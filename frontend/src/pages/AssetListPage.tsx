import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import TopNavbar from '../components/TopNavbar';
import { useAssets, useFilterOptions, useBulkUpdate, useBulkAddDependency, useDecommissionAsset, searchAssets } from '../api/assets';
import type { AutocompleteResult } from '../api/assets';
import type { AssetListItem } from '../types';
import { useAuth } from '../contexts/AuthContext';

const CRITICALITY_BADGE: Record<string, string> = {
  CRITICAL: 'badge-critical',
  HIGH: 'badge-high',
  MEDIUM: 'badge-medium',
  LOW: 'badge-low',
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'badge-active',
  INACTIVE: 'badge-inactive',
  UNKNOWN: 'badge-unknown',
};

const SORTABLE_COLUMNS = [
  { key: 'asset_id', label: 'Asset ID' },
  { key: 'name', label: 'Name' },
  { key: 'aws_service_type', label: 'AWS Service' },
  { key: 'criticality', label: 'Criticality' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Created' },
  { key: 'last_seen_at', label: 'Last Seen' },
];

function InlineAssetAutocomplete({
  onSelect,
  placeholder,
}: {
  onSelect: (asset: AutocompleteResult) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AutocompleteResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback((q: string) => {
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    searchAssets(q).then((r) => {
      setResults(r);
      setOpen(true);
      setLoading(false);
    });
  }, []);

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
        placeholder={placeholder || 'Search asset...'}
        value={query}
        onChange={handleChange}
        onFocus={() => results.length > 0 && setOpen(true)}
        style={{ minWidth: 200 }}
      />
      {loading && (
        <div className="position-absolute end-0 top-50 translate-middle-y me-2">
          <div className="spinner-border spinner-border-sm" role="status" />
        </div>
      )}
      {open && results.length > 0 && (
        <ul
          className="dropdown-menu show w-100 position-absolute"
          style={{ maxHeight: 200, overflowY: 'auto', zIndex: 1050 }}
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
    </div>
  );
}

function AssetHoverCard({
  asset,
  children,
}: {
  asset: AssetListItem;
  children: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  function handleEnter() {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShow(true), 300);
  }

  function handleLeave() {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShow(false), 150);
  }

  return (
    <div
      ref={wrapperRef}
      className="asset-hover-wrapper"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
      {show && (
        <div className="asset-hover-card" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
          <div className="asset-hover-header">
            <strong>{asset.asset_id}</strong>
            <span
              className={`badge ms-2 ${CRITICALITY_BADGE[asset.criticality] || 'bg-secondary'}`}
            >
              {asset.criticality}
            </span>
            <span
              className={`badge ms-1 ${STATUS_BADGE[asset.status] || 'bg-secondary'}`}
            >
              {asset.status}
            </span>
          </div>
          <div className="asset-hover-name">{asset.name}</div>
          <table className="asset-hover-table">
            <tbody>
              <tr>
                <td className="asset-hover-label">Type</td>
                <td>{asset.asset_type_display}</td>
              </tr>
              {asset.aws_service_type_display && (
                <tr>
                  <td className="asset-hover-label">Service</td>
                  <td>{asset.aws_service_type_display}</td>
                </tr>
              )}
              {asset.category_name && (
                <tr>
                  <td className="asset-hover-label">Category</td>
                  <td>{asset.category_name}</td>
                </tr>
              )}
              {asset.aws_account_name && (
                <tr>
                  <td className="asset-hover-label">Account</td>
                  <td>{asset.aws_account_name}</td>
                </tr>
              )}
              {asset.aws_region && (
                <tr>
                  <td className="asset-hover-label">Region</td>
                  <td>{asset.aws_region}</td>
                </tr>
              )}
              {asset.owner && (
                <tr>
                  <td className="asset-hover-label">Owner</td>
                  <td>{asset.owner}</td>
                </tr>
              )}
              <tr>
                <td className="asset-hover-label">Created</td>
                <td>{new Date(asset.created_at).toLocaleDateString()}</td>
              </tr>
              {asset.last_seen_at && (
                <tr>
                  <td className="asset-hover-label">Last seen</td>
                  <td>{new Date(asset.last_seen_at).toLocaleDateString()}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ExcludeCheckboxGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string;
  onToggle: (value: string) => void;
}) {
  const values = selected ? selected.split(',') : [];
  const [open, setOpen] = useState(false);
  const count = values.length;

  return (
    <div className="mb-2">
      <div
        className="d-flex justify-content-between align-items-center small"
        style={{ cursor: 'pointer' }}
        onClick={() => setOpen(!open)}
      >
        <span>
          {label}
          {count > 0 && (
            <span className="badge bg-danger ms-1">{count}</span>
          )}
        </span>
        <i className={`bi bi-chevron-${open ? 'up' : 'down'}`} />
      </div>
      {open && (
        <div className="mt-1" style={{ maxHeight: 150, overflowY: 'auto' }}>
          {options.map((o) => (
            <div key={o.value} className="form-check form-check-sm">
              <input
                type="checkbox"
                className="form-check-input"
                id={`excl-${label}-${o.value}`}
                checked={values.includes(o.value)}
                onChange={() => onToggle(o.value)}
              />
              <label
                className="form-check-label small"
                htmlFor={`excl-${label}-${o.value}`}
              >
                {o.label}
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  paramKey,
  value,
  options,
  allLabel,
  onChange,
  onClear,
}: {
  label: string;
  paramKey: string;
  value: string;
  options: { value: string; label: string }[] | string[];
  allLabel: string;
  onChange: (key: string, value: string) => void;
  onClear: (key: string) => void;
}) {
  const isActive = !!value;
  return (
    <div className={`filter-group ${isActive ? 'filter-active' : ''}`}>
      <div className="filter-label">{label}</div>
      <div className="filter-select-wrapper">
        <select
          className="form-select form-select-sm"
          value={value}
          onChange={(e) => onChange(paramKey, e.target.value)}
        >
          <option value="">{allLabel}</option>
          {options.map((o) => {
            const val = typeof o === 'string' ? o : o.value;
            const lbl = typeof o === 'string' ? o : o.label;
            return (
              <option key={val} value={val}>
                {lbl}
              </option>
            );
          })}
        </select>
        {isActive && (
          <button
            type="button"
            className="filter-clear-btn"
            title={`Clear ${label}`}
            onClick={(e) => {
              e.stopPropagation();
              onClear(paramKey);
            }}
          >
            <i className="bi bi-x-lg" />
          </button>
        )}
      </div>
    </div>
  );
}

const STORAGE_KEY = 'assetListFilters';

export default function AssetListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOwner, setBulkOwner] = useState('');
  const [bulkCriticality, setBulkCriticality] = useState('');
  const [bulkClassification, setBulkClassification] = useState('');

  // Restore filters from sessionStorage on mount if URL has no params
  useEffect(() => {
    if (searchParams.toString() === '') {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSearchParams(new URLSearchParams(saved), { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist filters to sessionStorage on every change
  useEffect(() => {
    const str = searchParams.toString();
    if (str) {
      sessionStorage.setItem(STORAGE_KEY, str);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [searchParams]);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    searchParams.forEach((v, k) => {
      if (v) p[k] = v;
    });
    return p;
  }, [searchParams]);

  const currentSort = params.ordering || '-created_at';
  const currentPage = params.page || '1';

  const { isAdmin } = useAuth();
  const { data, isLoading } = useAssets(params);
  const { data: filterOpts } = useFilterOptions();
  const bulkUpdate = useBulkUpdate();
  const bulkDep = useBulkAddDependency();
  const decommission = useDecommissionAsset();
  const [bulkRelType, setBulkRelType] = useState('DEPENDS_ON');
  const [bulkDepResult, setBulkDepResult] = useState<string | null>(null);
  const [includeOpen, setIncludeOpen] = useState(true);
  const [excludeOpen, setExcludeOpen] = useState(true);

  const FILTER_KEYS = ['asset_type', 'aws_service_type', 'criticality', 'status', 'aws_account', 'aws_region'] as const;
  const EXCLUDE_KEYS = ['exclude_aws_service_type', 'exclude_asset_type', 'exclude_criticality', 'exclude_status'] as const;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    for (const k of FILTER_KEYS) {
      if (params[k]) count++;
    }
    if (params.search) count++;
    for (const k of EXCLUDE_KEYS) {
      if (params[k]) count += params[k].split(',').length;
    }
    return count;
  }, [params]);

  function clearAllFilters() {
    const next = new URLSearchParams();
    if (params.ordering) next.set('ordering', params.ordering);
    sessionStorage.removeItem(STORAGE_KEY);
    setSearchParams(next);
    setSelected(new Set());
  }

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
    setSelected(new Set());
  }

  function toggleExcludeValue(paramKey: string, value: string) {
    const current = params[paramKey] || '';
    const values = current ? current.split(',') : [];
    const idx = values.indexOf(value);
    if (idx >= 0) {
      values.splice(idx, 1);
    } else {
      values.push(value);
    }
    setParam(paramKey, values.join(','));
  }

  function toggleSort(col: string) {
    const next = currentSort === col ? `-${col}` : col;
    setParam('ordering', next);
  }

  function sortIcon(col: string) {
    if (currentSort === col) return <i className="bi bi-sort-up ms-1" />;
    if (currentSort === `-${col}`) return <i className="bi bi-sort-down ms-1" />;
    return null;
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!data) return;
    if (selected.size === data.results.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.results.map((a) => a.id)));
    }
  }

  function handleBulkUpdate() {
    const payload: Record<string, unknown> = {
      asset_ids: Array.from(selected),
    };
    if (bulkOwner) payload.owner = bulkOwner;
    if (bulkCriticality) payload.criticality = bulkCriticality;
    if (bulkClassification) payload.data_classification = bulkClassification;
    bulkUpdate.mutate(payload as never, {
      onSuccess: () => {
        setSelected(new Set());
        setBulkOwner('');
        setBulkCriticality('');
        setBulkClassification('');
      },
    });
  }

  const totalPages = data ? Math.ceil(data.count / 50) : 0;
  const pageNum = parseInt(currentPage, 10) || 1;

  return (
    <>
      <TopNavbar breadcrumbs={[{ label: 'Assets' }]} />

      <div className="row mt-1">
        {/* Filter Sidebar */}
        <div className="col-md-3 col-lg-2">
          <div className="filter-sidebar">
            <div className="card filter-card">
              {/* Header */}
              <div className="card-header py-2 d-flex justify-content-between align-items-center">
                <span>
                  <strong className="small">Filters</strong>
                  {activeFilterCount > 0 && (
                    <span className="badge bg-primary ms-1">{activeFilterCount}</span>
                  )}
                </span>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    className="filter-header-clear"
                    onClick={clearAllFilters}
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="card-body">
                {/* Search — always visible */}
                <div className="filter-group">
                  <div className="filter-label">Search</div>
                  <div className="filter-select-wrapper">
                    <input
                      type="text"
                      className={`form-control form-control-sm${params.search ? ' border-start border-primary border-3' : ''}`}
                      placeholder="Search..."
                      value={params.search || ''}
                      onChange={(e) => setParam('search', e.target.value)}
                    />
                    {params.search && (
                      <button
                        type="button"
                        className="filter-clear-btn"
                        title="Clear search"
                        onClick={() => setParam('search', '')}
                      >
                        <i className="bi bi-x-lg" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="filter-divider" />

                {/* Include Section */}
                <button
                  type="button"
                  className="filter-section-toggle"
                  onClick={() => setIncludeOpen(!includeOpen)}
                >
                  <span>Include</span>
                  <i className={`bi bi-chevron-${includeOpen ? 'up' : 'down'}`} />
                </button>
                {includeOpen && filterOpts && (
                  <div>
                    <FilterSelect
                      label="Type"
                      paramKey="asset_type"
                      value={params.asset_type || ''}
                      options={filterOpts.asset_types}
                      allLabel="All Types"
                      onChange={setParam}
                      onClear={(k) => setParam(k, '')}
                    />
                    <FilterSelect
                      label="Service"
                      paramKey="aws_service_type"
                      value={params.aws_service_type || ''}
                      options={filterOpts.aws_service_types}
                      allLabel="All Services"
                      onChange={setParam}
                      onClear={(k) => setParam(k, '')}
                    />
                    <FilterSelect
                      label="Criticality"
                      paramKey="criticality"
                      value={params.criticality || ''}
                      options={filterOpts.criticalities}
                      allLabel="All Criticalities"
                      onChange={setParam}
                      onClear={(k) => setParam(k, '')}
                    />
                    <FilterSelect
                      label="Status"
                      paramKey="status"
                      value={params.status || ''}
                      options={filterOpts.statuses}
                      allLabel="All Statuses"
                      onChange={setParam}
                      onClear={(k) => setParam(k, '')}
                    />
                    <FilterSelect
                      label="Account"
                      paramKey="aws_account"
                      value={params.aws_account || ''}
                      options={filterOpts.aws_accounts}
                      allLabel="All Accounts"
                      onChange={setParam}
                      onClear={(k) => setParam(k, '')}
                    />
                    <FilterSelect
                      label="Region"
                      paramKey="aws_region"
                      value={params.aws_region || ''}
                      options={filterOpts.aws_regions}
                      allLabel="All Regions"
                      onChange={setParam}
                      onClear={(k) => setParam(k, '')}
                    />
                  </div>
                )}

                <div className="filter-divider" />

                {/* Exclude Section */}
                <button
                  type="button"
                  className="filter-section-toggle"
                  onClick={() => setExcludeOpen(!excludeOpen)}
                >
                  <span>Exclude</span>
                  <i className={`bi bi-chevron-${excludeOpen ? 'up' : 'down'}`} />
                </button>
                {excludeOpen && filterOpts && (
                  <div>
                    <ExcludeCheckboxGroup
                      label="Services"
                      options={filterOpts.aws_service_types}
                      selected={params.exclude_aws_service_type || ''}
                      onToggle={(v) => toggleExcludeValue('exclude_aws_service_type', v)}
                    />
                    <ExcludeCheckboxGroup
                      label="Types"
                      options={filterOpts.asset_types}
                      selected={params.exclude_asset_type || ''}
                      onToggle={(v) => toggleExcludeValue('exclude_asset_type', v)}
                    />
                    <ExcludeCheckboxGroup
                      label="Criticalities"
                      options={filterOpts.criticalities}
                      selected={params.exclude_criticality || ''}
                      onToggle={(v) => toggleExcludeValue('exclude_criticality', v)}
                    />
                    <ExcludeCheckboxGroup
                      label="Statuses"
                      options={filterOpts.statuses}
                      selected={params.exclude_status || ''}
                      onToggle={(v) => toggleExcludeValue('exclude_status', v)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="col-md-9 col-lg-10">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <span className="text-muted small">
                {data ? `${data.count} assets` : '...'}
              </span>
            </div>
            <div className="d-flex gap-2">
              <a
                href={`/assets/export/csv/?${searchParams.toString()}`}
                className="btn btn-sm btn-outline-secondary"
              >
                <i className="bi bi-filetype-csv"></i> CSV
              </a>
              <a
                href={`/assets/export/excel/?${searchParams.toString()}`}
                className="btn btn-sm btn-outline-secondary"
              >
                <i className="bi bi-file-earmark-excel"></i> Excel
              </a>
              {isAdmin && (
                <Link to="/assets/new" className="btn btn-sm btn-primary">
                  <i className="bi bi-plus-lg"></i> Add Asset
                </Link>
              )}
            </div>
          </div>

          {/* Bulk Actions */}
          {isAdmin && selected.size > 0 && (
            <div className="alert alert-info py-2">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <strong>{selected.size} selected</strong>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Owner"
                  value={bulkOwner}
                  onChange={(e) => setBulkOwner(e.target.value)}
                  style={{ maxWidth: 150 }}
                />
                <select
                  className="form-select form-select-sm"
                  value={bulkCriticality}
                  onChange={(e) => setBulkCriticality(e.target.value)}
                  style={{ maxWidth: 140 }}
                >
                  <option value="">Criticality</option>
                  {filterOpts?.criticalities.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <select
                  className="form-select form-select-sm"
                  value={bulkClassification}
                  onChange={(e) => setBulkClassification(e.target.value)}
                  style={{ maxWidth: 170 }}
                >
                  <option value="">Classification</option>
                  {filterOpts?.data_classifications.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={handleBulkUpdate}
                  disabled={bulkUpdate.isPending}
                >
                  Update
                </button>
              </div>
              <hr className="my-2" />
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="small text-muted">Add dependency:</span>
                <select
                  className="form-select form-select-sm"
                  value={bulkRelType}
                  onChange={(e) => setBulkRelType(e.target.value)}
                  style={{ maxWidth: 150 }}
                >
                  <option value="DEPENDS_ON">Depends On</option>
                  <option value="CONTAINS">Contains</option>
                  <option value="CONNECTS_TO">Connects To</option>
                  <option value="MANAGED_BY">Managed By</option>
                </select>
                <InlineAssetAutocomplete
                  placeholder="Search target asset..."
                  onSelect={(target) => {
                    setBulkDepResult(null);
                    bulkDep.mutate(
                      {
                        asset_ids: Array.from(selected),
                        target_asset: target.id,
                        relationship_type: bulkRelType,
                      },
                      {
                        onSuccess: (res) => setBulkDepResult(res.detail),
                      },
                    );
                  }}
                />
                {bulkDep.isPending && (
                  <div className="spinner-border spinner-border-sm" role="status" />
                )}
                {bulkDepResult && (
                  <span className="small text-success">{bulkDepResult}</span>
                )}
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status" />
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      {isAdmin && (
                        <th style={{ width: 30 }}>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={
                              data !== undefined &&
                              data.results.length > 0 &&
                              selected.size === data.results.length
                            }
                            onChange={toggleAll}
                          />
                        </th>
                      )}
                      {SORTABLE_COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          style={{ cursor: 'pointer' }}
                          onClick={() => toggleSort(col.key)}
                        >
                          {col.label}
                          {sortIcon(col.key)}
                        </th>
                      ))}
                      <th>Account</th>
                      <th>Region</th>
                      <th>Owner</th>
                      {isAdmin && <th style={{ width: 50 }}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data?.results.map((asset) => (
                      <tr key={asset.id}>
                        {isAdmin && (
                          <td>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={selected.has(asset.id)}
                              onChange={() => toggleSelect(asset.id)}
                            />
                          </td>
                        )}
                        <td>
                          <Link to={`/assets/${asset.id}`}>
                            {asset.asset_id}
                          </Link>
                        </td>
                        <td>
                          <AssetHoverCard asset={asset}>
                            <Link to={`/assets/${asset.id}`}>{asset.name}</Link>
                          </AssetHoverCard>
                        </td>
                        <td>{asset.aws_service_type_display || asset.asset_type_display}</td>
                        <td>
                          <span
                            className={`badge ${
                              CRITICALITY_BADGE[asset.criticality] || 'bg-secondary'
                            }`}
                          >
                            {asset.criticality}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              STATUS_BADGE[asset.status] || 'bg-secondary'
                            }`}
                          >
                            {asset.status}
                          </span>
                        </td>
                        <td className="small">
                          {new Date(asset.created_at).toLocaleDateString()}
                        </td>
                        <td className="small">
                          {asset.last_seen_at
                            ? new Date(asset.last_seen_at).toLocaleDateString()
                            : '—'}
                        </td>
                        <td className="small">{asset.aws_account_name || '—'}</td>
                        <td className="small">{asset.aws_region || '—'}</td>
                        <td className="small">{asset.owner || '—'}</td>
                        {isAdmin && (
                          <td>
                            <Link
                              to={`/assets/${asset.id}/edit`}
                              className="btn btn-sm btn-outline-secondary py-0 px-1"
                              title="Edit"
                            >
                              <i className="bi bi-pencil-square" />
                            </Link>
                          </td>
                        )}
                      </tr>
                    ))}
                    {data?.results.length === 0 && (
                      <tr>
                        <td colSpan={isAdmin ? 12 : 10} className="text-muted text-center">
                          No assets found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <nav>
                  <ul className="pagination pagination-sm justify-content-center">
                    <li className={`page-item${pageNum <= 1 ? ' disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setParam('page', String(pageNum - 1))}
                      >
                        Previous
                      </button>
                    </li>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let p: number;
                      if (totalPages <= 7) {
                        p = i + 1;
                      } else if (pageNum <= 4) {
                        p = i + 1;
                      } else if (pageNum >= totalPages - 3) {
                        p = totalPages - 6 + i;
                      } else {
                        p = pageNum - 3 + i;
                      }
                      return (
                        <li
                          key={p}
                          className={`page-item${p === pageNum ? ' active' : ''}`}
                        >
                          <button
                            className="page-link"
                            onClick={() => setParam('page', String(p))}
                          >
                            {p}
                          </button>
                        </li>
                      );
                    })}
                    <li
                      className={`page-item${
                        pageNum >= totalPages ? ' disabled' : ''
                      }`}
                    >
                      <button
                        className="page-link"
                        onClick={() => setParam('page', String(pageNum + 1))}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
