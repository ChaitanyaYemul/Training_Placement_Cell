import axios from 'axios';

export const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  timeout: 10_000,
});
let csrfToken, tokenRequest;
let generation = 0;
export function resetSession() {
  generation += 1;
  csrfToken = undefined;
  tokenRequest = undefined;
}
export function setCsrfToken(token) {
  csrfToken = token;
}
export async function ensureCsrf() {
  if (csrfToken) return csrfToken;
  if (!tokenRequest) {
    const current = generation;
    tokenRequest = axiosClient
      .get('/auth/csrf-token')
      .then(({ data }) => {
        if (current === generation) csrfToken = data.csrfToken;
        return data.csrfToken;
      })
      .finally(() => {
        if (current === generation) tokenRequest = undefined;
      });
  }
  return tokenRequest;
}
axiosClient.interceptors.request.use(async (config) => {
  config.sessionGeneration = generation;
  if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
    config.headers.set('X-CSRF-Token', await ensureCsrf());
  }
  if (config.sessionGeneration !== generation)
    throw new axios.CanceledError('Session changed');
  return config;
});
axiosClient.interceptors.response.use(
  (response) => {
    if (response.config.sessionGeneration !== generation)
      throw new axios.CanceledError('Session changed');
    return response.status === 204 ? { data: null } : response.data;
  },
  (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);
    if (error.config?.sessionGeneration !== generation)
      return Promise.reject(new axios.CanceledError('Session changed'));
    const normalized = new Error(
      error.response?.data?.error?.message || 'Unable to reach the API',
    );
    normalized.status = error.response?.status;
    normalized.code = error.response?.data?.error?.code || 'NETWORK_ERROR';
    normalized.details = error.response?.data?.error?.details || [];
    if (normalized.status === 403) csrfToken = undefined;
    if (normalized.status === 401 && !error.config?.url?.startsWith('/auth/')) {
      window.dispatchEvent(new Event('placement:session-expired'));
    }
    return Promise.reject(normalized);
  },
);
