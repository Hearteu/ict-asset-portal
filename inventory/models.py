from django.db import models


class Asset(models.Model):
    DEVICE_TYPES = [
        ('Laptop', 'Laptop'),
        ('Desktop', 'Desktop'),
        ('Workstation', 'Workstation'),
        ('Server', 'Server'),
        ('All-in-One', 'All-in-One'),
        ('Other', 'Other'),
    ]

    STATUS_CHOICES = [
        ('In Use', 'In Use'),
        ('Available / Spare', 'Available / Spare'),
        ('Under Repair', 'Under Repair'),
        ('Decommissioned', 'Decommissioned'),
    ]

    asset_tag = models.CharField(max_length=50, unique=True, db_index=True)
    serial_no = models.CharField(max_length=100, unique=True, db_index=True)
    device_type = models.CharField(max_length=50, choices=DEVICE_TYPES, default='Desktop')
    brand_model = models.CharField(max_length=150)
    processor = models.CharField(max_length=150, blank=True, default='')
    ram = models.CharField(max_length=100, blank=True, default='')
    storage = models.CharField(max_length=150, blank=True, default='')
    gpu = models.CharField(max_length=150, blank=True, default='')
    os = models.CharField(max_length=100, blank=True, default='')

    # Ownership & Location
    owner_name = models.CharField(max_length=150, default='Unassigned')
    department = models.CharField(max_length=150, default='General Pool')
    location = models.CharField(max_length=200, blank=True, default='')

    # Status & Life Cycle
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='In Use', db_index=True)
    purchase_date = models.CharField(max_length=50, blank=True, default='')
    warranty_expiry = models.CharField(max_length=50, blank=True, default='')
    notes = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Computer Asset'
        verbose_name_plural = 'Computer Assets'

    def __str__(self):
        return f"{self.asset_tag} - {self.brand_model} ({self.owner_name})"

    def to_dict(self, include_history=False):
        jobs = self.job_sheets.all()
        data = {
            "id": self.id,
            "asset_tag": self.asset_tag,
            "serial_no": self.serial_no,
            "device_type": self.device_type,
            "brand_model": self.brand_model,
            "processor": self.processor,
            "ram": self.ram,
            "storage": self.storage,
            "gpu": self.gpu,
            "os": self.os,
            "owner_name": self.owner_name,
            "department": self.department,
            "location": self.location,
            "status": self.status,
            "purchase_date": self.purchase_date,
            "warranty_expiry": self.warranty_expiry,
            "notes": self.notes,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M") if self.created_at else "",
            "total_repairs": jobs.count(),
            "active_jobs": jobs.filter(status__in=["Open", "In Progress", "Waiting for Parts"]).count()
        }
        if include_history:
            data["job_sheets"] = [j.to_dict(include_asset=False) for j in jobs]
        return data


class JobSheet(models.Model):
    PRIORITY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Critical', 'Critical'),
    ]

    STATUS_CHOICES = [
        ('Open', 'Open'),
        ('In Progress', 'In Progress'),
        ('Waiting for Parts', 'Waiting for Parts'),
        ('Resolved', 'Resolved'),
        ('Closed', 'Closed'),
    ]

    job_no = models.CharField(max_length=50, unique=True, db_index=True)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='job_sheets')

    issue_description = models.TextField()
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='Medium')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Open', db_index=True)
    technician_name = models.CharField(max_length=150, blank=True, default='')

    # Technical Details
    diagnosis = models.TextField(blank=True, default='')
    action_taken = models.TextField(blank=True, default='')
    parts_replaced = models.TextField(blank=True, default='')
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    # Timeline
    date_received = models.CharField(max_length=50, blank=True, default='')
    date_completed = models.CharField(max_length=50, blank=True, null=True, default='')
    remarks = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Job Sheet'
        verbose_name_plural = 'Job Sheets'

    def __str__(self):
        return f"{self.job_no} - {self.asset.asset_tag} ({self.status})"

    def to_dict(self, include_asset=True):
        data = {
            "id": self.id,
            "job_no": self.job_no,
            "asset_id": self.asset_id,
            "issue_description": self.issue_description,
            "priority": self.priority,
            "status": self.status,
            "technician_name": self.technician_name or "Unassigned",
            "diagnosis": self.diagnosis,
            "action_taken": self.action_taken,
            "parts_replaced": self.parts_replaced,
            "cost": float(self.cost or 0.0),
            "date_received": self.date_received,
            "date_completed": self.date_completed or "",
            "remarks": self.remarks,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M") if self.created_at else "",
            "updated_at": self.updated_at.strftime("%Y-%m-%d %H:%M") if self.updated_at else ""
        }
        if include_asset and self.asset:
            data["asset_tag"] = self.asset.asset_tag
            data["serial_no"] = self.asset.serial_no
            data["brand_model"] = self.asset.brand_model
            data["device_type"] = self.asset.device_type
            data["owner_name"] = self.asset.owner_name
            data["department"] = self.asset.department
            data["processor"] = self.asset.processor
            data["ram"] = self.asset.ram
            data["storage"] = self.asset.storage
            data["gpu"] = self.asset.gpu
            data["os"] = self.asset.os
        return data
