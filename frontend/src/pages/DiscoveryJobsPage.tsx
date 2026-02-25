import { useState } from 'react';
import { Link } from 'react-router-dom';
import TopNavbar from '../components/TopNavbar';
import { useDiscoveryJobs, useTriggerDiscovery } from '../api/discovery';
import { useAccounts } from '../api/accounts';
import { useAuth } from '../contexts/AuthContext';

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

export default function DiscoveryJobsPage() {
  const { isAdmin } = useAuth();
  const { data, isLoading } = useDiscoveryJobs();
  const { data: accountsData } = useAccounts();
  const trigger = useTriggerDiscovery();
  const [selectedAccount, setSelectedAccount] = useState('');

  function handleTrigger() {
    trigger.mutate(selectedAccount || undefined);
  }

  return (
    <>
      <TopNavbar breadcrumbs={[{ label: 'Discovery' }]} />

      <div className="d-flex justify-content-between align-items-center mt-1 mb-3">
        <h5 className="mb-0">Discovery Jobs</h5>
        {isAdmin && (
          <div className="d-flex gap-3 align-items-center">
            <select
              className="form-select"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              style={{ maxWidth: 200 }}
            >
              <option value="">All Accounts</option>
              {accountsData?.results.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_name}
                </option>
              ))}
            </select>
            <button
              className="btn btn-primary text-nowrap"
              onClick={handleTrigger}
              disabled={trigger.isPending}
            >
              <i className="bi bi-play-fill"></i>{' '}
              {trigger.isPending ? 'Starting...' : 'Start Discovery'}
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border" role="status" />
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Account</th>
                <th>Status</th>
                <th>Discovered</th>
                <th>New</th>
                <th>Updated</th>
                <th>Started</th>
                <th>Duration</th>
                <th>Triggered By</th>
              </tr>
            </thead>
            <tbody>
              {data?.results.map((job) => (
                <tr key={job.id}>
                  <td>
                    <Link to={`/discovery/${job.id}`}>
                      {job.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td>{job.aws_account_name || 'All Accounts'}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[job.status] || 'bg-secondary'}`}>
                      {job.status === 'RUNNING' && (
                        <span className="spinner-border spinner-border-sm me-1" role="status" />
                      )}
                      {job.status}
                    </span>
                  </td>
                  <td>{job.resources_discovered}</td>
                  <td>{job.resources_new}</td>
                  <td>{job.resources_updated}</td>
                  <td className="small">{formatDate(job.started_at)}</td>
                  <td className="small">{formatDuration(job.duration_seconds)}</td>
                  <td className="small">{job.triggered_by_username || '—'}</td>
                </tr>
              ))}
              {data?.results.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-muted text-center">
                    No discovery jobs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
