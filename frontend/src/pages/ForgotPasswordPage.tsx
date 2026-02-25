import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForgotPassword } from '../api/auth';
import client from '../api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const forgot = useForgotPassword();
  const [sent, setSent] = useState(false);

  useEffect(() => {
    client.get('/auth/csrf/');
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(false);
    forgot.mutate(email, {
      onSuccess: () => setSent(true),
    });
  }

  return (
    <div className="login-wrapper">
      <div className="login-card" style={{ maxWidth: 420, width: '100%', margin: '0 1rem' }}>
        <div className="card-body p-4">
          <div className="text-center mb-4">
            <div className="login-brand-icon">
              <i className="bi bi-shield-check"></i>
            </div>
            <h5 className="mt-2">Reset Password</h5>
            <p className="text-muted small">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {sent ? (
            <div className="alert alert-success">
              <i className="bi bi-check-circle me-1" />
              If an account with that email exists, a reset link has been sent. Check your inbox.
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                />
              </div>
              {forgot.isError && (
                <div className="alert alert-danger py-2 small">
                  {(forgot.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
                    'Something went wrong. Please try again.'}
                </div>
              )}
              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={forgot.isPending}
              >
                {forgot.isPending ? 'Sending...' : 'Send Reset Link'}
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
