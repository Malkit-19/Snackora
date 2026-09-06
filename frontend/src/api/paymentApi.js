import axiosClient from './axiosClient';

export const paymentApi = {
  // GET /api/v1/payments/config (Public — returns razorpayKeyId if configured)
  getConfig: () => axiosClient.get('/payments/config'),

  // POST /api/v1/payments/create-razorpay-order
  createRazorpayOrder: (orderId) =>
    axiosClient.post('/payments/create-razorpay-order', { orderId }),

  // POST /api/v1/payments/verify
  verifyPayment: (data) =>
    axiosClient.post('/payments/verify', data),

  // POST /api/v1/payments/verify-direct-upi
  verifyDirectUpiPayment: (data) =>
    axiosClient.post('/payments/verify-direct-upi', data),

  // GET /api/v1/payments/order/:orderId
  getPaymentByOrder: (orderId) =>
    axiosClient.get(`/payments/order/${orderId}`)
};

export default paymentApi;
