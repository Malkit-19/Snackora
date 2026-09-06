import axiosClient from './axiosClient';

export const addressApi = {
  // GET /api/v1/addresses
  getAddresses: () => axiosClient.get('/addresses'),

  // POST /api/v1/addresses
  addAddress: (data) => axiosClient.post('/addresses', data),

  // PUT /api/v1/addresses/:id
  updateAddress: (id, data) => axiosClient.put(`/addresses/${id}`, data),

  // DELETE /api/v1/addresses/:id
  deleteAddress: (id) => axiosClient.delete(`/addresses/${id}`),

  // PATCH /api/v1/addresses/:id/default
  setDefault: (id) => axiosClient.patch(`/addresses/${id}/default`)
};

export default addressApi;
