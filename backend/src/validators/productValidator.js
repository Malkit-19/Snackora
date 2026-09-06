/**
 * Product & Filter Query Validator
 */
const validateProductQuery = (query = {}) => {
  const errors = [];
  const { minPrice, maxPrice, page, limit, minRating } = query;

  if (minPrice !== undefined && (isNaN(Number(minPrice)) || Number(minPrice) < 0)) {
    errors.push('minPrice must be a positive number.');
  }

  if (maxPrice !== undefined && (isNaN(Number(maxPrice)) || Number(maxPrice) < 0)) {
    errors.push('maxPrice must be a positive number.');
  }

  if (minPrice !== undefined && maxPrice !== undefined && Number(minPrice) > Number(maxPrice)) {
    errors.push('minPrice cannot be greater than maxPrice.');
  }

  if (page !== undefined && (!Number.isInteger(Number(page)) || Number(page) < 1)) {
    errors.push('page must be an integer >= 1.');
  }

  if (limit !== undefined && (!Number.isInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)) {
    errors.push('limit must be an integer between 1 and 100.');
  }

  if (minRating !== undefined && (isNaN(Number(minRating)) || Number(minRating) < 0 || Number(minRating) > 5)) {
    errors.push('minRating must be a number between 0 and 5.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateProductQuery
};
