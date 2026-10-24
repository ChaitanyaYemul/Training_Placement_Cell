import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { Button, FormErrors } from '../components/ui.jsx';
export default function AppLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-white focus:p-4"
      >
        Skip to content
      </a>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <NavLink
            to="/"
            className="flex items-center gap-3"
            aria-label="Placement Cell home"
          >
            <span
              className="grid size-10 place-items-center rounded-xl bg-emerald-950 text-lg font-semibold text-white"
              aria-hidden="true"
            >
              P
            </span>
            <span className="font-semibold tracking-tight">
              Placement Cell
              <span className="block text-xs font-normal text-stone-500">
                Training & Placement
              </span>
            </span>
          </NavLink>
          <nav
            aria-label="Main navigation"
            className="flex flex-wrap items-center gap-2 text-sm font-medium"
          >
            <NavLink className="nav-link" to="/" end>
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
                  Register
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      <main
        id="main-content"
        className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12"
      >
        <FormErrors
          error={logout.error?.status === 401 ? null : logout.error}
        />
        <Outlet />
      </main>
      <footer className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 px-5 py-8 text-xs text-stone-500 sm:px-8">
        <p>College Training and Placement Cell</p>
        <p>Campus to career, together.</p>
      </footer>
    </div>
  );
}
