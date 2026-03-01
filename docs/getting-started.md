# Getting Started

This guide walks you through setting up CN-Asset-Manager for local development.

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.11+ | Backend runtime |
| Node.js | 22+ | Frontend build |
| Docker | Latest | Redis (and optionally PostgreSQL) |
| Git | Latest | Version control |

Optional:
- **Helm 3.8+** — only needed if working on the Helm chart
- **kubectl** — only needed for Kubernetes deployment

## Quick Setup

```bash
# Clone the repository
git clone https://github.com/ashkankamyab/CN-Asset-Manager.git
cd CN-Asset-Manager

# Install dependencies and run migrations (uses SQLite by default)
make setup

# Create a superuser for the Django admin
make superuser
```

`make setup` runs three commands:
1. `pip install -r requirements.txt` (backend dependencies)
2. `python manage.py migrate` (database migrations — creates a default superadmin user)
3. `npm install` (frontend dependencies)

## Running the Application

You need three terminal windows (four if using Celery):

### Terminal 1 — Redis
```bash
make redis
```
Starts Redis via Docker Compose on port 6379. Required for Celery task processing.

### Terminal 2 — Backend
```bash
make run
```
Starts the Django development server on `http://localhost:8000`.

### Terminal 3 — Frontend
```bash
make frontend-dev
```
Starts the Vite development server on `http://localhost:5173`. The Vite dev server proxies API calls to the backend automatically.

### Terminal 4 — Celery Worker (optional)
```bash
make celery
```
Starts the Celery worker for async task processing (discovery, cost refresh). Only needed if you want to run AWS discovery.

## First Login

Open `http://localhost:5173` in your browser.

The initial migration creates a default admin user:

| Field | Value |
|-------|-------|
| Username | `superadmin` |
| Password | `changeme` |

**Change this password immediately** after first login via the Django admin at `http://localhost:8000/admin/`.

## First Discovery Run

1. **Add an AWS account** — go to AWS Accounts and click "Add Account"
   - Enter the 12-digit AWS account ID and a name
   - Choose account type: Management (has credentials) or Member (uses cross-account role)
   - For a Management account, provide AWS access key and secret key
   - Select the regions to discover (defaults are `eu-central-1` and `us-east-1`)

2. **Test the connection** — click "Test Connection" on the account row to verify credentials

3. **Run discovery** — click "Run Discovery" on the Discovery page
   - You can discover a single account or all accounts at once
   - Discovery runs as a background Celery task

4. **View results** — go to the Dashboard or Assets page to see discovered resources

## Using PostgreSQL Instead of SQLite

By default, the backend uses SQLite for simplicity. To use PostgreSQL locally:

1. Start PostgreSQL via Docker Compose:
   ```bash
   docker compose up -d postgres
   ```

2. Set the `DATABASE_URL` environment variable:
   ```bash
   export DATABASE_URL=postgres://cn_assets:change-me@localhost:5432/cn_assets
   ```

3. Run migrations:
   ```bash
   make migrate
   ```

## Environment Variables

Create a `.env` file in the project root for local configuration. See the [Configuration](configuration.md) guide for all available variables.

Minimal `.env` for local development:
```bash
SECRET_KEY=your-random-secret-key
DEBUG=True
```

## Next Steps

- [Configuration](configuration.md) — all environment variables and runtime settings
- [AWS Permissions](aws-permissions.md) — IAM policy required for discovery
- [User Guide: Accounts](user-guide/accounts.md) — detailed account setup
- [User Guide: Discovery](user-guide/discovery.md) — discovery options and scheduling
