import { useParams, Link, useNavigate } from 'react-router-dom';
import TopNavbar from '../components/TopNavbar';
import { useAsset, useDecommissionAsset } from '../api/assets';
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

function BoolBadge({ value, label }: { value: boolean; label: string }) {
  return (
    <span
      className="badge me-1"
      style={value ? { background: '#f0fdf4', color: '#166534' } : { background: '#f3f4f6', color: '#6b7280' }}
    >
      {value ? 'Yes' : 'No'} — {label}
    </span>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: asset, isLoading, error } = useAsset(id!);
  const decommission = useDecommissionAsset();

  if (isLoading) {
    return (
      <>
        <TopNavbar breadcrumbs={[{ label: 'Assets', href: '/assets' }, { label: '...' }]} />
        <div className="text-center py-5">
          <div className="spinner-border" role="status" />
        </div>
      </>
    );
  }

  if (error || !asset) {
    return (
      <>
        <TopNavbar breadcrumbs={[{ label: 'Assets', href: '/assets' }, { label: 'Error' }]} />
        <div className="alert alert-danger">Failed to load asset.</div>
      </>
    );
  }

  function handleDecommission() {
    if (!confirm(`Decommission "${asset!.name}"?`)) return;
    decommission.mutate(asset!.id, {
      onSuccess: () => navigate('/assets'),
    });
  }

  return (
    <>
      <TopNavbar
        breadcrumbs={[
          { label: 'Assets', href: '/assets' },
          { label: `${asset.asset_id} — ${asset.name}` },
        ]}
      />

      <div className="d-flex justify-content-between align-items-center mt-1 mb-3">
        <div>
          <h4 className="mb-1">{asset.name}</h4>
          <span className="text-muted me-2">{asset.asset_id}</span>
          <span className={`badge ${CRITICALITY_BADGE[asset.criticality] || 'bg-secondary'} me-1`}>
            {asset.criticality}
          </span>
          <span className={`badge ${STATUS_BADGE[asset.status] || 'bg-secondary'}`}>
            {asset.status}
          </span>
        </div>
        {isAdmin && (
          <div className="d-flex gap-2">
            <Link to={`/assets/${asset.id}/edit`} className="btn btn-sm btn-outline-primary">
              <i className="bi bi-pencil"></i> Edit
            </Link>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={handleDecommission}
              disabled={decommission.isPending}
            >
              <i className="bi bi-trash"></i> Decommission
            </button>
          </div>
        )}
      </div>

      <div className="row g-3">
        {/* General Information */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header"><strong>General Information</strong></div>
            <div className="card-body">
              <table className="table table-sm mb-0">
                <tbody>
                  <tr><th style={{ width: '40%' }}>Type</th><td>{asset.asset_type_display}</td></tr>
                  <tr><th>AWS Service</th><td>{asset.aws_service_type_display || '—'}</td></tr>
                  <tr><th>Category</th><td>{asset.category_detail?.name || '—'}</td></tr>
                  <tr><th>Owner</th><td>{asset.owner || '—'}</td></tr>
                  <tr><th>Department</th><td>{asset.department || '—'}</td></tr>
                  <tr><th>Vendor</th><td>{asset.vendor || '—'}</td></tr>
                  <tr><th>Version</th><td>{asset.version || '—'}</td></tr>
                  <tr><th>URL</th><td>{asset.url ? <a href={asset.url} target="_blank" rel="noreferrer">{asset.url}</a> : '—'}</td></tr>
                  <tr><th>Description</th><td>{asset.description || '—'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* AWS Details */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header"><strong>AWS Details</strong></div>
            <div className="card-body">
              <table className="table table-sm mb-0">
                <tbody>
                  <tr><th style={{ width: '40%' }}>Account</th><td>{asset.aws_account_detail?.account_name || '—'}</td></tr>
                  <tr><th>Region</th><td>{asset.aws_region || '—'}</td></tr>
                  <tr><th>Resource ID</th><td><code>{asset.aws_resource_id || '—'}</code></td></tr>
                  <tr><th>ARN</th><td><code className="small" style={{ wordBreak: 'break-all' }}>{asset.aws_resource_arn || '—'}</code></td></tr>
                  <tr><th>Discovered</th><td>{formatDate(asset.discovered_at)}</td></tr>
                  <tr><th>Last Seen</th><td>{formatDate(asset.last_seen_at)}</td></tr>
                  <tr><th>Manually Added</th><td>{asset.is_manually_added ? 'Yes' : 'No'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Compliance & Security */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header"><strong>Compliance &amp; Security</strong></div>
            <div className="card-body">
              <table className="table table-sm mb-0">
                <tbody>
                  <tr><th style={{ width: '40%' }}>Data Classification</th><td>{asset.data_classification_display}</td></tr>
                </tbody>
              </table>
              <div className="mt-2">
                <BoolBadge value={asset.gdpr_relevant} label="GDPR Relevant" />
                <BoolBadge value={asset.contains_personal_data} label="Personal Data" />
                <BoolBadge value={asset.backup_enabled} label="Backup" />
                <BoolBadge value={asset.monitoring_enabled} label="Monitoring" />
              </div>
            </div>
          </div>
        </div>

        {/* Network */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header"><strong>Network</strong></div>
            <div className="card-body">
              <h6 className="small text-muted">IP Addresses</h6>
              {asset.ip_addresses.length > 0 ? (
                <ul className="list-unstyled mb-2">
                  {asset.ip_addresses.map((ip, i) => (
                    <li key={i}><code>{ip}</code></li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted small">None</p>
              )}
              <h6 className="small text-muted">DNS Names</h6>
              {asset.dns_names.length > 0 ? (
                <ul className="list-unstyled mb-0">
                  {asset.dns_names.map((dns, i) => (
                    <li key={i}><code className="small">{dns}</code></li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted small mb-0">None</p>
              )}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header"><strong>Tags</strong></div>
            <div className="card-body">
              {Object.keys(asset.tags).length > 0 ? (
                <div className="d-flex flex-wrap gap-2">
                  {Object.entries(asset.tags).map(([k, v]) => (
                    <span key={k} className="badge" style={{ background: '#f3f4f6', color: '#4b5563', fontWeight: 500 }}>
                      {k}: {v}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-muted small mb-0">No tags.</p>
              )}
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header"><strong>Metadata</strong></div>
            <div className="card-body">
              {Object.keys(asset.metadata).length > 0 ? (
                <pre className="bg-light p-2 rounded small mb-0" style={{ maxHeight: 200, overflow: 'auto' }}>
                  {JSON.stringify(asset.metadata, null, 2)}
                </pre>
              ) : (
                <p className="text-muted small mb-0">No metadata.</p>
              )}
            </div>
          </div>
        </div>

        {/* Relationships */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header"><strong>Outgoing Relationships</strong></div>
            <div className="card-body">
              {asset.outgoing_relationships.length > 0 ? (
                <table className="table table-sm mb-0">
                  <thead>
                    <tr><th>Type</th><th>Target</th><th>Description</th></tr>
                  </thead>
                  <tbody>
                    {asset.outgoing_relationships.map((r) => (
                      <tr key={r.id}>
                        <td><span className="badge" style={{ background: '#dbeafe', color: '#1e40af' }}>{r.relationship_type}</span></td>
                        <td><Link to={`/assets/${r.related_asset_pk}`}>{r.related_asset_id} — {r.related_asset_name}</Link></td>
                        <td>{r.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-muted small mb-0">None.</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header"><strong>Incoming Relationships</strong></div>
            <div className="card-body">
              {asset.incoming_relationships.length > 0 ? (
                <table className="table table-sm mb-0">
                  <thead>
                    <tr><th>Type</th><th>Source</th><th>Description</th></tr>
                  </thead>
                  <tbody>
                    {asset.incoming_relationships.map((r) => (
                      <tr key={r.id}>
                        <td><span className="badge" style={{ background: '#dbeafe', color: '#1e40af' }}>{r.relationship_type}</span></td>
                        <td><Link to={`/assets/${r.related_asset_pk}`}>{r.related_asset_id} — {r.related_asset_name}</Link></td>
                        <td>{r.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-muted small mb-0">None.</p>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="col-12">
          <div className="card">
            <div className="card-header"><strong>Notes</strong></div>
            <div className="card-body">
              {asset.notes ? (
                <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{asset.notes}</p>
              ) : (
                <p className="text-muted mb-0">No notes.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
