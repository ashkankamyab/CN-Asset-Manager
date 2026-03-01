import { useState } from 'react';
import { Link } from 'react-router-dom';
import TopNavbar from '../components/TopNavbar';
import { useAccounts, useTestConnection } from '../api/accounts';
import { useTriggerDiscovery } from '../api/discovery';
import { useAuth } from '../contexts/AuthContext';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export default function AccountListPage() {
  const { isAdmin } = useAuth();
  const { data, isLoading } = useAccounts();
  const testConn = useTestConnection();
  const triggerDisc = useTriggerDiscovery();

  const [testResult, setTestResult] = useState<{
    accountId: string;
    success?: boolean;
    message?: string;
    loading: boolean;
  } | null>(null);

  function handleTest(accountId: string) {
    setTestResult({ accountId, loading: true });
    testConn.mutate(accountId, {
      onSuccess: (result) => {
        setTestResult({ accountId, ...result, loading: false });
      },
      onError: (err: unknown) => {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setTestResult({
          accountId,
          success: false,
          message: axiosErr.response?.data?.message || 'Connection failed',
          loading: false,
        });
      },
    });
  }

  return (
    <>
      <TopNavbar breadcrumbs={[{ label: 'AWS Accounts' }]} />

      <div className="d-flex justify-content-between align-items-center mt-1 mb-3">
        <h5 className="mb-0">AWS Accounts</h5>
        {isAdmin && (
          <Link to="/accounts/new" className="btn btn-sm btn-primary">
            <i className="bi bi-plus-lg"></i> Add Account
          </Link>
        )}
      </div>

      {/* Test Connection Modal */}
      {testResult && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header py-2">
                <h6 className="modal-title">Connection Test</h6>
                <button className="btn-close" onClick={() => setTestResult(null)} />
              </div>
              <div className="modal-body text-center">
                {testResult.loading ? (
                  <div className="spinner-border text-primary" role="status" />
                ) : testResult.success ? (
                  <>
                    <i className="bi bi-check-circle-fill text-success fs-1"></i>
                    <p className="mt-2 mb-0">{testResult.message}</p>
                  </>
                ) : (
                  <>
                    <i className="bi bi-x-circle-fill text-danger fs-1"></i>
                    <p className="mt-2 mb-0 small">{testResult.message}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border" role="status" />
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Account Name</th>
                <th>Account ID</th>
                <th>Type</th>
                <th>Environment</th>
                <th>Status</th>
                <th>Assets</th>
                <th>Last Discovery</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.results.map((acct) => (
                <tr key={acct.id}>
                  <td><strong>{acct.account_name}</strong></td>
                  <td><code>{acct.account_id}</code></td>
                  <td><span className="badge badge-soft-gray">{acct.account_type_display}</span></td>
                  <td><span className="badge badge-soft-blue">{acct.environment_display}</span></td>
                  <td>
                    <span className={`badge ${acct.is_active ? 'badge-active' : 'badge-inactive'}`}>
                      {acct.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{acct.asset_count}</td>
                  <td className="small">{formatDate(acct.last_discovery_at)}</td>
                  <td>
                    <div className="d-flex gap-1">
                      {isAdmin && (
                        <Link
                          to={`/accounts/${acct.id}/edit`}
                          className="btn btn-sm btn-outline-primary"
                          title="Edit"
                        >
                          <i className="bi bi-pencil"></i>
                        </Link>
                      )}
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        title="Test Connection"
                        onClick={() => handleTest(acct.id)}
                      >
                        <i className="bi bi-plug"></i>
                      </button>
                      {isAdmin && (
                        <button
                          className="btn btn-sm btn-outline-success"
                          title="Run Discovery"
                          disabled={triggerDisc.isPending}
                          onClick={() => triggerDisc.mutate(acct.id)}
                        >
                          <i className="bi bi-arrow-repeat"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {data?.results.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-muted text-center">
                    No accounts configured.
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
