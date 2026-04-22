import axios from 'axios';
import { API_URLS } from './config';

export const authHttp = axios.create({
  baseURL: `${API_URLS.AUTH}/api/auth`,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});