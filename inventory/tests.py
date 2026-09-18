from django.test import TestCase, Client
from django.urls import reverse
from .models import Asset, JobSheet


class InventoryModelAndApiTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.asset = Asset.objects.create(
            asset_tag="ICT-NB-001",
            serial_no="5CD2048XYZ",
            device_type="Laptop",
            brand_model="Dell Latitude 5420",
            processor="Intel Core i7-1185G7",
            ram="16 GB",
            storage="512 GB SSD",
            owner_name="Alice Smith",
            department="Finance",
            status="In Use"
        )
        self.job = JobSheet.objects.create(
            job_no="JOB-2026-0001",
            asset=self.asset,
            issue_description="Fan rattling noise",
            priority="Medium",
            status="Open",
            technician_name="Alex Wong"
        )

    def test_portal_home_page(self):
        res = self.client.get('/')
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, "ICT Operations")

    def test_stats_api(self):
        res = self.client.get('/api/stats/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['total_assets'], 1)
        self.assertEqual(data['total_jobs'], 1)
        self.assertEqual(data['in_use'], 1)

    def test_assets_api_list_and_search(self):
        res = self.client.get('/api/assets/?search=5CD2048XYZ')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['asset_tag'], "ICT-NB-001")

    def test_create_asset_api(self):
        payload = {
            "asset_tag": "ICT-DT-100",
            "serial_no": "SN-100200",
            "device_type": "Desktop",
            "brand_model": "HP ProDesk",
            "owner_name": "Bob",
            "department": "HR"
        }
        res = self.client.post('/api/assets/', data=payload, content_type='application/json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Asset.objects.filter(asset_tag="ICT-DT-100").count(), 1)

    def test_create_job_sheet_api(self):
        payload = {
            "asset_id": self.asset.id,
            "issue_description": "Upgrade to 32GB RAM",
            "priority": "Low",
            "status": "In Progress"
        }
        res = self.client.post('/api/jobs/', data=payload, content_type='application/json')
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertTrue(data['job_no'].startswith("JOB-"))
        # Verify asset was automatically marked Under Repair
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, "Under Repair")

    def test_csv_export(self):
        res = self.client.get('/api/assets/export/csv/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res['Content-Type'], 'text/csv')
        self.assertIn(b"Asset Tag,Serial No", res.content)
