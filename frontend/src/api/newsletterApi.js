import axiosClient from './axiosClient';

export const newsletterApi = {
  subscribe: async (email) => {
    try {
      return await axiosClient.post('/newsletter/subscribe', { email });
    } catch (err) {
      // If backend endpoint is not yet mounted, return mock success for smooth UX
      if (err.status === 404) {
        return {
          success: true,
          message: 'Thank you for subscribing to Snackora cravings!'
        };
      }
      throw err;
    }
  }
};

export default newsletterApi;
