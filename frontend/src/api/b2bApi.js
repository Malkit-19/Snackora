import axiosClient from './axiosClient';

export const b2bApi = {
  // USER ENDPOINTS
  // POST /api/v1/b2b/apply
  applyB2B: (data) => axiosClient.post('/b2b/apply', data),

  // GET /api/v1/b2b/status
  getB2BStatus: () => axiosClient.get('/b2b/status'),

  // POST /api/v1/b2b/requests
  createRequest: (data) => axiosClient.post('/b2b/requests', data),

  // GET /api/v1/b2b/requests
  getMyRequests: () => axiosClient.get('/b2b/requests'),

  // ADMIN ENDPOINTS
  // GET /api/v1/admin/b2b/applications
  adminGetApplications: (params) => axiosClient.get('/admin/b2b/applications', { params }),

  // PATCH /api/v1/admin/b2b/applications/:id/approve
  adminApproveApplication: (id, data) => axiosClient.patch(`/admin/b2b/applications/${id}/approve`, data),

  // PATCH /api/v1/admin/b2b/applications/:id/reject
  adminRejectApplication: (id, data) => axiosClient.patch(`/admin/b2b/applications/${id}/reject`, data),

  // GET /api/v1/admin/b2b/requests
  adminGetRequests: (params) => axiosClient.get('/admin/b2b/requests', { params }),

  // PATCH /api/v1/admin/b2b/requests/:id
  adminUpdateRequest: (id, data) => axiosClient.patch(`/admin/b2b/requests/${id}`, data)
};

export default b2bApi;
