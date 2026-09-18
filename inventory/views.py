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


def generate_next_ref_no():
    """Generate Ref. No. in format YYYY-MM-NNN (e.g. 2026-09-001)."""
    now = datetime.datetime.now()
    year_month = now.strftime("%Y-%m")
    prefix = f"{year_month}-"
    latest = JobSheet.objects.filter(ref_no__startswith=prefix).order_by('-id').first()
    if not latest:
        return f"{prefix}001"
    try:
        last_seq = int(latest.ref_no.split("-")[-1])
        next_seq = last_seq + 1
    except (ValueError, IndexError):
        next_seq = 1
    return f"{prefix}{next_seq:03d}"


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
                Q(end_user__icontains=search) |
                Q(serial_number__icontains=search) |
                Q(brand_model__icontains=search) |
                Q(computer_name__icontains=search) |
                Q(monitor_serial__icontains=search) |
                Q(ups_serial__icontains=search) |
                Q(office__icontains=search) |
                Q(processor__icontains=search)
            )

        status = request.GET.get("status", "").strip()
        if status:
            qs = qs.filter(status=status)

        device = request.GET.get("device", "").strip()
        if device:
            qs = qs.filter(device=device)

        return JsonResponse([a.to_dict(include_history=False) for a in qs], safe=False)

    elif request.method == "POST":
        try:
            data = json.loads(request.body.decode('utf-8'))
        except Exception:
            return JsonResponse({"error": "Invalid JSON body"}, status=400)

        end_user = data.get("end_user", "").strip()
        brand_model = data.get("brand_model", "").strip()
        serial_number = data.get("serial_number", "").strip().upper()

        if not end_user or not brand_model or not serial_number:
            return JsonResponse({"error": "End-User, Brand & Model, and Serial Number are required."}, status=400)

        if Asset.objects.filter(serial_number=serial_number).exists():
            return JsonResponse({"error": f"Serial Number '{serial_number}' is already registered in the system."}, status=400)

        asset = Asset.objects.create(
            end_user=end_user,
            device=data.get("device", "Desktop"),
            brand_model=brand_model,
            serial_number=serial_number,
            computer_name=data.get("computer_name", "").strip(),
            monitor_serial=data.get("monitor_serial", "").strip(),
            ups_serial=data.get("ups_serial", "").strip(),
            office=data.get("office", "ODE-ICTS").strip(),
            status=data.get("status", "In Use"),
            asset_tag=data.get("asset_tag", "").strip(),
            processor=data.get("processor", "").strip(),
            ram=data.get("ram", "").strip(),
            storage=data.get("storage", "").strip(),
            gpu=data.get("gpu", "").strip(),
            os=data.get("os", "").strip(),
            notes=data.get("notes", "").strip()
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

        if "serial_number" in data:
            new_sn = data["serial_number"].strip().upper()
            if new_sn != asset.serial_number and Asset.objects.filter(serial_number=new_sn).exclude(id=asset_id).exists():
                return JsonResponse({"error": f"Serial Number '{new_sn}' is already used by another computer."}, status=400)
            asset.serial_number = new_sn

        for field in ["end_user", "device", "brand_model", "computer_name", "monitor_serial",
                      "ups_serial", "office", "status", "asset_tag", "processor", "ram", "storage",
                      "gpu", "os", "notes"]:
            if field in data:
                setattr(asset, field, data[field])

        asset.save()
        return JsonResponse(asset.to_dict(include_history=True))

    elif request.method == "DELETE":
        sn = asset.serial_number
        asset.delete()
        return JsonResponse({"message": f"Asset {sn} was successfully deleted."})

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def jobs_api(request):
    if request.method == "GET":
        qs = JobSheet.objects.select_related('asset').all()
        search = request.GET.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(ref_no__icontains=search) |
                Q(full_name__icontains=search) |
                Q(incident_description__icontains=search) |
                Q(hardware_serial_number__icontains=search) |
                Q(hardware_computer_name__icontains=search) |
                Q(fulfilled_by__icontains=search) |
                Q(section_division__icontains=search) |
                Q(actions_taken__icontains=search)
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
        incident_description = data.get("incident_description", "").strip() or data.get("issue_description", "").strip()

        if not asset_id:
            return JsonResponse({"error": "Computer asset selection is required."}, status=400)
        if not incident_description:
            return JsonResponse({"error": "Brief description of the Incident or Request is required."}, status=400)

        asset = get_object_or_404(Asset, id=asset_id)

        ref_no = data.get("ref_no", "").strip() or data.get("job_no", "").strip()
        if not ref_no:
            ref_no = generate_next_ref_no()
        else:
            if JobSheet.objects.filter(ref_no=ref_no).exists():
                return JsonResponse({"error": f"Job Sheet Ref. No. '{ref_no}' already exists."}, status=400)

        date_of_filing = data.get("date_of_filing") or datetime.date.today().isoformat()

        job = JobSheet.objects.create(
            ref_no=ref_no,
            asset=asset,
            full_name=data.get("full_name", "").strip() or asset.end_user,
            section_division=data.get("section_division", "").strip() or asset.office,
            date_of_filing=date_of_filing,
            contact_no=data.get("contact_no", "").strip(),
            incident_description=incident_description,
            hardware_type=data.get("hardware_type", asset.device),
            hardware_brand_model=data.get("hardware_brand_model", asset.brand_model),
            hardware_serial_number=data.get("hardware_serial_number", asset.serial_number),
            hardware_computer_name=data.get("hardware_computer_name", asset.computer_name),
            app_software_description=data.get("app_software_description", "").strip(),
            app_software_version=data.get("app_software_version", "").strip(),
            connectivity_description=data.get("connectivity_description", "").strip(),
            user_account_description=data.get("user_account_description", "").strip(),
            assessment=data.get("assessment", "").strip(),
            actions_taken=data.get("actions_taken", "").strip(),
            mode_of_filing=data.get("mode_of_filing", "Walk-in"),
            date_time_received=data.get("date_time_received", date_of_filing),
            date_time_completed=data.get("date_time_completed", ""),
            fulfilled_by=data.get("fulfilled_by", "").strip() or data.get("technician_name", "").strip(),
            reviewed_by=data.get("reviewed_by", "").strip(),
            status=data.get("status", "Open"),
            priority=data.get("priority", "Medium"),
            concern_addressed=data.get("concern_addressed", ""),
            it_support_satisfaction=data.get("it_support_satisfaction", ""),
            solution_satisfaction=data.get("solution_satisfaction", ""),
            comments_suggestions=data.get("comments_suggestions", "").strip()
        )

        # Sync asset status to Under Repair if ticket is active
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

        for field in ["full_name", "section_division", "date_of_filing", "contact_no",
                      "incident_description", "hardware_type", "hardware_brand_model",
                      "hardware_serial_number", "hardware_computer_name",
                      "app_software_description", "app_software_version",
                      "connectivity_description", "user_account_description",
                      "assessment", "actions_taken", "mode_of_filing",
                      "date_time_received", "date_time_completed",
                      "fulfilled_by", "reviewed_by", "status", "priority",
                      "concern_addressed", "it_support_satisfaction",
                      "solution_satisfaction", "comments_suggestions"]:
            if field in data:
                setattr(job, field, data[field])

        # Backward-compat aliases
        if "issue_description" in data and not data.get("incident_description"):
            job.incident_description = data["issue_description"]
        if "technician_name" in data and not data.get("fulfilled_by"):
            job.fulfilled_by = data["technician_name"]

        if job.status in ["Resolved", "Closed"] and not job.date_time_completed:
            job.date_time_completed = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

        if data.get("update_asset_status") and job.asset:
            job.asset.status = data["update_asset_status"]
            job.asset.save()

        job.save()
        return JsonResponse(job.to_dict(include_asset=True))

    elif request.method == "DELETE":
        ref = job.ref_no
        asset = job.asset
        job.delete()
        if asset:
            active_jobs = asset.job_sheets.filter(status__in=["Open", "In Progress", "Waiting for Parts"]).count()
            if active_jobs == 0 and asset.status == "Under Repair":
                asset.status = "In Use"
                asset.save()
        return JsonResponse({"message": f"Job Sheet {ref} was deleted."})

    return JsonResponse({"error": "Method not allowed"}, status=405)


def export_csv(request):
    """
    Exports CSV formatted matching the user's Excel Inventory Sheet:
    END-USER | DEVICE | BRAND and MODEL | SERIAL NUMBER | COMPUTER NAME | MONITOR with SERIAL NUMBER | UPS with SERIAL NUMBER | OFFICE | REPAIR HISTORY
    """
    assets = Asset.objects.all().order_by('end_user', 'serial_number')
    response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
    response['Content-Disposition'] = 'attachment; filename="ICT_Computer_Inventory.csv"'

    # UTF-8 BOM ensures Excel and spreadsheet editors properly interpret UTF-8 bold glyphs
    response.write('\ufeff')

    writer = csv.writer(response)
    writer.writerow([
        "𝗘𝗡𝗗-𝗨𝗦𝗘𝗥",
        "𝗗𝗘𝗩𝗜𝗖𝗘",
        "𝗕𝗥𝗔𝗡𝗗 𝗮𝗻𝗱 𝗠𝗢𝗗𝗘𝗟",
        "𝗦𝗘𝗥𝗜𝗔𝗟 𝗡𝗨𝗠𝗕𝗘𝗥",
        "𝗖𝗢𝗠𝗣𝗨𝗧𝗘𝗥 𝗡𝗔𝗠𝗘",
        "𝗠𝗢𝗡𝗜𝗧𝗢𝗥 𝘄𝗶𝘁𝗵 𝗦𝗘𝗥𝗜𝗔𝗟 𝗡𝗨𝗠𝗕𝗘𝗥",
        "𝗨𝗣𝗦 𝘄𝗶𝘁𝗵 𝗦𝗘𝗥𝗜𝗔𝗟 𝗡𝗨𝗠𝗕𝗘𝗥",
        "𝗢𝗙𝗙𝗜𝗖𝗘",
        "𝗥𝗘𝗣𝗔𝗜𝗥 𝗛𝗜𝗦𝗧𝗢𝗥𝗬"
    ])

    for a in assets:
        # Build repair history summary string
        repairs = a.job_sheets.all()
        if repairs.exists():
            repair_history_str = "; ".join([
                f"[{j.ref_no}] {j.date_of_filing}: {j.incident_description[:50]} (Status: {j.status}, Tech: {j.fulfilled_by})"
                for j in repairs
            ])
        else:
            repair_history_str = "None"

        writer.writerow([
            a.end_user,
            a.device,
            a.brand_model,
            a.serial_number,
            a.computer_name or "",
            a.monitor_serial or "",
            a.ups_serial or "",
            a.office,
            repair_history_str
        ])

    return response
