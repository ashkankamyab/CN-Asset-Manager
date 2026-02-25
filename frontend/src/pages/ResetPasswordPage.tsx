import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useResetPassword } from '../api/auth';
import client from '../api/client';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState('');
  const reset = useResetPassword();
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    client.get('/auth/csrf/');
  }, []);

  if (!uid || !token) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
        <div className="card shadow-sm" style={{ maxWidth: 420, width: '100%' }}>
          <div className="card-body p-4 text-center">
            <i className="bi bi-exclamation-triangle fs-1 text-warning" />
            <h5 className="mt-2">Invalid Reset Link</h5>
            <p className="text-muted small">
              This password reset link is invalid or has expired.
            </p>
            <Link to="/forgot-password" className="btn btn-primary mt-2">
              Request a new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError('');

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setLocalError('Passwords do not match.');
      return;
    }

    reset.mutate(
      { uid, token, password },
      { onSuccess: () => setSuccess(true) },
    );
  }

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="card shadow-sm" style={{ maxWidth: 420, width: '100%' }}>
        <div className="card-body p-4">
          <div className="text-center mb-4">
            <i className="bi bi-shield-check fs-1 text-primary" />
            <h5 className="mt-2">Set New Password</h5>
          </div>

          {success ? (
            <>
              <div className="alert alert-success">
                <i className="bi bi-check-circle me-1" />
                Your password has been reset successfully.
              </div>
              <Link to="/login" className="btn btn-primary w-100">
                Go to Login
              </Link>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoFocus
                />
                <div className="form-text">Minimum 8 characters.</div>
              </div>
              <div className="mb-3">
                <label className="form-label">Confirm Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              {(localError || reset.isError) && (
                <div className="alert alert-danger py-2 small">
                  {localError ||
                    (reset.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
                    'Something went wrong.'}
                </div>
              )}
              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={reset.isPending}
              >
                {reset.isPending ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          <div className="text-center mt-3">
            <Link to="/login" className="small">
              <i className="bi bi-arrow-left me-1" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
