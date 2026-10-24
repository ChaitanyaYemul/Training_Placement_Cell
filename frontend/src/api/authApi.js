import { axiosClient, setCsrfToken } from './axiosClient.js';
export async function currentUser({ signal }) {
  try {
    return (await axiosClient.get('/auth/me', { signal })).data;
  } catch (error) {
    if (error.status === 401) return null;
    throw error;
  }
}
export async function login(input) {
  const { data } = await axiosClient.post('/auth/login', input);
  setCsrfToken(data.csrfToken);
  return data.user;
}
export async function register(input) {
  return (await axiosClient.post('/auth/register', input)).data;
}
export async function logout() {
  await axiosClient.post('/auth/logout', {});
}
