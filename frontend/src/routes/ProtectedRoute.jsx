import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { QueryState } from '../components/ui.jsx';
export default function ProtectedRoute({ role }) {
  const { user, me } = useAuth();
  const location = useLocation();
  if (me.isPending || me.isError) return <QueryState query={me} />;
  if (!user)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  if (user.role !== role)
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  return <Outlet />;
}
