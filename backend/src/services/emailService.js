const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');

let transporter = null;

/**
 * Initialize or get cached Nodemailer transporter
 */
const getTransporter = () => {
  if (!transporter) {
    const user = process.env.SMTP_USER || process.env.EMAIL_USER || '';
    const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || '';

    if (user && pass && !user.includes('REPLACE_WITH')) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });
    } else {
      // Simulation mode when real SMTP credentials are not configured in environment
      transporter = {
        sendMail: async (mailOptions) => {
          console.log(`[Email Simulation - Add SMTP_USER & SMTP_PASS in Render to deliver real emails] To: ${mailOptions.to} | Subject: ${mailOptions.subject}`);
          return { messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`, simulated: true };
        }
      };
    }
  }
  return transporter;
};

/**
 * Base email dispatch helper with non-blocking error handling & logging
 */
const sendEmail = async ({
  to,
  userId,
  subject,
  html,
  text,
  templateType,
  metadata = {}
}) => {
  const fromEmail = `"Snackora" <${process.env.SMTP_USER || 'snackora26@gmail.com'}>`;

  try {
    const safeRecipient = (to && typeof to === 'string' && to.trim()) ? to.trim() : 'invalid-recipient@snackora.in';

    if (!to || !to.trim()) {
      throw new Error('Recipient email address is required.');
    }

    // Generate clean plain-text fallback from HTML if not provided (helps anti-spam scoring)
    const plainText = text || html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                                 .replace(/<[^>]+>/g, ' ')
                                 .replace(/\s+/g, ' ')
                                 .trim();

    const mailClient = getTransporter();
    const info = await mailClient.sendMail({
      from: fromEmail,
      to: safeRecipient,
      subject,
      text: plainText,
      html
    });

    console.log(`[Email Delivered] '${templateType}' sent to ${safeRecipient}. MessageId: ${info.messageId}`);

    await EmailLog.create({
      recipient: safeRecipient,
      userId,
      templateType,
      subject,
      status: 'SENT',
      metadata: { ...metadata, messageId: info.messageId }
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email Error] Failed to send '${templateType}' to ${to}:`, error.message);

    // Record failure in EmailLog for admin retry without breaking caller
    try {
      const safeRecipient = (to && typeof to === 'string' && to.trim()) ? to.trim() : 'invalid-recipient@snackora.in';
      await EmailLog.create({
        recipient: safeRecipient,
        userId,
        templateType,
        subject,
        status: 'FAILED',
        error: error.message,
        metadata
      });
    } catch (logErr) {
      console.error('[EmailLog Error]', logErr.message);
    }

    return { success: false, error: error.message };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// HTML EMAIL WRAPPER TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────
const emailWrapper = (title, bodyContent) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fcfbf9; margin: 0; padding: 20px; color: #1c1917; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 36px; border: 1px solid #e7e5e4; }
    .header { text-align: center; border-bottom: 2px solid #f5f5f4; padding-bottom: 20px; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: 900; color: #d97706; letter-spacing: -0.5px; }
    .footer { text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid #f5f5f4; font-size: 11px; color: #a8a29e; }
    .btn { display: inline-block; padding: 12px 28px; background: #d97706; color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 13px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">SNACKORA</div>
      <div style="font-size: 12px; color: #78716c; margin-top: 4px;">Premium Artisanal Indian Snacks</div>
    </div>
    <h2 style="font-size: 18px; font-weight: 800; color: #292524; margin-top: 0;">${title}</h2>
    ${bodyContent}
    <div class="footer">
      © ${new Date().getFullYear()} Snackora Foods Pvt. Ltd. All rights reserved.<br>
      Questions? Contact us at support@snackora.in
    </div>
  </div>
</body>
</html>
`;

// ─────────────────────────────────────────────────────────────────────────────
// 10 TRANSACTIONAL EMAIL DISPATCHERS
// ─────────────────────────────────────────────────────────────────────────────

// 1. Welcome / Registration Email
const sendRegistrationEmail = async ({ user }) => {
  const html = emailWrapper(
    'Welcome to the Snackora Family! 🎉',
    `<p>Hello <strong>${user.name}</strong>,</p>
     <p>Thank you for creating an account with Snackora. Discover our range of gourmet roasted makhana, cookies, and artisanal snacks crafted for clean snacking.</p>
     <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/shop" class="btn">Explore Products</a></p>`
  );
  return sendEmail({
    to: user.email,
    userId: user._id,
    subject: 'Welcome to Snackora! Enjoy Clean, Artisanal Snacking',
    html,
    templateType: 'REGISTRATION'
  });
};

// 2. Order Confirmation Email
const sendOrderConfirmationEmail = async ({ user, order }) => {
  const html = emailWrapper(
    `Order Confirmed: ${order.orderNumber} 📦`,
    `<p>Hello <strong>${user.name}</strong>,</p>
     <p>Your Snackora order <strong>${order.orderNumber}</strong> has been placed successfully.</p>
     <div style="background: #fbfbfa; padding: 16px; border-radius: 12px; margin: 16px 0; font-size: 13px;">
       <p style="margin: 0 0 6px;"><strong>Items:</strong> ${order.items?.length || 0} product(s)</p>
       <p style="margin: 0 0 6px;"><strong>Total:</strong> ₹${order.pricing?.total || 0}</p>
       <p style="margin: 0;"><strong>Payment Method:</strong> ${order.paymentMethod} (${order.paymentStatus})</p>
     </div>
     <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${order._id}" class="btn">View Order Details</a></p>`
  );
  return sendEmail({
    to: user.email,
    userId: user._id,
    subject: `Order Confirmed: ${order.orderNumber}`,
    html,
    templateType: 'ORDER_CONFIRMATION',
    metadata: { orderId: order._id, orderNumber: order.orderNumber }
  });
};

// 3. Payment Success Email
const sendPaymentSuccessEmail = async ({ user, order, paymentId }) => {
  const html = emailWrapper(
    'Payment Successful! 💳',
    `<p>Hello <strong>${user.name}</strong>,</p>
     <p>We received your payment of <strong>₹${order.pricing?.total}</strong> for Order <strong>${order.orderNumber}</strong>.</p>
     <p style="font-size: 12px; color: #78716c;">Transaction Reference: ${paymentId || 'Verified'}</p>`
  );
  return sendEmail({
    to: user.email,
    userId: user._id,
    subject: `Payment Successful for Order ${order.orderNumber}`,
    html,
    templateType: 'PAYMENT_SUCCESS',
    metadata: { orderId: order._id, paymentId }
  });
};

// 4. Payment Failure Email
const sendPaymentFailureEmail = async ({ user, order, errorReason }) => {
  const html = emailWrapper(
    'Payment Failed ⚠️',
    `<p>Hello <strong>${user.name}</strong>,</p>
     <p>We were unable to process your payment for Order <strong>${order.orderNumber}</strong>.</p>
     <p style="color: #e11d48; font-size: 13px;">Reason: ${errorReason || 'Transaction could not be completed'}</p>
     <p>Your order remains saved in your account. You can retry payment anytime.</p>`
  );
  return sendEmail({
    to: user.email,
    userId: user._id,
    subject: `Payment Failed for Order ${order.orderNumber}`,
    html,
    templateType: 'PAYMENT_FAILURE',
    metadata: { orderId: order._id, errorReason }
  });
};

// 5. Order Shipped Email
const sendOrderShippedEmail = async ({ user, order, trackingNumber, carrier }) => {
  const html = emailWrapper(
    `Your Order is on the way! 🚚`,
    `<p>Hello <strong>${user.name}</strong>,</p>
     <p>Great news! Your Snackora order <strong>${order.orderNumber}</strong> has been shipped.</p>
     <div style="background: #fbfbfa; padding: 16px; border-radius: 12px; margin: 16px 0; font-size: 13px;">
       <p style="margin: 0 0 6px;"><strong>Carrier:</strong> ${carrier || 'Snackora Express'}</p>
       <p style="margin: 0;"><strong>Tracking Number:</strong> ${trackingNumber || 'Available in account'}</p>
     </div>`
  );
  return sendEmail({
    to: user.email,
    userId: user._id,
    subject: `Order Shipped: ${order.orderNumber}`,
    html,
    templateType: 'ORDER_SHIPPED',
    metadata: { orderId: order._id, trackingNumber }
  });
};

// 6. Order Delivered Email
const sendOrderDeliveredEmail = async ({ user, order }) => {
  const html = emailWrapper(
    `Order Delivered! 🍿`,
    `<p>Hello <strong>${user.name}</strong>,</p>
     <p>Your Snackora order <strong>${order.orderNumber}</strong> has been delivered. We hope you enjoy your snacks!</p>
     <p>Please take a moment to leave a review and let us know what you thought.</p>`
  );
  return sendEmail({
    to: user.email,
    userId: user._id,
    subject: `Delivered: Your Snackora Order ${order.orderNumber}`,
    html,
    templateType: 'ORDER_DELIVERED',
    metadata: { orderId: order._id }
  });
};

// 7. Refund Update Email
const sendRefundUpdateEmail = async ({ user, order, refundAmount, status }) => {
  const html = emailWrapper(
    'Refund Status Update 💰',
    `<p>Hello <strong>${user.name}</strong>,</p>
     <p>We have updated the refund status for Order <strong>${order.orderNumber}</strong>.</p>
     <p><strong>Refund Amount:</strong> ₹${refundAmount || order.pricing?.total}</p>
     <p><strong>Status:</strong> ${status || 'PROCESSED'}</p>`
  );
  return sendEmail({
    to: user.email,
    userId: user._id,
    subject: `Refund Update for Order ${order.orderNumber}`,
    html,
    templateType: 'REFUND_UPDATE',
    metadata: { orderId: order._id, refundAmount }
  });
};

// 8. B2B Approval Email
const sendB2BApprovalEmail = async ({ user, businessName }) => {
  const html = emailWrapper(
    'B2B Wholesale Application Approved! 🏢',
    `<p>Hello <strong>${user.name}</strong>,</p>
     <p>Congratulations! Your wholesale partnership application for <strong>${businessName || 'your business'}</strong> has been approved.</p>
     <p>You can now log in to view wholesale catalog pricing, MOQ bulk rates, and place business orders directly.</p>
     <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/shop" class="btn">Access Wholesale Catalog</a></p>`
  );
  return sendEmail({
    to: user.email,
    userId: user._id,
    subject: 'Snackora B2B Partner Application Approved!',
    html,
    templateType: 'B2B_APPROVAL',
    metadata: { businessName }
  });
};

// 9. B2B Rejection Email
const sendB2BRejectionEmail = async ({ user, reason }) => {
  const html = emailWrapper(
    'B2B Application Status Update',
    `<p>Hello <strong>${user.name}</strong>,</p>
     <p>Thank you for your interest in partnering with Snackora.</p>
     <p>At this time, we are unable to approve your wholesale application.</p>
     <p style="font-size: 13px; color: #78716c;">Note: ${reason || 'Application requirements not met'}</p>`
  );
  return sendEmail({
    to: user.email,
    userId: user._id,
    subject: 'Snackora B2B Application Update',
    html,
    templateType: 'B2B_REJECTION',
    metadata: { reason }
  });
};

// 10. Password Reset Email with Verification Code (OTP) & 1-Click Link
const sendPasswordResetEmail = async ({ user, otp, resetUrl }) => {
  const html = emailWrapper(
    'Reset Your Snackora Password 🔒',
    `<p>Hello <strong>${user.name || 'Snackora Customer'}</strong>,</p>
     <p>We received a request to reset the password for your Snackora account (<strong>${user.email}</strong>).</p>
     
     <div style="background: #fffbeb; border: 2px dashed #f59e0b; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0;">
       <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 1.5px; color: #b45309; margin-bottom: 8px;">
         Your 6-Digit Password Reset Verification Code
       </div>
       <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #92400e; font-family: monospace;">
         ${otp}
       </div>
       <div style="font-size: 12px; color: #78716c; margin-top: 8px;">
         Valid for 15 minutes. Enter this code on the reset password screen.
       </div>
     </div>

     <p style="text-align: center; margin: 20px 0 10px;">
       <strong>— OR —</strong>
     </p>

     <p style="text-align: center;">
       <a href="${resetUrl}" class="btn" style="background: #d97706; padding: 14px 32px; font-size: 14px; text-decoration: none; color: #ffffff !important; border-radius: 12px; font-weight: bold; display: inline-block;">
         Click to Reset Password in 1-Click &rarr;
       </a>
     </p>

     <p style="font-size: 12px; color: #78716c; margin-top: 24px; line-height: 1.5;">
       If you didn't request a password reset, you can safely ignore this email. Your existing password will remain secure and unchanged.
     </p>`
  );
  return sendEmail({
    to: user.email,
    userId: user._id,
    subject: `Your Snackora Password Reset Code: ${otp}`,
    html,
    templateType: 'PASSWORD_RESET',
    metadata: { hasOtp: true }
  });
};


module.exports = {
  sendEmail,
  sendRegistrationEmail,
  sendOrderConfirmationEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailureEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendRefundUpdateEmail,
  sendB2BApprovalEmail,
  sendB2BRejectionEmail,
  sendPasswordResetEmail
};
