# Contributing to CN-Asset-Manager

## Prerequisites

- Python 3.11+
- Node.js 22+
- Docker (for Redis and optional PostgreSQL)
- Helm 3.8+ (for chart development)

## Setup

```bash
# Clone the repo
git clone https://github.com/ashkankamyab/CN-Asset-Manager.git
cd CN-Asset-Manager

# Install dependencies and run migrations
make setup

# Create an admin user
make superuser

# Copy and configure environment variables
cp .env.example .env
```

## Running Locally

Start these in separate terminals:

```bash
make redis          # Redis (Docker)
make run            # Django dev server (port 8000)
make celery         # Celery worker
make frontend-dev   # Vite dev server (port 5173)
```

Open http://localhost:5173.

## Project Structure

```
backend/            Django app (project config in backend/config/)
frontend/           React/Vite app
helm/               Helm chart for Kubernetes
.github/workflows/  CI/CD pipelines
```

## Development Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Test locally
4. Push and open a pull request against `main`

### Backend

```bash
make run             # Start dev server
make migrate         # Run migrations
make shell           # Django shell
```

- Django project config is in `backend/config/`
- Apps live in `backend/` (e.g. `assets`, `discovery`, `accounts`)
- Celery tasks go in each app's `celery_tasks.py`
- Database schema changes require a migration: `cd backend && python manage.py makemigrations`

### Frontend

```bash
make frontend-dev    # Vite dev server with hot reload
make frontend-build  # Production build
```

- Source lives in `frontend/src/`
- API calls use relative paths (`/api/...`) — Vite proxies to Django in dev, Nginx in production

### Helm Chart

```bash
make helm-deps       # Download subchart dependencies
make helm-lint       # Lint
make helm-template   # Dry-run render
```

- Chart source is in `helm/cn-asset-manager/`
- Bump `version` in `Chart.yaml` when making chart changes
- Bitnami subcharts (PostgreSQL, MySQL, Redis) are condition-gated via `values.yaml`

## CI/CD

Pushes to `main` trigger GitHub Actions automatically:

| Path changed | Action |
|-------------|--------|
| `backend/**` | Build and push backend Docker image to GHCR |
| `frontend/**` | Build and push frontend Docker image to GHCR |
| `helm/**` | Package and push Helm chart to GHCR |

You can also trigger builds manually via the Actions tab (`workflow_dispatch`).

**Do not push Docker images or Helm charts locally** — CI handles this with `GITHUB_TOKEN` auth.

## Code Style

### Python (Backend)
- Follow PEP 8
- Use `django-environ` for environment variables (never hardcode secrets)
- Use `dj_database_url` format for `DATABASE_URL`

### TypeScript (Frontend)
- Use functional components with hooks
- Keep API calls in dedicated service files

## Adding a New AWS Service Discovery

1. Add the discovery function in `backend/discovery/services/`
2. Register it in the discovery task flow
3. Add the corresponding asset type if needed
4. Test with `make discover` or via the web UI

## Commit Messages

Use concise, descriptive messages:

```
Add user authentication via OIDC
Fix pagination on assets list page
Update Helm chart persistence defaults
```

Prefix with the nature of the change (Add, Fix, Update, Remove, Refactor).
