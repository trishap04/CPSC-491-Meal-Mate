import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Create a timestamped SQLite backup and manifest in the configured offsite backup directory.'

    def handle(self, *args, **options):
        database_name = settings.DATABASES['default']['NAME']
        database_path = Path(database_name)

        if not database_path.exists():
            raise CommandError(f'Database file not found: {database_path}')

        backup_dir = Path(getattr(settings, 'BACKUP_STORAGE_DIR', settings.BASE_DIR / 'backups' / 'offsite'))
        backup_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        backup_filename = f'meal_mate_backup_{timestamp}.sqlite3'
        manifest_filename = f'meal_mate_backup_{timestamp}.json'

        backup_path = backup_dir / backup_filename
        manifest_path = backup_dir / manifest_filename

        shutil.copy2(database_path, backup_path)

        manifest = {
            'created_at': timestamp,
            'database_path': str(database_path),
            'backup_path': str(backup_path),
            'size_bytes': backup_path.stat().st_size,
        }
        manifest_path.write_text(json.dumps(manifest, indent=2))

        self.stdout.write(self.style.SUCCESS(f'Backup created: {backup_path}'))
        self.stdout.write(self.style.SUCCESS(f'Manifest created: {manifest_path}'))
