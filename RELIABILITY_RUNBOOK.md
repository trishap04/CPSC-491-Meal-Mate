# Meal Mate Reliability Runbook

This project now includes the core pieces for Objective 4.2 reliability work:

- Transactional donation writes so a failed item cannot leave partial donation data behind.
- Frontend retry logic for REST requests in the donation flow.
- A reusable resilient WebSocket helper with exponential reconnect backoff.
- A timestamped database backup command for offsite-style storage.

## Create a backup

From the `backend` directory:

```bash
python manage.py backup_database
```

By default, backups are written to:

```text
backend/backups/offsite/
```

To send backups to a different mounted directory, set:

```bash
export MEAL_MATE_BACKUP_DIR="/path/to/offsite/location"
```

Then rerun:

```bash
python manage.py backup_database
```

Each run creates:

- A copied SQLite database file named `meal_mate_backup_<timestamp>.sqlite3`
- A JSON manifest with the same timestamp for audit and recovery tracking

## Restore from backup

1. Stop the Django server.
2. Copy the desired backup file over `backend/db.sqlite3`.
3. Start the server again.
4. Verify donation records and login flows in the app.

## REST retry coverage

The shared [network.js](/Users/suhaibaffaneh/Desktop/CPSC-491-Meal-Mate/BaseSite/album/network.js) helper retries transient failures for:

- Category loading
- Food list loading
- Food search
- Donation submission
- Donation confirmation lookup

## WebSocket reconnect coverage

If a page defines `window.MEAL_MATE_WS_URL`, the checkout flow can create a reconnecting WebSocket client with exponential backoff. This keeps future chat or realtime donation updates from silently disconnecting on temporary network loss.

## Verification

Run backend tests from `backend`:

```bash
python manage.py test users
```
