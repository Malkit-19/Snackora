const authValidator = require('./authValidator');
const productValidator = require('./productValidator');

module.exports = {
  ...authValidator,
  ...productValidator
};
