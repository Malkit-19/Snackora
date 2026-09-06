import axiosClient from './axiosClient';

export const refundApi = {
  // Customer
  // POST /api/v1/refunds
  createRefund: (data) => axiosClient.post('/refunds', data),

  // GET /api/v1/refunds
  getCustomerRefunds: (params) => axiosClient.get('/refunds', { params }),

  // GET /api/v1/refunds/:id
  getRefundById: (id) => axiosClient.get(`/refunds/${id}`),

  // Admin
  // GET /api/v1/admin/refunds
  adminGetAllRefunds: (params) => axiosClient.get('/admin/refunds', { params }),

  // PATCH /api/v1/admin/refunds/:id
  adminUpdateRefundStatus: (id, data) => axiosClient.patch(`/admin/refunds/${id}`, data)
};

export default refundApi;
