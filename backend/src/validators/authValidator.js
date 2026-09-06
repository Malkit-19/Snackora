const validator = require('validator');

/**
 * Validate customer registration input
 */
const validateRegisterInput = (data = {}) => {
  const errors = [];
  const { name, email, password, phone } = data;

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push('Full name is required.');
  }

  if (!email || !validator.isEmail(String(email).trim())) {
    errors.push('A valid email address is required.');
  }

  if (!password || String(password).length < 6) {
    errors.push('Password must be at least 6 characters.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate B2B registration input
 */
const validateB2BRegisterInput = (data = {}) => {
  const errors = [];
  const { name, email, password, companyName, gstin } = data;

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push('Owner/Contact name is required.');
  }

  if (!email || !validator.isEmail(String(email).trim())) {
    errors.push('A valid business email address is required.');
  }

  if (!password || String(password).length < 6) {
    errors.push('Password must be at least 6 characters.');
  }

  if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
    errors.push('Company / Business name is required.');
  }

  if (!gstin || typeof gstin !== 'string' || !gstin.trim()) {
    errors.push('GSTIN is required for B2B registration.');
  } else {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(gstin.trim().toUpperCase())) {
      errors.push('Invalid GSTIN format. Expected 15-character GSTIN (e.g., 27AAACS1429B1ZB).');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate login credentials input
 */
const validateLoginInput = (data = {}) => {
  const errors = [];
  const { email, password } = data;

  if (!email || !validator.isEmail(String(email).trim())) {
    errors.push('A valid email address is required.');
  }

  if (!password || !String(password).trim()) {
    errors.push('Password is required.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateRegisterInput,
  validateB2BRegisterInput,
  validateLoginInput
};
