import axiosClient from './axiosClient';

export const checkoutApi = {
  // GET /api/v1/checkout/summary
  getSummary: () => axiosClient.get('/checkout/summary'),

  // POST /api/v1/checkout/place-order
  placeOrder: (data) => axiosClient.post('/checkout/place-order', data),

  // GET /api/v1/checkout/orders
  getMyOrders: (params) => axiosClient.get('/checkout/orders', { params }),

  // GET /api/v1/checkout/orders/:orderNumber
  getOrderByNumber: (orderNumber) => axiosClient.get(`/checkout/orders/${orderNumber}`)
};

export default checkoutApi;
