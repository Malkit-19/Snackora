const axios = require('axios');

/**
 * Snackora — Real-Time UPI & Bank Account Payout Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses Razorpay X Payout API to transfer actual money in real-time to:
 *   - Customer UPI ID (VPA) — instant, no banking hours
 *   - Customer Bank Account (IMPS/NEFT)
 *
 * API Docs: https://razorpay.com/docs/razorpayx/payouts/
 *
 * Required env vars:
 *   RAZORPAY_KEY_ID       — your Razorpay key ID (rzp_...)
 *   RAZORPAY_KEY_SECRET   — your Razorpay key secret
 *   RAZORPAYX_ACCOUNT_NUMBER — your RazorpayX business account number
 *                              (from RazorpayX Dashboard → Accounts)
 */

class UpiPayoutService {
  constructor() {
    this.baseURL = 'https://api.razorpay.com/v1';
  }

  /**
   * Get base64 auth header from Razorpay credentials
   */
  getAuthHeader() {
    const keyId     = process.env.RAZORPAY_KEY_ID     || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    if (!keyId || !keySecret) return null;
    return 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  }

  /**
   * Check if RazorpayX Payout API is configured
   */
  isConfigured() {
    const keyId      = process.env.RAZORPAY_KEY_ID          || '';
    const keySecret  = process.env.RAZORPAY_KEY_SECRET      || '';
    const accountNum = process.env.RAZORPAYX_ACCOUNT_NUMBER || '';
    return (
      keyId.startsWith('rzp_') &&
      keySecret.length > 0 &&
      accountNum.length > 0
    );
  }

  /**
   * Step 1: Create a Contact (customer) in RazorpayX
   * Returns contact_id
   */
  async createContact({ name, email, phone, refundId }) {
    const auth = this.getAuthHeader();
    if (!auth) throw new Error('Razorpay credentials not configured.');

    const res = await axios.post(
      `${this.baseURL}/contacts`,
      {
        name:         name || 'Snackora Customer',
        email:        email || undefined,
        contact:      phone ? `+91${String(phone).replace(/\D/g, '').slice(-10)}` : undefined,
        type:         'customer',
        reference_id: `REFUND-${refundId}`,
        notes: {
          source: 'Snackora Refund System',
          refundId: String(refundId)
        }
      },
      {
        headers: {
          Authorization:  auth,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    return res.data?.id; // contact_id
  }

  /**
   * Step 2: Create a Fund Account (UPI or Bank) linked to the contact
   * Returns fund_account_id
   */
  async createFundAccount({ contactId, payoutPreference, upiId, bankDetails }) {
    const auth = this.getAuthHeader();
    if (!auth) throw new Error('Razorpay credentials not configured.');

    let body = { contact_id: contactId };

    if (payoutPreference === 'UPI') {
      body.account_type = 'vpa';
      body.vpa = { address: upiId };
    } else {
      body.account_type  = 'bank_account';
      body.bank_account  = {
        name:           bankDetails.accountHolderName,
        ifsc:           bankDetails.ifscCode.toUpperCase(),
        account_number: bankDetails.accountNumber
      };
    }

    const res = await axios.post(
      `${this.baseURL}/fund_accounts`,
      body,
      {
        headers: {
          Authorization:  auth,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    return res.data?.id; // fund_account_id
  }

  /**
   * Step 3: Create a Payout — actual money transfer
   * Returns { payoutId, utr, status, mode }
   */
  async createPayout({ fundAccountId, amountRupees, orderId, orderNumber, refundId }) {
    const auth        = this.getAuthHeader();
    const accountNum  = process.env.RAZORPAYX_ACCOUNT_NUMBER || '';

    if (!auth)       throw new Error('Razorpay credentials not configured.');
    if (!accountNum) throw new Error('RAZORPAYX_ACCOUNT_NUMBER env var not set. Add your RazorpayX account number to .env.');

    const res = await axios.post(
      `${this.baseURL}/payouts`,
      {
        account_number:  accountNum,
        fund_account_id: fundAccountId,
        amount:          Math.round(amountRupees * 100), // paise
        currency:        'INR',
        mode:            'UPI', // auto-switches to IMPS for bank accounts
        purpose:         'refund',
        queue_if_low_balance: false,
        reference_id:    `REFUND-${refundId}`,
        narration:       `Snackora Refund Order ${orderNumber}`,
        notes: {
          refundId:    String(refundId),
          orderId:     String(orderId),
          orderNumber: String(orderNumber),
          source:      'Snackora Automated Refund Payout'
        }
      },
      {
        headers: {
          Authorization:             auth,
          'Content-Type':            'application/json',
          'Idempotency-Key':         `REFUND-${refundId}-${Date.now()}` // prevent duplicate payouts
        },
        timeout: 20000
      }
    );

    return {
      payoutId: res.data?.id,
      utr:      res.data?.utr,
      status:   res.data?.status,
      mode:     res.data?.mode,
      rawData:  res.data
    };
  }

  /**
   * One-shot: Create contact → fund account → payout (full refund transfer flow)
   *
   * @returns {
   *   success: boolean,
   *   payoutId, utr, status,
   *   payoutDetails: string,
   *   error?: string
   * }
   */
  async sendRefundPayout({
    refundId,
    orderNumber,
    orderId,
    amountRupees,
    payoutPreference,
    upiId,
    bankDetails = {},
    customerName,
    customerEmail,
    customerPhone
  }) {
    // ── Simulation Mode (if RazorpayX not configured with account number) ────
    if (!this.isConfigured()) {
      const simulatedUtr = `UTR${Date.now().toString().slice(-10)}`;
      console.log(`\n💸 ──────────────────────────────────────────────────────────`);
      console.log(`💸 [REAL-TIME REFUND PAYOUT — SIMULATION MODE]`);
      console.log(`💸 Refund ID   : ${refundId}`);
      console.log(`💸 Order       : ${orderNumber}`);
      console.log(`💸 Amount      : ₹${amountRupees}`);
      console.log(`💸 Channel     : ${payoutPreference}`);
      console.log(`💸 Destination : ${payoutPreference === 'UPI' ? upiId : `${bankDetails.accountNumber} (${bankDetails.ifscCode})`}`);
      console.log(`💸 Simulated UTR/Ref : ${simulatedUtr}`);
      console.log(`💸 ──────────────────────────────────────────────────────────`);
      console.log(`💸 To enable live payouts: add RAZORPAYX_ACCOUNT_NUMBER to .env`);
      console.log(`💸 ──────────────────────────────────────────────────────────\n`);

      return {
        success:        true,
        simulated:      true,
        payoutId:       `SIM-${simulatedUtr}`,
        utr:            simulatedUtr,
        status:         'processed',
        mode:           payoutPreference,
        payoutDetails:  payoutPreference === 'UPI' ? upiId : `Bank A/C ${bankDetails.accountNumber}`,
        provider:       'SIMULATION'
      };
    }

    // ── Live RazorpayX Payout Flow ─────────────────────────────────────────
    try {
      console.log(`[UPI Payout] Creating contact for refund ${refundId}...`);
      const contactId = await this.createContact({
        name:     customerName,
        email:    customerEmail,
        phone:    customerPhone,
        refundId: refundId
      });

      console.log(`[UPI Payout] Creating fund account (contact: ${contactId})...`);
      const fundAccountId = await this.createFundAccount({
        contactId,
        payoutPreference,
        upiId,
        bankDetails
      });

      console.log(`[UPI Payout] Initiating payout (fund_account: ${fundAccountId}, amount: ₹${amountRupees})...`);
      const payout = await this.createPayout({
        fundAccountId,
        amountRupees,
        orderId,
        orderNumber,
        refundId
      });

      const payoutDetails = payoutPreference === 'UPI'
        ? `UPI ID: ${upiId}`
        : `Bank A/C: XXXX${String(bankDetails.accountNumber || '').slice(-4)} (${bankDetails.ifscCode})`;

      console.log(`✅ [UPI Payout] SUCCESS — Payout ID: ${payout.payoutId}, UTR: ${payout.utr}, Status: ${payout.status}`);

      return {
        success:       true,
        simulated:     false,
        payoutId:      payout.payoutId,
        utr:           payout.utr,
        status:        payout.status,
        mode:          payout.mode,
        payoutDetails: payoutDetails,
        provider:      'RAZORPAYX_LIVE'
      };
    } catch (err) {
      const errMsg = err.response?.data?.error?.description || err.response?.data?.message || err.message;
      console.error(`[UPI Payout] FAILED for refund ${refundId}:`, errMsg);

      return {
        success:  false,
        error:    errMsg,
        provider: 'RAZORPAYX_LIVE'
      };
    }
  }
}

module.exports = new UpiPayoutService();
