import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar() {
  const { isAdmin } = useAuth();

  const links = [
    { to: '/', icon: 'bi-speedometer2', label: 'Dashboard' },
    { to: '/assets', icon: 'bi-hdd-stack', label: 'Assets' },
    { to: '/accounts', icon: 'bi-cloud', label: 'AWS Accounts' },
    { to: '/discovery', icon: 'bi-search', label: 'Discovery' },
    ...(isAdmin ? [{ to: '/settings', icon: 'bi-gear', label: 'Settings' }] : []),
  ];

  return (
    <nav className="sidebar d-flex flex-column">
      <div className="sidebar-brand">
        <i className="bi bi-shield-check"></i> Cloud Native Asset Manager
        <small>Compliance &amp; Inventory</small>
      </div>
      <hr className="mx-3 my-1" style={{ borderColor: '#333' }} />
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
      <div className="p-3">
        <small className="text-muted">v1.0.0</small>
      </div>
    </nav>
  );
}
