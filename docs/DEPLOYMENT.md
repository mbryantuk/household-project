# Deployment & Infrastructure Playbook

This guide covers the procedures for deploying, maintaining, and recovering the Hearthstone ecosystem.

---

## 1. Production Deployment (Docker Compose)

The primary deployment mechanism is **Docker Compose**. This ensures that the Node.js API, PostgreSQL Registry, and Redis Cache are version-pinned and correctly networked.

### Steps to Deploy

1. **Update Code:** Pull the latest stable branch.
2. **Build & Restart:**
   ```bash
   ./scripts/deploy/deploy_verify.sh "Release comment"
   ```
   _This script handles the `docker compose up --build`, executes migrations, and triggers the verification suite._

---

## 2. Infrastructure Components

| Component       | Image                | Purpose                                | Persistence                       |
| :-------------- | :------------------- | :------------------------------------- | :-------------------------------- |
| **API Server**  | `node:22-slim`       | Express API, Socket.io, BullMQ Workers | `/app/server/data` (SQLite files) |
| **Registry DB** | `postgres:16-alpine` | Global Users, Tenancy, Sessions        | `postgres_data` volume            |
| **Cache/Queue** | `redis:7-alpine`     | Rate limiting, Job Queue state         | Ephemeral (Non-critical)          |

---

## 3. Backup & Disaster Recovery

### Global Registry (PostgreSQL)

The global registry should be backed up using `pg_dump`.

- **Frequency:** Nightly.
- **Retention:** 30 days.

### Tenant Data (SQLite)

Hearthstone includes native backup logic in `server/services/backup.js`.

- **Nightly Suite:** Automatically triggers a ZIP export of every active household `.db` file.
- **Location:** `/backups/household-{id}-{timestamp}.zip`.
- **Restoration:** Simply place the unzipped `.db` file back into `/server/data/` and restart the API.

---

## 4. Rollback Procedures

### Application Rollback

If a deployment fails verification:

1. **Revert Git:** `git checkout [previous-tag]`
2. **Re-deploy:** Run the deployment script.
3. **Database:** Drizzle migrations are forward-only. If a schema change was destructive, restore the Postgres volume from the latest `pg_dump`.

---

## 5. Maintenance Mode

To prevent data corruption during major migrations:

1. Create a lock file: `touch server/data/upgrading.lock`.
2. The API will return `503 Service Unavailable` for all non-admin registration/login attempts.
3. Remove the file once migrations are verified.
