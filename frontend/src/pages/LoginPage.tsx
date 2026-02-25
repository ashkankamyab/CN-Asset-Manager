import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLogin, useConfig, useCurrentUser } from '../api/auth';
import axios from 'axios';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const login = useLogin();
  const { data: config } = useConfig();
  const { data: user } = useCurrentUser();
  const next = searchParams.get('next') || '/';

  // Fetch CSRF cookie on mount
  useEffect(() => {
    axios.get('/api/auth/csrf/', { withCredentials: true });
  }, []);

  // If already logged in, redirect
  useEffect(() => {
    if (user) navigate(next, { replace: true });
  }, [user, navigate, next]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    login.mutate(
      { username, password },
      {
        onSuccess: () => navigate(next, { replace: true }),
        onError: (err: unknown) => {
          if (axios.isAxiosError(err) && err.response?.data?.detail) {
            setError(err.response.data.detail);
          } else {
            setError('Login failed. Please try again.');
          }
        },
      },
    );
  }

  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: '100vh', background: '#1a1d23' }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div className="text-center mb-4">
          <h2 className="fw-bold text-white mb-1">Cloud Native Asset Manager</h2>
          <p className="text-secondary small">Sign in to continue</p>
        </div>

        <div className="card border-0 shadow">
          <div className="card-body p-4">
            {error && (
              <div className="alert alert-danger py-2 small">{error}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="username" className="form-label small fw-semibold">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  className="form-control"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <label htmlFor="password" className="form-label small fw-semibold mb-0">
                    Password
                  </label>
                  <Link to="/forgot-password" className="small" tabIndex={-1}>
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  className="form-control mt-1"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={login.isPending}
              >
                {login.isPending ? (
                  <span className="spinner-border spinner-border-sm me-2" />
                ) : (
                  <i className="bi bi-box-arrow-in-right me-2" />
                )}
                Sign in
              </button>
            </form>

            {config?.oidc_enabled && (
              <>
                <div className="d-flex align-items-center my-3">
                  <hr className="flex-grow-1" />
                  <span className="px-3 text-muted small">or</span>
                  <hr className="flex-grow-1" />
                </div>
                <a
                  href={`/oidc/authenticate/?next=${encodeURIComponent(next)}`}
                  className="btn btn-outline-secondary w-100"
                >
                  <i className="bi bi-shield-lock me-2" />
                  Sign in with OIDC
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
