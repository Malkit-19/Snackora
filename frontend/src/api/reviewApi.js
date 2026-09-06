import axiosClient from './axiosClient';

export const reviewApi = {
  // GET /api/v1/products/:id/reviews
  getProductReviews: (productId, params) =>
    axiosClient.get(`/products/${productId}/reviews`, { params }),

  // POST /api/v1/products/:id/reviews
  createReview: (productId, data) =>
    axiosClient.post(`/products/${productId}/reviews`, data),

  // PUT /api/v1/reviews/:id
  updateReview: (id, data) =>
    axiosClient.put(`/reviews/${id}`, data),

  // DELETE /api/v1/reviews/:id
  deleteReview: (id) =>
    axiosClient.delete(`/reviews/${id}`)
};

export default reviewApi;
