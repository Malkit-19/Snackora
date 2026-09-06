import axiosClient from './axiosClient';

export const cartApi = {
  // GET /api/v1/cart
  getCart: () => axiosClient.get('/cart'),

  // POST /api/v1/cart/items
  addToCart: (productId, quantity = 1) =>
    axiosClient.post('/cart/items', { productId, quantity }),

  // PATCH /api/v1/cart/items/:id
  updateCartItem: (itemId, quantity) =>
    axiosClient.patch(`/cart/items/${itemId}`, { quantity }),

  // DELETE /api/v1/cart/items/:id
  removeFromCart: (itemId) =>
    axiosClient.delete(`/cart/items/${itemId}`),

  // DELETE /api/v1/cart
  clearCart: () =>
    axiosClient.delete('/cart')
};

export default cartApi;
