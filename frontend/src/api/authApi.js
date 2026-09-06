import axiosClient from './axiosClient';

export const authApi = {
  // Core auth
  login: (credentials) => axiosClient.post('/auth/login', credentials),
  register: (userData) => axiosClient.post('/auth/register', userData),
  registerB2B: (b2bData) => axiosClient.post('/auth/register-b2b', b2bData),
  getMe: () => axiosClient.get('/auth/me'),
  updateProfile: (data) => axiosClient.put('/auth/profile', data),
  logout: () => axiosClient.post('/auth/logout'),

  // Password recovery & OTP verification
  forgotPassword: (email) => axiosClient.post('/auth/forgot-password', { email }),
  verifyResetCode: (payload) => axiosClient.post('/auth/verify-reset-code', payload),
  resetPassword: (payload) => axiosClient.post('/auth/reset-password', payload),

  // OAuth (prepared — tokens issued by Google/Apple and verified server-side)
  googleOAuth: (idToken) => axiosClient.post('/auth/oauth/google', { idToken }),
  appleOAuth: (idToken) => axiosClient.post('/auth/oauth/apple', { idToken })

};

export default authApi;
