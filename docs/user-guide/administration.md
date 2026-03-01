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

OIDC allows users to log in with an external identity provider (e.g., Azure Entra ID, Okta, Keycloak, Google Workspace). All OIDC settings are configured via the admin UI and take effect immediately — no environment variables or restarts needed.

#### Enabling OIDC

1. Go to **Settings > OIDC**
2. Toggle **Enable OIDC Authentication** on
3. Fill in the provider configuration:

| Field | Description | Example (Azure Entra ID) |
|-------|-------------|---------|
| Authority URL | Base URL of the provider | `https://login.microsoftonline.com/{tenant-id}/v2.0` |
| Authorization Endpoint | Provider's authorize URL | `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize` |
| Token Endpoint | Provider's token URL | `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token` |
| User Info Endpoint | Provider's userinfo URL | `https://graph.microsoft.com/oidc/userinfo` |
| JWKS Endpoint | Provider's JWKS URL | `https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys` |
| Client ID | Application (client) ID | `591537bd-c8ef-4ffa-...` |
| Client Secret | Client secret value | `secret-value` |
| Signing Algorithm | JWT signing algorithm | `RS256` (default) |
| Role Claim | JWT claim key for roles | `roles` (default) |
| Admin Role Value | Value that grants admin role | `admin` (default) |

4. Click **Save Settings**

#### Identity Provider Setup

In your identity provider, register the following redirect URI:

```
https://your-domain/oidc/callback/
```

**Important:** The URI must use `https://`. The application requires TLS termination (e.g., via an ingress controller) and the proxy must forward the `X-Forwarded-Proto` header so Django builds correct redirect URIs.

The application requests `openid email profile` scopes. Ensure your identity provider is configured to return email, given_name, family_name, and preferred_username claims.

#### OIDC Login Flow

When OIDC is enabled, the login page shows a **"Sign in with OIDC"** button. Clicking it:

1. Redirects to the OIDC provider's authorization endpoint
2. User authenticates with the provider
3. Provider redirects back to `/oidc/callback/` with an authorization code
4. Backend exchanges the code for tokens
5. Backend extracts user info (email, name) from the claims
6. A local user is created or updated
7. A Django session is created

#### User Creation and Roles

- **New users** created via OIDC are assigned the **read-only** role by default
- **Admins** can promote OIDC users to admin via the Settings > Users page
- **Manually assigned roles are preserved** — subsequent OIDC logins will not downgrade a user's role
- If your identity provider includes a role claim (e.g., Azure App Roles), users with the matching admin role value are automatically granted admin access
- **Username** is set from the `preferred_username` claim (typically the UPN/email), not the random `sub` identifier
- **Email, first name, and last name** are synced from OIDC claims on every login

Users created via OIDC have `auth_source = oidc` and cannot use password-based login or password reset.

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
