import axiosClient from './axiosClient';

export const notificationApi = {
  // GET /api/v1/notifications
  getNotifications: (params) => axiosClient.get('/notifications', { params }),

  // PATCH /api/v1/notifications/:id/read
  markAsRead: (id) => axiosClient.patch(`/notifications/${id}/read`),

  // PATCH /api/v1/notifications/read-all
  markAllAsRead: () => axiosClient.patch('/notifications/read-all'),

  // GET /api/v1/notifications/push-config
  getPushConfig: () => axiosClient.get('/notifications/push-config'),

  // POST /api/v1/notifications/subscribe-push
  subscribePush: (subscription) => axiosClient.post('/notifications/subscribe-push', { subscription })
};

export default notificationApi;
