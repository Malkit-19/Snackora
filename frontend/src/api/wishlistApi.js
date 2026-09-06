import axiosClient from './axiosClient';

export const wishlistApi = {
  // GET /api/v1/wishlist
  getWishlist: () => axiosClient.get('/wishlist'),

  // POST /api/v1/wishlist/:productId
  addToWishlist: (productId) => axiosClient.post(`/wishlist/${productId}`),

  // DELETE /api/v1/wishlist/:productId
  removeFromWishlist: (productId) => axiosClient.delete(`/wishlist/${productId}`)
};

export default wishlistApi;
