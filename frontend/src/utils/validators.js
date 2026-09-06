/**
 * Shared validation helpers for auth forms
 */

export const validateEmail = (email) => {
  if (!email?.trim()) return 'Email address is required.';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(email.trim())) return 'Please enter a valid email address.';
  return null;
};

export const validatePhone = (phone) => {
  if (!phone?.trim()) return 'Mobile number is required.';
  const cleaned = phone.trim().replace(/[\s\-()]/g, '');
  const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
  if (!phoneRegex.test(cleaned)) return 'Enter a valid 10-digit Indian mobile number.';
  return null;
};

export const validatePassword = (password) => {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  if (!/[^a-zA-Z0-9]/.test(password)) return 'Password must contain at least one special character (@, #, !, etc.).';
  return null;
};

export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) return 'Please confirm your password.';
  if (password !== confirmPassword) return 'Passwords do not match.';
  return null;
};

export const validateRequired = (value, label) => {
  if (!value || !String(value).trim()) return `${label} is required.`;
  return null;
};

export const validateGST = (gstin) => {
  if (!gstin?.trim()) return 'GSTIN is required.';
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstRegex.test(gstin.trim().toUpperCase())) {
    return 'Enter a valid 15-character GSTIN (e.g., 27AAACS1429B1ZB).';
  }
  return null;
};

export const validatePincode = (pincode) => {
  if (!pincode?.trim()) return 'Pincode is required.';
  if (!/^\d{6}$/.test(pincode.trim())) return 'Enter a valid 6-digit Indian pincode.';
  return null;
};
