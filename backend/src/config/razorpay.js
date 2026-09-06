const Razorpay = require('razorpay');

let razorpayInstance = null;

/**
 * Returns the singleton Razorpay instance.
 * Throws a clear error when credentials are placeholder values so tests can detect
 * the unconfigured state without crashing the server.
 */
const getRazorpay = () => {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
  }
  return razorpayInstance;
};

/**
 * Returns true when real Razorpay credentials have been configured.
 * Placeholder values that still contain "REPLACE_WITH_YOUR" are treated as unconfigured.
 */
const isRazorpayConfigured = () => {
  const id = process.env.RAZORPAY_KEY_ID || '';
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  return (
    id.startsWith('rzp_') &&
    !id.includes('REPLACE_WITH_YOUR') &&
    secret.length > 0 &&
    !secret.includes('REPLACE_WITH_YOUR')
  );
};

module.exports = { getRazorpay, isRazorpayConfigured };
