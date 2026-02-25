import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import TopNavbar from '../components/TopNavbar';
import {
  useAdminUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useSiteSettings,
  useUpdateSiteSettings,
  useTestEmail,
} from '../api/admin';
import type { AdminUser, SiteSettings } from '../types';

// ────────────────────────────────────────
// User Form Modal
// ────────────────────────────────────────
function UserFormModal({
  user,
  onClose,
}: {
  user: AdminUser | null; // null = create mode
  onClose: () => void;
}) {
  const isEdit = !!user;
  const create = useCreateUser();
  const update = useUpdateUser();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'readonly' as string,
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username,
        email: user.email,
        password: '',
        role: user.role,
        is_active: user.is_active,
      });
    }
  }, [user]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    if (isEdit) {
      const payload: Record<string, unknown> = {
        id: user!.id,
        username: form.username,
        email: form.email,
        role: form.role,
        is_active: form.is_active,
      };
      if (form.password) payload.password = form.password;
      update.mutate(payload as { id: number } & Record<string, unknown>, {
        onSuccess: onClose,
        onError: (err: unknown) => {
          const axErr = err as { response?: { data?: Record<string, string[]> } };
          if (axErr.response?.data) setErrors(axErr.response.data);
        },
      });
    } else {
      create.mutate(
        { username: form.username, email: form.email, password: form.password, role: form.role },
        {
          onSuccess: onClose,
          onError: (err: unknown) => {
            const axErr = err as { response?: { data?: Record<string, string[]> } };
            if (axErr.response?.data) setErrors(axErr.response.data);
          },
        },
      );
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,.5)' }}>
      <div className="modal-dialog">
        <form className="modal-content" onSubmit={handleSubmit}>
          <div className="modal-header">
            <h5 className="modal-title">{isEdit ? 'Edit User' : 'Add User'}</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            {errors.detail && (
              <div className="alert alert-danger py-1 small">{errors.detail}</div>
            )}

            <div className="mb-3">
              <label className="form-label">Username</label>
              <input
                className={`form-control${errors.username ? ' is-invalid' : ''}`}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
              {errors.username && <div className="invalid-feedback">{errors.username[0]}</div>}
            </div>

            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className={`form-control${errors.email ? ' is-invalid' : ''}`}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              {errors.email && <div className="invalid-feedback">{errors.email[0]}</div>}
            </div>

            <div className="mb-3">
              <label className="form-label">
                Password {isEdit && <span className="text-muted small">(leave blank to keep)</span>}
              </label>
              <input
                type="password"
                className={`form-control${errors.password ? ' is-invalid' : ''}`}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                {...(!isEdit ? { required: true, minLength: 8 } : {})}
                placeholder={isEdit ? 'Unchanged' : ''}
              />
              {errors.password && <div className="invalid-feedback">{errors.password[0]}</div>}
              {!isEdit && <div className="form-text">Minimum 8 characters.</div>}
            </div>

            <div className="mb-3">
              <label className="form-label">Role</label>
              <select
                className="form-select"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                disabled={user?.is_superadmin}
              >
                {user?.is_superadmin && <option value="superadmin">Super Admin</option>}
                <option value="readonly">Read Only</option>
                <option value="admin">Admin</option>
              </select>
              {user?.is_superadmin && (
                <div className="form-text">Superadmin role cannot be changed.</div>
              )}
            </div>

            {isEdit && (
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="user-active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  disabled={user?.is_superadmin}
                />
                <label className="form-check-label" htmlFor="user-active">
                  Active
                </label>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isPending}>
              {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Users Tab
// ────────────────────────────────────────
function UsersTab() {
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useAdminUsers();
  const deleteUser = useDeleteUser();
  const [modalUser, setModalUser] = useState<AdminUser | null | undefined>(undefined);
  // undefined = closed, null = create, AdminUser = edit
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);

  function closeModal() {
    setModalUser(undefined);
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  }

  const ROLE_BADGE: Record<string, string> = {
    superadmin: '',
    admin: '',
    readonly: '',
  };
  const ROLE_STYLE: Record<string, React.CSSProperties> = {
    superadmin: { background: '#fef2f2', color: '#991b1b' },
    admin: { background: '#eef2ff', color: '#4f46e5' },
    readonly: { background: '#f3f4f6', color: '#4b5563' },
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status" />
      </div>
    );
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">Users ({users?.length ?? 0})</h6>
        <button className="btn btn-sm btn-primary" onClick={() => setModalUser(null)}>
          <i className="bi bi-plus-lg" /> Add User
        </button>
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Source</th>
              <th>Status</th>
              <th>Last Login</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id}>
                <td className="fw-medium">{u.username}</td>
                <td className="small">{u.email || '—'}</td>
                <td>
                  <span className="badge" style={ROLE_STYLE[u.role] || { background: '#f3f4f6', color: '#4b5563' }}>
                    {u.role}
                  </span>
                </td>
                <td>
                  <span className="badge" style={u.auth_source === 'oidc' ? { background: '#dbeafe', color: '#1e40af' } : { background: '#f3f4f6', color: '#4b5563' }}>
                    {u.auth_source}
                  </span>
                </td>
                <td>
                  {u.is_active ? (
                    <span className="badge badge-active">Active</span>
                  ) : (
                    <span className="badge badge-inactive">Disabled</span>
                  )}
                </td>
                <td className="small">
                  {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}
                </td>
                <td>
                  <div className="d-flex gap-1">
                    <button
                      className="btn btn-sm btn-outline-secondary py-0 px-1"
                      title="Edit"
                      onClick={() => setModalUser(u)}
                    >
                      <i className="bi bi-pencil-square" />
                    </button>
                    {!u.is_superadmin && (
                      <button
                        className="btn btn-sm btn-outline-danger py-0 px-1"
                        title="Delete"
                        onClick={() => setConfirmDelete(u)}
                      >
                        <i className="bi bi-trash" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users?.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* User form modal */}
      {modalUser !== undefined && (
        <UserFormModal user={modalUser} onClose={closeModal} />
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-sm">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">Delete User</h6>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setConfirmDelete(null)}
                />
              </div>
              <div className="modal-body">
                Are you sure you want to delete <strong>{confirmDelete.username}</strong>?
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setConfirmDelete(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  disabled={deleteUser.isPending}
                  onClick={() =>
                    deleteUser.mutate(confirmDelete.id, {
                      onSuccess: () => setConfirmDelete(null),
                    })
                  }
                >
                  {deleteUser.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ────────────────────────────────────────
// OIDC Settings Tab
// ────────────────────────────────────────
function OIDCTab() {
  const { data: settings, isLoading } = useSiteSettings();
  const updateSettings = useUpdateSiteSettings();
  const [form, setForm] = useState<Partial<SiteSettings>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    updateSettings.mutate(form, {
      onSuccess: () => setSaved(true),
    });
  }

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">OpenID Connect (OIDC)</h6>
        <div className="d-flex align-items-center gap-2">
          {saved && <span className="text-success small">Saved</span>}
          <button
            type="submit"
            className="btn btn-sm btn-primary"
            disabled={updateSettings.isPending}
          >
            {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="form-check form-switch mb-3">
            <input
              className="form-check-input"
              type="checkbox"
              id="oidc-enabled"
              checked={form.oidc_enabled ?? false}
              onChange={(e) => setForm({ ...form, oidc_enabled: e.target.checked })}
            />
            <label className="form-check-label fw-medium" htmlFor="oidc-enabled">
              Enable OIDC Authentication
            </label>
            <div className="form-text">
              Allow users to sign in with an external identity provider.
            </div>
          </div>
        </div>
      </div>

      <div className={form.oidc_enabled ? '' : 'opacity-50 pe-none'}>
        <div className="card mb-3">
          <div className="card-header py-2">
            <strong className="small">Provider Endpoints</strong>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label">Authority URL</label>
              <input
                className="form-control"
                value={form.oidc_authority_url ?? ''}
                onChange={(e) => setForm({ ...form, oidc_authority_url: e.target.value })}
                placeholder="https://login.microsoftonline.com/tenant/v2.0"
              />
              <div className="form-text">
                Base URL of the OIDC provider. Used for auto-discovery.
              </div>
            </div>
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label">Authorization Endpoint</label>
                <input
                  className="form-control"
                  value={form.oidc_authorization_endpoint ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, oidc_authorization_endpoint: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Token Endpoint</label>
                <input
                  className="form-control"
                  value={form.oidc_token_endpoint ?? ''}
                  onChange={(e) => setForm({ ...form, oidc_token_endpoint: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">User Info Endpoint</label>
                <input
                  className="form-control"
                  value={form.oidc_user_endpoint ?? ''}
                  onChange={(e) => setForm({ ...form, oidc_user_endpoint: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">JWKS Endpoint</label>
                <input
                  className="form-control"
                  value={form.oidc_jwks_endpoint ?? ''}
                  onChange={(e) => setForm({ ...form, oidc_jwks_endpoint: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-header py-2">
            <strong className="small">Client Credentials</strong>
          </div>
          <div className="card-body">
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label">Client ID</label>
                <input
                  className="form-control"
                  value={form.oidc_client_id ?? ''}
                  onChange={(e) => setForm({ ...form, oidc_client_id: e.target.value })}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Client Secret</label>
                <input
                  type="password"
                  className="form-control"
                  value={form.oidc_client_secret ?? ''}
                  onChange={(e) => setForm({ ...form, oidc_client_secret: e.target.value })}
                />
              </div>
            </div>
            <div className="mb-0">
              <label className="form-label">Signing Algorithm</label>
              <select
                className="form-select"
                value={form.oidc_sign_algo ?? 'RS256'}
                onChange={(e) => setForm({ ...form, oidc_sign_algo: e.target.value })}
                style={{ maxWidth: 200 }}
              >
                <option value="RS256">RS256</option>
                <option value="RS384">RS384</option>
                <option value="RS512">RS512</option>
                <option value="HS256">HS256</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-header py-2">
            <strong className="small">Role Mapping</strong>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Role Claim</label>
                <input
                  className="form-control"
                  value={form.oidc_role_claim ?? ''}
                  onChange={(e) => setForm({ ...form, oidc_role_claim: e.target.value })}
                  placeholder="roles"
                />
                <div className="form-text">JWT claim that contains the user's roles.</div>
              </div>
              <div className="col-md-6">
                <label className="form-label">Admin Role Value</label>
                <input
                  className="form-control"
                  value={form.oidc_admin_role_value ?? ''}
                  onChange={(e) => setForm({ ...form, oidc_admin_role_value: e.target.value })}
                  placeholder="admin"
                />
                <div className="form-text">
                  Claim value that grants admin access. Others get read-only.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

// ────────────────────────────────────────
// General Settings Tab
// ────────────────────────────────────────
function GeneralTab() {
  const { data: settings, isLoading } = useSiteSettings();
  const updateSettings = useUpdateSiteSettings();
  const [timeout, setTimeout_] = useState(480);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) setTimeout_(settings.session_timeout_minutes);
  }, [settings]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    updateSettings.mutate({ session_timeout_minutes: timeout }, {
      onSuccess: () => setSaved(true),
    });
  }

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">General Settings</h6>
        <div className="d-flex align-items-center gap-2">
          {saved && <span className="text-success small">Saved</span>}
          <button
            type="submit"
            className="btn btn-sm btn-primary"
            disabled={updateSettings.isPending}
          >
            {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header py-2">
          <strong className="small">Session</strong>
        </div>
        <div className="card-body">
          <div className="row align-items-end">
            <div className="col-md-4">
              <label className="form-label">Session Timeout (minutes)</label>
              <input
                type="number"
                className="form-control"
                min={5}
                max={10080}
                value={timeout}
                onChange={(e) => setTimeout_(parseInt(e.target.value, 10) || 480)}
              />
              <div className="form-text">
                How long before an inactive session expires. Default: 480 (8 hours).
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header py-2">
          <strong className="small">About</strong>
        </div>
        <div className="card-body">
          <table className="table table-sm table-borderless mb-0">
            <tbody>
              <tr>
                <td className="text-muted" style={{ width: '30%' }}>
                  Application
                </td>
                <td>Cloud Native Asset Manager</td>
              </tr>
              <tr>
                <td className="text-muted">Version</td>
                <td>1.0.0</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </form>
  );
}

// ────────────────────────────────────────
// Email Settings Tab
// ────────────────────────────────────────
const EMAIL_BACKENDS = [
  { value: 'console', label: 'Console (development)', description: 'Prints emails to the server console. Use for development only.' },
  { value: 'smtp', label: 'SMTP', description: 'Send via any SMTP server (Mailgun, SendGrid, self-hosted, etc.).' },
  { value: 'ses', label: 'Amazon SES', description: 'Send via Amazon Simple Email Service using SMTP credentials.' },
  { value: 'google', label: 'Google API (Gmail)', description: 'Send via Gmail using a Google service account with domain-wide delegation.' },
] as const;

function EmailTab() {
  const { data: settings, isLoading } = useSiteSettings();
  const updateSettings = useUpdateSiteSettings();
  const testEmail = useTestEmail();
  const [form, setForm] = useState<Partial<SiteSettings>>({});
  const [saved, setSaved] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    updateSettings.mutate(
      {
        email_backend: form.email_backend,
        email_from_address: form.email_from_address,
        email_from_name: form.email_from_name,
        smtp_host: form.smtp_host,
        smtp_port: form.smtp_port,
        smtp_username: form.smtp_username,
        smtp_password: form.smtp_password,
        smtp_use_tls: form.smtp_use_tls,
        smtp_use_ssl: form.smtp_use_ssl,
        ses_aws_region: form.ses_aws_region,
        ses_aws_access_key_id: form.ses_aws_access_key_id,
        ses_aws_secret_access_key: form.ses_aws_secret_access_key,
        google_service_account_json: form.google_service_account_json,
        google_delegated_email: form.google_delegated_email,
      },
      { onSuccess: () => setSaved(true) },
    );
  }

  function handleTest(e: React.FormEvent) {
    e.preventDefault();
    setTestResult(null);
    testEmail.mutate(testTo, {
      onSuccess: (res) => setTestResult({ ok: true, msg: res.detail }),
      onError: (err: unknown) => {
        const axErr = err as { response?: { data?: { detail?: string } } };
        setTestResult({ ok: false, msg: axErr.response?.data?.detail || 'Failed to send.' });
      },
    });
  }

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status" />
      </div>
    );
  }

  const backend = form.email_backend || 'console';

  return (
    <form onSubmit={handleSave}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">Email Delivery</h6>
        <div className="d-flex align-items-center gap-2">
          {saved && <span className="text-success small">Saved</span>}
          <button
            type="submit"
            className="btn btn-sm btn-primary"
            disabled={updateSettings.isPending}
          >
            {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Provider selection */}
      <div className="card mb-3">
        <div className="card-header py-2">
          <strong className="small">Email Provider</strong>
        </div>
        <div className="card-body">
          {EMAIL_BACKENDS.map((b) => (
            <div className="form-check mb-2" key={b.value}>
              <input
                className="form-check-input"
                type="radio"
                name="email_backend"
                id={`email-backend-${b.value}`}
                checked={backend === b.value}
                onChange={() => setForm({ ...form, email_backend: b.value })}
              />
              <label className="form-check-label" htmlFor={`email-backend-${b.value}`}>
                <strong>{b.label}</strong>
                <div className="form-text mt-0">{b.description}</div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* From address */}
      <div className="card mb-3">
        <div className="card-header py-2">
          <strong className="small">Sender</strong>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">From Name</label>
              <input
                className="form-control"
                value={form.email_from_name ?? ''}
                onChange={(e) => setForm({ ...form, email_from_name: e.target.value })}
                placeholder="Cloud Native Asset Manager"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">From Address</label>
              <input
                type="email"
                className="form-control"
                value={form.email_from_address ?? ''}
                onChange={(e) => setForm({ ...form, email_from_address: e.target.value })}
                placeholder="noreply@example.com"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SMTP settings */}
      {backend === 'smtp' && (
        <div className="card mb-3">
          <div className="card-header py-2">
            <strong className="small">SMTP Configuration</strong>
          </div>
          <div className="card-body">
            <div className="row g-3 mb-3">
              <div className="col-md-8">
                <label className="form-label">Host</label>
                <input
                  className="form-control"
                  value={form.smtp_host ?? ''}
                  onChange={(e) => setForm({ ...form, smtp_host: e.target.value })}
                  placeholder="smtp.example.com"
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Port</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.smtp_port ?? 587}
                  onChange={(e) => setForm({ ...form, smtp_port: parseInt(e.target.value, 10) || 587 })}
                />
              </div>
            </div>
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label">Username</label>
                <input
                  className="form-control"
                  value={form.smtp_username ?? ''}
                  onChange={(e) => setForm({ ...form, smtp_username: e.target.value })}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={form.smtp_password ?? ''}
                  onChange={(e) => setForm({ ...form, smtp_password: e.target.value })}
                />
              </div>
            </div>
            <div className="d-flex gap-4">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="smtp-tls"
                  checked={form.smtp_use_tls ?? true}
                  onChange={(e) => setForm({ ...form, smtp_use_tls: e.target.checked, ...(e.target.checked ? { smtp_use_ssl: false } : {}) })}
                />
                <label className="form-check-label" htmlFor="smtp-tls">Use TLS (port 587)</label>
              </div>
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="smtp-ssl"
                  checked={form.smtp_use_ssl ?? false}
                  onChange={(e) => setForm({ ...form, smtp_use_ssl: e.target.checked, ...(e.target.checked ? { smtp_use_tls: false } : {}) })}
                />
                <label className="form-check-label" htmlFor="smtp-ssl">Use SSL (port 465)</label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Amazon SES settings */}
      {backend === 'ses' && (
        <div className="card mb-3">
          <div className="card-header py-2">
            <strong className="small">Amazon SES Configuration</strong>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label">AWS Region</label>
              <select
                className="form-select"
                value={form.ses_aws_region ?? 'us-east-1'}
                onChange={(e) => setForm({ ...form, ses_aws_region: e.target.value })}
                style={{ maxWidth: 250 }}
              >
                {['us-east-1', 'us-east-2', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">SMTP Username (Access Key ID)</label>
                <input
                  className="form-control"
                  value={form.ses_aws_access_key_id ?? ''}
                  onChange={(e) => setForm({ ...form, ses_aws_access_key_id: e.target.value })}
                />
                <div className="form-text">This is the SES SMTP credential, not your IAM access key.</div>
              </div>
              <div className="col-md-6">
                <label className="form-label">SMTP Password (Secret Access Key)</label>
                <input
                  type="password"
                  className="form-control"
                  value={form.ses_aws_secret_access_key ?? ''}
                  onChange={(e) => setForm({ ...form, ses_aws_secret_access_key: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google API settings */}
      {backend === 'google' && (
        <div className="card mb-3">
          <div className="card-header py-2">
            <strong className="small">Google API (Gmail) Configuration</strong>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label">Delegated Email</label>
              <input
                type="email"
                className="form-control"
                value={form.google_delegated_email ?? ''}
                onChange={(e) => setForm({ ...form, google_delegated_email: e.target.value })}
                placeholder="noreply@yourdomain.com"
              />
              <div className="form-text">
                The email address the service account will impersonate (requires domain-wide delegation).
              </div>
            </div>
            <div className="mb-0">
              <label className="form-label">Service Account JSON Key</label>
              <textarea
                className="form-control font-monospace"
                rows={6}
                value={form.google_service_account_json ?? ''}
                onChange={(e) => setForm({ ...form, google_service_account_json: e.target.value })}
                placeholder='{"type": "service_account", ...}'
              />
              <div className="form-text">
                Paste the full JSON key file contents for a service account with Gmail API access.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test email */}
      <div className="card">
        <div className="card-header py-2">
          <strong className="small">Test Email Delivery</strong>
        </div>
        <div className="card-body">
          <div className="d-flex align-items-end gap-2">
            <div style={{ flex: 1, maxWidth: 350 }}>
              <label className="form-label">Recipient</label>
              <input
                type="email"
                className="form-control"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <button
              type="button"
              className="btn btn-outline-primary"
              disabled={!testTo || testEmail.isPending}
              onClick={handleTest}
            >
              {testEmail.isPending ? 'Sending...' : 'Send Test Email'}
            </button>
          </div>
          {testResult && (
            <div className={`mt-2 small ${testResult.ok ? 'text-success' : 'text-danger'}`}>
              {testResult.msg}
            </div>
          )}
          <div className="form-text mt-2">
            Save your settings first, then send a test email to verify delivery.
          </div>
        </div>
      </div>
    </form>
  );
}

// ────────────────────────────────────────
// Main Admin Page
// ────────────────────────────────────────
const TABS = [
  { key: 'users', label: 'Users', icon: 'bi-people' },
  { key: 'email', label: 'Email', icon: 'bi-envelope' },
  { key: 'oidc', label: 'OIDC', icon: 'bi-shield-lock' },
  { key: 'general', label: 'General', icon: 'bi-sliders' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function AdminPage() {
  const [tab, setTab] = useState<TabKey>('users');

  return (
    <>
      <TopNavbar breadcrumbs={[{ label: 'Settings' }]} />

      <ul className="nav nav-tabs mb-4">
        {TABS.map((t) => (
          <li className="nav-item" key={t.key}>
            <button
              type="button"
              className={`nav-link${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <i className={`bi ${t.icon} me-1`} />
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      {tab === 'users' && <UsersTab />}
      {tab === 'email' && <EmailTab />}
      {tab === 'oidc' && <OIDCTab />}
      {tab === 'general' && <GeneralTab />}
    </>
  );
}
