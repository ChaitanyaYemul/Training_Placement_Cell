import { axiosClient } from './axiosClient.js';

export function exportReport(report, filters) {
  return axiosClient.get(`/admin/reports/${report}`, {
    params: { ...filters, format: 'csv' },
    headers: { Accept: 'text/csv' },
    // Default Axios transformation also preserves structured JSON errors.
    responseType: 'text',
    transformResponse: [
      (body) => {
        try {
          return JSON.parse(body);
        } catch {
          return body;
        }
      },
    ],
  });
}
