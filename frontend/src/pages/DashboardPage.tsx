import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from 'recharts';
import TopNavbar from '../components/TopNavbar';
import { useDashboard } from '../api/dashboard';
import { useTheme } from '../contexts/ThemeContext';

/* ── colour palettes ─────────────────────────────────── */
const CRITICALITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'badge-status-pending',
  RUNNING: 'badge-status-running',
  COMPLETED: 'badge-status-completed',
  FAILED: 'badge-status-failed',
};

const ENV_BADGE: Record<string, string> = {
  PRODUCTION: 'badge-env-prod',
  STAGING: 'badge-env-staging',
  DEVELOPMENT: 'badge-env-dev',
  SHARED: 'badge-env-shared',
};

const CHART_PALETTE = [
  '#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b',
];

/* ── helpers ──────────────────────────────────────────── */
function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function formatDuration(seconds: number | null) {
  if (seconds == null) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

function formatCost(value: string | null) {
  if (!value) return '—';
  const num = parseFloat(value);
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(n: number) {
  return n.toLocaleString();
}

/* ── Stat Card ───────────────────────────────────────── */
function StatCard({ icon, label, value, accent, sub }: {
  icon: string; label: string; value: string | number; accent: string; sub?: string;
}) {
  return (
    <div className="dash-stat-card" style={{ '--accent': accent } as React.CSSProperties}>
      <div className="dash-stat-icon">
        <i className={`bi ${icon}`}></i>
      </div>
      <div className="dash-stat-body">
        <span className="dash-stat-label">{label}</span>
        <span className="dash-stat-value">{typeof value === 'number' ? formatNumber(value) : value}</span>
        {sub && <span className="dash-stat-sub">{sub}</span>}
      </div>
    </div>
  );
}

/* ── Dashboard ───────────────────────────────────────── */
export default function DashboardPage() {
  const { data, isLoading, error } = useDashboard();
  const { resolved: theme } = useTheme();
  const isDark = theme === 'dark';

  if (isLoading) {
    return (
      <>
        <TopNavbar breadcrumbs={[{ label: 'Dashboard' }]} />
        <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
          <div className="spinner-border text-primary" role="status" />
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <TopNavbar breadcrumbs={[{ label: 'Dashboard' }]} />
        <div className="alert alert-danger m-3">Failed to load dashboard data.</div>
      </>
    );
  }

  // Criticality donut data
  const critData = data.by_criticality.map((c) => ({
    name: c.criticality,
    value: c.count,
  }));
  const totalCritAssets = data.by_criticality.reduce((s, c) => s + c.count, 0);

  // Asset type horizontal bars
  const totalTypeAssets = data.by_type.reduce((s, t) => s + t.count, 0) || 1;

  return (
    <>
      <TopNavbar breadcrumbs={[{ label: 'Dashboard' }]} />

      {/* ── Stat Cards ─────────────────────────────────── */}
      <div className="dash-stats-row">
        <StatCard
          icon="bi-hdd-stack"
          label="Total Assets"
          value={data.total_assets}
          accent="#6366f1"
        />
        <StatCard
          icon="bi-cloud"
          label="AWS Accounts"
          value={data.total_accounts}
          accent="#06b6d4"
        />
        <StatCard
          icon="bi-exclamation-triangle"
          label="Critical Assets"
          value={data.critical_assets}
          accent="#ef4444"
        />
        <StatCard
          icon="bi-currency-dollar"
          label="Est. Monthly Cost"
          value={formatCost(data.total_monthly_cost)}
          accent="#f59e0b"
          sub={data.total_previous_month_cost ? `Prev: ${formatCost(data.total_previous_month_cost)}` : undefined}
        />
      </div>

      {/* ── Charts Row ─────────────────────────────────── */}
      <div className="row g-4 mb-4">
        {/* Bar Chart — Assets by Service */}
        <div className="col-lg-8">
          <div className="dash-card">
            <div className="dash-card-header">
              <h6 className="dash-card-title">Assets by AWS Service</h6>
            </div>
            <div className="dash-card-body">
              {data.by_service.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={data.by_service}
                    barSize={28}
                    margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
                  >
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={isDark ? '#2d3039' : '#f1f5f9'} />
                    <XAxis
                      dataKey="aws_service_type"
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(99,102,241,.06)' }}
                      contentStyle={{
                        borderRadius: 8,
                        border: isDark ? '1px solid #2d3039' : '1px solid #e9ecef',
                        background: isDark ? '#1a1d23' : '#fff',
                        color: isDark ? '#e5e7eb' : '#111827',
                        boxShadow: isDark ? '0 4px 12px rgba(0,0,0,.4)' : '0 4px 12px rgba(0,0,0,.08)',
                        fontSize: 12,
                        padding: '6px 10px',
                      }}
                    />
                    <Bar dataKey="count" fill="url(#barGrad)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted mb-0">No AWS assets discovered yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column — Criticality donut + Asset type bars */}
        <div className="col-lg-4 d-flex flex-column gap-4">
          {/* Criticality Donut */}
          <div className="dash-card flex-fill">
            <div className="dash-card-header">
              <h6 className="dash-card-title">Criticality Distribution</h6>
            </div>
            <div className="dash-card-body">
              {critData.length > 0 ? (
                <div className="dash-donut-wrapper">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={critData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {critData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={CRITICALITY_COLORS[entry.name] || '#94a3b8'}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: 'none',
                          background: isDark ? '#1a1d23' : '#fff',
                          color: isDark ? '#e5e7eb' : '#111827',
                          boxShadow: isDark ? '0 4px 12px rgba(0,0,0,.4)' : '0 4px 12px rgba(0,0,0,.1)',
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="dash-donut-center">
                    <span className="dash-donut-total">{totalCritAssets}</span>
                    <span className="dash-donut-label">Assets</span>
                  </div>
                </div>
              ) : (
                <p className="text-muted mb-0">No data yet.</p>
              )}
              {/* Legend */}
              <div className="dash-donut-legend">
                {critData.map((item) => (
                  <div key={item.name} className="dash-donut-legend-item">
                    <span
                      className="dash-donut-legend-dot"
                      style={{ backgroundColor: CRITICALITY_COLORS[item.name] || '#94a3b8' }}
                    />
                    <span className="dash-donut-legend-text">{item.name}</span>
                    <span className="dash-donut-legend-count">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Asset Types — horizontal bars */}
          {data.by_type.length > 0 && (
            <div className="dash-card flex-fill">
              <div className="dash-card-header">
                <h6 className="dash-card-title">Asset Types</h6>
              </div>
              <div className="dash-card-body">
                {data.by_type.map((item, i) => {
                  const pct = (item.count / totalTypeAssets) * 100;
                  const color = CHART_PALETTE[i % CHART_PALETTE.length];
                  return (
                    <div key={item.asset_type} className="dash-hbar-row">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="dash-hbar-label">{item.asset_type}</span>
                        <span className="dash-hbar-count">{item.count}</span>
                      </div>
                      <div className="dash-hbar-track">
                        <div
                          className="dash-hbar-fill"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── AWS Accounts ───────────────────────────────── */}
      <div className="dash-card mb-4">
        <div className="dash-card-header">
          <h6 className="dash-card-title">AWS Accounts Summary</h6>
        </div>
        <div className="table-responsive">
          <table className="table dash-table mb-0">
            <thead>
              <tr>
                <th>Account Name</th>
                <th>Environment</th>
                <th>Assets</th>
                <th className="text-end">Current Month</th>
                <th className="text-end">Previous Month</th>
                <th>Last Discovery</th>
              </tr>
            </thead>
            <tbody>
              {data.accounts.map((acct) => (
                <tr key={acct.id}>
                  <td>
                    <Link to="/accounts" className="dash-link">{acct.account_name}</Link>
                  </td>
                  <td>
                    <span className={`badge ${ENV_BADGE[acct.environment] || 'bg-secondary'}`}>
                      {acct.environment}
                    </span>
                  </td>
                  <td><span className="fw-semibold">{acct.asset_count}</span></td>
                  <td className="text-end font-monospace">{formatCost(acct.estimated_monthly_cost)}</td>
                  <td className="text-end font-monospace text-muted">{formatCost(acct.previous_month_cost)}</td>
                  <td className="text-muted">{formatDate(acct.last_discovery_at)}</td>
                </tr>
              ))}
              {data.accounts.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-muted text-center py-4">
                    No accounts configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Recent Discovery Jobs ──────────────────────── */}
      <div className="dash-card mb-4">
        <div className="dash-card-header">
          <h6 className="dash-card-title">Recent Discovery Jobs</h6>
        </div>
        <div className="table-responsive">
          <table className="table dash-table mb-0">
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Account</th>
                <th>Status</th>
                <th>Discovered</th>
                <th>Started</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <Link to={`/discovery/${job.id}`} className="dash-link font-monospace">
                      {job.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td>{job.aws_account_name || 'All Accounts'}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[job.status] || 'badge-status-pending'}`}>
                      {job.status === 'RUNNING' && (
                        <span className="spinner-border spinner-border-sm me-1" role="status" />
                      )}
                      {job.status}
                    </span>
                  </td>
                  <td><span className="fw-semibold">{job.resources_discovered}</span></td>
                  <td className="text-muted">{formatDate(job.started_at)}</td>
                  <td className="text-muted">{formatDuration(job.duration_seconds)}</td>
                </tr>
              ))}
              {data.recent_jobs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-muted text-center py-4">
                    No discovery jobs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
