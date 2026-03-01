# Architecture

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | Django + Django REST Framework | Python 3.11 |
| Frontend | React + TypeScript | Node 22, Vite 7 |
| Task Queue | Celery + django-celery-beat | — |
| Database | PostgreSQL (default), MySQL, or SQLite | PostgreSQL 16 |
| Cache / Broker | Redis | 7 |
| Web Server | Nginx (frontend) + Gunicorn (backend) | — |
| Charts | Recharts | 3.x |
| CSS | Bootstrap 5 + custom CSS | 5.3 |
| Infrastructure | Docker Compose / Helm (Kubernetes) | — |
| CI/CD | GitHub Actions | — |
| AWS SDK | boto3 | — |

## System Diagram

```
┌─────────────────────────────────────────────────────┐
│                      Browser                         │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                  Nginx (port 80)                     │
│  ┌───────────────┐    ┌───────────────────────────┐ │
│  │ Static files   │    │ Reverse proxy             │ │
│  │ React SPA      │    │ /api/  → backend:8000     │ │
│  │ try_files →    │    │ /admin/ → backend:8000    │ │
│  │   index.html   │    │ /oidc/  → backend:8000    │ │
│  └───────────────┘    │ /assets/export/ → :8000   │ │
│                        └───────────────────────────┘ │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│           Gunicorn (port 8000, 3 workers)            │
│                  Django Application                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │  Auth     │ │ Accounts │ │  Assets  │            │
│  │  app      │ │ app      │ │  app     │            │
│  ├──────────┤ ├──────────┤ ├──────────┤            │
│  │ Discovery │ │ Exports  │ │Dashboard │            │
│  │ app       │ │ app      │ │ app      │            │
│  └──────────┘ └──────────┘ └──────────┘            │
└───────┬─────────────────────────┬───────────────────┘
        │                         │
        ▼                         ▼
┌──────────────┐          ┌──────────────┐
│  PostgreSQL  │          │    Redis     │
│  (port 5432) │          │  (port 6379) │
└──────────────┘          └──────┬───────┘
                                 │
                                 ▼
                  ┌──────────────────────────┐
                  │   Celery Worker           │
                  │   - run_discovery_task    │
                  │   - refresh_costs_task    │
                  ├──────────────────────────┤
                  │   Celery Beat             │
                  │   - check_scheduled_      │
                  │     discovery (hourly)    │
                  └──────────────────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────┐
                  │        AWS APIs           │
                  │  EC2, EKS, RDS, S3, ...  │
                  │  Cost Explorer            │
                  │  STS (cross-account)      │
                  └──────────────────────────┘
```

## Django Apps

The backend is organized into 6 Django apps plus the project configuration:

| App | Purpose |
|-----|---------|
| `config` | Django project settings, root URL routing, Celery configuration, WSGI |
| `authentication` | User auth (local + OIDC), user profiles, roles, site settings, email utilities, admin user management |
| `accounts` | AWS account models, credential management, cost explorer integration |
| `discovery` | AWS resource discoverer, Celery tasks, discovery jobs, management commands |
| `assets` | Asset models, categories, relationships, filtering, API views |
| `exports` | CSV and Excel export views |
| `dashboard` | Dashboard statistics API (aggregations across all models) |

## Frontend Structure

The React frontend follows a feature-based structure:

| Directory | Purpose |
|-----------|---------|
| `src/api/` | API service layer — one file per resource (Axios + React Query hooks) |
| `src/components/` | Shared layout components (AppLayout, Sidebar, TopNavbar) |
| `src/contexts/` | React Context providers (AuthContext, ThemeContext) |
| `src/pages/` | Page components — one per route (12 pages) |
| `src/types/` | TypeScript interfaces for all API responses |

Key patterns:
- **Data fetching**: TanStack React Query with custom hooks per resource
- **Authentication**: Cookie-based sessions with CSRF tokens
- **Routing**: React Router with protected routes and role-based guards
- **Styling**: Bootstrap 5 with custom CSS, dark/light/system theme toggle

## Data Flow

### Discovery Flow

```
User triggers discovery (UI or CLI)
  → DiscoveryJob created (status: PENDING)
  → Celery task queued
  → Worker picks up task (status: RUNNING)
  → AWSResourceDiscoverer.discover_all_resources()
    → Global services: S3, CloudFront, Route53
    → Regional services (5 concurrent threads per region):
        EC2, VPC, EKS, RDS, ElastiCache, ALB/NLB,
        Lambda, ECR, Cognito, OpenSearch, MSK
  → Each resource upserted into Asset table
    → Match by ARN > (resource_id + account + region) > (name + account + service)
    → New assets: discovered_at set, status ACTIVE
    → Existing assets: last_seen_at updated
  → Cost refresh triggered automatically
  → Job completed (status: COMPLETED)
```

### Authentication Flow

```
Login request (username + password)
  → Django session created
  → CSRF cookie set
  → React stores user in AuthContext
  → All API calls include session cookie + X-CSRFToken header

OIDC flow (if enabled via admin UI):
  → Redirect to OIDC provider (authorization endpoint)
  → User authenticates with provider
  → Callback exchanges code for tokens
  → User created/updated from claims (email, name, preferred_username)
  → Manually assigned roles are preserved across logins
  → Session created
```

### Export Flow

```
User applies filters on Asset list page
  → Clicks CSV or Excel export
  → GET /assets/export/{csv,excel}/ with same filter params
  → Server applies filters to queryset
  → Streams file as HTTP response
```

## Celery Tasks

| Task | Schedule | Description |
|------|----------|-------------|
| `run_discovery_task` | On demand | Discovers AWS resources for one or all accounts (30 min time limit) |
| `refresh_costs_task` | After discovery | Fetches current and previous month costs from AWS Cost Explorer (5 min time limit) |
| `check_scheduled_discovery` | Every hour | Checks if automatic discovery is due based on SiteSettings interval |
