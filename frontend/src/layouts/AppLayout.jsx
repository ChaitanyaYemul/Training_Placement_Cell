import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { Button, FormErrors } from '../components/ui.jsx';
import Brand from '../components/Brand.jsx';
export default function AppLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const workspace = /^\/(student|admin)\//.test(pathname);
  return (
    <div
      className={
        workspace ? 'app-shell workspace-shell' : 'app-shell public-shell'
      }
    >
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <NavLink to="/" aria-label="Placement Cell home">
            <Brand />
          </NavLink>
          <nav aria-label="Main navigation" className="header-nav">
            <NavLink className="nav-link overview-link" to="/" end>
              Overview
            </NavLink>
            {user ? (
              <>
                <NavLink className="nav-link" to={`/${user.role}/dashboard`}>
                  My workspace
                </NavLink>
                <Button
                  variant="secondary"
                  disabled={logout.isPending}
                  onClick={() => logout.mutate()}
                >
                  {logout.isPending ? 'Signing out…' : 'Sign out'}
                </Button>
              </>
            ) : (
              <>
                <NavLink className="nav-link" to="/login">
                  Sign in
                </NavLink>
                <NavLink className="button button-primary" to="/register">
                  Register <span aria-hidden="true">↗</span>
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className={workspace ? 'workspace-main' : 'public-main'}
      >
        <FormErrors
          error={logout.error?.status === 401 ? null : logout.error}
        />
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>
          VIT Pune <span aria-hidden="true">·</span> Training & Placement Cell
        </p>
        <p>Made for your next chapter.</p>
      </footer>
    </div>
  );
}
