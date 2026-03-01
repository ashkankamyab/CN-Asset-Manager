import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function Sidebar() {
  const { isAdmin } = useAuth();
  const { mode, setMode } = useTheme();

  const links = [
    { to: '/', icon: 'bi-speedometer2', label: 'Dashboard' },
    { to: '/assets', icon: 'bi-hdd-stack', label: 'Assets' },
    { to: '/accounts', icon: 'bi-cloud', label: 'AWS Accounts' },
    { to: '/discovery', icon: 'bi-search', label: 'Discovery' },
    ...(isAdmin ? [{ to: '/settings', icon: 'bi-gear', label: 'Settings' }] : []),
  ];

  const modes = [
    { value: 'light' as const, icon: 'bi-sun-fill', title: 'Light' },
    { value: 'system' as const, icon: 'bi-display', title: 'System' },
    { value: 'dark' as const, icon: 'bi-moon-stars-fill', title: 'Dark' },
  ];

  return (
    <nav className="sidebar d-flex flex-column">
      <div className="sidebar-brand">
        <i className="bi bi-shield-check"></i> Cloud Native Asset Manager
        <small>Compliance &amp; Inventory</small>
      </div>
      <hr className="sidebar-divider" />
      <div className="sidebar-nav-label">Navigation</div>
      <ul className="nav flex-column flex-grow-1">
        {links.map((link) => (
          <li className="nav-item" key={link.to}>
            <NavLink
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `nav-link${isActive ? ' active' : ''}`
              }
            >
              <i className={`bi ${link.icon}`}></i> {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="p-3 d-flex justify-content-center">
        <div className="btn-group btn-group-sm" role="group" aria-label="Theme toggle">
          {modes.map((m) => (
            <button
              key={m.value}
              type="button"
              title={m.title}
              className={`btn ${mode === m.value ? 'btn-primary' : 'btn-outline-secondary'}`}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', border: mode === m.value ? undefined : '1px solid #4b5563' }}
              onClick={() => setMode(m.value)}
            >
              <i className={`bi ${m.icon}`}></i>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
