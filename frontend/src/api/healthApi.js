import { axiosClient } from './axiosClient.js';
export async function fetchHealth() {
  return axiosClient.get('/health');
}
