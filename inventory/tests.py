from django.test import TestCase, Client
from .models import Asset, JobSheet


class InventoryModelAndApiTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.asset = Asset.objects.create(
            end_user="Stephen C. Maybanting",
            device="Desktop",
            brand_model="HP Pro 3330MT",
            serial_number="SGH303QPNH",
            computer_name="ODE-ICTS-DT01",
            monitor_serial="HP V203p",
            ups_serial="APC Back-UPS 650VA",
            office="ODE-ICTS",
            status="In Use"
        )
        self.job = JobSheet.objects.create(
            ref_no="2026-09-001",
            asset=self.asset,
            full_name="Stephen C. Maybanting",
            section_division="ODE-ICTS",
            date_of_filing="2026-09-14",
            incident_description="Computer fan spinning at maximum speed",
            status="Open",
            priority="High",
            fulfilled_by="Engr. J. Dela Cruz"
        )

    def test_portal_home_page(self):
        res = self.client.get('/')
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, "DPWH")

    def test_stats_api(self):
        res = self.client.get('/api/stats/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['total_assets'], 1)
        self.assertEqual(data['total_jobs'], 1)
        self.assertEqual(data['in_use'], 1)

    def test_assets_api_list_and_search(self):
        res = self.client.get('/api/assets/?search=SGH303QPNH')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['end_user'], "Stephen C. Maybanting")
        self.assertEqual(data[0]['serial_number'], "SGH303QPNH")

    def test_create_asset_api(self):
        payload = {
            "end_user": "Vanessa G. Gamil",
            "device": "Desktop",
            "brand_model": "HP EliteDesk 800 G3",
            "serial_number": "SGH735PWSW",
            "computer_name": "ODE-ICTS-DT02",
            "monitor_serial": "HP EliteDisplay E233",
            "ups_serial": "APC 650VA",
            "office": "ODE-ICTS",
            "status": "In Use"
        }
        res = self.client.post('/api/assets/', data=payload, content_type='application/json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Asset.objects.filter(serial_number="SGH735PWSW").count(), 1)

    def test_create_job_sheet_api(self):
        payload = {
            "asset_id": self.asset.id,
            "incident_description": "Cannot connect to network shared drive",
            "priority": "Medium",
            "status": "In Progress",
            "mode_of_filing": "Walk-in"
        }
        res = self.client.post('/api/jobs/', data=payload, content_type='application/json')
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertIn("ref_no", data)
        # Verify asset was set to Under Repair
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, "Under Repair")

    def test_csv_export(self):
        res = self.client.get('/api/assets/export/csv/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res['Content-Type'].startswith('text/csv'))
        self.assertIn("𝗘𝗡𝗗-𝗨𝗦𝗘𝗥".encode('utf-8'), res.content)
