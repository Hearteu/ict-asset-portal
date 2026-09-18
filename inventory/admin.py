from django.contrib import admin
from .models import Asset, JobSheet


class JobSheetInline(admin.TabularInline):
    model = JobSheet
    extra = 0
    fields = ('job_no', 'status', 'priority', 'issue_description', 'technician_name', 'cost', 'date_received')
    show_change_link = True


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ('asset_tag', 'serial_no', 'brand_model', 'device_type', 'owner_name', 'department', 'status', 'total_repairs')
    search_fields = ('asset_tag', 'serial_no', 'brand_model', 'owner_name', 'department', 'processor')
    list_filter = ('status', 'device_type', 'department')
    inlines = [JobSheetInline]

    def total_repairs(self, obj):
        return obj.job_sheets.count()
    total_repairs.short_description = 'Repairs'


@admin.register(JobSheet)
class JobSheetAdmin(admin.ModelAdmin):
    list_display = ('job_no', 'asset', 'priority', 'status', 'technician_name', 'cost', 'date_received', 'date_completed')
    search_fields = ('job_no', 'issue_description', 'technician_name', 'asset__asset_tag', 'asset__serial_no')
    list_filter = ('status', 'priority', 'technician_name')
