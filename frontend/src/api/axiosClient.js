import axios from 'axios';

const axiosClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000 // 15 seconds — prevents infinite loading on cold starts or slow network
});

// Request interceptor to attach JWT token
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('snackora_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for unified error unwrapping
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // If 401 and token was invalid, clear local auth
    if (error.response && error.response.status === 401) {
      const isAuthEndpoint = error.config.url.includes('/auth/login') || error.config.url.includes('/auth/register');
      if (!isAuthEndpoint) {
        localStorage.removeItem('snackora_token');
        localStorage.removeItem('snackora_user');
      }
    }

    const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
    const message = isTimeout
      ? 'The server is taking too long to respond. Please try again in a moment.'
      : (error.response?.data?.message ||
         error.message ||
         'An unexpected network error occurred.');

    return Promise.reject({
      message,
      status: error.response?.status,
      errors: error.response?.data?.errors || null
    });
  }
);

// postFormData — helper for multipart/form-data uploads (Cloudinary upload endpoint)
axiosClient.postFormData = async (url, formData) => {
  const token = localStorage.getItem('snackora_token');
  const response = await axiosClient.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  return response;
};

export default axiosClient;
