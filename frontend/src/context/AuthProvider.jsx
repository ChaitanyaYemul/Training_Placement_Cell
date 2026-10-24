import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/authApi.js';
import { resetSession } from '../api/axiosClient.js';
import { queryKeys } from '../api/queryKeys.js';
import { AuthContext } from './authContext.js';
export default function AuthProvider() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const me = useQuery({
    queryKey: queryKeys.me(),
    queryFn: async (context) => {
      const previous = client.getQueryData(queryKeys.me());
      const user = await api.currentUser(context);
      if (previous && !user)
        window.dispatchEvent(new Event('placement:session-expired'));
      if (
        previous &&
        user &&
        (previous.id !== user.id || previous.role !== user.role)
      ) {
        resetSession();
        client.removeQueries({
          predicate: (query) => query.queryKey[0] !== 'auth',
        });
      }
      return user;
    },
  });
  useEffect(() => {
    const expire = () => {
      resetSession();
      client.clear();
      client.setQueryData(queryKeys.me(), null);
      navigate('/login', {
        replace: true,
        state: { message: 'Your session expired. Please sign in again.' },
      });
    };
    window.addEventListener('placement:session-expired', expire);
    return () =>
      window.removeEventListener('placement:session-expired', expire);
  }, [client, navigate]);
  const login = useMutation({
    mutationFn: async (input) => {
      await client.cancelQueries();
      resetSession();
      return api.login(input);
    },
    onSuccess: (user) => {
      client.clear();
      client.setQueryData(queryKeys.me(), user);
    },
  });
  const logout = useMutation({
    mutationFn: api.logout,
    onSuccess: async () => {
      await client.cancelQueries();
      resetSession();
      client.clear();
      client.setQueryData(queryKeys.me(), null);
      navigate('/login', { replace: true });
    },
    onError: (error) => {
      if (error.status === 401) {
        resetSession();
        client.clear();
        client.setQueryData(queryKeys.me(), null);
        navigate('/login', { replace: true });
      }
    },
  });
  return (
    <AuthContext.Provider value={{ user: me.data, me, login, logout }}>
      <Outlet />
    </AuthContext.Provider>
  );
}
