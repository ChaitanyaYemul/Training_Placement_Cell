import { NavLink, Outlet } from 'react-router-dom';
export default function AppLayout() {
  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-white focus:p-4"
      >
        Skip to content
      </a>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-5 sm:px-8">
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
              <span className="block text-xs font-normal tracking-normal text-stone-500">
                Training & Placement
              </span>
            </span>
          </NavLink>
          <nav
            aria-label="Main navigation"
            className="flex flex-wrap gap-2 text-sm font-medium"
          >
            <NavLink to="/" end className="nav-link">
              Overview
            </NavLink>
            <NavLink to="/student/dashboard" className="nav-link">
              Student
            </NavLink>
            <NavLink to="/admin/dashboard" className="nav-link">
              Admin
            </NavLink>
          </nav>
        </div>
      </header>
      <main
        id="main-content"
        className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16"
      >
        <Outlet />
      </main>
      <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-5 py-8 text-xs text-stone-500 sm:px-8">
        <p>College Training and Placement Cell</p>
        <p>Phase 1 · Development foundation</p>
      </footer>
    </div>
  );
}
