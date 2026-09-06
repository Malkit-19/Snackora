import axiosClient from './axiosClient';

export const adminApi = {
  // GET /api/v1/admin/dashboard
  getDashboardAnalytics: (params) => axiosClient.get('/admin/dashboard', { params })
};

export default adminApi;
