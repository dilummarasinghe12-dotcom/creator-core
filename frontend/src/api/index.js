import axios from 'axios';

const BASE = (import.meta.env.VITE_API_URL || '') + '/api';

const api = axios.create({
  baseURL: BASE,
  // No default Content-Type — Axios sets application/json automatically for plain objects,
  // and lets the browser set multipart/form-data (with boundary) for FormData payloads.
  // A hardcoded application/json default causes Axios to JSON-stringify FormData, breaking uploads.
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(`${BASE}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/me', data),
  changePassword: (data) => api.post('/auth/me/change-password', data),
};

// Products
export const productsApi = {
  list: (params) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.patch(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  trackDownload: (id) => api.post(`/products/${id}/download`),
};

// Members (admin)
export const membersApi = {
  list: (params) => api.get('/members', { params }),
  getOne: (id) => api.get(`/members/${id}`),
  invite: (data) => api.post('/members/invite', data),
  update: (id, data) => api.patch(`/members/${id}`, data),
  remove: (id) => api.delete(`/members/${id}`),
  email: (id, data) => api.post(`/members/${id}/email`, data),
};

// Analytics
export const analyticsApi = {
  dashboard: () => api.get('/analytics/dashboard'),
  me: () => api.get('/analytics/me'),
};

// Live
export const liveApi = {
  list: (params) => api.get('/live', { params }),
  create: (data) => api.post('/live', data),
  update: (id, data) => api.patch(`/live/${id}`, data),
  start: (id) => api.post(`/live/${id}/start`),
  end: (id, data) => api.post(`/live/${id}/end`, data),
  delete: (id) => api.delete(`/live/${id}`),
};

// Notifications
export const notificationsApi = {
  list: () => api.get('/notifications'),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/mark-all-read'),
};

// Stripe
export const stripeApi = {
  checkout: (tier) => api.post('/stripe/checkout', { tier }),
  portal: () => api.post('/stripe/portal'),
  invoices: () => api.get('/stripe/invoices'),
  mrr: () => api.get('/stripe/mrr'),
  transactions: () => api.get('/stripe/transactions'),
};
