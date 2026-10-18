import axios from 'axios';

export const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  timeout: 10_000,
});
// Phase 1 exposes only a public GET. Require an explicit CSRF token before any future write.
axiosClient.interceptors.request.use((config) => {
  if (
    ['post', 'put', 'patch', 'delete'].includes(config.method) &&
    !config.headers.get('X-CSRF-Token')
  ) {
    throw new Error(
      'State-changing requests require CSRF integration, which is not implemented yet.',
    );
  }
  return config;
});
axiosClient.interceptors.response.use(
  (response) => response.data.data,
  (error) => {
    const normalized = new Error(
      error.response?.data?.error?.message || 'Unable to reach the API',
    );
    normalized.status = error.response?.status;
    normalized.code = error.response?.data?.error?.code || 'NETWORK_ERROR';
    normalized.details = error.response?.data?.error?.details || [];
    return Promise.reject(normalized);
  },
);
