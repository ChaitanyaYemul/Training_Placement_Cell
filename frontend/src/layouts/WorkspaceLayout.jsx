import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import Icon from '../components/Icon.jsx';
import PageTransition from '../components/PageTransition.jsx';
const studentLinks = [
  ['dashboard', 'Dashboard'],
  ['profile', 'My profile'],
  ['companies', 'Companies'],
  ['drives', 'Placement drives'],
  ['applications', 'My applications'],
  ['announcements', 'Announcements'],
];
const adminLinks = [
  ['dashboard', 'Dashboard'],
  ['companies', 'Companies & jobs'],
  ['drives', 'Placement drives'],
  ['applications', 'Applications'],
  ['announcements', 'Announcements'],
  ['reports', 'Reports'],
];
export default function WorkspaceLayout({ role }) {
  const { user } = useAuth();
  return (
    <div className="workspace-grid">
      <aside className="workspace-sidebar">
        <div className="sidebar-title">
          <span className="status-dot" />
          {role === 'admin' ? 'PLACEMENT OFFICE' : 'STUDENT WORKSPACE'}
        </div>
        <nav aria-label={`${role} navigation`} className="sidebar-nav">
          {(role === 'admin' ? adminLinks : studentLinks).map(
            ([path, label]) => (
              <NavLink
                className="sidebar-link"
                to={`/${role}/${path}`}
                key={path}
              >
                <Icon name={path} />
                <span>{label}</span>
                <Icon name="chevron" size={14} className="sidebar-chevron" />
              </NavLink>
            ),
          )}
        </nav>
        <div className="sidebar-note">
          <span className="icon-tile">
            <Icon name="graduation" />
          </span>
          <strong>
            {role === 'admin'
              ? 'A little coordination. A big future.'
              : 'Your next chapter starts here.'}
          </strong>
          <p>
            {role === 'admin'
              ? 'Bring every opportunity closer to campus.'
              : 'Keep learning. Stay prepared. Make your move.'}
          </p>
        </div>
        <div className="sidebar-user">
          <span className="avatar">{role === 'admin' ? 'TP' : 'ST'}</span>
          <div>
            <strong>
              {role === 'admin' ? 'Administrator' : 'Student account'}
            </strong>
            <span>{user.email}</span>
          </div>
        </div>
      </aside>
      <PageTransition className="workspace-content">
        <Outlet />
      </PageTransition>
    </div>
  );
}
