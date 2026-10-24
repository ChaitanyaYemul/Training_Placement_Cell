import { axiosClient } from './axiosClient.js';
export async function fetchHealth() {
  return (await axiosClient.get('/health')).data;
}
