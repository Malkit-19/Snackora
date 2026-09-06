/**
 * Snackora Product API additions for detail page interactions
 */
import axiosClient from './axiosClient';

export const catalogApi = {
  getCategories: () => axiosClient.get('/categories'),
  getCategoryBySlug: (slug) => axiosClient.get(`/categories/${slug}`),
  getProducts: (params = {}) => axiosClient.get('/products', { params }),
  getProductBySlug: (slug) => axiosClient.get(`/products/${slug}`),
  getFeaturedProducts: () => axiosClient.get('/products/featured'),
  getRelatedProducts: (categorySlug, currentSlug) =>
    axiosClient.get('/products', {
      params: { category: categorySlug, limit: 6 }
    }).then((res) => {
      // Exclude the current product from related
      if (res.success && res.data?.products) {
        res.data.products = res.data.products.filter((p) => p.slug !== currentSlug);
      }
      return res;
    })
};

export default catalogApi;
