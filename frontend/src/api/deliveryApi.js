import axiosClient from './axiosClient';

export const deliveryApi = {
  // Public / Customer
  getDeliveryRates: (destinationPincode, weightKg = 0.5, cod = false) =>
    axiosClient.post('/delivery/rates', { destinationPincode, weightKg, cod }),

  getOrderTracking: (orderId) =>
    axiosClient.get(`/orders/${orderId}/tracking`),

  // Admin
  adminCreateShipment: (data) =>
    axiosClient.post('/admin/shipments', data),

  adminGetAllShipments: (params) =>
    axiosClient.get('/admin/shipments', { params }),

  adminGetShipmentById: (id) =>
    axiosClient.get(`/admin/shipments/${id}`),

  adminCancelShipment: (id, reason) =>
    axiosClient.post(`/admin/shipments/${id}/cancel`, { reason }),

  adminUpdateShipmentStatus: (id, data) =>
    axiosClient.patch(`/admin/shipments/${id}/status`, data)
};

export default deliveryApi;
