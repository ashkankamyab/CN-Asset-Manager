import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopNavbar from '../components/TopNavbar';
import {
  useAsset,
  useCreateAsset,
  useUpdateAsset,
  useFilterOptions,
  searchAssets,
  useCreateRelationship,
  useDeleteRelationship,
} from '../api/assets';
import type { AutocompleteResult } from '../api/assets';
import { useAccounts } from '../api/accounts';

const RELATIONSHIP_TYPES = [
  { value: 'DEPENDS_ON', label: 'Depends On' },
  { value: 'CONTAINS', label: 'Contains' },
  { value: 'CONNECTS_TO', label: 'Connects To' },
  { value: 'MANAGED_BY', label: 'Managed By' },
];

/* ── Tag Input (for IP / DNS lists) ── */
function TagInput({
  label,
  placeholder,
  values,
  onChange,
  error,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (v: string[]) => void;
  error?: string[];
}) {
  const [input, setInput] = useState('');

  function add() {
    const v = input.trim();
    if (v && !values.includes(v)) {
      onChange([...values, v]);
    }
    setInput('');
  }

  function remove(idx: number) {
    onChange(values.filter((_, i) => i !== idx));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    }
  }

  return (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <div className="d-flex gap-1 flex-wrap mb-1">
        {values.map((v, i) => (
          <span key={i} className="badge bg-secondary d-flex align-items-center gap-1">
            <code className="text-white">{v}</code>
            <button
              type="button"
              className="btn-close btn-close-white"
              style={{ fontSize: '0.5rem' }}
              onClick={() => remove(i)}
            />
          </span>
        ))}
      </div>
      <div className="input-group input-group-sm">
        <input
          type="text"
          className={`form-control${error ? ' is-invalid' : ''}`}
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={add}
        />
        <button type="button" className="btn btn-outline-secondary" onClick={add}>
          Add
        </button>
      </div>
      {error && <div className="invalid-feedback d-block">{error.join(', ')}</div>}
    </div>
  );
}

/* ── Asset Autocomplete ── */
function AssetAutocomplete({
  onSelect,
  excludeIds,
}: {
  onSelect: (asset: AutocompleteResult) => void;
  excludeIds: Set<string>;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AutocompleteResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(
    (q: string) => {
      if (q.length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      searchAssets(q).then((r) => {
        setResults(r.filter((a) => !excludeIds.has(a.id)));
        setOpen(true);
        setLoading(false);
      });
    },
    [excludeIds],
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(v), 250);
  }

  function handleSelect(asset: AutocompleteResult) {
    onSelect(asset);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={wrapperRef} className="position-relative">
      <input
        type="text"
        className="form-control form-control-sm"
        placeholder="Search by name, asset ID, IP, DNS..."
        value={query}
        onChange={handleChange}
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      {loading && (
        <div className="position-absolute end-0 top-50 translate-middle-y me-2">
          <div className="spinner-border spinner-border-sm" role="status" />
        </div>
      )}
      {open && results.length > 0 && (
        <ul
          className="dropdown-menu show w-100"
          style={{ maxHeight: 200, overflowY: 'auto' }}
        >
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="dropdown-item small"
                onClick={() => handleSelect(r)}
              >
                <strong>{r.asset_id}</strong> — {r.name}
                {r.aws_service_type && (
                  <span className="badge bg-info ms-1">{r.aws_service_type}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && results.length === 0 && query.length >= 2 && !loading && (
        <ul className="dropdown-menu show w-100">
          <li className="dropdown-item small text-muted">No results found</li>
        </ul>
      )}
    </div>
  );
}

/* ── Main Form ── */
export default function AssetFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data: existing, isLoading: loadingExisting } = useAsset(id || '');
  const { data: filterOpts } = useFilterOptions();
  const { data: accountsData } = useAccounts();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset(id || '');
  const createRelationship = useCreateRelationship();
  const deleteRelationship = useDeleteRelationship();

  const [form, setForm] = useState<Record<string, unknown>>({
    name: '',
    asset_type: 'AWS_SERVICE',
    status: 'ACTIVE',
    criticality: 'MEDIUM',
    aws_account: '',
    aws_region: '',
    aws_resource_id: '',
    aws_resource_arn: '',
    aws_service_type: '',
    owner: '',
    description: '',
    vendor: '',
    url: '',
    version: '',
    data_classification: 'INTERNAL',
    gdpr_relevant: false,
    contains_personal_data: false,
    backup_enabled: false,
    monitoring_enabled: false,
    notes: '',
    category: '',
    ip_addresses: [] as string[],
    dns_names: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  // Relationship state (managed after asset exists)
  const [relType, setRelType] = useState('DEPENDS_ON');

  useEffect(() => {
    if (existing && isEdit) {
      setForm({
        name: existing.name,
        asset_type: existing.asset_type,
        status: existing.status,
        criticality: existing.criticality,
        aws_account: existing.aws_account || '',
        aws_region: existing.aws_region,
        aws_resource_id: existing.aws_resource_id,
        aws_resource_arn: existing.aws_resource_arn,
        aws_service_type: existing.aws_service_type,
        owner: existing.owner,
        description: existing.description,
        vendor: existing.vendor,
        url: existing.url,
        version: existing.version,
        data_classification: existing.data_classification,
        gdpr_relevant: existing.gdpr_relevant,
        contains_personal_data: existing.contains_personal_data,
        backup_enabled: existing.backup_enabled,
        monitoring_enabled: existing.monitoring_enabled,
        notes: existing.notes,
        category: existing.category || '',
        ip_addresses: existing.ip_addresses || [],
        dns_names: existing.dns_names || [],
      });
    }
  }, [existing, isEdit]);

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const payload = { ...form };
    if (!payload.aws_account) payload.aws_account = null;
    if (!payload.category) payload.category = null;

    const mutation = isEdit ? updateAsset : createAsset;
    mutation.mutate(payload, {
      onSuccess: (data: { id?: string }) => {
        navigate(isEdit ? `/assets/${id}` : `/assets/${data.id}`);
      },
      onError: (err: unknown) => {
        const axiosErr = err as { response?: { data?: Record<string, string[]> } };
        if (axiosErr.response?.data) {
          setErrors(axiosErr.response.data);
        }
      },
    });
  }

  // Relationship helpers (only available in edit mode)
  const existingRelIds = new Set(
    [
      ...(existing?.outgoing_relationships || []).map((r) => r.related_asset_pk),
      id, // exclude self
    ].filter(Boolean) as string[],
  );

  function handleAddRelationship(target: AutocompleteResult) {
    if (!id) return;
    createRelationship.mutate({
      source_asset: id,
      target_asset: target.id,
      relationship_type: relType,
    });
  }

  function handleRemoveRelationship(relId: number) {
    deleteRelationship.mutate(relId);
  }

  if (isEdit && loadingExisting) {
    return (
      <>
        <TopNavbar breadcrumbs={[{ label: 'Assets', href: '/assets' }, { label: 'Loading...' }]} />
        <div className="text-center py-5">
          <div className="spinner-border" role="status" />
        </div>
      </>
    );
  }

  const title = isEdit ? `Edit ${existing?.asset_id || ''}` : 'Add Asset';
  const isPending = createAsset.isPending || updateAsset.isPending;

  return (
    <>
      <TopNavbar
        breadcrumbs={[
          { label: 'Assets', href: '/assets' },
          { label: title },
        ]}
      />

      <div className="row mt-1">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header"><strong>{title}</strong></div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                {Object.keys(errors).length > 0 && (
                  <div className="alert alert-danger py-2">
                    <strong>Please fix the following errors:</strong>
                    <ul className="mb-0 mt-1">
                      {Object.entries(errors).map(([field, msgs]) => (
                        <li key={field}><strong>{field}</strong>: {msgs.join(', ')}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label">Name *</label>
                  <input
                    type="text"
                    className={`form-control${errors.name ? ' is-invalid' : ''}`}
                    value={form.name as string}
                    onChange={(e) => set('name', e.target.value)}
                    required
                  />
                  {errors.name && <div className="invalid-feedback">{errors.name.join(', ')}</div>}
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Asset Type</label>
                    <select className="form-select" value={form.asset_type as string} onChange={(e) => set('asset_type', e.target.value)}>
                      {filterOpts?.asset_types.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">AWS Service Type</label>
                    <select className="form-select" value={form.aws_service_type as string} onChange={(e) => set('aws_service_type', e.target.value)}>
                      <option value="">---</option>
                      {filterOpts?.aws_service_types.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-4">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={form.status as string} onChange={(e) => set('status', e.target.value)}>
                      {filterOpts?.statuses.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Criticality</label>
                    <select className="form-select" value={form.criticality as string} onChange={(e) => set('criticality', e.target.value)}>
                      {filterOpts?.criticalities.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Data Classification</label>
                    <select className="form-select" value={form.data_classification as string} onChange={(e) => set('data_classification', e.target.value)}>
                      {filterOpts?.data_classifications.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">AWS Account</label>
                    <select className="form-select" value={form.aws_account as string} onChange={(e) => set('aws_account', e.target.value)}>
                      <option value="">---</option>
                      {accountsData?.results.map((a) => (
                        <option key={a.id} value={a.id}>{a.account_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">AWS Region</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.aws_region as string}
                      onChange={(e) => set('aws_region', e.target.value)}
                      placeholder="e.g. eu-central-1"
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Resource ID</label>
                    <input type="text" className="form-control" value={form.aws_resource_id as string} onChange={(e) => set('aws_resource_id', e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Resource ARN</label>
                    <input type="text" className="form-control" value={form.aws_resource_arn as string} onChange={(e) => set('aws_resource_arn', e.target.value)} />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Owner</label>
                    <input type="text" className="form-control" value={form.owner as string} onChange={(e) => set('owner', e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Vendor</label>
                    <input type="text" className="form-control" value={form.vendor as string} onChange={(e) => set('vendor', e.target.value)} />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">URL</label>
                    <input type="text" className={`form-control${errors.url ? ' is-invalid' : ''}`} value={form.url as string} onChange={(e) => set('url', e.target.value)} />
                    {errors.url && <div className="invalid-feedback">{errors.url.join(', ')}</div>}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Version</label>
                    <input type="text" className="form-control" value={form.version as string} onChange={(e) => set('version', e.target.value)} />
                  </div>
                </div>

                {/* Network: IP Addresses & DNS Names */}
                <hr />
                <h6>Network</h6>
                <div className="row">
                  <div className="col-md-6">
                    <TagInput
                      label="IP Addresses"
                      placeholder="e.g. 10.0.1.5"
                      values={form.ip_addresses as string[]}
                      onChange={(v) => set('ip_addresses', v)}
                      error={errors.ip_addresses}
                    />
                  </div>
                  <div className="col-md-6">
                    <TagInput
                      label="DNS Names"
                      placeholder="e.g. app.example.com"
                      values={form.dns_names as string[]}
                      onChange={(v) => set('dns_names', v)}
                      error={errors.dns_names}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows={3} value={form.description as string} onChange={(e) => set('description', e.target.value)} />
                </div>

                <div className="mb-3">
                  <label className="form-label">Notes</label>
                  <textarea className="form-control" rows={3} value={form.notes as string} onChange={(e) => set('notes', e.target.value)} />
                </div>

                <div className="mb-3">
                  <div className="form-check form-check-inline">
                    <input className="form-check-input" type="checkbox" checked={form.gdpr_relevant as boolean} onChange={(e) => set('gdpr_relevant', e.target.checked)} id="gdpr" />
                    <label className="form-check-label" htmlFor="gdpr">GDPR Relevant</label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input className="form-check-input" type="checkbox" checked={form.contains_personal_data as boolean} onChange={(e) => set('contains_personal_data', e.target.checked)} id="personal" />
                    <label className="form-check-label" htmlFor="personal">Contains Personal Data</label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input className="form-check-input" type="checkbox" checked={form.backup_enabled as boolean} onChange={(e) => set('backup_enabled', e.target.checked)} id="backup" />
                    <label className="form-check-label" htmlFor="backup">Backup Enabled</label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input className="form-check-input" type="checkbox" checked={form.monitoring_enabled as boolean} onChange={(e) => set('monitoring_enabled', e.target.checked)} id="monitoring" />
                    <label className="form-check-label" htmlFor="monitoring">Monitoring Enabled</label>
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={isPending}>
                    {isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Dependencies (only in edit mode, after asset exists) */}
          {isEdit && existing && (
            <div className="card mt-3">
              <div className="card-header"><strong>Dependencies</strong></div>
              <div className="card-body">
                {/* Current relationships */}
                {existing.outgoing_relationships.length > 0 && (
                  <table className="table table-sm mb-3">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Target Asset</th>
                        <th>Description</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {existing.outgoing_relationships.map((r) => (
                        <tr key={r.id}>
                          <td><span className="badge bg-info">{r.relationship_type}</span></td>
                          <td><strong>{r.related_asset_id}</strong> — {r.related_asset_name}</td>
                          <td className="small">{r.description || '—'}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleRemoveRelationship(r.id)}
                              disabled={deleteRelationship.isPending}
                              title="Remove"
                            >
                              <i className="bi bi-x-lg"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {existing.outgoing_relationships.length === 0 && (
                  <p className="text-muted small">No dependencies yet.</p>
                )}

                {/* Add new relationship */}
                <div className="d-flex gap-2 align-items-start">
                  <select
                    className="form-select form-select-sm"
                    style={{ maxWidth: 160 }}
                    value={relType}
                    onChange={(e) => setRelType(e.target.value)}
                  >
                    {RELATIONSHIP_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <div className="flex-grow-1">
                    <AssetAutocomplete
                      onSelect={handleAddRelationship}
                      excludeIds={existingRelIds}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
