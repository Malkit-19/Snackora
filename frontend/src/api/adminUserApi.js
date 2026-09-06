import axiosClient from './axiosClient';

export const adminUserApi = {
  // GET /api/v1/admin/users
  getAllUsers: (params) => axiosClient.get('/admin/users', { params }),

  // GET /api/v1/admin/users/:id
  getUserById: (id) => axiosClient.get(`/admin/users/${id}`),

  // PUT /api/v1/admin/users/:id
  updateUser: (id, data) => axiosClient.put(`/admin/users/${id}`, data),

  // PATCH /api/v1/admin/users/:id/status
  updateUserStatus: (id, status, reason) =>
    axiosClient.patch(`/admin/users/${id}/status`, { status, reason })
};

export default adminUserApi;
