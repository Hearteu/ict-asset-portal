from django.core.management.base import BaseCommand
from inventory.models import Asset, JobSheet


class Command(BaseCommand):
    help = 'Seeds DPWH ODE-ICTS computer assets and official job sheet records'

    def handle(self, *args, **kwargs):
        # Reset and seed with user spreadsheet data
        JobSheet.objects.all().delete()
        Asset.objects.all().delete()

        self.stdout.write("Populating DPWH ODE-ICTS computer inventory and job sheet records...")

        # 1. Stephen C. Maybanting - HP Pro 3330MT
        a1 = Asset.objects.create(
            end_user="Stephen C. Maybanting",
            device="Desktop",
            brand_model="HP Pro 3330MT",
            serial_number="SGH303QPNH",
            computer_name="ODE-ICTS-DT01",
            monitor_serial="HP V203p (CN49200XYZ)",
            ups_serial="APC Back-UPS 650VA (BB190401)",
            office="ODE-ICTS",
            status="In Use",
            processor="Intel Core i5-3470 @ 3.20GHz",
            ram="8 GB DDR3",
            storage="500 GB SATA HDD",
            os="Windows 10 Pro 64-bit",
            notes="Primary workstation at ODE-ICTS."
        )

        # 2. Vanessa G. Gamil - HP EliteDesk 800 G3
        a2 = Asset.objects.create(
            end_user="Vanessa G. Gamil",
            device="Desktop",
            brand_model="HP EliteDesk 800 G3",
            serial_number="SGH735PWSW",
            computer_name="ODE-ICTS-DT02",
            monitor_serial="HP EliteDisplay E233 (3CQ8141ABC)",
            ups_serial="APC Back-UPS 650VA (BB201102)",
            office="ODE-ICTS",
            status="In Use",
            processor="Intel Core i7-7700 @ 3.60GHz",
            ram="16 GB DDR4",
            storage="256 GB NVMe SSD + 1 TB HDD",
            os="Windows 10 Pro 64-bit",
            notes="Workstation configured with DPWH intranet applications."
        )

        # 3. Jadin M. Fronteras - HP EliteDesk 800 G3
        a3 = Asset.objects.create(
            end_user="Jadin M. Fronteras",
            device="Desktop",
            brand_model="HP EliteDesk 800 G3",
            serial_number="SGH745RGZZ",
            computer_name="ODE-ICTS-DT03",
            monitor_serial="HP EliteDisplay E233 (3CQ8141DEF)",
            ups_serial="APC Back-UPS 650VA (BB201105)",
            office="ODE-ICTS",
            status="In Use",
            processor="Intel Core i7-7700 @ 3.60GHz",
            ram="16 GB DDR4",
            storage="512 GB NVMe SSD",
            os="Windows 11 Pro 64-bit",
            notes="Assigned at Planning and Design / ICT support pool."
        )

        # 4. Stephen C. Maybanting - HP EliteDesk 800 G3 (Secondary/Upgrade)
        a4 = Asset.objects.create(
            end_user="Stephen C. Maybanting",
            device="Desktop",
            brand_model="HP EliteDesk 800 G3",
            serial_number="SGH745RH01",
            computer_name="ODE-ICTS-DT04",
            monitor_serial="HP EliteDisplay E233 (3CQ8141GHI)",
            ups_serial="APC Back-UPS 650VA (BB201109)",
            office="ODE-ICTS",
            status="Under Repair",
            processor="Intel Core i7-7700 @ 3.60GHz",
            ram="16 GB DDR4",
            storage="256 GB SSD",
            os="Windows 10 Pro 64-bit",
            notes="Currently undergoing system restoration and thermal maintenance."
        )

        # Create realistic DPWH Job Sheets
        j1 = JobSheet.objects.create(
            ref_no="2026-09-001",
            asset=a4,
            full_name="Stephen C. Maybanting",
            section_division="ODE-ICTS",
            date_of_filing="2026-09-14",
            contact_no="Local 4102",
            incident_description="Computer randomly freezing during report generation. System fan spinning continuously at maximum speed.",
            hardware_type="Desktop",
            hardware_brand_model="HP EliteDesk 800 G3",
            hardware_serial_number="SGH745RH01",
            hardware_computer_name="ODE-ICTS-DT04",
            app_software_description="Operating System and DPWH Executive Information System",
            app_software_version="Windows 10 Pro 22H2",
            connectivity_description="LAN connection normal, DHCP IP assigned",
            user_account_description="Standard domain user account",
            assessment="Thermal throttling detected due to dried heatsink compound. Hard drive SMART diagnostic showed bad sectors on secondary data drive.",
            actions_taken="Cleaned chassis and CPU blower fan. Replaced dried thermal compound with high-grade thermal paste. Replaced failing hard drive and re-imaged OS. Ran burn-in test.",
            mode_of_filing="Walk-in",
            date_time_received="2026-09-14 08:30 AM",
            date_time_completed="2026-09-15 04:00 PM",
            fulfilled_by="Engr. J. Dela Cruz (ICT Support)",
            reviewed_by="Head, ICT Unit",
            status="In Progress",
            priority="High",
            concern_addressed="Yes",
            it_support_satisfaction="Very Satisfied",
            solution_satisfaction="Very Satisfied",
            comments_suggestions="Prompt diagnosis and immediate replacement of storage drive."
        )

        j2 = JobSheet.objects.create(
            ref_no="2026-08-015",
            asset=a2,
            full_name="Vanessa G. Gamil",
            section_division="ODE-ICTS",
            date_of_filing="2026-08-20",
            contact_no="Local 4105",
            incident_description="Request for network printer configuration and DPWH Document Tracking System installation.",
            hardware_type="Desktop",
            hardware_brand_model="HP EliteDesk 800 G3",
            hardware_serial_number="SGH735PWSW",
            hardware_computer_name="ODE-ICTS-DT02",
            app_software_description="DPWH DoTS (Document Tracking System)",
            app_software_version="v4.2.1",
            connectivity_description="Static IP configuration for network shared printer access",
            user_account_description="User account credentials verified",
            assessment="Client workstation lacks printer driver package and DoTS desktop client prerequisites.",
            actions_taken="Installed HP Universal Print Driver via network IP port. Deployed DoTS client software and tested document routing successfully.",
            mode_of_filing="Walk-in",
            date_time_received="2026-08-20 09:15 AM",
            date_time_completed="2026-08-20 10:30 AM",
            fulfilled_by="Engr. J. Dela Cruz (ICT Support)",
            reviewed_by="Head, ICT Unit",
            status="Resolved",
            priority="Medium",
            concern_addressed="Yes",
            it_support_satisfaction="Very Satisfied",
            solution_satisfaction="Very Satisfied",
            comments_suggestions="Fast and accommodating service."
        )

        self.stdout.write(self.style.SUCCESS("Successfully seeded DPWH ODE-ICTS assets and job sheets!"))
