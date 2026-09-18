from django.contrib import admin
from .models import Asset, JobSheet


class JobSheetInline(admin.TabularInline):
    model = JobSheet
    extra = 0
    fields = ('ref_no', 'status', 'priority', 'incident_description', 'fulfilled_by', 'date_of_filing')
    show_change_link = True


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ('end_user', 'device', 'brand_model', 'serial_number', 'computer_name', 'office', 'status', 'total_repairs')
    search_fields = ('end_user', 'serial_number', 'brand_model', 'computer_name', 'monitor_serial', 'ups_serial', 'office')
    list_filter = ('status', 'device', 'office')
    inlines = [JobSheetInline]

    def total_repairs(self, obj):
        return obj.job_sheets.count()
    total_repairs.short_description = 'Repairs'


@admin.register(JobSheet)
class JobSheetAdmin(admin.ModelAdmin):
    list_display = ('ref_no', 'full_name', 'section_division', 'hardware_brand_model', 'hardware_serial_number', 'priority', 'status', 'fulfilled_by', 'date_of_filing')
    search_fields = ('ref_no', 'full_name', 'incident_description', 'hardware_serial_number', 'fulfilled_by', 'section_division')
    list_filter = ('status', 'priority', 'mode_of_filing', 'section_division')
