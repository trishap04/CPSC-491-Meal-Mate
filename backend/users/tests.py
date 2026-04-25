import sqlite3
import json
from pathlib import Path
from tempfile import TemporaryDirectory

from django.conf import settings
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import Donation, DonationItem, Food, FoodCategory


class DonationReliabilityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = FoodCategory.objects.create(name='canned')
        self.food = Food.objects.create(name='Beans', category=self.category)

    def test_creates_donation_and_items_in_one_request(self):
        response = self.client.post(
            '/api/users/api/donations/',
            {
                'first_name': 'Suhaib',
                'last_name': 'Affaneh',
                'email': 'suhaib@example.com',
                'phone': '555-000-1111',
                'address': '123 Meal Mate Lane',
                'pickup_date': '2026-04-26',
                'pickup_time': '10:00 AM',
                'door_preference': 'meet',
                'items': [
                    {
                        'food_id': self.food.id,
                        'quantity': 3,
                        'unit': 'cans',
                    }
                ],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Donation.objects.count(), 1)
        self.assertEqual(DonationItem.objects.count(), 1)
        self.assertEqual(response.data['items'][0]['food']['name'], 'Beans')
        self.assertEqual(response.data['address'], '123 Meal Mate Lane')

    def test_invalid_item_rolls_back_entire_donation(self):
        response = self.client.post(
            '/api/users/api/donations/',
            {
                'first_name': 'Suhaib',
                'last_name': 'Affaneh',
                'email': 'suhaib@example.com',
                'phone': '555-000-1111',
                'address': '123 Meal Mate Lane',
                'pickup_date': '2026-04-26',
                'pickup_time': '10:00 AM',
                'door_preference': 'meet',
                'items': [
                    {
                        'food_id': 999999,
                        'quantity': 3,
                        'unit': 'cans',
                    }
                ],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Donation.objects.count(), 0)
        self.assertEqual(DonationItem.objects.count(), 0)

    def test_requires_address_and_at_least_one_item(self):
        response = self.client.post(
            '/api/users/api/donations/',
            {
                'first_name': 'Suhaib',
                'last_name': 'Affaneh',
                'email': 'suhaib@example.com',
                'phone': '555-000-1111',
                'pickup_date': '2026-04-26',
                'pickup_time': '10:00 AM',
                'door_preference': 'meet',
                'items': [],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Donation.objects.count(), 0)
        self.assertIn('items', str(response.data['error']))


class BackupCommandTests(TestCase):
    def test_backup_command_creates_copy_and_manifest(self):
        with TemporaryDirectory() as temp_dir:
            source_db = Path(temp_dir) / 'source.sqlite3'
            sqlite3.connect(source_db).close()

            with override_settings(
                BACKUP_STORAGE_DIR=temp_dir,
                DATABASES={
                    **settings.DATABASES,
                    'default': {
                        **settings.DATABASES['default'],
                        'NAME': str(source_db),
                    },
                },
            ):
                call_command('backup_database')

                backup_files = list(Path(temp_dir).glob('meal_mate_backup_*.sqlite3'))
                manifest_files = list(Path(temp_dir).glob('meal_mate_backup_*.json'))

                self.assertTrue(backup_files)
                self.assertTrue(manifest_files)
                self.assertTrue(backup_files[0].exists())

                manifest = json.loads(manifest_files[0].read_text())
                self.assertEqual(manifest['backup_path'], str(backup_files[0]))

    def test_backup_command_uses_database_file_from_settings(self):
        with TemporaryDirectory() as temp_dir:
            source_db = Path(temp_dir) / 'source.sqlite3'
            sqlite3.connect(source_db).close()

            with override_settings(
                DATABASES={
                    **settings.DATABASES,
                    'default': {
                        **settings.DATABASES['default'],
                        'NAME': str(source_db),
                    },
                },
            ):
                self.assertTrue(Path(settings.DATABASES['default']['NAME']).exists())
