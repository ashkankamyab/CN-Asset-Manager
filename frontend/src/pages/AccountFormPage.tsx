import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopNavbar from '../components/TopNavbar';
import { useAccount, useAccounts, useCreateAccount, useUpdateAccount } from '../api/accounts';

const ACCOUNT_TYPES = [
  { value: 'MANAGEMENT', label: 'Management Account' },
  { value: 'MEMBER', label: 'Member Account' },
];

const ENVIRONMENTS = [
  { value: 'PRODUCTION', label: 'Production' },
  { value: 'STAGING', label: 'Staging' },
  { value: 'DEVELOPMENT', label: 'Development' },
  { value: 'SHARED', label: 'Shared Services' },
];

const AWS_REGIONS = [
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-north-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-south-1',
  'sa-east-1',
  'ca-central-1',
];

export default function AccountFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data: existing, isLoading: loadingExisting } = useAccount(id || '');
  const { data: allAccounts } = useAccounts();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount(id || '');

  const managementAccounts = allAccounts?.results.filter(
    (a) => a.account_type === 'MANAGEMENT' && a.id !== id
  ) || [];

  const [form, setForm] = useState({
    account_id: '',
    account_name: '',
    account_type: 'MEMBER',
    environment: 'DEVELOPMENT',
    organization_role_name: 'OrganizationAccountAccessRole',
    is_active: true,
    aws_access_key_id: '',
    aws_secret_access_key: '',
    management_account: '' as string | null,
    discovery_regions: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (existing && isEdit) {
      setForm({
        account_id: existing.account_id,
        account_name: existing.account_name,
        account_type: existing.account_type,
        environment: existing.environment,
        organization_role_name: existing.organization_role_name,
        is_active: existing.is_active,
        aws_access_key_id: existing.aws_access_key_id || '',
        aws_secret_access_key: '',
        management_account: existing.management_account || '',
        discovery_regions: existing.discovery_regions || [],
      });
    }
  }, [existing, isEdit]);

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    // Client-side validation
    if (form.account_id.length !== 12 || !/^\d{12}$/.test(form.account_id)) {
      setErrors({ account_id: ['Account ID must be exactly 12 digits.'] });
      return;
    }

    const payload: Record<string, unknown> = { ...form };
    // Send null instead of empty string for FK
    if (!payload.management_account) {
      payload.management_account = null;
    }
    // Only send secret key if user entered a new value
    if (!payload.aws_secret_access_key) {
      delete payload.aws_secret_access_key;
    }

    const mutation = isEdit ? updateAccount : createAccount;
    mutation.mutate(payload, {
      onSuccess: () => navigate('/accounts'),
      onError: (err: unknown) => {
        const axiosErr = err as { response?: { data?: Record<string, string[]> } };
        if (axiosErr.response?.data) {
          setErrors(axiosErr.response.data);
        }
      },
    });
  }

  if (isEdit && loadingExisting) {
    return (
      <>
        <TopNavbar breadcrumbs={[{ label: 'AWS Accounts', href: '/accounts' }, { label: 'Loading...' }]} />
        <div className="text-center py-5">
          <div className="spinner-border" role="status" />
        </div>
      </>
    );
  }

  const title = isEdit ? `Edit ${existing?.account_name || ''}` : 'Add Account';
  const isPending = createAccount.isPending || updateAccount.isPending;
  const isManagement = form.account_type === 'MANAGEMENT';

  return (
    <>
      <TopNavbar
        breadcrumbs={[
          { label: 'AWS Accounts', href: '/accounts' },
          { label: title },
        ]}
      />

      <div className="row mt-1">
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header"><strong>{title}</strong></div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Account ID *</label>
                  <input
                    type="text"
                    className={`form-control${errors.account_id ? ' is-invalid' : ''}`}
                    value={form.account_id}
                    onChange={(e) => set('account_id', e.target.value)}
                    placeholder="123456789012"
                    maxLength={12}
                    required
                  />
                  {errors.account_id && <div className="invalid-feedback">{errors.account_id.join(', ')}</div>}
                  <div className="form-text">12-digit AWS account ID</div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Account Name *</label>
                  <input
                    type="text"
                    className={`form-control${errors.account_name ? ' is-invalid' : ''}`}
                    value={form.account_name}
                    onChange={(e) => set('account_name', e.target.value)}
                    placeholder="my-aws-account"
                    required
                  />
                  {errors.account_name && <div className="invalid-feedback">{errors.account_name.join(', ')}</div>}
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Account Type</label>
                    <select className="form-select" value={form.account_type} onChange={(e) => set('account_type', e.target.value)}>
                      {ACCOUNT_TYPES.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Environment</label>
                    <select className="form-select" value={form.environment} onChange={(e) => set('environment', e.target.value)}>
                      {ENVIRONMENTS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Discovery Regions</label>
                  <div className="row row-cols-2 row-cols-md-3 g-2">
                    {AWS_REGIONS.map((region) => (
                      <div className="col" key={region}>
                        <div className="form-check">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id={`region-${region}`}
                            checked={form.discovery_regions.includes(region)}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...form.discovery_regions, region]
                                : form.discovery_regions.filter((r) => r !== region);
                              set('discovery_regions', next);
                            }}
                          />
                          <label className="form-check-label" htmlFor={`region-${region}`}>
                            {region}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="form-text">
                    {form.discovery_regions.length === 0
                      ? 'No regions selected — uses global default regions.'
                      : `${form.discovery_regions.length} region(s) selected.`}
                  </div>
                </div>

                {isManagement && (
                  <>
                    <div className="mb-3">
                      <label className="form-label">AWS Access Key ID</label>
                      <input
                        type="text"
                        className={`form-control${errors.aws_access_key_id ? ' is-invalid' : ''}`}
                        value={form.aws_access_key_id}
                        onChange={(e) => set('aws_access_key_id', e.target.value)}
                        placeholder="AKIA..."
                      />
                      {errors.aws_access_key_id && <div className="invalid-feedback">{errors.aws_access_key_id.join(', ')}</div>}
                      <div className="form-text">Leave blank to use the host machine's default credentials</div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">AWS Secret Access Key</label>
                      <input
                        type="password"
                        className={`form-control${errors.aws_secret_access_key ? ' is-invalid' : ''}`}
                        value={form.aws_secret_access_key}
                        onChange={(e) => set('aws_secret_access_key', e.target.value)}
                        placeholder={isEdit ? '(unchanged)' : ''}
                      />
                      {errors.aws_secret_access_key && <div className="invalid-feedback">{errors.aws_secret_access_key.join(', ')}</div>}
                      {isEdit && <div className="form-text">Leave blank to keep the existing secret key</div>}
                    </div>
                  </>
                )}

                {!isManagement && (
                  <>
                    <div className="mb-3">
                      <label className="form-label">Management Account</label>
                      <select
                        className={`form-select${errors.management_account ? ' is-invalid' : ''}`}
                        value={form.management_account || ''}
                        onChange={(e) => set('management_account', e.target.value || null)}
                      >
                        <option value="">— None (use default credentials) —</option>
                        {managementAccounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.account_name} ({a.account_id})</option>
                        ))}
                      </select>
                      {errors.management_account && <div className="invalid-feedback">{errors.management_account.join(', ')}</div>}
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Organization Role Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.organization_role_name}
                        onChange={(e) => set('organization_role_name', e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="mb-3 form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="is_active"
                    checked={form.is_active}
                    onChange={(e) => set('is_active', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="is_active">Active</label>
                </div>

                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={isPending}>
                    {isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/accounts')}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
