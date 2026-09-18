import json
import csv
import datetime
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q
from .models import Asset, JobSheet


def index(request):
    """Serve the main ICT Portal Single Page Application."""
    return render(request, 'index.html')


def generate_next_job_no():
    current_year = datetime.datetime.now().year
    prefix = f"JOB-{current_year}-"
    latest = JobSheet.objects.filter(job_no__startswith=prefix).order_by('-id').first()
    if not latest:
        return f"{prefix}0001"
    try:
        last_seq = int(latest.job_no.split("-")[-1])
        next_seq = last_seq + 1
    except (ValueError, IndexError):
        next_seq = 1
    return f"{prefix}{next_seq:04d}"


def stats_api(request):
    total_assets = Asset.objects.count()
    in_use = Asset.objects.filter(status="In Use").count()
    spares = Asset.objects.filter(status="Available / Spare").count()
    under_repair = Asset.objects.filter(status="Under Repair").count()
    decommissioned = Asset.objects.filter(status="Decommissioned").count()

    total_jobs = JobSheet.objects.count()
    open_jobs = JobSheet.objects.filter(status="Open").count()
    in_progress = JobSheet.objects.filter(status="In Progress").count()
    waiting_parts = JobSheet.objects.filter(status="Waiting for Parts").count()
    resolved_jobs = JobSheet.objects.filter(status__in=["Resolved", "Closed"]).count()

    return JsonResponse({
        "total_assets": total_assets,
        "in_use": in_use,
        "spares": spares,
        "under_repair": under_repair,
        "decommissioned": decommissioned,
        "total_jobs": total_jobs,
        "open_jobs": open_jobs,
        "in_progress": in_progress,
        "waiting_parts": waiting_parts,
        "active_jobs": open_jobs + in_progress + waiting_parts,
        "resolved_jobs": resolved_jobs
    })


@csrf_exempt
def assets_api(request):
    if request.method == "GET":
        qs = Asset.objects.all()
        search = request.GET.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(asset_tag__icontains=search) |
                Q(serial_no__icontains=search) |
                Q(brand_model__icontains=search) |
                Q(owner_name__icontains=search) |
                Q(department__icontains=search) |
                Q(processor__icontains=search) |
                Q(location__icontains=search)
            )

        status = request.GET.get("status", "").strip()
        if status:
            qs = qs.filter(status=status)

        device_type = request.GET.get("device_type", "").strip()
        if device_type:
            qs = qs.filter(device_type=device_type)

        return JsonResponse([a.to_dict(include_history=False) for a in qs], safe=False)

    elif request.method == "POST":
        try:
            data = json.loads(request.body.decode('utf-8'))
        except Exception:
            return JsonResponse({"error": "Invalid JSON body"}, status=400)

        if not data.get("asset_tag") or not data.get("serial_no") or not data.get("brand_model"):
            return JsonResponse({"error": "Asset Tag, Serial No, and Brand/Model are required"}, status=400)

        tag = data["asset_tag"].strip().upper()
        serial = data["serial_no"].strip().upper()

        if Asset.objects.filter(asset_tag=tag).exists():
            return JsonResponse({"error": f"Asset Tag '{tag}' is already registered."}, status=400)
        if Asset.objects.filter(serial_no=serial).exists():
            return JsonResponse({"error": f"Serial No '{serial}' is already registered."}, status=400)

        asset = Asset.objects.create(
            asset_tag=tag,
            serial_no=serial,
            device_type=data.get("device_type", "Desktop"),
            brand_model=data.get("brand_model", "").strip(),
            processor=data.get("processor", "").strip(),
            ram=data.get("ram", "").strip(),
            storage=data.get("storage", "").strip(),
            gpu=data.get("gpu", "").strip(),
            os=data.get("os", "").strip(),
            owner_name=data.get("owner_name", "Unassigned").strip(),
            department=data.get("department", "General Pool").strip(),
            location=data.get("location", "").strip(),
            status=data.get("status", "In Use"),
            purchase_date=data.get("purchase_date", ""),
            warranty_expiry=data.get("warranty_expiry", ""),
            notes=data.get("notes", "")
        )
        return JsonResponse(asset.to_dict(include_history=False), status=201)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def asset_detail_api(request, asset_id):
    asset = get_object_or_404(Asset, id=asset_id)

    if request.method == "GET":
        return JsonResponse(asset.to_dict(include_history=True))

    elif request.method == "PUT":
        try:
            data = json.loads(request.body.decode('utf-8'))
        except Exception:
            return JsonResponse({"error": "Invalid JSON body"}, status=400)

        if "asset_tag" in data:
            tag = data["asset_tag"].strip().upper()
            if tag != asset.asset_tag and Asset.objects.filter(asset_tag=tag).exclude(id=asset_id).exists():
                return JsonResponse({"error": f"Asset Tag '{tag}' is already used."}, status=400)
            asset.asset_tag = tag

        if "serial_no" in data:
            serial = data["serial_no"].strip().upper()
            if serial != asset.serial_no and Asset.objects.filter(serial_no=serial).exclude(id=asset_id).exists():
                return JsonResponse({"error": f"Serial No '{serial}' is already used."}, status=400)
            asset.serial_no = serial

        for field in ["device_type", "brand_model", "processor", "ram", "storage", "gpu", "os",
                      "owner_name", "department", "location", "status", "purchase_date", "warranty_expiry", "notes"]:
            if field in data:
                setattr(asset, field, data[field])

        asset.save()
        return JsonResponse(asset.to_dict(include_history=True))

    elif request.method == "DELETE":
        tag = asset.asset_tag
        asset.delete()
        return JsonResponse({"message": f"Asset {tag} was deleted."})

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def jobs_api(request):
    if request.method == "GET":
        qs = JobSheet.objects.select_related('asset').all()
        search = request.GET.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(job_no__icontains=search) |
                Q(issue_description__icontains=search) |
                Q(technician_name__icontains=search) |
                Q(parts_replaced__icontains=search) |
                Q(asset__asset_tag__icontains=search) |
                Q(asset__serial_no__icontains=search) |
                Q(asset__brand_model__icontains=search) |
                Q(asset__owner_name__icontains=search)
            )

        status = request.GET.get("status", "").strip()
        if status:
            qs = qs.filter(status=status)

        priority = request.GET.get("priority", "").strip()
        if priority:
            qs = qs.filter(priority=priority)

        asset_id = request.GET.get("asset_id")
        if asset_id:
            qs = qs.filter(asset_id=asset_id)

        return JsonResponse([j.to_dict(include_asset=True) for j in qs], safe=False)

    elif request.method == "POST":
        try:
            data = json.loads(request.body.decode('utf-8'))
        except Exception:
            return JsonResponse({"error": "Invalid JSON body"}, status=400)

        asset_id = data.get("asset_id")
        issue = data.get("issue_description", "").strip()
        if not asset_id:
            return JsonResponse({"error": "Asset ID is required"}, status=400)
        if not issue:
            return JsonResponse({"error": "Issue description is required"}, status=400)

        asset = get_object_or_404(Asset, id=asset_id)

        job_no = data.get("job_no", "").strip()
        if not job_no:
            job_no = generate_next_job_no()
        else:
            if JobSheet.objects.filter(job_no=job_no).exists():
                return JsonResponse({"error": f"Job Sheet #{job_no} already exists."}, status=400)

        date_received = data.get("date_received") or datetime.date.today().isoformat()

        job = JobSheet.objects.create(
            job_no=job_no,
            asset=asset,
            issue_description=issue,
            priority=data.get("priority", "Medium"),
            status=data.get("status", "Open"),
            technician_name=data.get("technician_name", "").strip(),
            diagnosis=data.get("diagnosis", "").strip(),
            action_taken=data.get("action_taken", "").strip(),
            parts_replaced=data.get("parts_replaced", "").strip(),
            cost=float(data.get("cost") or 0.0),
            date_received=date_received,
            date_completed=data.get("date_completed") or None,
            remarks=data.get("remarks", "").strip()
        )

        if data.get("set_asset_under_repair", True) and job.status in ["Open", "In Progress", "Waiting for Parts"]:
            asset.status = "Under Repair"
            asset.save()

        return JsonResponse(job.to_dict(include_asset=True), status=201)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def job_detail_api(request, job_id):
    job = get_object_or_404(JobSheet, id=job_id)

    if request.method == "GET":
        return JsonResponse(job.to_dict(include_asset=True))

    elif request.method == "PUT":
        try:
            data = json.loads(request.body.decode('utf-8'))
        except Exception:
            return JsonResponse({"error": "Invalid JSON body"}, status=400)

        for field in ["issue_description", "priority", "status", "technician_name",
                      "diagnosis", "action_taken", "parts_replaced", "date_received",
                      "date_completed", "remarks"]:
            if field in data:
                setattr(job, field, data[field])

        if "cost" in data:
            job.cost = float(data["cost"] or 0.0)

        if job.status in ["Resolved", "Closed"] and not job.date_completed:
            job.date_completed = datetime.date.today().isoformat()

        if data.get("update_asset_status") and job.asset:
            job.asset.status = data["update_asset_status"]
            job.asset.save()

        job.save()
        return JsonResponse(job.to_dict(include_asset=True))

    elif request.method == "DELETE":
        job_no = job.job_no
        job.delete()
        return JsonResponse({"message": f"Job Sheet {job_no} deleted."})

    return JsonResponse({"error": "Method not allowed"}, status=405)


def export_csv(request):
    assets = Asset.objects.all().order_by('asset_tag')
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="ICT_Hardware_Inventory.csv"'

    writer = csv.writer(response)
    writer.writerow([
        "Asset Tag", "Serial No", "Device Type", "Brand / Model", "Processor", "RAM", "Storage",
        "GPU", "Operating System", "Owner Name", "Department", "Location", "Status",
        "Purchase Date", "Warranty Expiry", "Total Repairs", "Notes"
    ])

    for a in assets:
        writer.writerow([
            a.asset_tag, a.serial_no, a.device_type, a.brand_model, a.processor, a.ram, a.storage,
            a.gpu, a.os, a.owner_name, a.department, a.location, a.status,
            a.purchase_date, a.warranty_expiry, a.job_sheets.count(), a.notes
        ])

    return response
