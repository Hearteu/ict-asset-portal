from django.core.management.base import BaseCommand
from inventory.models import Asset, JobSheet


class Command(BaseCommand):
    help = 'Seeds initial ICT assets and job sheet repair history into Django database'

    def handle(self, *args, **kwargs):
        if Asset.objects.exists():
            self.stdout.write(self.style.WARNING("Database already has records. Skipping seed."))
            return

        self.stdout.write("Seeding ICT computers and repair job sheets...")

        a1 = Asset.objects.create(
            asset_tag="ICT-NB-001",
            serial_no="5CD2048XYZ",
            device_type="Laptop",
            brand_model="Dell Latitude 5420",
            processor="Intel Core i7-1185G7 @ 3.00GHz (4 Cores, 8 Threads)",
            ram="16 GB DDR4-3200MHz",
            storage="512 GB NVMe M.2 SSD",
            gpu="Intel Iris Xe Graphics",
            os="Windows 11 Pro 64-bit",
            owner_name="Elena Rostova",
            department="Finance",
            location="HQ Building A, Level 3, Desk 304",
            status="In Use",
            purchase_date="2024-03-15",
            warranty_expiry="2027-03-15",
            notes="Company issued laptop with docking station."
        )

        a2 = Asset.objects.create(
            asset_tag="ICT-NB-002",
            serial_no="PF3910A9-LEN",
            device_type="Laptop",
            brand_model="Lenovo ThinkPad T14 Gen 3",
            processor="AMD Ryzen 7 PRO 6850U (8 Cores, 16 Threads)",
            ram="32 GB LPDDR5-6400MHz",
            storage="1 TB PCIe 4.0 NVMe SSD",
            gpu="Integrated AMD Radeon 680M",
            os="Windows 11 Pro 64-bit",
            owner_name="David Miller",
            department="Engineering",
            location="HQ Building B, Level 2, Desk 210",
            status="In Use",
            purchase_date="2024-06-20",
            warranty_expiry="2027-06-20",
            notes="Configured with WSL2 and Docker development stack."
        )

        a3 = Asset.objects.create(
            asset_tag="ICT-DT-001",
            serial_no="CZ293108B-HP",
            device_type="Desktop",
            brand_model="HP EliteDesk 800 G6 Mini Desktop",
            processor="Intel Core i5-10500 @ 3.10GHz",
            ram="16 GB DDR4-2933MHz",
            storage="256 GB NVMe SSD + 1 TB SATA HDD",
            gpu="Intel UHD Graphics 630",
            os="Windows 10 Pro 64-bit",
            owner_name="Reception Kiosk",
            department="Operations / Front Desk",
            location="HQ Ground Floor Lobby",
            status="In Use",
            purchase_date="2023-08-10",
            warranty_expiry="2026-08-10",
            notes="Dedicated visitor badge printing and sign-in terminal."
        )

        a4 = Asset.objects.create(
            asset_tag="ICT-WS-001",
            serial_no="8GH21901Q-DELL",
            device_type="Workstation",
            brand_model="Dell Precision 3660 Tower",
            processor="Intel Core i9-13900K @ 3.00GHz (24 Cores, 32 Threads)",
            ram="64 GB DDR5-4800MHz (2x32GB)",
            storage="2 TB Samsung 990 Pro NVMe + 4 TB Seagate Enterprise HDD",
            gpu="NVIDIA RTX A4000 16GB GDDR6",
            os="Windows 11 Pro for Workstations",
            owner_name="Dr. Aris Thorne",
            department="Research & Development",
            location="Tech Lab, Room 108",
            status="In Use",
            purchase_date="2024-01-12",
            warranty_expiry="2027-01-12",
            notes="High compute workstation for 3D modeling and rendering."
        )

        a5 = Asset.objects.create(
            asset_tag="ICT-NB-003",
            serial_no="L3N0CV012-ASUS",
            device_type="Laptop",
            brand_model="Asus ExpertBook B9450",
            processor="Intel Core i7-1165G7 @ 2.80GHz",
            ram="16 GB LPDDR4X",
            storage="1 TB Samsung PCIe NVMe SSD",
            gpu="Intel Iris Xe Graphics",
            os="Windows 11 Pro 64-bit",
            owner_name="Rachel Green",
            department="Legal",
            location="HQ Building A, Level 4, Desk 412",
            status="Under Repair",
            purchase_date="2023-11-05",
            warranty_expiry="2026-11-05",
            notes="Sent to ICT due to screen flickering and swollen touchpad."
        )

        a6 = Asset.objects.create(
            asset_tag="ICT-DT-002",
            serial_no="MJ09A410-LEN",
            device_type="Desktop",
            brand_model="Lenovo ThinkCentre M70q Tiny",
            processor="Intel Core i5-12400T @ 1.80GHz",
            ram="16 GB DDR4-3200MHz",
            storage="512 GB NVMe SSD",
            gpu="Intel UHD Graphics 730",
            os="Windows 11 Pro 64-bit",
            owner_name="Unassigned",
            department="ICT Reserve / Spare Pool",
            location="ICT Storeroom Server Rack C, Shelf 2",
            status="Available / Spare",
            purchase_date="2024-05-18",
            warranty_expiry="2027-05-18",
            notes="Clean image deployed, ready for immediate assignment."
        )

        JobSheet.objects.create(
            job_no="JOB-2025-0089",
            asset=a1,
            issue_description="Laptop shutting down intermittently under load; extreme fan noise reported by user.",
            priority="Medium",
            status="Resolved",
            technician_name="Alex Wong (ICT Support)",
            diagnosis="Heatsink fins clogged with dense dust buildup; factory thermal paste was completely dried out.",
            action_taken="Disassembled chassis, ultrasonically cleaned cooling fan and heatsink. Applied Arctic MX-4 thermal compound. Ran AIDA64 stress test for 60 minutes with max temp peaking at 74C.",
            parts_replaced="Arctic MX-4 thermal paste",
            cost=15.00,
            date_received="2025-11-14",
            date_completed="2025-11-15",
            remarks="Unit returned to user in optimal working condition."
        )

        JobSheet.objects.create(
            job_no="JOB-2026-0004",
            asset=a4,
            issue_description="User requested storage upgrade and secondary high-speed scratch disk for video & photogrammetry pipeline.",
            priority="Low",
            status="Resolved",
            technician_name="Samira Patel (ICT Hardware Lead)",
            diagnosis="Primary OS drive had only 12% free capacity remaining.",
            action_taken="Installed additional 2TB PCIe 4.0 NVMe SSD into M.2 Slot 2. Initialized GPT partition as D: Scratch with BitLocker enabled.",
            parts_replaced="Samsung 990 Pro 2TB NVMe PCIe 4.0 M.2 SSD",
            cost=189.99,
            date_received="2026-02-10",
            date_completed="2026-02-11",
            remarks="User confirmed substantial speed boost in rendering workflow."
        )

        JobSheet.objects.create(
            job_no="JOB-2026-0012",
            asset=a5,
            issue_description="Screen flickering when lid is moved; touchpad is bulging and difficult to click.",
            priority="High",
            status="In Progress",
            technician_name="Alex Wong (ICT Support)",
            diagnosis="Battery cell swelling (safety hazard). Also loose eDP display ribbon cable at motherboard hinge.",
            action_taken="Immediately removed swollen lithium battery and safely quarantined it in battery disposal bin. Ordered OEM Asus 66Wh replacement battery pack. Reseated and taped eDP cable.",
            parts_replaced="Awaiting OEM 66Wh battery (P/N: C41N1908)",
            cost=75.00,
            date_received="2026-09-12",
            date_completed=None,
            remarks="Awaiting courier delivery of replacement battery pack. Estimated arrival 2 business days."
        )

        self.stdout.write(self.style.SUCCESS("Django database successfully populated with ICT assets and job sheets!"))
