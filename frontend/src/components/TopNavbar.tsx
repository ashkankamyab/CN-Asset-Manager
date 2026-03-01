import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLogout } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  breadcrumbs: { label: string; href?: string }[];
}

export default function TopNavbar({ breadcrumbs }: Props) {
  const logout = useLogout();
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="top-navbar d-flex justify-content-between align-items-center">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb mb-0">
          {breadcrumbs.map((bc, i) => (
            <li
              key={i}
              className={`breadcrumb-item${
                i === breadcrumbs.length - 1 ? ' active' : ''
              }`}
            >
              {bc.href && i < breadcrumbs.length - 1 ? (
                <a href={bc.href}>{bc.label}</a>
              ) : (
                bc.label
              )}
            </li>
          ))}
        </ol>
      </nav>
      <div className="d-flex align-items-center gap-3">
        <div className="dropdown" ref={ref}>
          <button
            type="button"
            className="btn btn-link d-flex align-items-center text-decoration-none dropdown-toggle text-dark p-0"
            onClick={() => setOpen(!open)}
          >
            <i className="bi bi-person-circle me-1"></i>
            {user?.username ?? 'User'}
            {isAdmin && <span className="badge badge-soft-indigo ms-2">Admin</span>}
            {user?.role === 'readonly' && <span className="badge badge-soft-gray ms-2">Read Only</span>}
          </button>
          {open && (
            <ul className="dropdown-menu dropdown-menu-end show">
              {isAdmin && user && (
                <li>
                  <Link className="dropdown-item" to="/settings" onClick={() => setOpen(false)}>
                    <i className="bi bi-person-gear me-2"></i>User Info
                  </Link>
                </li>
              )}
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setOpen(false);
                    logout.mutate();
                  }}
                  disabled={logout.isPending}
                >
                  <i className="bi bi-box-arrow-right me-2"></i>Logout
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
