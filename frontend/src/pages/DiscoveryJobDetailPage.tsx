import { useParams } from 'react-router-dom';
import { useRef, useEffect } from 'react';
import TopNavbar from '../components/TopNavbar';
import { useDiscoveryJob } from '../api/discovery';

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'badge-status-pending',
  RUNNING: 'badge-status-running',
  COMPLETED: 'badge-status-completed',
  FAILED: 'badge-status-failed',
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function formatDuration(seconds: number | null) {
  if (seconds == null) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

export default function DiscoveryJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading, error } = useDiscoveryJob(id!);
  const logRef = useRef<HTMLPreElement>(null);

  const isActive = job?.status === 'PENDING' || job?.status === 'RUNNING';

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [job?.log_output]);

  if (isLoading) {
    return (
      <>
        <TopNavbar breadcrumbs={[{ label: 'Discovery', href: '/discovery' }, { label: '...' }]} />
        <div className="text-center py-5">
          <div className="spinner-border" role="status" />
        </div>
      </>
    );
  }

  if (error || !job) {
    return (
      <>
        <TopNavbar breadcrumbs={[{ label: 'Discovery', href: '/discovery' }, { label: 'Error' }]} />
        <div className="alert alert-danger">Failed to load job details.</div>
      </>
    );
  }

  return (
    <>
      <TopNavbar
        breadcrumbs={[
          { label: 'Discovery', href: '/discovery' },
          { label: `Job ${job.id.slice(0, 8)}` },
        ]}
      />

      <div className="row g-3 mt-1">
        {/* Job Details */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header"><strong>Job Details</strong></div>
            <div className="card-body">
              <table className="table table-sm mb-0">
                <tbody>
                  <tr><th style={{ width: '40%' }}>Job ID</th><td><code>{job.id}</code></td></tr>
                  <tr><th>Account</th><td>{job.aws_account_name || 'All Accounts'}</td></tr>
                  <tr>
                    <th>Status</th>
                    <td>
                      <span className={`badge ${STATUS_BADGE[job.status] || 'bg-secondary'}`}>
                        {job.status === 'RUNNING' && (
                          <span className="spinner-border spinner-border-sm me-1" role="status" />
                        )}
                        {job.status}
                      </span>
                    </td>
                  </tr>
                  <tr><th>Started</th><td>{formatDate(job.started_at)}</td></tr>
                  <tr><th>Completed</th><td>{formatDate(job.completed_at)}</td></tr>
                  <tr><th>Duration</th><td>{formatDuration(job.duration_seconds)}</td></tr>
                  <tr><th>Triggered By</th><td>{job.triggered_by_username || '—'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="col-md-6">
          <div className="card">
            <div className="card-header"><strong>Results</strong></div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-4">
                  <div className="fs-3 fw-bold text-primary">
                    {job.resources_discovered}
                  </div>
                  <div className="text-muted small">Discovered</div>
                </div>
                <div className="col-4">
                  <div className="fs-3 fw-bold text-success">
                    {job.resources_new}
                  </div>
                  <div className="text-muted small">New</div>
                </div>
                <div className="col-4">
                  <div className="fs-3 fw-bold text-warning">
                    {job.resources_updated}
                  </div>
                  <div className="text-muted small">Updated</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {job.error_message && (
          <div className="col-12">
            <div className="card border-danger">
              <div className="card-header bg-danger text-white">
                <strong>Error</strong>
              </div>
              <div className="card-body">
                <pre className="mb-0 text-danger">{job.error_message}</pre>
              </div>
            </div>
          </div>
        )}

        {/* Log Output */}
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex align-items-center gap-2">
              <strong>Log Output</strong>
              {isActive && (
                <span className="badge" style={{ background: '#fef2f2', color: '#991b1b', animation: 'pulse 1.5s infinite' }}>
                  Live
                </span>
              )}
            </div>
            <div className="card-body p-0">
              {job.log_output ? (
                <pre
                  ref={logRef}
                  className="log-terminal mb-0"
                >
                  {job.log_output}
                </pre>
              ) : (
                <p className="text-muted p-3 mb-0">No log output.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
