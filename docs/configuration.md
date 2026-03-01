# Configuration

CN-Asset-Manager is configured through environment variables (set at startup) and runtime Site Settings (configured via the admin UI).

## Environment Variables

### Core Django

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SECRET_KEY` | string | `insecure-...` | Django secret key. **Must be changed in production.** |
| `DEBUG` | bool | `False` | Enable Django debug mode. Never `True` in production. |
| `ALLOWED_HOSTS` | comma-separated | `localhost,127.0.0.1` | Hostnames the server will respond to. |

### Database

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DATABASE_URL` | string | `sqlite:///backend/db/cn_assets.db` | Database connection URL. Supports PostgreSQL, MySQL, and SQLite via `dj-database-url` format. |

**Examples:**
```bash
# PostgreSQL
DATABASE_URL=postgres://user:pass@localhost:5432/cn_assets

# MySQL
DATABASE_URL=mysql://user:pass@localhost:3306/cn_assets

# SQLite (default)
DATABASE_URL=sqlite:///path/to/db.sqlite3
```

### Celery / Redis

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `CELERY_BROKER_URL` | string | `redis://localhost:6379/0` | Redis URL for Celery message broker. |

### AWS

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `AWS_DEFAULT_REGION` | string | `eu-central-1` | Default AWS region for API calls. |
| `DISCOVERY_REGIONS` | comma-separated | `eu-central-1,us-east-1` | Regions to scan during discovery. Can be overridden per account. |
| `DISCOVERY_CONCURRENT_REGIONS` | int | `5` | Max concurrent threads for regional discovery. |
| `DISCOVERY_BATCH_SIZE` | int | `100` | Batch size for bulk operations. |

### CORS / CSRF

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `CORS_ALLOWED_ORIGINS` | comma-separated | `http://localhost:5173,http://127.0.0.1:5173` | Origins allowed for cross-origin requests. |
| `CSRF_TRUSTED_ORIGINS` | comma-separated | Same as CORS | Origins trusted for CSRF validation. |

## Runtime Site Settings

These settings are managed through the admin UI at **Settings** (admin users only) and stored in the database. They can be changed at runtime without restarting the application.

### General

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Session Timeout | minutes | `480` (8 hours) | Session expiry time. |
| Discovery Interval | choice | `disabled` | Automatic discovery schedule: `disabled`, `daily`, `weekly`, or `monthly`. |

### OIDC (OpenID Connect)

All OIDC settings are configured via the admin UI (**Settings > OIDC**) and stored in the database. No environment variables are needed. Changes take effect immediately without restarting the application.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Enable OIDC | toggle | off | Enable/disable OIDC authentication. When enabled, a "Sign in with OIDC" button appears on the login page. |
| Client ID | string | — | Application (client) ID from your identity provider. |
| Client Secret | string | — | Client secret from your identity provider. |
| Authority URL | URL | — | Base URL of the OIDC provider (e.g., `https://login.microsoftonline.com/{tenant}/v2.0`). |
| Authorization Endpoint | URL | — | Provider's OAuth 2.0 authorization endpoint. |
| Token Endpoint | URL | — | Provider's OAuth 2.0 token endpoint. |
| User Info Endpoint | URL | — | Provider's userinfo endpoint. |
| JWKS Endpoint | URL | — | Provider's JSON Web Key Set endpoint (for token signature verification). |
| Signing Algorithm | string | `RS256` | JWT signing algorithm. |
| Role Claim | string | `roles` | JWT claim key that contains user roles. |
| Admin Role Value | string | `admin` | Value in the role claim that grants admin access. |

**Note:** The OIDC callback URL that must be registered with your identity provider is:
```
https://your-domain/oidc/callback/
```

### Email Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Email Backend | choice | `console` | Email delivery method: `console`, `smtp`, `ses`, or `google`. |
| From Address | string | — | Sender email address. |
| From Name | string | — | Sender display name. |

**SMTP Settings** (when backend = `smtp`):

| Setting | Type | Description |
|---------|------|-------------|
| SMTP Host | string | SMTP server hostname. |
| SMTP Port | int | SMTP server port (typically 587 for TLS). |
| SMTP Username | string | SMTP authentication username. |
| SMTP Password | string | SMTP authentication password. |
| Use TLS | bool | Enable STARTTLS. |
| Use SSL | bool | Enable implicit SSL. |

**AWS SES Settings** (when backend = `ses`):

| Setting | Type | Description |
|---------|------|-------------|
| SES Region | string | AWS SES region (e.g., `eu-west-1`). |
| SES Access Key ID | string | AWS access key for SES. |
| SES Secret Access Key | string | AWS secret key for SES. |

**Google Workspace Settings** (when backend = `google`):

| Setting | Type | Description |
|---------|------|-------------|
| Service Account JSON | text | Google service account credentials (JSON). |
| Delegated Email | string | Email address for domain-wide delegation. |

### Testing Email

After configuring email settings, use the **Test Email** button in the Settings page to send a test message and verify the configuration.

## Django REST Framework

The API uses these defaults (not configurable via environment variables):

| Setting | Value |
|---------|-------|
| Authentication | Session-based (cookies) |
| Default Permission | IsAuthenticated + IsAdminOrReadOnly |
| Pagination | PageNumberPagination, 50 per page |
| Filter Backends | DjangoFilterBackend, SearchFilter, OrderingFilter |
