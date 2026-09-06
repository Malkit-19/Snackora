import axiosClient from './axiosClient';

export const marketingApi = {
  // Public
  validateCoupon: (code, subtotal) =>
    axiosClient.post('/coupons/validate', { code, subtotal }),

  getActiveBanners: (params = { random: true }) =>
    axiosClient.get('/banners', { params }),

  getActiveAds: (placement, params = { random: true }) =>
    axiosClient.get('/ads', { params: { placement, ...params } }),


  // Admin Coupons
  adminGetAllCoupons: () =>
    axiosClient.get('/admin/coupons'),

  adminCreateCoupon: (data) =>
    axiosClient.post('/admin/coupons', data),

  adminUpdateCoupon: (id, data) =>
    axiosClient.put(`/admin/coupons/${id}`, data),

  adminDeleteCoupon: (id) =>
    axiosClient.delete(`/admin/coupons/${id}`),

  // Admin Banners
  adminGetAllBanners: () =>
    axiosClient.get('/admin/banners'),

  adminCreateBanner: (data) =>
    axiosClient.post('/admin/banners', data),

  adminUpdateBanner: (id, data) =>
    axiosClient.put(`/admin/banners/${id}`, data),

  adminDeleteBanner: (id) =>
    axiosClient.delete(`/admin/banners/${id}`),

  // Admin Ads
  adminGetAllAds: () =>
    axiosClient.get('/admin/ads'),

  adminCreateAd: (data) =>
    axiosClient.post('/admin/ads', data),

  adminUpdateAd: (id, data) =>
    axiosClient.put(`/admin/ads/${id}`, data),

  adminDeleteAd: (id) =>
    axiosClient.delete(`/admin/ads/${id}`),

  // WhatsApp Marketing Broadcasts
  adminGetBroadcastStats: () =>
    axiosClient.get('/admin/broadcast/stats'),

  adminGetBroadcastRecipients: (audience = 'ALL') =>
    axiosClient.get('/admin/broadcast/recipients', { params: { audience } }),

  adminBroadcastAdWhatsApp: (id, data = {}) =>
    axiosClient.post(`/admin/ads/${id}/broadcast`, data),

  adminCustomBroadcast: (data) =>
    axiosClient.post('/admin/broadcast', data)
};

export default marketingApi;
