import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  validateEmail, validatePhone, validateGST, validatePincode, validateRequired
} from '../utils/validators';
import {
  Building2, User, Phone, Mail, MapPin,
  Package, MessageSquare, CheckCircle2, AlertCircle,
  Clock, ArrowRight, FileText, Layers, IndianRupee
} from 'lucide-react';

export const B2BRegisterPage = () => {
  const [form, setForm] = useState({
    companyName: '',
    ownerName: '',
    businessType: '',
    gstin: '',
    phone: '',
    email: '',
    dob: '',
    addressLine1: '',
    city: '',
    state: '',
    pincode: '',
    expectedMonthlyOrder: '',
    productsInterested: [],
    message: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { registerB2B } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const businessTypes = [
    'Supermarket / Hypermarket',
    'Kirana / Grocery Store',
    'FMCG Distributor',
    'Online Retail / D2C',
    'Corporate Gifting',
    'Hotel / Restaurant / Cafe',
    'Gym / Fitness Centre',
    'Export / International',
    'Other'
  ];

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu & Kashmir', 'Ladakh'
  ];

  const orderRanges = [
    'Under ₹25,000 / month',
    '₹25,000 – ₹1,00,000 / month',
    '₹1,00,000 – ₹5,00,000 / month',
    'Above ₹5,00,000 / month'
  ];

  const productCategories = ['Cookies', 'Protein Bars', 'Makhana', 'Dairy (Amul)', 'All Categories'];

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }));
  };

  const toggleProduct = (cat) => {
    setForm((f) => ({
      ...f,
      productsInterested: f.productsInterested.includes(cat)
        ? f.productsInterested.filter((c) => c !== cat)
        : [...f.productsInterested, cat]
    }));
    if (errors.productsInterested) setErrors((e) => ({ ...e, productsInterested: null }));
  };

  const validate = () => {
    const e = {};
    const req = (field, label) => {
      const err = validateRequired(form[field], label);
      if (err) e[field] = err;
    };

    req('companyName', 'Business Name');
    req('ownerName', 'Owner Name');
    req('businessType', 'Business Type');
    req('addressLine1', 'Business Address');
    req('city', 'City');
    req('state', 'State');
    req('expectedMonthlyOrder', 'Expected Monthly Order');

    const gstErr = validateGST(form.gstin);
    if (gstErr) e.gstin = gstErr;

    const phoneErr = validatePhone(form.phone);
    if (phoneErr) e.phone = phoneErr;

    const emailErr = validateEmail(form.email);
    if (emailErr) e.email = emailErr;

    const pinErr = validatePincode(form.pincode);
    if (pinErr) e.pincode = pinErr;

    if (form.productsInterested.length === 0) {
      e.productsInterested = 'Please select at least one product category.';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    if (!validate()) {
      // Scroll to first error
      const firstError = document.querySelector('[aria-invalid="true"]');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setLoading(true);
    try {
      await registerB2B({
        name: form.ownerName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        dob: form.dob || undefined,
        password: `B2B@${form.phone.trim().slice(-6)}!`,
        companyName: form.companyName.trim(),
        gstin: form.gstin.trim().toUpperCase(),
        businessType: form.businessType,

        businessAddress: {
          street: form.addressLine1.trim(),
          city: form.city.trim(),
          state: form.state,
          postalCode: form.pincode.trim(),
          country: 'India'
        },
        b2bProfile: {
          companyName: form.companyName.trim(),
          gstin: form.gstin.trim().toUpperCase(),
          businessType: form.businessType,
          businessAddress: {
            street: form.addressLine1.trim(),
            city: form.city.trim(),
            state: form.state,
            postalCode: form.pincode.trim(),
            country: 'India'
          }
        }
      });
      setSubmitted(true);
    } catch (err) {
      const msg = err.message || 'Application submission failed. Please try again.';
      toastError(msg);
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  const FieldError = ({ id, msg }) =>
    msg ? (
      <p id={id} role="alert" className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {msg}
      </p>
    ) : null;

  const inputCls = (err) =>
    `w-full bg-stone-50 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors
    ${err ? 'border-rose-400 bg-rose-50' : 'border-stone-300'}`;

  const withIconCls = (err) =>
    `w-full bg-stone-50 border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors
    ${err ? 'border-rose-400 bg-rose-50' : 'border-stone-300'}`;

  // ---- Success / Pending State ----
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FCFAF7] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-white rounded-3xl border border-stone-200 shadow-xl p-8 sm:p-12 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-indigo-100 flex items-center justify-center">
            <Clock className="w-10 h-10 text-indigo-600" aria-hidden="true" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-indigo-600 block mb-2">
              Application Received
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Application Under Review
            </h2>
          </div>
          <p className="text-sm text-stone-600 leading-relaxed">
            Thank you, <strong>{form.ownerName}</strong>! Your B2B wholesale application for{' '}
            <strong>{form.companyName}</strong> has been submitted successfully.
            Our team will review your GSTIN and business documents within{' '}
            <strong>24 business hours</strong>.
          </p>
          <div className="text-left p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-2 text-xs text-indigo-900">
            <p className="font-bold">What happens next:</p>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>Admin reviews your GSTIN and business type</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>Verification email sent to <strong>{form.email}</strong></span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>Once approved, wholesale pricing unlocks on login</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="flex-1 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-colors"
            >
              Sign In Now
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex-1 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-sm transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFAF7] py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center justify-center mb-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-md">
              S
            </div>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5" /> B2B Wholesale Application
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Apply for Wholesale
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
            Fill in your business details. Once approved, you'll unlock bulk wholesale pricing.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-stone-200/90 rounded-3xl shadow-xl p-6 sm:p-10">
          {errors.general && (
            <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium mb-6">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{errors.general}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-7">

            {/* SECTION 1: Business Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-black text-stone-900 uppercase tracking-wide">
                  Business Details
                </h2>
              </div>

              {/* Business Name */}
              <div>
                <label htmlFor="b2b-company" className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1.5">
                  Business Name *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" aria-hidden="true" />
                  <input
                    id="b2b-company"
                    type="text"
                    value={form.companyName}
                    onChange={(e) => set('companyName', e.target.value)}
                    placeholder="SuperBite Mart Private Limited"
                    aria-invalid={!!errors.companyName}
                    aria-describedby={errors.companyName ? 'b2b-company-error' : undefined}
                    className={withIconCls(errors.companyName)}
                  />
                </div>
                <FieldError id="b2b-company-error" msg={errors.companyName} />
              </div>

              {/* Owner Name */}
              <div>
                <label htmlFor="b2b-owner" className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1.5">
                  Owner / Contact Person Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" aria-hidden="true" />
                  <input
                    id="b2b-owner"
                    type="text"
                    value={form.ownerName}
                    onChange={(e) => set('ownerName', e.target.value)}
                    placeholder="Rajesh Sharma"
                    aria-invalid={!!errors.ownerName}
                    className={withIconCls(errors.ownerName)}
                  />
                </div>
                <FieldError id="b2b-owner-error" msg={errors.ownerName} />
              </div>

              {/* Business Type */}
              <div>
                <label htmlFor="b2b-type" className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1.5">
                  Business Type *
                </label>
                <select
                  id="b2b-type"
                  value={form.businessType}
                  onChange={(e) => set('businessType', e.target.value)}
                  aria-invalid={!!errors.businessType}
                  className={inputCls(errors.businessType)}
                >
                  <option value="">-- Select your business type --</option>
                  {businessTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <FieldError id="b2b-type-error" msg={errors.businessType} />
              </div>

              {/* GSTIN */}
              <div>
                <label htmlFor="b2b-gst" className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1.5">
                  GSTIN (15-character Tax ID) *
                </label>
                <input
                  id="b2b-gst"
                  type="text"
                  value={form.gstin}
                  onChange={(e) => set('gstin', e.target.value.toUpperCase())}
                  placeholder="27AAACS1429B1ZB"
                  maxLength={15}
                  aria-invalid={!!errors.gstin}
                  aria-describedby={errors.gstin ? 'b2b-gst-error' : 'b2b-gst-hint'}
                  className={inputCls(errors.gstin)}
                />
                {!errors.gstin && (
                  <p id="b2b-gst-hint" className="text-xs text-stone-400 mt-1">
                    Format: 27AAACS1429B1ZB (15 characters). Verified by our team.
                  </p>
                )}
                <FieldError id="b2b-gst-error" msg={errors.gstin} />
              </div>
            </div>

            {/* SECTION 2: Contact Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                <Phone className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-black text-stone-900 uppercase tracking-wide">
                  Contact Details
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="b2b-phone" className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1.5">
                    Mobile Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" aria-hidden="true" />
                    <input
                      id="b2b-phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => set('phone', e.target.value)}
                      placeholder="+91 98220 12345"
                      aria-invalid={!!errors.phone}
                      className={withIconCls(errors.phone)}
                    />
                  </div>
                  <FieldError id="b2b-phone-error" msg={errors.phone} />
                </div>

                <div>
                  <label htmlFor="b2b-email" className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1.5">
                    Business Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" aria-hidden="true" />
                    <input
                      id="b2b-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      placeholder="procurement@company.in"
                      aria-invalid={!!errors.email}
                      className={withIconCls(errors.email)}
                    />
                  </div>
                  <FieldError id="b2b-email-error" msg={errors.email} />
                </div>
              </div>

              {/* Date of Birth for B2B Owner Birthday Rewards */}
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="b2b-dob" className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                    🎂 Owner Date of Birth (Optional Birthday Treat)
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                    Free Cookie Box
                  </span>
                </div>
                <input
                  id="b2b-dob"
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={form.dob}
                  onChange={(e) => set('dob', e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-xl px-4 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>


            {/* SECTION 3: Business Address */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-black text-stone-900 uppercase tracking-wide">
                  Business Address
                </h2>
              </div>

              {/* Address Line */}
              <div>
                <label htmlFor="b2b-addr" className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1.5">
                  Street / Building Address *
                </label>
                <input
                  id="b2b-addr"
                  type="text"
                  value={form.addressLine1}
                  onChange={(e) => set('addressLine1', e.target.value)}
                  placeholder="Plot 42, Sector 18, Vashi Industrial Area"
                  aria-invalid={!!errors.addressLine1}
                  className={inputCls(errors.addressLine1)}
                />
                <FieldError id="b2b-addr-error" msg={errors.addressLine1} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* City */}
                <div>
                  <label htmlFor="b2b-city" className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1.5">
                    City *
                  </label>
                  <input
                    id="b2b-city"
                    type="text"
                    value={form.city}
                    onChange={(e) => set('city', e.target.value)}
                    placeholder="Mumbai"
                    aria-invalid={!!errors.city}
                    className={inputCls(errors.city)}
                  />
                  <FieldError id="b2b-city-error" msg={errors.city} />
                </div>

                {/* State */}
                <div>
                  <label htmlFor="b2b-state" className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1.5">
                    State *
                  </label>
                  <select
                    id="b2b-state"
                    value={form.state}
                    onChange={(e) => set('state', e.target.value)}
                    aria-invalid={!!errors.state}
                    className={inputCls(errors.state)}
                  >
                    <option value="">-- State --</option>
                    {indianStates.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <FieldError id="b2b-state-error" msg={errors.state} />
                </div>

                {/* Pincode */}
                <div>
                  <label htmlFor="b2b-pin" className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1.5">
                    Pincode *
                  </label>
                  <input
                    id="b2b-pin"
                    type="text"
                    value={form.pincode}
                    onChange={(e) => set('pincode', e.target.value)}
                    placeholder="400703"
                    maxLength={6}
                    aria-invalid={!!errors.pincode}
                    className={inputCls(errors.pincode)}
                  />
                  <FieldError id="b2b-pin-error" msg={errors.pincode} />
                </div>
              </div>
            </div>

            {/* SECTION 4: Order Intent */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                <IndianRupee className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-black text-stone-900 uppercase tracking-wide">
                  Order Intent
                </h2>
              </div>

              {/* Expected Monthly Order */}
              <div>
                <label htmlFor="b2b-order" className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1.5">
                  Expected Monthly Order Value *
                </label>
                <select
                  id="b2b-order"
                  value={form.expectedMonthlyOrder}
                  onChange={(e) => set('expectedMonthlyOrder', e.target.value)}
                  aria-invalid={!!errors.expectedMonthlyOrder}
                  className={inputCls(errors.expectedMonthlyOrder)}
                >
                  <option value="">-- Select expected order range --</option>
                  {orderRanges.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <FieldError id="b2b-order-error" msg={errors.expectedMonthlyOrder} />
              </div>

              {/* Products Interested In */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
                  Products Interested In *
                </p>
                <div className="flex flex-wrap gap-2">
                  {productCategories.map((cat) => {
                    const isSelected = form.productsInterested.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleProduct(cat)}
                        aria-pressed={isSelected}
                        className={`
                          px-3.5 py-1.5 rounded-full text-xs font-bold border-2 transition-all
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                          ${isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-white border-stone-200 text-stone-600 hover:border-indigo-300'
                          }
                        `}
                      >
                        {isSelected && <CheckCircle2 className="w-3 h-3 inline mr-1 mb-0.5" />}
                        {cat}
                      </button>
                    );
                  })}
                </div>
                <FieldError id="b2b-products-error" msg={errors.productsInterested} />
              </div>

              {/* Message */}
              <div>
                <label htmlFor="b2b-msg" className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1.5">
                  Additional Message <span className="font-normal text-stone-400">(Optional)</span>
                </label>
                <textarea
                  id="b2b-msg"
                  value={form.message}
                  onChange={(e) => set('message', e.target.value)}
                  rows={3}
                  placeholder="Tell us more about your business, delivery locations, or any specific requirements..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none transition-colors"
                />
              </div>
            </div>

            {/* Terms notice */}
            <p className="text-[11px] text-stone-400 leading-relaxed">
              By submitting, you confirm all provided business details are accurate. Snackora reserves the right to verify GSTIN and approve/reject applications at its sole discretion.
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl
                bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm
                shadow-md shadow-indigo-600/30 transition-all
                disabled:opacity-60 disabled:cursor-not-allowed
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
              "
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Submitting Application…
                </>
              ) : (
                <>Submit B2B Application <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>

        {/* Back to Login */}
        <p className="text-center text-xs text-stone-500 pb-4">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-indigo-700 hover:underline">Sign In →</Link>
        </p>
      </div>
    </div>
  );
};

export default B2BRegisterPage;
