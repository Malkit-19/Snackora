import React, { useState } from 'react';
import { refundApi } from '../../api/refundApi';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  RefreshCw, Smartphone, Building2, CheckCircle2,
  AlertCircle, ShieldCheck, Image as ImageIcon, Loader2,
  HelpCircle, Sparkles, ArrowRight
} from 'lucide-react';

const REFUND_REASONS = [
  'Damaged',
  'Wrong Product',
  'Missing Product',
  'Quality Issue',
  'Other'
];

const UPI_HANDLES = ['@oksbi', '@okhdfcbank', '@okaxis', '@okicici', '@paytm', '@ybl', '@ibl'];

export const RefundRequestModal = ({ isOpen, order, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [payoutPreference, setPayoutPreference] = useState('UPI'); // 'UPI' | 'BANK_TRANSFER'
  const [whatsappNumber, setWhatsappNumber] = useState(user?.phone ? user.phone.replace(/\D/g, '').slice(-10) : '');
  const [upiId, setUpiId] = useState('');
  
  // Bank Details State
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: user?.name || '',
    bankName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: ''
  });

  const [reason, setReason] = useState('Damaged');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  if (!isOpen || !order) return null;

  const validateForm = () => {
    const errs = {};
    const cleanWa = whatsappNumber.replace(/\D/g, '');
    if (!cleanWa || cleanWa.length !== 10) {
      errs.whatsappNumber = 'Please enter a valid 10-digit WhatsApp mobile number.';
    }

    if (payoutPreference === 'UPI') {
      if (!upiId.trim() || !upiId.includes('@')) {
        errs.upiId = 'Please enter a valid UPI ID (e.g. yourname@oksbi).';
      }
    } else {
      if (!bankDetails.accountHolderName.trim()) {
        errs.accountHolderName = 'Account holder name is required.';
      }
      if (!bankDetails.bankName.trim()) {
        errs.bankName = 'Bank name is required.';
      }
      if (!bankDetails.accountNumber.trim() || bankDetails.accountNumber.length < 8) {
        errs.accountNumber = 'Valid account number is required (min 8 digits).';
      }
      if (bankDetails.accountNumber !== bankDetails.confirmAccountNumber) {
        errs.confirmAccountNumber = 'Account numbers do not match.';
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankDetails.ifscCode.trim().toUpperCase())) {
        errs.ifscCode = 'Enter a valid 11-character IFSC code (e.g. SBIN0001234).';
      }
    }

    if (!description.trim()) {
      errs.description = 'Please provide details about the refund issue.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleBankChange = (field, val) => {
    setBankDetails((prev) => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleApplyHandle = (handle) => {
    const prefix = upiId.split('@')[0] || whatsappNumber || '';
    setUpiId(`${prefix}${handle}`);
    if (errors.upiId) setErrors((prev) => ({ ...prev, upiId: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        orderId: order._id,
        reason,
        description: description.trim(),
        images: imageUrl.trim() ? [imageUrl.trim()] : [],
        payoutPreference,
        whatsappNumber: whatsappNumber.replace(/\D/g, '').slice(-10),
        upiId: payoutPreference === 'UPI' ? upiId.trim() : '',
        bankDetails: payoutPreference === 'BANK_TRANSFER' ? {
          accountHolderName: bankDetails.accountHolderName.trim(),
          bankName: bankDetails.bankName.trim(),
          accountNumber: bankDetails.accountNumber.trim(),
          ifscCode: bankDetails.ifscCode.trim().toUpperCase()
        } : {}
      };

      const res = await refundApi.createRefund(payload);

      if (res.success) {
        toastSuccess(`Refund request for Order #${order.orderNumber} submitted! Real-time notifications dispatched.`);
        if (onSuccess) onSuccess(res.data?.refund);
        onClose();
      }
    } catch (err) {
      toastError(err.message || 'Failed to submit refund request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-150 my-8">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-stone-900">Request Refund & Money Back</h3>
              <p className="text-xs text-stone-400 font-medium">Order #{order.orderNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 font-bold p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Refund Amount & Security Guarantee */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-50 to-stone-50 border border-amber-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-900 uppercase block tracking-wider">Refundable Amount</span>
            <span className="text-2xl font-black text-stone-900">₹{order.pricing?.total}</span>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 100% Money Back
            </span>
            <p className="text-[10px] text-stone-400 mt-1">Direct account transfer</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* 1. WhatsApp Number Input */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-stone-800 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                WhatsApp Mobile Number *
              </label>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                💬 Instant WhatsApp Notification
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-stone-500 text-xs">+91</span>
              <input
                type="tel"
                maxLength={10}
                placeholder="9876543210"
                value={whatsappNumber}
                onChange={(e) => {
                  setWhatsappNumber(e.target.value.replace(/\D/g, ''));
                  if (errors.whatsappNumber) setErrors((prev) => ({ ...prev, whatsappNumber: undefined }));
                }}
                className={`w-full pl-12 pr-4 py-2.5 rounded-xl border text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white ${
                  errors.whatsappNumber ? 'border-rose-400 bg-rose-50' : 'border-stone-200'
                }`}
              />
            </div>
            {errors.whatsappNumber ? (
              <p className="text-[11px] text-rose-600 font-bold">{errors.whatsappNumber}</p>
            ) : (
              <p className="text-[10px] text-stone-400">
                We will send instant real-time WhatsApp updates to this number once your refund is granted and transferred.
              </p>
            )}
          </div>

          {/* 2. Payout Preference Selection */}
          <div className="space-y-2">
            <label className="block font-bold text-stone-700">Select How You Want to Receive Your Money *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPayoutPreference('UPI')}
                className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center gap-2.5 ${
                  payoutPreference === 'UPI'
                    ? 'border-amber-500 bg-amber-50/70 text-amber-950 font-black shadow-xs'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 font-bold'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  payoutPreference === 'UPI' ? 'bg-amber-500 text-white' : 'bg-stone-100 text-stone-400'
                }`}>
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs block">UPI ID</span>
                  <span className="text-[10px] text-stone-400 font-normal">GPay, PhonePe, Paytm</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPayoutPreference('BANK_TRANSFER')}
                className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center gap-2.5 ${
                  payoutPreference === 'BANK_TRANSFER'
                    ? 'border-amber-500 bg-amber-50/70 text-amber-950 font-black shadow-xs'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 font-bold'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  payoutPreference === 'BANK_TRANSFER' ? 'bg-amber-500 text-white' : 'bg-stone-100 text-stone-400'
                }`}>
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs block">Bank Account</span>
                  <span className="text-[10px] text-stone-400 font-normal">Direct IMPS / NEFT</span>
                </div>
              </button>
            </div>
          </div>

          {/* 3. Payout Details Form */}
          {payoutPreference === 'UPI' ? (
            <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/70 space-y-2.5 animate-in fade-in duration-150">
              <label className="block font-bold text-stone-800">
                Your UPI ID / VPA * <span className="text-stone-400 font-normal">(e.g. 9876543210@paytm or name@oksbi)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 7021475382@oksbi"
                value={upiId}
                onChange={(e) => {
                  setUpiId(e.target.value.trim());
                  if (errors.upiId) setErrors((prev) => ({ ...prev, upiId: undefined }));
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white ${
                  errors.upiId ? 'border-rose-400 bg-rose-50' : 'border-stone-200'
                }`}
              />
              {errors.upiId && <p className="text-[11px] text-rose-600 font-bold">{errors.upiId}</p>}

              {/* Quick Handle Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold text-stone-400">Quick suggestions:</span>
                {UPI_HANDLES.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleApplyHandle(h)}
                    className="px-2 py-0.5 rounded-md bg-white border border-stone-200 text-stone-600 hover:border-amber-400 hover:text-amber-800 font-mono text-[10px] transition-colors"
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Account Holder Name *</label>
                  <input
                    type="text"
                    placeholder="Rahul Sharma"
                    value={bankDetails.accountHolderName}
                    onChange={(e) => handleBankChange('accountHolderName', e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none ${
                      errors.accountHolderName ? 'border-rose-400 bg-rose-50' : 'border-stone-200'
                    }`}
                  />
                  {errors.accountHolderName && <p className="text-[10px] text-rose-600 font-bold mt-0.5">{errors.accountHolderName}</p>}
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Bank Name *</label>
                  <input
                    type="text"
                    placeholder="State Bank of India / HDFC"
                    value={bankDetails.bankName}
                    onChange={(e) => handleBankChange('bankName', e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none ${
                      errors.bankName ? 'border-rose-400 bg-rose-50' : 'border-stone-200'
                    }`}
                  />
                  {errors.bankName && <p className="text-[10px] text-rose-600 font-bold mt-0.5">{errors.bankName}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Bank Account Number *</label>
                  <input
                    type="text"
                    placeholder="123456789012"
                    value={bankDetails.accountNumber}
                    onChange={(e) => handleBankChange('accountNumber', e.target.value.replace(/\D/g, ''))}
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-mono font-medium bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none ${
                      errors.accountNumber ? 'border-rose-400 bg-rose-50' : 'border-stone-200'
                    }`}
                  />
                  {errors.accountNumber && <p className="text-[10px] text-rose-600 font-bold mt-0.5">{errors.accountNumber}</p>}
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Confirm Account Number *</label>
                  <input
                    type="text"
                    placeholder="Re-enter Account Number"
                    value={bankDetails.confirmAccountNumber}
                    onChange={(e) => handleBankChange('confirmAccountNumber', e.target.value.replace(/\D/g, ''))}
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-mono font-medium bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none ${
                      errors.confirmAccountNumber ? 'border-rose-400 bg-rose-50' : 'border-stone-200'
                    }`}
                  />
                  {errors.confirmAccountNumber && <p className="text-[10px] text-rose-600 font-bold mt-0.5">{errors.confirmAccountNumber}</p>}
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">IFSC Code * (11 Characters)</label>
                <input
                  type="text"
                  maxLength={11}
                  placeholder="SBIN0001234"
                  value={bankDetails.ifscCode}
                  onChange={(e) => handleBankChange('ifscCode', e.target.value.toUpperCase())}
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs font-mono font-bold uppercase bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none ${
                    errors.ifscCode ? 'border-rose-400 bg-rose-50' : 'border-stone-200'
                  }`}
                />
                {errors.ifscCode && <p className="text-[10px] text-rose-600 font-bold mt-0.5">{errors.ifscCode}</p>}
              </div>
            </div>
          )}

          {/* 4. Refund Reason */}
          <div>
            <label className="block font-bold text-stone-700 mb-1">Reason for Refund *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 font-bold text-xs bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
            >
              {REFUND_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* 5. Issue Description */}
          <div>
            <label className="block font-bold text-stone-700 mb-1">
              Issue Description * <span className="text-rose-600">(Required)</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Please describe the damaged items, wrong snack received, or defect in detail..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              className={`w-full px-4 py-2.5 rounded-xl border text-xs font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none bg-white ${
                errors.description ? 'border-rose-400 bg-rose-50' : 'border-stone-200'
              }`}
            />
            {errors.description && <p className="text-[10px] text-rose-600 font-bold mt-0.5">{errors.description}</p>}
          </div>

          {/* 6. Photo URL / Proof */}
          <div>
            <label className="block font-bold text-stone-700 mb-1">
              Photo / Proof URL <span className="text-stone-400 font-normal">(Optional evidence)</span>
            </label>
            <div className="relative">
              <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="url"
                placeholder="https://example.com/damaged-snack.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none bg-white"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-stone-200 font-bold text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black transition-all disabled:opacity-50 shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 text-xs"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting Request…</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Submit Refund Request</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RefundRequestModal;
