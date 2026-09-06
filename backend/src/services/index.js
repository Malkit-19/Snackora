const authService = require('./authService');
const productService = require('./productService');
const categoryService = require('./categoryService');

module.exports = {
  ...authService,
  ...productService,
  ...categoryService
};
