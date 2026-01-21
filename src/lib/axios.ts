import axios from 'axios';
import conf from '../conf/conf';

const api = axios.create({
  baseURL: conf.baseURL,
  withCredentials: true,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add access token to headers
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/login/refresh')) {
      originalRequest._retry = true;

      try {
        // Call refresh endpoint
        const response = await api.post('/login/refresh');
        const { access_token } = response.data;

        // Store new token
        sessionStorage.setItem('access_token', access_token);

        // Update header for original request
        originalRequest.headers.Authorization = `Bearer ${access_token}`;

        // Retry original request
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear token and reject
        sessionStorage.removeItem('access_token');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
