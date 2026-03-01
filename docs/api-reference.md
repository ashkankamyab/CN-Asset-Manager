# API Reference

All API endpoints are prefixed with `/api/`. Authentication is cookie-based (session) with CSRF token protection.

## Authentication

All endpoints require authentication unless noted. Write operations (POST, PUT, PATCH, DELETE) require the `admin` or `superadmin` role unless noted.

### CSRF

A CSRF token must be included in the `X-CSRFToken` header for all non-safe requests. The token is read from the `csrftoken` cookie.

---

## Auth

### Get CSRF Cookie

```
GET /api/auth/csrf/
```

Sets the CSRF cookie. Call this before login. No authentication required.

**Response:** `200 OK`
```json
{ "detail": "CSRF cookie set." }
```

### Login

```
POST /api/auth/login/
```

No authentication required.

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "role": "superadmin",
  "is_superadmin": true
}
```

**Errors:** `400` invalid credentials.

### Get Current User

```
GET /api/auth/me/
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "role": "superadmin",
  "is_superadmin": true
}
```

### Logout

```
POST /api/auth/logout/
```

**Response:** `200 OK`
```json
{ "detail": "Logged out." }
```

### Get Config

```
GET /api/auth/config/
```

No authentication required. Returns public configuration.

**Response:** `200 OK`
```json
{
  "oidc_enabled": false
}
```

### Forgot Password

```
POST /api/auth/forgot-password/
```

No authentication required.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK` (always, regardless of whether email exists)
```json
{
  "detail": "If an account with that email exists, a reset link has been sent."
}
```

### Reset Password

```
POST /api/auth/reset-password/
```

No authentication required.

**Request:**
```json
{
  "uid": "base64-encoded-user-id",
  "token": "reset-token",
  "password": "new-password"
}
```

**Response:** `200 OK`
```json
{
  "detail": "Password has been reset."
}
```

**Errors:** `400` invalid or expired token.

---

## Dashboard

### Get Dashboard Data

```
GET /api/dashboard/
```

**Response:** `200 OK`
```json
{
  "total_assets": 150,
  "total_accounts": 3,
  "critical_assets": 12,
  "last_discovery": "2024-01-15T10:30:00Z",
  "total_monthly_cost": "5432.10",
  "total_previous_month_cost": "5100.00",
  "by_type": [
    { "asset_type": "AWS_SERVICE", "count": 140 }
  ],
  "by_service": [
    { "aws_service_type": "EC2", "count": 45 }
  ],
  "by_criticality": [
    { "criticality": "CRITICAL", "count": 12 }
  ],
  "by_status": [
    { "status": "ACTIVE", "count": 145 }
  ],
  "accounts": [
    {
      "id": "uuid",
      "account_name": "Production",
      "account_id": "123456789012",
      "environment": "PRODUCTION",
      "is_active": true,
      "asset_count": 80,
      "estimated_monthly_cost": "3000.00",
      "previous_month_cost": "2800.00",
      "last_discovery_at": "2024-01-15T10:30:00Z"
    }
  ],
  "recent_jobs": [
    {
      "id": "uuid",
      "status": "COMPLETED",
      "aws_account_name": "Production",
      "resources_discovered": 80,
      "resources_new": 5,
      "started_at": "2024-01-15T10:00:00Z",
      "completed_at": "2024-01-15T10:30:00Z",
      "triggered_by_username": "admin"
    }
  ]
}
```

---

## AWS Accounts

### List Accounts

```
GET /api/accounts/
```

**Response:** `200 OK` — paginated list of `AWSAccount` objects.

### Create Account

```
POST /api/accounts/
```

**Request:**
```json
{
  "account_id": "123456789012",
  "account_name": "Production",
  "account_type": "MANAGEMENT",
  "environment": "PRODUCTION",
  "organization_role_name": "OrganizationAccountAccessRole",
  "aws_access_key_id": "AKIAIOSFODNN7EXAMPLE",
  "aws_secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "discovery_regions": ["eu-central-1", "us-east-1"],
  "is_active": true,
  "management_account": null
}
```

**Validation:**
- `account_id` must be exactly 12 digits
- `management_account` must be null for MANAGEMENT accounts
- `aws_secret_access_key` is write-only (never returned in responses)

**Response:** `201 Created`

### Get Account

```
GET /api/accounts/{id}/
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "account_id": "123456789012",
  "account_name": "Production",
  "account_type": "MANAGEMENT",
  "account_type_display": "Management",
  "environment": "PRODUCTION",
  "environment_display": "Production",
  "organization_role_name": "OrganizationAccountAccessRole",
  "aws_access_key_id": "AKIAIOSFODNN7EXAMPLE",
  "management_account": null,
  "management_account_name": "",
  "discovery_regions": ["eu-central-1", "us-east-1"],
  "is_active": true,
  "last_discovery_at": "2024-01-15T10:30:00Z",
  "estimated_monthly_cost": "3000.00",
  "previous_month_cost": "2800.00",
  "cost_updated_at": "2024-01-15T10:31:00Z",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:31:00Z",
  "asset_count": 80
}
```

### Update Account

```
PUT /api/accounts/{id}/
PATCH /api/accounts/{id}/
```

Same fields as create. PATCH supports partial updates.

### Delete Account

```
DELETE /api/accounts/{id}/
```

**Response:** `204 No Content`

### Test Connection

```
POST /api/accounts/{id}/test_connection/
```

Tests AWS connectivity for the account.

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Connection successful. Account: 123456789012"
}
```

**Errors:** `200` with `"success": false` and error message.

### Refresh Costs

```
POST /api/accounts/refresh_costs/
```

Triggers an async cost refresh for all accounts via AWS Cost Explorer.

**Response:** `200 OK`
```json
{
  "status": "Cost refresh task queued."
}
```

---

## Assets

### List Assets

```
GET /api/assets/
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | int | Page number (default: 1) |
| `page_size` | int | Items per page (default: 50) |
| `ordering` | string | Sort field. Prefix with `-` for descending. |
| `search` | string | Full-text search (name, asset_id, ARN, resource_id) |
| `asset_type` | string | Filter by type |
| `aws_service_type` | string | Filter by service |
| `criticality` | string | Filter by criticality |
| `status` | string | Filter by status |
| `aws_account` | uuid | Filter by account ID |
| `aws_region` | string | Filter by region |
| `department` | string | Filter by department |
| `exclude_asset_type` | string | Exclude types (repeatable) |
| `exclude_aws_service_type` | string | Exclude services (repeatable) |
| `exclude_criticality` | string | Exclude criticalities (repeatable) |
| `exclude_status` | string | Exclude statuses (repeatable) |
| `exclude_aws_account` | uuid | Exclude accounts (repeatable) |
| `exclude_aws_region` | string | Exclude regions (repeatable) |

**Response:** `200 OK`
```json
{
  "count": 150,
  "next": "/api/assets/?page=2",
  "previous": null,
  "results": [
    {
      "id": "uuid",
      "asset_id": "ASSET-0001",
      "name": "web-server-1",
      "asset_type": "AWS_SERVICE",
      "asset_type_display": "AWS Service",
      "aws_service_type": "EC2",
      "aws_service_type_display": "EC2 Instance",
      "aws_account": "uuid",
      "aws_account_name": "Production",
      "aws_region": "eu-central-1",
      "status": "ACTIVE",
      "status_display": "Active",
      "criticality": "HIGH",
      "criticality_display": "High",
      "owner": "Platform Team",
      "department": "Engineering",
      "category_name": "",
      "created_at": "2024-01-15T10:30:00Z",
      "last_seen_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Get Asset

```
GET /api/assets/{id}/
```

Returns the full asset detail including relationships, metadata, tags, compliance fields, and all other fields.

### Create Asset

```
POST /api/assets/
```

**Request:** Asset fields (see [Assets user guide](user-guide/assets.md) for all fields).

**Response:** `201 Created`

### Update Asset

```
PUT /api/assets/{id}/
PATCH /api/assets/{id}/
```

### Delete Asset

```
DELETE /api/assets/{id}/
```

**Response:** `204 No Content`

### Decommission Asset

```
POST /api/assets/{id}/decommission/
```

Sets the asset status to DECOMMISSIONED.

**Response:** `200 OK`

### Bulk Update

```
POST /api/assets/bulk_update/
```

**Request:**
```json
{
  "asset_ids": ["uuid1", "uuid2", "uuid3"],
  "owner": "Platform Team",
  "criticality": "HIGH",
  "data_classification": "CONFIDENTIAL"
}
```

All fields except `asset_ids` are optional — only provided fields are updated.

**Response:** `200 OK`
```json
{
  "updated": 3
}
```

### Bulk Add Dependency

```
POST /api/assets/bulk_add_dependency/
```

**Request:**
```json
{
  "asset_ids": ["uuid1", "uuid2"],
  "target_asset": "uuid3",
  "relationship_type": "DEPENDS_ON"
}
```

Creates a relationship from each source asset to the target.

**Response:** `200 OK`

### Filter Options

```
GET /api/assets/filter_options/
```

Returns available values for all filter dropdowns.

**Response:** `200 OK`
```json
{
  "asset_types": [{ "value": "AWS_SERVICE", "label": "AWS Service" }],
  "aws_service_types": [{ "value": "EC2", "label": "EC2 Instance" }],
  "criticalities": [{ "value": "CRITICAL", "label": "Critical" }],
  "statuses": [{ "value": "ACTIVE", "label": "Active" }],
  "data_classifications": [{ "value": "PUBLIC", "label": "Public" }],
  "aws_accounts": [{ "value": "uuid", "label": "Production (123456789012)" }],
  "aws_regions": ["eu-central-1", "us-east-1"]
}
```

### Autocomplete

```
GET /api/assets/autocomplete/?q=web-server
```

Returns matching assets for search suggestions (minimum 2 characters).

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "asset_id": "ASSET-0001",
    "name": "web-server-1"
  }
]
```

---

## Asset Categories

### List Categories

```
GET /api/categories/
```

### Create Category

```
POST /api/categories/
```

**Request:**
```json
{
  "name": "Compute",
  "description": "Compute resources",
  "icon": "bi-cpu",
  "color": "#007bff"
}
```

### Get / Update / Delete

```
GET    /api/categories/{id}/
PUT    /api/categories/{id}/
PATCH  /api/categories/{id}/
DELETE /api/categories/{id}/
```

---

## Asset Relationships

### List Relationships

```
GET /api/relationships/
```

### Create Relationship

```
POST /api/relationships/
```

**Request:**
```json
{
  "source_asset": "uuid",
  "target_asset": "uuid",
  "relationship_type": "DEPENDS_ON",
  "description": "Reads data from this database"
}
```

**Relationship types:** `DEPENDS_ON`, `CONTAINS`, `CONNECTS_TO`, `MANAGED_BY`

### Delete Relationship

```
DELETE /api/relationships/{id}/
```

**Response:** `204 No Content`

> Note: Relationships only support GET, POST, and DELETE (no updates).

---

## Discovery

### List Jobs

```
GET /api/discovery/jobs/
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (PENDING, RUNNING, COMPLETED, FAILED) |
| `aws_account` | uuid | Filter by account |

Ordered by `-started_at` (newest first).

**Response:** `200 OK` — paginated list of discovery jobs.

### Get Job

```
GET /api/discovery/jobs/{id}/
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "aws_account": "uuid",
  "aws_account_name": "Production",
  "status": "COMPLETED",
  "started_at": "2024-01-15T10:00:00Z",
  "completed_at": "2024-01-15T10:30:00Z",
  "resources_discovered": 80,
  "resources_updated": 75,
  "resources_new": 5,
  "error_message": "",
  "triggered_by_username": "admin",
  "log_output": "Discovering account Production...\n...",
  "duration_seconds": 1800
}
```

### Trigger Discovery

```
POST /api/discovery/trigger/
```

Requires `admin` or `superadmin` role.

**Request (optional):**
```json
{
  "account_id": "uuid"
}
```

Omit `account_id` to discover all accounts.

**Response:** `200 OK` — the created DiscoveryJob.

**Errors:** `409 Conflict` if a job is already in progress.

---

## Admin

All admin endpoints require `admin` or `superadmin` role.

### List Users

```
GET /api/admin/users/
```

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "is_active": true,
    "role": "superadmin",
    "is_superadmin": true,
    "auth_source": "local",
    "date_joined": "2024-01-01T00:00:00Z",
    "last_login": "2024-01-15T08:00:00Z"
  }
]
```

### Create User

```
POST /api/admin/users/
```

**Request:**
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "securepassword",
  "role": "admin",
  "is_active": true
}
```

Password must be at least 8 characters.

### Get / Update / Delete User

```
GET    /api/admin/users/{id}/
PUT    /api/admin/users/{id}/
PATCH  /api/admin/users/{id}/
DELETE /api/admin/users/{id}/
```

**Update request** (password optional):
```json
{
  "username": "updatedname",
  "email": "updated@example.com",
  "role": "readonly",
  "is_active": true
}
```

**Delete restrictions:**
- Cannot delete the superadmin user
- Cannot delete your own account

### Get Site Settings

```
GET /api/admin/settings/
```

Returns all site settings (OIDC, email, discovery interval, session timeout).

### Update Site Settings

```
PUT /api/admin/settings/
PATCH /api/admin/settings/
```

Partial updates supported with PATCH.

### Test Email

```
POST /api/admin/settings/test-email/
```

**Request:**
```json
{
  "to": "test@example.com"
}
```

**Response:** `200 OK`
```json
{
  "detail": "Test email sent successfully."
}
```

---

## Exports (Non-API)

Export endpoints are served directly (not under `/api/`) and return file downloads:

```
GET /assets/export/csv/
GET /assets/export/excel/
```

Both accept the same filter query parameters as the asset list API. Returns a file download with `Content-Disposition` header.
