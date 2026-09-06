import axiosClient from './axiosClient';

export const orderApi = {
  // USER ENDPOINTS
  // POST /api/v1/orders
  createOrder: (data) => axiosClient.post('/orders', data),

  // GET /api/v1/orders
  getMyOrders: (params) => axiosClient.get('/orders', { params }),

  // GET /api/v1/orders/:id
  getOrderById: (id) => axiosClient.get(`/orders/${id}`),

  // ADMIN ENDPOINTS
  // GET /api/v1/admin/orders
  adminGetAllOrders: (params) => axiosClient.get('/admin/orders', { params }),

  // GET /api/v1/admin/orders/:id
  adminGetOrderById: (id) => axiosClient.get(`/admin/orders/${id}`),

  // PATCH /api/v1/admin/orders/:id/status
  adminUpdateStatus: (id, data) => axiosClient.patch(`/admin/orders/${id}/status`, data)
};

export default orderApi;
