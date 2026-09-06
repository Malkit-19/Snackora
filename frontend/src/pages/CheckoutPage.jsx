import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag, MapPin, CreditCard, CheckCircle2, ChevronRight,
  ChevronLeft, Truck, ShieldCheck, Smartphone, Banknote,
  Loader2, AlertCircle, Package, Lock, RefreshCw, AlertTriangle,
  QrCode, Copy, Check, ExternalLink, Sparkles, Shield
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { AddressManager } from '../components/address/AddressManager';
import { checkoutApi } from '../api/checkoutApi';
import { paymentApi } from '../api/paymentApi';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const STEPS = [
  { id: 1, label: 'Cart', icon: ShoppingBag },
  { id: 2, label: 'Address', icon: MapPin },
  { id: 3, label: 'Summary', icon: Package },
  { id: 4, label: 'Payment', icon: CreditCard }
];

const PAYMENT_METHODS = [
  {
    id: 'COD',
    label: 'Cash on Delivery (COD)',
    description: 'Pay in cash when your fresh Snackora snacks arrive at your doorstep.',
    icon: Banknote,
    badge: 'Zero Risk'
  },
  {
    id: 'UPI',
    label: 'UPI / Instant QR Scanner (GPay / PhonePe / Paytm / BHIM)',
    description: 'Pay instantly via GPay, PhonePe, Paytm or any UPI app. Zero extra charges.',
    icon: Smartphone,
    badge: 'Recommended'
  }
];

// Helper to load Razorpay checkout script dynamically
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cartItems, cartCount, clearCart } = useCart();
  const { user, isApprovedB2B } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [step, setStep] = useState(2); // Start at Address (cart is already /cart)
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState(null);

  // UPI Dynamic Scanner State
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [utrInput, setUtrInput] = useState('');
  const [verifyingUpi, setVerifyingUpi] = useState(false);
  const [autoTracking, setAutoTracking] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState(user?.phone ? String(user.phone).replace(/\D/g,'').slice(-10) : '');

  // ── Real-Time UPI Transaction Tracking & Auto-Confirmation Poller ──────────
  useEffect(() => {
    if (!upiModalOpen || !placedOrder?._id) return;

    let isMounted = true;
    setAutoTracking(true);

    const checkPaymentStatus = async () => {
      try {
        const res = await paymentApi.getPaymentByOrder(placedOrder._id);
        if (!isMounted) return;

        if (
          res.success &&
          (res.data?.paymentStatus === 'COMPLETED' || res.data?.orderStatus === 'CONFIRMED')
        ) {
          toastSuccess('🎉 Payment received! Order confirmed automatically.');
          setPlacedOrder((prev) => ({
            ...prev,
            paymentStatus: 'COMPLETED',
            orderStatus: 'CONFIRMED'
          }));
          setUpiModalOpen(false);
          setStep(5);
        }
      } catch (err) {
        // Silent background poll
      }
    };

    // Immediate check on modal open
    checkPaymentStatus();

    // Fast 2-second poller
    const pollInterval = setInterval(checkPaymentStatus, 2000);

    // Immediate check whenever user switches back from UPI app
    const onWindowFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        checkPaymentStatus();
      }
    };

    document.addEventListener('visibilitychange', onWindowFocusOrVisible);
    window.addEventListener('focus', onWindowFocusOrVisible);

    return () => {
      isMounted = false;
      setAutoTracking(false);
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', onWindowFocusOrVisible);
      window.removeEventListener('focus', onWindowFocusOrVisible);
    };
  }, [upiModalOpen, placedOrder?._id, toastSuccess]);

  // Redirect to cart if empty
  useEffect(() => {
    if (cartCount === 0 && !placedOrder) {
      navigate('/cart');
    }
  }, [cartCount, navigate, placedOrder]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
    }
  }, [user, navigate]);

  // Load authoritative summary when reaching Step 3
  useEffect(() => {
    if (step === 3) {
      fetchSummary();
    }
  }, [step]);

  // Fetch payment gateway configuration (public key id + merchant UPI)
  useEffect(() => {
    paymentApi.getConfig()
      .then((res) => { if (res.success) setPaymentConfig(res.data); })
      .catch(() => {});
  }, []);

  const merchantUpiId = paymentConfig?.merchantUpiId || 'jkaur08@oksbi';
  const merchantPhone = paymentConfig?.merchantPhone || '7021475382';
  const merchantName = paymentConfig?.merchantName || 'Snackora Foods';
  const payableAmount = summary?.pricing?.total || 0;

  // Standard Indian UPI Intent URI
  const upiUri = `upi://pay?pa=${encodeURIComponent(merchantUpiId)}&pn=${encodeURIComponent(merchantName)}&am=${encodeURIComponent(payableAmount)}&cu=INR&tn=${encodeURIComponent(placedOrder?.orderNumber ? `Order ${placedOrder.orderNumber}` : 'Snackora Order Payment')}`;

  const fetchSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const res = await checkoutApi.getSummary();
      if (res.success) {
        setSummary(res.data);
      }
    } catch (err) {
      setSummaryError(err.message || 'Failed to load order summary.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const copyUpiIdToClipboard = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(merchantUpiId);
      setCopiedUpi(true);
      toastSuccess(`UPI ID copied: ${merchantUpiId}`);
      setTimeout(() => setCopiedUpi(false), 2500);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toastError('Please select a delivery address.');
      return;
    }
    if (!paymentMethod) {
      toastError('Please select a payment method.');
      return;
    }

    setPlacing(true);
    try {
      // 1. Create order on authoritative backend (automatically deducts stock!)
      const res = await checkoutApi.placeOrder({
        addressId: selectedAddress._id,
        paymentMethod
      });

      if (!res.success) {
        throw new Error(res.message || 'Failed to create order.');
      }

      const order = res.data?.order;
      setPlacedOrder(order);

      // 2. Branch according to Payment Method
      if (paymentMethod === 'COD') {
        // Cash on delivery — order placed immediately
        setStep(5); // Confirmation screen
        toastSuccess(`Order ${order.orderNumber} placed successfully!`);
      } else {
        // UPI Payment: open live scanner & payment modal
        setUpiModalOpen(true);
      }
    } catch (err) {
      toastError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  // Direct UPI Verification (UTR / Reference submission)
  const handleDirectUpiVerification = async () => {
    if (!placedOrder) return;
    setVerifyingUpi(true);
    try {
      const res = await paymentApi.verifyDirectUpiPayment({
        orderId: placedOrder._id,
        utr: utrInput.trim() || `UPI-APP-${Date.now()}`
      });

      if (res.success) {
        toastSuccess('UPI Payment verified successfully! Your order is confirmed.');
        setPlacedOrder({
          ...placedOrder,
          paymentStatus: 'COMPLETED',
          orderStatus: 'CONFIRMED'
        });
        setUpiModalOpen(false);
        setStep(5);
      } else {
        toastError(res.message || 'Payment verification failed.');
      }
    } catch (err) {
      toastError(err.message || 'Error verifying UPI payment.');
    } finally {
      setVerifyingUpi(false);
    }
  };

  // Razorpay Gateway UPI launcher (transfers to account linked to 7021475382)
  const handleLaunchRazorpay = async () => {
    if (!placedOrder) return;
    const isScriptLoaded = await loadRazorpayScript();
    if (!isScriptLoaded) {
      toastError('Unable to load Razorpay payment SDK.');
      return;
    }

    try {
      const rzpOrderRes = await paymentApi.createRazorpayOrder(placedOrder._id);
      if (!rzpOrderRes.success) {
        toastError(rzpOrderRes.message || 'Payment gateway unconfigured.');
        return;
      }

      const { razorpayOrderId, amount, razorpayKeyId, orderNumber } = rzpOrderRes.data;

      const options = {
        key: razorpayKeyId,
        amount: amount,
        currency: 'INR',
        name: 'Snackora Foods',
        description: `Order ${orderNumber} Payment`,
        order_id: razorpayOrderId,
        prefill: {
          name: selectedAddress?.fullName || user?.name || '',
          email: user?.email || '',
          contact: selectedAddress?.phone || user?.phone || merchantPhone
        },
        theme: {
          color: '#f59e0b'
        },
        handler: async (response) => {
          try {
            const verifyRes = await paymentApi.verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              orderId: placedOrder._id
            });

            if (verifyRes.success) {
              toastSuccess('Payment verified successfully! Your order is confirmed.');
              setPlacedOrder({
                ...placedOrder,
                paymentStatus: 'COMPLETED',
                orderStatus: 'CONFIRMED'
              });
              setUpiModalOpen(false);
              setStep(5);
            } else {
              toastError('Payment verification failed.');
            }
          } catch (vErr) {
            toastError(vErr.message || 'Error verifying payment signature.');
          }
        }
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();
    } catch (err) {
      toastError(err.message || 'Razorpay initialization failed.');
    }
  };

  const isB2BPending = user?.role === 'B2B_WHOLESALER' && !isApprovedB2B;
  const canProceedToSummary = !!selectedAddress && !isB2BPending;
  const canPlaceOrder = selectedAddress && paymentMethod && !placing && !isB2BPending;


  // ── STEP INDICATOR ──────────────────────────────────────────────────────────
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((s, idx) => {
        const isCompleted = step > s.id || (placedOrder && step === 5);
        const isActive = step === s.id;
        const Icon = s.icon;
        return (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all font-black text-xs ${
                  isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isActive
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                    : 'bg-stone-100 text-stone-400'
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[10px] font-bold hidden sm:block ${isActive ? 'text-amber-700' : 'text-stone-400'}`}>
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`h-0.5 w-12 sm:w-20 mx-1 transition-all ${step > s.id ? 'bg-emerald-400' : 'bg-stone-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // ── STEP 2: ADDRESS ─────────────────────────────────────────────────────────
  const AddressStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-stone-900">Select Delivery Address</h2>
        <p className="text-sm text-stone-400 mt-1">Choose where we should deliver your Snackora order.</p>
      </div>
      <AddressManager
        selectable
        selectedId={selectedAddress?._id || null}
        onSelect={(addr) => setSelectedAddress(addr)}
      />
      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={!canProceedToSummary}
          onClick={() => setStep(3)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-amber-500/20"
        >
          Continue to Summary <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // ── STEP 3: ORDER SUMMARY ───────────────────────────────────────────────────
  const SummaryStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-stone-900">Review Order Summary</h2>
          <p className="text-sm text-stone-400 mt-1">Prices are up to date.</p>
        </div>
        <button type="button" onClick={() => setStep(2)} className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" /> Change Address
        </button>
      </div>

      {summaryLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
      ) : summaryError ? (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {summaryError}
        </div>
      ) : summary ? (
        <div className="space-y-4">
          {/* Address Preview */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-stone-600">
              <span className="font-black text-stone-900 block">{selectedAddress?.fullName} ({selectedAddress?.phone})</span>
              <span>{selectedAddress?.addressLine1}{selectedAddress?.addressLine2 ? `, ${selectedAddress?.addressLine2}` : ''}, {selectedAddress?.city}, {selectedAddress?.state} - {selectedAddress?.pincode}</span>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-stone-500 uppercase">Payment Summary</h3>
            <div className="space-y-2 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Subtotal ({summary.items?.length} items)</span>
                <span className="font-bold text-stone-900">₹{summary.pricing?.subtotal}</span>
              </div>
              {summary.pricing?.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Coupon Discount</span>
                  <span className="font-bold">-₹{summary.pricing?.discount}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery</span>
                {summary.pricing?.delivery === 0
                  ? <span className="font-bold text-emerald-600 uppercase text-xs">FREE</span>
                  : <span className="font-bold text-stone-900">₹{summary.pricing?.delivery}</span>}
              </div>
              <div className="flex justify-between">
                <span>GST (5%)</span>
                <span className="font-bold text-stone-900">₹{summary.pricing?.tax}</span>
              </div>
              <div className="flex justify-between text-base font-black text-stone-900 border-t border-stone-200 pt-2 mt-1">
                <span>Total Payable</span>
                <span className="text-xl text-amber-900">₹{summary.pricing?.total}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => setStep(2)} className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-stone-200 text-sm font-bold text-stone-500 hover:bg-stone-50 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          type="button"
          disabled={summaryLoading || !summary}
          onClick={() => setStep(4)}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-amber-500/20"
        >
          Continue to Payment <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // ── STEP 4: PAYMENT ─────────────────────────────────────────────────────────
  const PaymentStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-stone-900">Select Payment Method</h2>
          <p className="text-sm text-stone-400 mt-1">Choose your preferred payment method.</p>
        </div>
        <button type="button" onClick={() => setStep(3)} className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      <div className="space-y-3">
        {PAYMENT_METHODS.map((pm) => {
          const Icon = pm.icon;
          const isSelected = paymentMethod === pm.id;
          return (
            <button
              key={pm.id}
              type="button"
              onClick={() => setPaymentMethod(pm.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                isSelected
                  ? 'border-amber-500 bg-amber-50/60 shadow-xs'
                  : 'border-stone-200 hover:border-stone-300 bg-white'
              }`}
            >
              {/* Radio Indicator */}
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                isSelected ? 'border-amber-500 bg-amber-500' : 'border-stone-300'
              }`}>
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>

              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isSelected ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-500'
              }`}>
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-stone-900">{pm.label}</span>
                  {pm.badge && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                      {pm.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-400 font-medium mt-0.5">{pm.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── WhatsApp Number Collection ─────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
        <div className="flex items-center justify-between">
          <label className="font-bold text-stone-800 text-sm flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-600" />
            WhatsApp Number for Order Alerts
          </label>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-100">
            💬 Delivery & Refund Alerts
          </span>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-stone-500 text-xs">+91</span>
            <input
              type="tel"
              maxLength={10}
              placeholder="9876543210 (for order + refund WhatsApp updates)"
              value={whatsappPhone}
              onChange={(e) => setWhatsappPhone(e.target.value.replace(/\D/g, ''))}
              className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-emerald-200 text-xs font-bold bg-white focus:ring-2 focus:ring-emerald-400 focus:outline-none"
            />
          </div>
        </div>
        <p className="text-[10px] text-stone-500">
          We'll send real-time order confirmation, tracking, and refund notifications to this WhatsApp number.
        </p>
      </div>



      {/* ── LIVE UPI SCANNER PREVIEW (When UPI is selected) ───────────────── */}
      {paymentMethod === 'UPI' && (
        <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-50/40 to-stone-50 border-2 border-amber-400/80 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-amber-600" />
              <span className="font-black text-sm text-stone-900">Instant UPI Dynamic QR Scanner</span>
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              ⚡ Instant Account Credit
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-white border border-amber-200/80 shadow-xs">
            {/* Live QR Code with Crisp Styling */}
            <div className="p-3 bg-white rounded-2xl border-2 border-dashed border-amber-300 shadow-sm shrink-0 flex flex-col items-center">
              <QRCodeSVG
                value={upiUri}
                size={140}
                level="M"
                includeMargin={false}
              />
              <span className="text-[10px] font-black text-amber-900 mt-1.5 uppercase tracking-wider">
                Scan & Pay ₹{payableAmount}
              </span>
            </div>

            {/* UPI Details & Instant Links */}
            <div className="space-y-2.5 flex-1 text-xs">
              <div>
                <span className="text-stone-400 font-medium block text-[11px]">Pay to Snackora</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono font-black text-stone-900 text-sm bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200">
                    {merchantUpiId}
                  </span>
                  <button
                    type="button"
                    onClick={copyUpiIdToClipboard}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-[11px] transition-colors"
                  >
                    {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedUpi ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-stone-500 space-y-1">
                <p>• <strong>Supported UPI Apps:</strong> GPay, PhonePe, Paytm, BHIM, Amazon Pay, Cred</p>
                <p>• All payments reflect immediately to merchant phone <strong>+91 {merchantPhone}</strong>.</p>
              </div>

              {/* Mobile Deep Link */}
              <div className="pt-1">
                <a
                  href={upiUri}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition-colors shadow-xs"
                >
                  <Smartphone className="w-3.5 h-3.5" /> Open in Any UPI App
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trust & Security Badge */}
      <div className="flex items-center gap-2 text-xs text-stone-500 bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Your payment goes directly to Snackora. Secure &amp; instant.</span>
      </div>

      {/* Place Order / Pay Button */}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => setStep(3)} className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-stone-200 text-sm font-bold text-stone-500 hover:bg-stone-50 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          type="button"
          disabled={!canPlaceOrder}
          onClick={handlePlaceOrder}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20"
        >
          {placing ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Processing Order…</>
          ) : isB2BPending ? (
            'Your wholesale application is under review. Checkout will open once approved.'
          ) : paymentMethod === 'COD' ? (
            'Place Order (Cash on Delivery)'
          ) : (
            `Pay ₹${payableAmount} via UPI Scanner`
          )}
        </button>
      </div>
    </div>
  );

  // ── STEP 5: CONFIRMATION ───────────────────────────────────────────────────
  const ConfirmationStep = () => (
    <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center space-y-6 max-w-lg mx-auto shadow-sm">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-lg ${
        placedOrder?.paymentStatus === 'COMPLETED' || placedOrder?.paymentMethod === 'COD'
          ? 'bg-emerald-100 text-emerald-600 shadow-emerald-100'
          : 'bg-amber-100 text-amber-600 shadow-amber-100'
      }`}>
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-black text-stone-900">
          {placedOrder?.paymentStatus === 'COMPLETED'
            ? 'Payment Verified & Order Confirmed!'
            : 'Order Placed Successfully!'}
        </h2>
        <p className="text-xs text-stone-500">
          Order Number: <strong className="font-mono text-stone-900 text-sm">{placedOrder?.orderNumber}</strong>
        </p>
      </div>

      <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-left text-xs space-y-2">
        <div className="flex justify-between">
          <span className="text-stone-400">Payment Method</span>
          <span className="font-bold text-stone-800">{placedOrder?.paymentMethod}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-400">Payment Status</span>
          <span className={`font-black ${placedOrder?.paymentStatus === 'COMPLETED' ? 'text-emerald-600' : 'text-amber-600'}`}>
            {placedOrder?.paymentStatus}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-400">Total Amount</span>
          <span className="font-black text-stone-900">₹{placedOrder?.pricing?.total}</span>
        </div>
        <div className="flex justify-between text-stone-500 pt-1 border-t border-stone-200">
          <span>Paid To</span>
          <span className="font-bold text-stone-700">Snackora Foods (+91 {merchantPhone})</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Link
          to={`/orders/${placedOrder?._id || ''}`}
          className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition-colors shadow-md shadow-amber-500/20"
        >
          View Order Details
        </Link>
        <Link
          to="/shop"
          className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-700 font-bold text-xs hover:bg-stone-50 transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {step < 5 && <StepIndicator />}

        {isB2BPending && step < 5 && (
          <div className="mb-6 p-5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3.5 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <p className="font-black text-sm text-amber-950">Your wholesale application is under review.</p>
              <p className="leading-relaxed">
                Your B2B Wholesale application is currently under review by the Snackora Admin team. You can continue adding items to your cart, but order checkout will remain locked until your business credentials (GSTIN) are approved.
              </p>
              <div className="pt-2">
                <Link to="/dashboard" className="font-bold underline text-amber-900 hover:text-amber-700">
                  View your application status on Dashboard →
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs">
          {step === 2 && <AddressStep />}
          {step === 3 && <SummaryStep />}
          {step === 4 && <PaymentStep />}
          {step === 5 && <ConfirmationStep />}
        </div>
      </div>

      {/* ── UPI PAYMENT SCANNER MODAL ────────────────────────────────────── */}
      {upiModalOpen && placedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-150 border border-amber-100">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-black">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">Scan & Pay ₹{placedOrder?.pricing?.total}</h3>
                  <p className="text-[11px] text-stone-400 font-mono">Order: {placedOrder?.orderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setUpiModalOpen(false);
                  setStep(5);
                }}
                className="text-stone-400 hover:text-stone-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Real-Time Auto-Confirmation Status Indicator */}
            <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>Auto-confirms as soon as your payment is received</span>
            </div>

            {/* QR Code Canvas */}
            <div className="flex flex-col items-center p-5 bg-gradient-to-b from-amber-50/50 to-stone-50 rounded-2xl border-2 border-amber-300">
              <div className="p-3 bg-white rounded-2xl shadow-md border border-stone-200">
                <QRCodeSVG
                  value={upiUri}
                  size={180}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <div className="text-center mt-3 space-y-1">
                <p className="text-xs font-black text-stone-800">Scan with any UPI App</p>
                <p className="text-xs text-stone-500 font-medium">GPay • PhonePe • Paytm • BHIM • Cred</p>
                <div className="inline-flex items-center gap-1.5 text-xs text-amber-900 font-mono bg-white px-2.5 py-1 rounded-lg border border-amber-200 mt-1 shadow-xs">
                  <span>Payee: <strong>{merchantUpiId}</strong></span>
                  <button
                    type="button"
                    onClick={copyUpiIdToClipboard}
                    className="text-amber-600 hover:text-amber-800 font-bold ml-1"
                  >
                    {copiedUpi ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Direct Deep Link */}
            <div className="text-center">
              <a
                href={upiUri}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition-colors shadow-xs"
              >
                <Smartphone className="w-4 h-4" /> Tap to Pay via Any UPI App on this Phone
              </a>
            </div>

            {/* Verification Actions */}
            <div className="space-y-3 pt-1 border-t border-stone-100">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  UPI Reference / Transaction ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 423589123456 or leave blank for instant verify"
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <button
                type="button"
                disabled={verifyingUpi}
                onClick={handleDirectUpiVerification}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-colors disabled:opacity-50 shadow-md shadow-emerald-600/20"
              >
                {verifyingUpi ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Verifying & Confirming Order…</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> I Have Paid — Confirm Order Instantly</>
                )}
              </button>

              {paymentConfig?.configured && (
                <button
                  type="button"
                  onClick={handleLaunchRazorpay}
                  className="w-full py-2.5 rounded-xl border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Open Razorpay UPI Gateway Popup
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

};

export default CheckoutPage;
