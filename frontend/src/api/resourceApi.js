import { axiosClient } from './axiosClient.js';
export const readResource = (path, params, signal) =>
  axiosClient.get(path, { params, signal });
export const writeResource = ({ path, method, body }) =>
  axiosClient.request({ url: path, method, data: body });
