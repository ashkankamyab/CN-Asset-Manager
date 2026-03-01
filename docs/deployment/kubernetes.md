# Kubernetes Deployment (Helm Chart)

CN-Asset-Manager provides a Helm chart for Kubernetes deployment, published as an OCI artifact to GitHub Container Registry.

## Architecture

The chart deploys a **single-pod** architecture with all application containers as sidecars:

```
┌─ Pod ──────────────────────────────────────────────┐
│                                                     │
│  Init Container: migrate                            │
│    └─ python manage.py migrate --noinput            │
│                                                     │
│  ┌─────────────┐  ┌─────────────┐                  │
│  │   frontend   │  │   backend   │                  │
│  │ Nginx :80    │  │ Gunicorn    │                  │
│  │              │──│ :8000       │                  │
│  │ Proxies /api │  │ (3 workers) │                  │
│  │ to 127.0.0.1 │  │             │                  │
│  └─────────────┘  └─────────────┘                  │
│                                                     │
│  ┌─────────────┐  ┌─────────────┐                  │
│  │   celery     │  │ celery-beat │                  │
│  │   worker     │  │  scheduler  │                  │
│  └─────────────┘  └─────────────┘                  │
│                                                     │
└─────────────────────────────────────────────────────┘
          │                    │
          ▼                    ▼
  ┌──────────────┐    ┌──────────────┐
  │  PostgreSQL  │    │    Redis     │
  │  (subchart)  │    │  (subchart)  │
  └──────────────┘    └──────────────┘
```

- The **init container** runs migrations before any application container starts
- **Nginx** proxies `/api/`, `/admin/`, `/oidc/`, and `/assets/export/` to `127.0.0.1:8000` (same pod)
- **Celery Beat** uses `django_celery_beat.schedulers:DatabaseScheduler` for persistent schedules
- **PostgreSQL** and **Redis** are deployed as Bitnami subcharts by default

## Install

### Default (Internal PostgreSQL + Redis)

```bash
helm install cn oci://ghcr.io/ashkankamyab/cn-asset-manager/cn-asset-manager \
  --version 0.1.0 \
  --set app.secretKey="your-secret-key"
```

This deploys everything out of the box: internal PostgreSQL, internal Redis, and the application.

### External Database + Redis

```bash
helm install cn oci://ghcr.io/ashkankamyab/cn-asset-manager/cn-asset-manager \
  --version 0.1.0 \
  --set app.secretKey="your-secret-key" \
  --set postgresql.enabled=false \
  --set database.internal=false \
  --set database.external.host=mydb.example.com \
  --set database.external.port=5432 \
  --set database.external.name=cn_asset_manager \
  --set database.external.user=cn_user \
  --set database.external.password=secret \
  --set redis.enabled=false \
  --set redis.internal=false \
  --set redis.external.url=redis://myredis:6379/0
```

### SQLite (Single-Node Development)

```bash
helm install cn oci://ghcr.io/ashkankamyab/cn-asset-manager/cn-asset-manager \
  --version 0.1.0 \
  --set app.secretKey="your-secret-key" \
  --set postgresql.enabled=false \
  --set database.type=sqlite \
  --set database.internal=false
```

SQLite uses a PersistentVolumeClaim for data persistence.

## Values Reference

### Application Settings

| Value | Type | Default | Description |
|-------|------|---------|-------------|
| `replicaCount` | int | `1` | Number of pod replicas. |
| `app.secretKey` | string | `change-me` | Django `SECRET_KEY`. **Must be changed.** |
| `app.debug` | string | `"False"` | Django `DEBUG` setting. |
| `app.allowedHosts` | string | `"*"` | Django `ALLOWED_HOSTS`. |
| `app.csrfTrustedOrigins` | string | `""` | CSRF trusted origins (comma-separated). |
| `app.corsAllowedOrigins` | string | `""` | CORS allowed origins (comma-separated). |

### Images

| Value | Type | Default | Description |
|-------|------|---------|-------------|
| `image.backend.repository` | string | `ghcr.io/ashkankamyab/cn-asset-manager/backend` | Backend image. |
| `image.backend.tag` | string | `latest` | Backend image tag. |
| `image.frontend.repository` | string | `ghcr.io/ashkankamyab/cn-asset-manager/frontend` | Frontend image. |
| `image.frontend.tag` | string | `latest` | Frontend image tag. |
| `image.pullPolicy` | string | `IfNotPresent` | Image pull policy. |

### Database

| Value | Type | Default | Description |
|-------|------|---------|-------------|
| `database.type` | string | `postgres` | Database engine: `postgres`, `mysql`, or `sqlite`. |
| `database.internal` | bool | `true` | Use Bitnami subchart (`true`) or external database (`false`). |
| `database.external.host` | string | `""` | External database hostname. |
| `database.external.port` | string | `""` | External database port. |
| `database.external.name` | string | `cn_asset_manager` | External database name. |
| `database.external.user` | string | `cn_user` | External database username. |
| `database.external.password` | string | `""` | External database password. |
| `database.sqlite.storageClass` | string | `""` | Storage class for SQLite PVC. Empty = cluster default. |
| `database.sqlite.size` | string | `1Gi` | SQLite PVC size. |

### PostgreSQL Subchart (Bitnami)

| Value | Type | Default | Description |
|-------|------|---------|-------------|
| `postgresql.enabled` | bool | `true` | Deploy PostgreSQL subchart. |
| `postgresql.auth.database` | string | `cn_asset_manager` | Database name. |
| `postgresql.auth.username` | string | `cn_user` | Database user. |
| `postgresql.auth.password` | string | `cn_pass` | Database password. |
| `postgresql.primary.persistence.enabled` | bool | `true` | Enable persistence. |
| `postgresql.primary.persistence.storageClass` | string | `""` | Storage class. Empty = cluster default. |
| `postgresql.primary.persistence.size` | string | `8Gi` | PVC size. |

### MySQL Subchart (Bitnami)

| Value | Type | Default | Description |
|-------|------|---------|-------------|
| `mysql.enabled` | bool | `false` | Deploy MySQL subchart. |
| `mysql.auth.database` | string | `cn_asset_manager` | Database name. |
| `mysql.auth.username` | string | `cn_user` | Database user. |
| `mysql.auth.password` | string | `cn_pass` | Database password. |
| `mysql.primary.persistence.enabled` | bool | `true` | Enable persistence. |
| `mysql.primary.persistence.storageClass` | string | `""` | Storage class. Empty = cluster default. |
| `mysql.primary.persistence.size` | string | `8Gi` | PVC size. |

> **Note:** MySQL support requires `mysqlclient` to be added to `backend/requirements.txt` and a custom backend image to be built.

### Redis

| Value | Type | Default | Description |
|-------|------|---------|-------------|
| `redis.enabled` | bool | `true` | Deploy Redis subchart. |
| `redis.internal` | bool | `true` | Use subchart (`true`) or external Redis (`false`). |
| `redis.external.url` | string | `""` | External Redis URL (e.g., `redis://host:6379/0`). |
| `redis.architecture` | string | `standalone` | Redis architecture. |
| `redis.auth.enabled` | bool | `false` | Enable Redis authentication. |
| `redis.master.persistence.enabled` | bool | `true` | Enable persistence. |
| `redis.master.persistence.storageClass` | string | `""` | Storage class. Empty = cluster default. |
| `redis.master.persistence.size` | string | `2Gi` | PVC size. |

### Ingress

| Value | Type | Default | Description |
|-------|------|---------|-------------|
| `ingress.enabled` | bool | `true` | Create Ingress resource. |
| `ingress.className` | string | `nginx` | Ingress class name. |
| `ingress.host` | string | `cn-asset-manager.local` | Hostname for the ingress. |
| `ingress.tls` | list | `[]` | TLS configuration (see example below). |
| `ingress.annotations` | map | `{}` | Additional ingress annotations. |

**TLS example with cert-manager:**
```yaml
ingress:
  tls:
    - secretName: cn-asset-manager-tls
      hosts:
        - cn-asset-manager.example.com
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
```

### Service

| Value | Type | Default | Description |
|-------|------|---------|-------------|
| `service.type` | string | `ClusterIP` | Service type. |
| `service.port` | int | `80` | Service port. |

### Resource Limits

| Value | Type | Default | Description |
|-------|------|---------|-------------|
| `resources.backend` | map | `{}` | Backend container resources. |
| `resources.frontend` | map | `{}` | Frontend container resources. |
| `resources.celery` | map | `{}` | Celery worker resources. |
| `resources.celeryBeat` | map | `{}` | Celery beat resources. |

**Example:**
```yaml
resources:
  backend:
    requests:
      cpu: 250m
      memory: 256Mi
    limits:
      cpu: "1"
      memory: 512Mi
```

## Database Options Matrix

| `database.type` | `database.internal` | `postgresql.enabled` | Result |
|-----------------|--------------------|--------------------|--------|
| `postgres` | `true` | `true` | Bitnami PostgreSQL subchart (default) |
| `postgres` | `false` | `false` | External PostgreSQL |
| `mysql` | `true` | — | Bitnami MySQL subchart (requires custom image) |
| `mysql` | `false` | — | External MySQL |
| `sqlite` | `false` | `false` | PVC-backed SQLite |

## Health Checks

| Container | Probe | Type | Path/Port | Initial Delay | Period |
|-----------|-------|------|-----------|---------------|--------|
| backend | Liveness | TCP | :8000 | 10s | 15s |
| backend | Readiness | TCP | :8000 | 5s | 10s |
| frontend | Liveness | HTTP GET | /:80 | 5s | 15s |
| frontend | Readiness | HTTP GET | /:80 | 3s | 10s |

## Upgrading

```bash
helm upgrade cn oci://ghcr.io/ashkankamyab/cn-asset-manager/cn-asset-manager \
  --version 0.2.0 \
  --reuse-values
```

The init container will automatically run any pending migrations during the upgrade.

## Uninstall

```bash
helm uninstall cn
```

> **Note:** This does not delete PersistentVolumeClaims. To remove all data, delete the PVCs manually:
> ```bash
> kubectl delete pvc -l app.kubernetes.io/instance=cn
> ```

## Local Development with Helm

```bash
# Download subchart dependencies
make helm-deps

# Lint the chart
make helm-lint

# Render templates locally (dry-run)
make helm-template

# Install to current kube context
make helm-install

# Uninstall
make helm-uninstall
```
