import axiosClient from './axiosClient';

export const categoryApi = {
  // Public
  // GET /api/v1/categories
  getAllCategories: () => axiosClient.get('/categories'),

  // GET /api/v1/categories/:slug
  getCategoryBySlug: (slug) => axiosClient.get(`/categories/${slug}`),

  // Admin
  // GET /api/v1/categories/admin/all
  adminGetAllCategories: () => axiosClient.get('/categories/admin/all'),

  // POST /api/v1/categories
  createCategory: (data) => axiosClient.post('/categories', data),

  // PUT /api/v1/categories/:id
  updateCategory: (id, data) => axiosClient.put(`/categories/${id}`, data),

  // PATCH /api/v1/categories/:id/status
  toggleCategoryStatus: (id, isActive) => axiosClient.patch(`/categories/${id}/status`, { isActive }),

  // DELETE /api/v1/categories/:id
  deleteCategory: (id) => axiosClient.delete(`/categories/${id}`)
};

export default categoryApi;
