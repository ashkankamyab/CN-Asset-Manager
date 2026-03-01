# Development Guide

This guide covers the project structure, development workflow, and how to extend the application.

## Project Structure

```
CN-Asset-Manager/
├── backend/                    # Django application
│   ├── config/                 # Django project (settings, URLs, Celery, WSGI)
│   │   ├── settings.py         # All Django settings
│   │   ├── urls.py             # Root URL patterns
│   │   ├── api_urls.py         # API router
│   │   ├── celery.py           # Celery app configuration
│   │   └── wsgi.py             # WSGI entry point
│   ├── authentication/         # User auth, profiles, OIDC, email, admin API
│   │   ├── models.py           # UserProfile, SiteSettings
│   │   ├── serializers.py      # Auth serializers
│   │   ├── api_views.py        # Login, logout, CSRF, user info
│   │   ├── admin_api_views.py  # User CRUD, settings management
│   │   ├── permissions.py      # IsAdmin, IsAdminOrReadOnly
│   │   ├── oidc.py             # Custom OIDC backend
│   │   ├── email_utils.py      # Multi-provider email sending
│   │   └── signals.py          # Auto-create UserProfile
│   ├── accounts/               # AWS account management
│   │   ├── models.py           # AWSAccount
│   │   ├── serializers.py      # Account serializer
│   │   ├── api_views.py        # Account CRUD, test connection, cost refresh
│   │   └── cost_explorer.py    # AWS Cost Explorer integration
│   ├── discovery/              # AWS resource discovery
│   │   ├── aws_discoverer.py   # AWSResourceDiscoverer class
│   │   ├── celery_tasks.py     # Celery tasks (discovery, cost refresh, scheduler)
│   │   ├── tasks.py            # Discovery job creation helper
│   │   ├── api_views.py        # Discovery job API, trigger endpoint
│   │   └── management/commands/discover_aws.py  # CLI command
│   ├── assets/                 # Asset inventory
│   │   ├── models.py           # Asset, AssetCategory, AssetRelationship, DiscoveryJob
│   │   ├── serializers.py      # List/detail/relationship/bulk serializers
│   │   └── api_views.py        # Asset CRUD, filtering, bulk ops, autocomplete
│   ├── exports/                # Export functionality
│   │   └── views.py            # CSV and Excel export views
│   ├── dashboard/              # Dashboard
│   │   └── api_views.py        # Dashboard statistics aggregation
│   ├── entrypoint.sh           # Docker entrypoint (migrate + gunicorn)
│   ├── requirements.txt        # Python dependencies
│   ├── manage.py               # Django management CLI
│   └── build-info.yml          # Version info (major.minor)
├── frontend/                   # React application
│   ├── src/
│   │   ├── api/                # API service layer (Axios + React Query)
│   │   │   ├── client.ts       # Axios instance with CSRF handling
│   │   │   ├── auth.ts         # Auth hooks
│   │   │   ├── assets.ts       # Asset hooks
│   │   │   ├── accounts.ts     # Account hooks
│   │   │   ├── discovery.ts    # Discovery hooks
│   │   │   ├── dashboard.ts    # Dashboard hook
│   │   │   └── admin.ts        # Admin hooks
│   │   ├── components/         # Shared UI components
│   │   │   ├── AppLayout.tsx   # Main layout (sidebar + content)
│   │   │   ├── Sidebar.tsx     # Navigation sidebar with theme toggle
│   │   │   └── TopNavbar.tsx   # Header with breadcrumbs and user menu
│   │   ├── contexts/           # React Context providers
│   │   │   ├── AuthContext.tsx  # Auth state, role checks, redirect
│   │   │   └── ThemeContext.tsx # Light/dark/system theme
│   │   ├── pages/              # Route page components
│   │   │   ├── LoginPage.tsx
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   ├── ResetPasswordPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── AssetListPage.tsx
│   │   │   ├── AssetDetailPage.tsx
│   │   │   ├── AssetFormPage.tsx
│   │   │   ├── AccountListPage.tsx
│   │   │   ├── AccountFormPage.tsx
│   │   │   ├── DiscoveryJobsPage.tsx
│   │   │   ├── DiscoveryJobDetailPage.tsx
│   │   │   └── AdminPage.tsx
│   │   ├── types/index.ts      # All TypeScript interfaces
│   │   ├── App.tsx             # Router and provider setup
│   │   ├── main.tsx            # React DOM entry point
│   │   └── index.css           # Global styles (Bootstrap + custom)
│   ├── vite.config.ts          # Vite configuration with proxy
│   ├── nginx.conf              # Production Nginx config
│   ├── Dockerfile              # Multi-stage build (Node → Nginx)
│   ├── package.json            # Node dependencies
│   └── build-info.yml          # Version info
├── helm/cn-asset-manager/      # Helm chart
│   ├── Chart.yaml              # Chart metadata + subchart dependencies
│   ├── values.yaml             # Default configuration values
│   └── templates/              # Kubernetes manifests
│       ├── _helpers.tpl        # Template helpers (DATABASE_URL, labels)
│       ├── deployment.yaml     # Single pod with all containers
│       ├── service.yaml        # ClusterIP service
│       ├── ingress.yaml        # Optional ingress
│       ├── configmap-nginx.yaml # Nginx config for Kubernetes
│       ├── secret.yaml         # App secrets
│       ├── pvc-sqlite.yaml     # SQLite PVC (conditional)
│       └── NOTES.txt           # Post-install instructions
├── .github/workflows/          # CI/CD pipelines
│   ├── ci.yml                  # Main CI: path detection → build triggers
│   ├── build-and-push.yml      # Reusable: build + push Docker images
│   └── helm-push.yml           # Reusable: package + push Helm chart
├── docker-compose.yml          # Production Docker Compose
├── Makefile                    # Development shortcuts
├── CLAUDE.md                   # AI assistant context
├── CONTRIBUTING.md             # Contribution guidelines
└── README.md                   # Project overview
```

## Development Workflow

### Running Locally

```bash
make setup          # Install deps + migrate (one-time)
make redis          # Start Redis (Terminal 1)
make run            # Start Django (Terminal 2)
make frontend-dev   # Start Vite (Terminal 3)
make celery         # Start Celery worker (Terminal 4, optional)
```

### Makefile Targets

| Target | Command | Purpose |
|--------|---------|---------|
| `setup` | install + migrate + frontend-install | Full project setup |
| `install` | `pip install -r requirements.txt` | Backend dependencies |
| `migrate` | `python manage.py migrate` | Run migrations |
| `run` | `python manage.py runserver` | Django dev server (port 8000) |
| `shell` | `python manage.py shell` | Django interactive shell |
| `superuser` | `python manage.py createsuperuser` | Create admin user |
| `discover` | `python manage.py discover_aws` | Run CLI discovery |
| `frontend-install` | `npm install` | Frontend dependencies |
| `frontend-dev` | `npm run dev` | Vite dev server (port 5173) |
| `frontend-build` | `npm run build` | Production frontend build |
| `redis` | `docker compose up -d redis` | Start Redis |
| `celery` | `celery -A config worker -l info` | Celery worker |
| `helm-deps` | `helm dependency build` | Download subchart dependencies |
| `helm-lint` | `helm lint` | Lint Helm chart |
| `helm-template` | `helm template` | Render templates (dry-run) |
| `helm-install` | `helm install` | Install to kube context |
| `helm-uninstall` | `helm uninstall` | Uninstall release |

### Creating Migrations

After modifying Django models:

```bash
cd backend && python manage.py makemigrations
cd backend && python manage.py migrate
```

## Adding a New AWS Service Discovery

To add discovery for a new AWS service (e.g., DynamoDB):

### 1. Add the Service Type

In `backend/assets/models.py`, add to `Asset.AWSServiceType`:

```python
class AWSServiceType(models.TextChoices):
    # ... existing types ...
    DYNAMODB = 'DYNAMODB', 'DynamoDB Table'
```

Run `makemigrations` and `migrate`.

### 2. Add the Discovery Method

In `backend/discovery/aws_discoverer.py`, add a new method to `AWSResourceDiscoverer`:

```python
def discover_dynamodb_tables(self, session, region):
    """Discover DynamoDB tables in a region."""
    client = session.client('dynamodb', region_name=region)
    resources = []

    tables = client.list_tables()['TableNames']
    for table_name in tables:
        desc = client.describe_table(TableName=table_name)['Table']
        tags_response = client.list_tags_of_resource(
            ResourceArn=desc['TableArn']
        )

        resources.append({
            'name': table_name,
            'aws_service_type': 'DYNAMODB',
            'aws_resource_id': table_name,
            'aws_resource_arn': desc['TableArn'],
            'aws_region': region,
            'status': 'ACTIVE' if desc['TableStatus'] == 'ACTIVE' else 'UNKNOWN',
            'tags': self._normalize_tags(tags_response.get('Tags', [])),
            'metadata': {
                'item_count': desc.get('ItemCount', 0),
                'table_size_bytes': desc.get('TableSizeBytes', 0),
                'billing_mode': desc.get('BillingModeSummary', {}).get('BillingMode', 'PROVISIONED'),
            },
            'ip_addresses': [],
            'dns_names': [],
        })

    return resources
```

### 3. Register in Discovery Flow

In `discover_all_resources()`, add the new method to the regional discovery list:

```python
regional_services = [
    # ... existing services ...
    self.discover_dynamodb_tables,
]
```

### 4. Add IAM Permission

Add `dynamodb:ListTables`, `dynamodb:DescribeTable`, and `dynamodb:ListTagsOfResource` to the IAM policy in [AWS Permissions](aws-permissions.md).

### 5. Test

```bash
cd backend && python manage.py discover_aws --dry-run
```

## Frontend Patterns

### Adding a New API Hook

In `src/api/`, create or extend a service file:

```typescript
// src/api/myresource.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './client';

export function useMyResources() {
  return useQuery({
    queryKey: ['myresources'],
    queryFn: () => api.get('/myresources/').then(r => r.data),
  });
}

export function useCreateMyResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePayload) => api.post('/myresources/', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['myresources'] }),
  });
}
```

### Adding a New Page

1. Create `src/pages/MyPage.tsx`
2. Add the route in `src/App.tsx`:
   ```tsx
   <Route path="/mypage" element={<MyPage />} />
   ```
3. Add a link in `src/components/Sidebar.tsx`

### API Client

All API calls go through the shared Axios client (`src/api/client.ts`) which:
- Sets base URL to `/api`
- Includes credentials (cookies)
- Adds the CSRF token from cookies to non-safe requests

## CI/CD Pipeline

### Trigger Flow

```
Push to main
  → ci.yml detects changed paths
    → backend/** changed → build-and-push.yml (component=backend)
    → frontend/** changed → build-and-push.yml (component=frontend)
    → helm/** changed → helm-push.yml
```

### Image Versioning

- `build-info.yml` in each component has `major.minor`
- CI appends the GitHub run number as the patch: `{major}.{minor}.{run_number}`
- Images are tagged with both the semver and `latest`
- Multi-arch builds: `linux/amd64` + `linux/arm64`

### Manual Trigger

Use `workflow_dispatch` on GitHub Actions to manually trigger builds. Select which component(s) to build: `frontend`, `backend`, `helm`, or `both`.

### Helm Chart Versioning

The chart version is in `helm/cn-asset-manager/Chart.yaml`. Bump the `version` field before pushing changes to `helm/**` — CI publishes the new version to GHCR automatically.

## Code Conventions

### Backend (Python)

- PEP 8 style
- Environment variables via `os.environ.get()` with defaults
- Database URLs via `dj-database-url`
- Celery tasks in `celery_tasks.py` per app
- Model choices as `TextChoices` enums
- API views as DRF ViewSets or APIViews
- Permissions via custom permission classes

### Frontend (TypeScript)

- Functional components with hooks
- TanStack React Query for all data fetching
- TypeScript strict mode
- Types defined in `src/types/index.ts`
- CSS via Bootstrap 5 classes + custom CSS
- No component library beyond Bootstrap

### Commit Messages

Use concise, descriptive messages prefixed with an action verb:
- `Add` — new feature
- `Fix` — bug fix
- `Update` — enhancement to existing feature
- `Remove` — deleted functionality
- `Refactor` — code restructuring without behavior change

Examples:
```
Add DynamoDB table discovery
Fix dark mode readability on dashboard charts
Update asset list to persist filter state
Remove deprecated API endpoint
Refactor discovery task to use thread pool
```
