import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
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
    <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <aside>
        <p className="eyebrow mb-4">
          {role === 'admin' ? 'Placement cell' : 'Student workspace'}
        </p>
        <nav
          aria-label={`${role} navigation`}
          className="flex flex-wrap gap-1 lg:flex-col"
        >
          {(role === 'admin' ? adminLinks : studentLinks).map(
            ([path, label]) => (
              <NavLink className="nav-link" to={`/${role}/${path}`} key={path}>
                {label}
              </NavLink>
            ),
          )}
        </nav>
        <p className="mt-6 break-all text-xs text-stone-500">
          Signed in as {user.email}
        </p>
      </aside>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
