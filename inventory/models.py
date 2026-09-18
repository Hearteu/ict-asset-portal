from django.db import models


class Asset(models.Model):
    DEVICE_TYPES = [
        ('Desktop', 'Desktop'),
        ('Laptop', 'Laptop'),
        ('All-in-One', 'All-in-One'),
        ('Server', 'Server'),
        ('Workstation', 'Workstation'),
        ('Other', 'Other'),
    ]

    STATUS_CHOICES = [
        ('In Use', 'In Use'),
        ('Available / Spare', 'Available / Spare'),
        ('Under Repair', 'Under Repair'),
        ('Decommissioned', 'Decommissioned'),
    ]

    # Aligned with the Excel Inventory Sheet:
    # END-USER | DEVICE | BRAND and MODEL | SERIAL NUMBER | COMPUTER NAME | MONITOR with S/N | UPS with S/N | OFFICE | REPAIR HISTORY
    end_user = models.CharField(max_length=150, verbose_name="End-User", default="Unassigned", db_index=True)
    device = models.CharField(max_length=50, choices=DEVICE_TYPES, default="Desktop", verbose_name="Device Type")
    brand_model = models.CharField(max_length=150, verbose_name="Brand and Model")
    serial_number = models.CharField(max_length=100, unique=True, verbose_name="Serial Number", db_index=True)
    computer_name = models.CharField(max_length=100, blank=True, default="", verbose_name="Computer Name")
    monitor_serial = models.CharField(max_length=150, blank=True, default="", verbose_name="Monitor with Serial Number")
    ups_serial = models.CharField(max_length=150, blank=True, default="", verbose_name="UPS with Serial Number")
    office = models.CharField(max_length=150, default="ODE-ICTS", verbose_name="Office / Section / Division")

    # Status & Life Cycle
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='In Use', db_index=True)
    asset_tag = models.CharField(max_length=50, blank=True, default="", verbose_name="Property / Asset Tag")
    processor = models.CharField(max_length=150, blank=True, default="", verbose_name="Processor (CPU)")
    ram = models.CharField(max_length=100, blank=True, default="", verbose_name="Memory (RAM)")
    storage = models.CharField(max_length=150, blank=True, default="", verbose_name="Storage / Drive")
    gpu = models.CharField(max_length=150, blank=True, default="", verbose_name="Graphics")
    os = models.CharField(max_length=100, blank=True, default="", verbose_name="Operating System")
    notes = models.TextField(blank=True, default="", verbose_name="General Remarks / Notes")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Computer Asset'
        verbose_name_plural = 'Computer Assets'

    def __str__(self):
        return f"{self.end_user} - {self.brand_model} ({self.serial_number})"

    def to_dict(self, include_history=False):
        jobs = self.job_sheets.all()
        data = {
            "id": self.id,
            "end_user": self.end_user,
            "device": self.device,
            "brand_model": self.brand_model,
            "serial_number": self.serial_number,
            "computer_name": self.computer_name or "-",
            "monitor_serial": self.monitor_serial or "-",
            "ups_serial": self.ups_serial or "-",
            "office": self.office or "ODE-ICTS",
            "status": self.status,
            "asset_tag": self.asset_tag or self.serial_number,
            "processor": self.processor,
            "ram": self.ram,
            "storage": self.storage,
            "gpu": self.gpu,
            "os": self.os,
            "notes": self.notes,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M") if self.created_at else "",
            "total_repairs": jobs.count(),
            "active_jobs": jobs.filter(status__in=["Open", "In Progress", "Waiting for Parts"]).count()
        }
        if include_history:
            data["job_sheets"] = [j.to_dict(include_asset=False) for j in jobs]
        return data


class JobSheet(models.Model):
    MODE_OF_FILING_CHOICES = [
        ('Walk-in', 'Walk-in'),
        ('Telephone Call', 'Telephone Call'),
        ('Email', 'Email'),
    ]

    STATUS_CHOICES = [
        ('Open', 'Open'),
        ('In Progress', 'In Progress'),
        ('Waiting for Parts', 'Waiting for Parts'),
        ('Resolved', 'Resolved'),
        ('Closed', 'Closed'),
    ]

    PRIORITY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Critical', 'Critical'),
    ]

    # Ref. No. format: YYYY-MM-NNN (e.g. 2026-09-001)
    ref_no = models.CharField(max_length=50, unique=True, db_index=True, verbose_name="Ref. No.")
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='job_sheets')

    # CLIENT'S INFORMATION and SERVICE REQUEST
    full_name = models.CharField(max_length=150, verbose_name="Full Name")
    section_division = models.CharField(max_length=150, default="ODE-ICTS", verbose_name="Section/Division")
    date_of_filing = models.CharField(max_length=50, verbose_name="Date of Filing")
    contact_no = models.CharField(max_length=50, blank=True, default="", verbose_name="Contact No.")
    incident_description = models.TextField(verbose_name="Brief description of the Incident or Request")

    # I.T. SUPPORT TECHNICAL ASSESSMENT
    hardware_type = models.CharField(max_length=50, default="Desktop", verbose_name="Hardware Type")
    hardware_brand_model = models.CharField(max_length=150, verbose_name="Brand and Model")
    hardware_serial_number = models.CharField(max_length=100, verbose_name="Serial Number")
    hardware_computer_name = models.CharField(max_length=100, blank=True, default="", verbose_name="Computer Name")

    app_software_description = models.CharField(max_length=200, blank=True, default="", verbose_name="App System / Software Description")
    app_software_version = models.CharField(max_length=50, blank=True, default="", verbose_name="Version")
    connectivity_description = models.CharField(max_length=200, blank=True, default="", verbose_name="Connectivity Description")
    user_account_description = models.CharField(max_length=200, blank=True, default="", verbose_name="User Account Description")

    assessment = models.TextField(blank=True, default="", verbose_name="Assessment")
    actions_taken = models.TextField(blank=True, default="", verbose_name="Actions Taken and/or Recommendations")

    mode_of_filing = models.CharField(max_length=30, choices=MODE_OF_FILING_CHOICES, default="Walk-in", verbose_name="Mode of Filing")
    date_time_received = models.CharField(max_length=100, blank=True, default="", verbose_name="Date and Time Received")
    date_time_completed = models.CharField(max_length=100, blank=True, default="", verbose_name="Date and Time Completed")

    fulfilled_by = models.CharField(max_length=150, blank=True, default="", verbose_name="Fulfilled by (Signature over Printed Name)")
    reviewed_by = models.CharField(max_length=150, blank=True, default="", verbose_name="Reviewed by (Signature over Printed Name)")

    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Open', db_index=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='Medium')

    # CLIENT'S EVALUATION
    concern_addressed = models.CharField(max_length=10, blank=True, default="", verbose_name="Was concern addressed? (Yes/No)")
    it_support_satisfaction = models.CharField(max_length=30, blank=True, default="", verbose_name="IT Support Satisfaction")
    solution_satisfaction = models.CharField(max_length=30, blank=True, default="", verbose_name="Solution Effectiveness Satisfaction")
    comments_suggestions = models.TextField(blank=True, default="", verbose_name="Comments and/or Suggestions")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Job Sheet'
        verbose_name_plural = 'Job Sheets'

    def __str__(self):
        return f"{self.ref_no} - {self.full_name} ({self.hardware_brand_model})"

    def to_dict(self, include_asset=True):
        data = {
            "id": self.id,
            "ref_no": self.ref_no,
            "job_no": self.ref_no,  # backward-compat alias
            "asset_id": self.asset_id,
            "full_name": self.full_name,
            "section_division": self.section_division,
            "date_of_filing": self.date_of_filing,
            "contact_no": self.contact_no,
            "incident_description": self.incident_description,
            "issue_description": self.incident_description,  # alias
            "hardware_type": self.hardware_type,
            "hardware_brand_model": self.hardware_brand_model,
            "hardware_serial_number": self.hardware_serial_number,
            "hardware_computer_name": self.hardware_computer_name,
            "app_software_description": self.app_software_description,
            "app_software_version": self.app_software_version,
            "connectivity_description": self.connectivity_description,
            "user_account_description": self.user_account_description,
            "assessment": self.assessment,
            "actions_taken": self.actions_taken,
            "mode_of_filing": self.mode_of_filing,
            "date_time_received": self.date_time_received,
            "date_time_completed": self.date_time_completed or "",
            "fulfilled_by": self.fulfilled_by,
            "reviewed_by": self.reviewed_by,
            "status": self.status,
            "priority": self.priority,
            "concern_addressed": self.concern_addressed,
            "it_support_satisfaction": self.it_support_satisfaction,
            "solution_satisfaction": self.solution_satisfaction,
            "comments_suggestions": self.comments_suggestions,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M") if self.created_at else "",
            "updated_at": self.updated_at.strftime("%Y-%m-%d %H:%M") if self.updated_at else ""
        }
        if include_asset and self.asset:
            data["end_user"] = self.asset.end_user
            data["office"] = self.asset.office
            data["device"] = self.asset.device
            data["brand_model"] = self.asset.brand_model
            data["serial_number"] = self.asset.serial_number
            data["computer_name"] = self.asset.computer_name
            data["monitor_serial"] = self.asset.monitor_serial
            data["ups_serial"] = self.asset.ups_serial
        return data
