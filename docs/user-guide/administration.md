# User Guide: Administration

This guide covers user management, authentication configuration, email setup, and site settings. All administrative functions require the **admin** or **superadmin** role.

## User Roles

| Role | Permissions |
|------|-------------|
| **Superadmin** | Full access. Cannot be deleted or demoted. Created during initial setup. |
| **Admin** | Full access to all features: create/edit/delete assets, accounts, users. Manage settings. Trigger discovery. |
| **Read-Only** | View-only access. Can browse assets, accounts, dashboard, and discovery jobs. Cannot modify anything. |

### Role-Based UI Restrictions

| Feature | Superadmin | Admin | Read-Only |
|---------|-----------|-------|-----------|
| View dashboard, assets, accounts, discovery | Yes | Yes | Yes |
| Export CSV/Excel | Yes | Yes | Yes |
| Create/edit/delete assets | Yes | Yes | No |
| Create/edit accounts | Yes | Yes | No |
| Trigger discovery | Yes | Yes | No |
| Bulk operations | Yes | Yes | No |
| Manage users | Yes | Yes | No |
| Manage settings | Yes | Yes | No |
| Settings page visible | Yes | Yes | No |

## User Management

Go to **Settings** to manage users.

### Creating a User

1. Click **Add User**
2. Fill in:
   - **Username** (required)
   - **Email** (required)
   - **Password** (required, minimum 8 characters)
   - **Role** — superadmin, admin, or readonly
   - **Active** — whether the user can log in
3. Click **Save**

### Editing a User

1. Click the edit icon next to a user
2. Modify fields as needed (password is optional on edit — leave blank to keep current)
3. Click **Save**

### Deleting a User

1. Click the delete icon next to a user
2. Confirm the deletion

**Restrictions:**
- The superadmin user cannot be deleted
- You cannot delete your own account
- You cannot change the superadmin's role

## Authentication Methods

### Local Authentication

Local authentication uses username/password with Django sessions. This is the default method and is always available.

The login flow:
1. User submits username + password
2. Server validates credentials and creates a session
3. A session cookie is set in the browser
4. All subsequent API calls include the session cookie and a CSRF token

### OIDC (OpenID Connect) SSO

OIDC allows users to log in with an external identity provider (e.g., Okta, Azure AD, Keycloak, Google Workspace).

#### Enabling OIDC

1. Go to **Settings**
2. Toggle **OIDC Enabled** on
3. Fill in the provider configuration:

| Field | Description | Example |
|-------|-------------|---------|
| Client ID | Your OIDC client ID | `cn-asset-manager` |
| Client Secret | Your OIDC client secret | `secret-value` |
| Authority URL | Base URL of the provider | `https://auth.example.com/realms/myorg` |
| Authorization Endpoint | Provider's authorize URL | `https://auth.example.com/.../authorize` |
| Token Endpoint | Provider's token URL | `https://auth.example.com/.../token` |
| User Info Endpoint | Provider's userinfo URL | `https://auth.example.com/.../userinfo` |
| JWKS Endpoint | Provider's JWKS URL | `https://auth.example.com/.../certs` |
| Signing Algorithm | JWT signing algorithm | `RS256` (default) |
| Role Claim | JWT claim key for roles | `roles` (default) |
| Admin Role Value | Value that grants admin role | `admin` (default) |

4. Click **Save**

#### OIDC Login Flow

When OIDC is enabled, the login page shows a "Login with SSO" button. Clicking it:

1. Redirects to the OIDC provider's authorization endpoint
2. User authenticates with the provider
3. Provider redirects back with an authorization code
4. Backend exchanges the code for tokens
5. Backend extracts user info and role from the JWT
6. A local user is created or updated with the OIDC role mapping
7. A Django session is created

#### Role Mapping

The OIDC backend reads the configured **Role Claim** from the JWT and maps it:
- If the claim value matches the **Admin Role Value** → user gets `admin` role
- Otherwise → user gets `readonly` role

Users created via OIDC have `auth_source = oidc` and cannot use password login.

## Email Configuration

Email is used for password reset functionality. Configure it in **Settings**.

### Email Backends

| Backend | Description |
|---------|-------------|
| **Console** | Prints emails to the server console (development only) |
| **SMTP** | Standard SMTP server (any provider) |
| **SES** | Amazon Simple Email Service |
| **Google** | Google Workspace via service account with domain-wide delegation |

### SMTP Setup

1. Set **Email Backend** to `SMTP`
2. Fill in:
   - **SMTP Host** — e.g., `smtp.gmail.com`
   - **SMTP Port** — e.g., `587`
   - **SMTP Username** — authentication username
   - **SMTP Password** — authentication password
   - **Use TLS** — enable for STARTTLS (port 587)
   - **Use SSL** — enable for implicit SSL (port 465)
3. Set **From Address** and **From Name**

### AWS SES Setup

1. Set **Email Backend** to `SES`
2. Fill in:
   - **SES Region** — e.g., `eu-west-1`
   - **SES Access Key ID** — AWS access key with SES permissions
   - **SES Secret Access Key** — corresponding secret key
3. Set **From Address** (must be verified in SES)

### Google Workspace Setup

1. Set **Email Backend** to `Google`
2. Fill in:
   - **Service Account JSON** — paste the full service account key JSON
   - **Delegated Email** — email address with domain-wide delegation
3. Set **From Address**

### Testing Email

After configuring any email backend:

1. Enter a test recipient email address
2. Click **Send Test Email**
3. Check the recipient's inbox for the test message

## Session Timeout

Configure the session expiry time in **Settings > Session Timeout**.

- Default: **480 minutes** (8 hours)
- After the timeout, users are logged out and redirected to the login page
- The timeout is reset on each authenticated request

## Password Reset

When email is configured, users can reset their password:

1. Click **Forgot Password?** on the login page
2. Enter the account email address
3. A reset link is sent (valid for a limited time)
4. Click the link and enter a new password

The reset uses Django's built-in token generator. The token is validated against the user ID encoded in the URL.

**Security:** The forgot-password endpoint always returns a success message regardless of whether the email exists, preventing user enumeration.

## Default Admin Account

The initial migration creates a default superadmin:

| Field | Value |
|-------|-------|
| Username | `superadmin` |
| Password | `changeme` |
| Role | `superadmin` |

**Change this password immediately after first deployment.**
