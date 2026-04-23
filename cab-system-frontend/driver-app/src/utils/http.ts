import axios from 'axios';

export const authHttp = axios.create({
  baseURL: '/auth',
  timeout: 15000,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
});