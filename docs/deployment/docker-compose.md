# Docker Compose Deployment

This guide covers deploying CN-Asset-Manager with Docker Compose using pre-built images from GitHub Container Registry (GHCR).

## Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `frontend` | `ghcr.io/ashkankamyab/cn-asset-manager/frontend:latest` | 80 | Nginx serving React SPA + reverse proxy |
| `backend` | `ghcr.io/ashkankamyab/cn-asset-manager/backend:latest` | 8000 | Django + Gunicorn API server |
| `celery` | `ghcr.io/ashkankamyab/cn-asset-manager/backend:latest` | — | Celery async task worker |
| `celery-beat` | `ghcr.io/ashkankamyab/cn-asset-manager/backend:latest` | — | Celery beat scheduler |
| `postgres` | `postgres:16-alpine` | 5432 | PostgreSQL database |
| `redis` | `redis:7-alpine` | 6379 | Redis message broker |

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/ashkankamyab/CN-Asset-Manager.git
   cd CN-Asset-Manager
   ```

2. Create a `.env` file:
   ```bash
   SECRET_KEY=your-random-secret-key-here
   DEBUG=False
   ALLOWED_HOSTS=your-domain.com,localhost
   CORS_ALLOWED_ORIGINS=https://your-domain.com
   CSRF_TRUSTED_ORIGINS=https://your-domain.com
   ```

3. Start all services:
   ```bash
   docker compose up -d
   ```

4. Access the application at `http://localhost` (port 80).

## Environment Variables

The `.env` file is loaded by the backend, celery, and celery-beat services. The following variables are set automatically by Docker Compose and do **not** need to be in your `.env`:

| Variable | Set By | Value |
|----------|--------|-------|
| `DATABASE_URL` | docker-compose.yml | `postgres://cn_assets:change-me@postgres:5432/cn_assets` |
| `CELERY_BROKER_URL` | docker-compose.yml | `redis://redis:6379/0` |

### PostgreSQL Credentials

The PostgreSQL service uses these defaults (override via `.env`):

| Variable | Default |
|----------|---------|
| `POSTGRES_DB` | `cn_assets` |
| `POSTGRES_USER` | `cn_assets` |
| `POSTGRES_PASSWORD` | `change-me` |

**Change `POSTGRES_PASSWORD` for production.**

## Volumes

| Volume | Service | Mount Point | Purpose |
|--------|---------|-------------|---------|
| `postgres-data` | postgres | `/var/lib/postgresql/data` | Database persistence |
| `redis-data` | redis | `/data` | Redis persistence |

## Startup Order

Docker Compose manages service dependencies:

```
postgres (healthcheck: pg_isready) ─┐
redis (service_started) ────────────┤
                                    ▼
                                 backend (runs migrations on start)
                                    │
                          ┌─────────┼─────────┐
                          ▼         ▼         ▼
                       celery  celery-beat  frontend
```

The backend's `entrypoint.sh` automatically runs Django migrations before starting Gunicorn. The Celery worker and beat scheduler start after the backend is up.

## Operations

### Update to Latest Images

When new images are pushed by CI:

```bash
docker compose pull
docker compose down
docker compose up -d
```

Or update a single service:

```bash
docker compose pull backend
docker compose up -d backend celery celery-beat
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f celery
```

### Restart a Service

```bash
docker compose restart backend
```

### Run a Django Management Command

```bash
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py discover_aws
```

### Database Backup

```bash
docker compose exec postgres pg_dump -U cn_assets cn_assets > backup.sql
```

### Database Restore

```bash
docker compose exec -T postgres psql -U cn_assets cn_assets < backup.sql
```

## Production Considerations

### Secrets

- Set a strong `SECRET_KEY` (use `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`)
- Change `POSTGRES_PASSWORD` from the default
- Never set `DEBUG=True` in production

### TLS / HTTPS

The default setup serves HTTP on port 80. For production, place a reverse proxy (e.g., Caddy, Traefik, or an external load balancer) in front of the frontend service to handle TLS termination.

When using HTTPS, update:
- `CSRF_TRUSTED_ORIGINS=https://your-domain.com`
- `CORS_ALLOWED_ORIGINS=https://your-domain.com`

### Resource Limits

You can add resource constraints in `docker-compose.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
```

### Exposing Ports

By default, PostgreSQL (5432) and Redis (6379) are exposed to the host. In production, remove the port mappings if external access is not needed:

```yaml
services:
  postgres:
    # Remove: ports: ["5432:5432"]
  redis:
    # Remove: ports: ["6379:6379"]
```

## Troubleshooting

### Frontend Returns 502 Bad Gateway

The frontend Nginx container tries to proxy to the backend. If the backend is still starting, Nginx may fail. Wait a moment and retry, or restart the frontend:

```bash
docker compose restart frontend
```

### Celery Tasks Not Running

Check that Redis is reachable and the Celery worker is running:

```bash
docker compose logs celery
docker compose exec backend python -c "from config.celery import app; print(app.control.ping())"
```

### Database Connection Errors

Verify PostgreSQL is healthy:

```bash
docker compose exec postgres pg_isready -U cn_assets
```
