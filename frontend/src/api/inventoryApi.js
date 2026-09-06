import axiosClient from './axiosClient';

export const inventoryApi = {
  // GET /api/v1/admin/inventory
  getOverview: (params) => axiosClient.get('/admin/inventory', { params }),

  // POST /api/v1/admin/inventory/adjust
  adjustInventory: (data) => axiosClient.post('/admin/inventory/adjust', data),

  // PATCH /api/v1/admin/inventory/:id
  adjustProductInventory: (id, data) => axiosClient.patch(`/admin/inventory/${id}`, data),

  // POST /api/v1/admin/inventory/quick-restock
  quickRestock: (productId, quantity = 50) =>
    axiosClient.post('/admin/inventory/quick-restock', { productId, quantity }),

  // GET /api/v1/admin/inventory/transactions
  getTransactions: (params) => axiosClient.get('/admin/inventory/transactions', { params })
};

export default inventoryApi;
