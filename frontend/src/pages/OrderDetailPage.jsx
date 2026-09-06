import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { orderApi } from "../api/orderApi";
import { refundApi } from "../api/refundApi";
import { useToast } from "../context/ToastContext";
import { Badge } from "../components/ui/Badge";
import { RefundRequestModal } from "../components/refund/RefundRequestModal";
import {
  Package, ArrowLeft, MapPin, CreditCard, Truck,
  CheckCircle2, Clock, XCircle, IndianRupee, Loader2,
  AlertCircle, ShoppingBag, CalendarDays, RefreshCw,
  Smartphone, Building2, ShieldCheck, Sparkles, MessageSquare
} from "lucide-react";

const STATUS_CONFIG = {
  PLACED:           { variant: "info",    label: "Order Placed",      step: 1 },
  CONFIRMED:        { variant: "primary", label: "Confirmed",         step: 2 },
  PACKED:           { variant: "warning", label: "Packed",            step: 3 },
  SHIPPED:          { variant: "warning", label: "Shipped",           step: 4 },
  OUT_FOR_DELIVERY: { variant: "warning", label: "Out for Delivery",  step: 5 },
  DELIVERED:        { variant: "success", label: "Delivered",         step: 6 },
  CANCELLED:        { variant: "danger",  label: "Cancelled",         step: -1 },
  RETURN_REQUESTED: { variant: "warning", label: "Return / Refund Requested", step: 6 },
  REFUNDED:         { variant: "success", label: "Refunded",          step: 6 }
};

const TIMELINE_STEPS = [
  { key: "PLACED",           label: "Placed" },
  { key: "CONFIRMED",        label: "Confirmed" },
  { key: "PACKED",           label: "Packed" },
  { key: "SHIPPED",          label: "Shipped" },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { key: "DELIVERED",        label: "Delivered" },
];

const fmt = (n) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n ?? 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default function OrderDetailPage() {
  const { id } = useParams();
  const { error: toastError } = useToast();
  const navigate = useNavigate();

  const [order, setOrder]             = useState(null);
  const [refund, setRefund]           = useState(null);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState(null);
  const [refundModalOpen, setRefundModalOpen] = useState(false);

  const fetchOrderAndRefund = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await orderApi.getOrderById(id);
      if (res.success) {
        const orderData = res.data?.order || res.data;
        setOrder(orderData);

        // Fetch user refunds to see if this order has a refund request
        try {
          const refundRes = await refundApi.getCustomerRefunds();
          if (refundRes.success && Array.isArray(refundRes.data?.refunds)) {
            const match = refundRes.data.refunds.find(
              (r) => String(r.order?._id || r.order) === String(orderData._id)
            );
            if (match) setRefund(match);
          }
        } catch {
          // Non-blocking
        }
      } else {
        setFetchError(res.message || "Order not found.");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to load order details.";
      setFetchError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  }, [id, toastError]);

  useEffect(() => { fetchOrderAndRefund(); }, [fetchOrderAndRefund]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50/50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-stone-500">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <span className="text-sm font-medium">Loading order details…</span>
        </div>
      </div>
    );
  }

  if (fetchError || !order) {
    return (
      <div className="min-h-screen bg-stone-50/50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-10 text-center max-w-md w-full space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-black text-stone-900">Order Not Found</h2>
          <p className="text-sm text-stone-500">{fetchError || "This order does not exist or you don't have permission."}</p>
          <Link to="/dashboard" className="inline-flex items-center gap-2 mt-2 text-sm font-bold text-amber-600 hover:text-amber-700">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo  = STATUS_CONFIG[order.orderStatus] || STATUS_CONFIG.PLACED;
  const currentStep = statusInfo.step;
  const isCancelled = order.orderStatus === "CANCELLED";
  const isRefunded  = order.orderStatus === "REFUNDED" || refund?.status === "REFUNDED";

  return (
    <div className="min-h-screen bg-stone-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2.5 rounded-xl border border-stone-200 hover:bg-stone-100 transition-colors">
              <ArrowLeft className="w-4 h-4 text-stone-600" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-stone-900">
                Order <span className="text-amber-600">{order.orderNumber}</span>
              </h1>
              <p className="text-xs text-stone-400 font-medium mt-0.5 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" /> Placed on {fmtDate(order.createdAt)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <Badge variant={statusInfo.variant} size="md">{statusInfo.label}</Badge>
            
            {/* Request Refund CTA in header */}
            {!isCancelled && !refund && (
              <button
                type="button"
                onClick={() => setRefundModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition-colors shadow-md shadow-amber-500/20"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Request Refund
              </button>
            )}
          </div>
        </div>

        {/* ── REFUND STATUS CARD (If refund requested or completed) ────────────── */}
        {refund && (
          <div className="bg-gradient-to-br from-amber-50 via-white to-stone-50 rounded-3xl border-2 border-amber-300 p-6 sm:p-7 shadow-sm space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  refund.status === 'REFUNDED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {refund.status === 'REFUNDED' ? <CheckCircle2 className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    {refund.status === 'REFUNDED' ? 'Refund Processed & Transferred' : 'Refund Request Active'}
                  </h3>
                  <p className="text-xs text-stone-500 font-medium">
                    Reason: <strong className="text-stone-800">{refund.reason}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    refund.status === 'REFUNDED' ? 'success' :
                    refund.status === 'APPROVED' ? 'primary' :
                    refund.status === 'REJECTED' ? 'danger' : 'warning'
                  }
                  size="sm"
                >
                  {refund.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-stone-200">
                <span className="text-stone-400 font-bold block text-[10px] uppercase">Refund Amount</span>
                <span className="font-black text-stone-900 text-sm">₹{refund.amount}</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-stone-200">
                <span className="text-stone-400 font-bold block text-[10px] uppercase">Payout Channel</span>
                <span className="font-black text-stone-900 text-xs flex items-center gap-1 mt-0.5">
                  {refund.payoutPreference === 'UPI' ? (
                    <><Smartphone className="w-3.5 h-3.5 text-amber-600" /> UPI ({refund.upiId || 'Direct'})</>
                  ) : (
                    <><Building2 className="w-3.5 h-3.5 text-amber-600" /> Bank Transfer</>
                  )}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-stone-200">
                <span className="text-stone-400 font-bold block text-[10px] uppercase">WhatsApp Alerts</span>
                <span className="font-black text-emerald-700 text-xs flex items-center gap-1 mt-0.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> +91 {refund.whatsappNumber || order.shippingAddress?.phone || 'Linked'}
                </span>
              </div>
            </div>

            {/* Transaction Reference & Live Alert Notice */}
            {refund.transactionReference && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold block text-[11px]">Real-Time Transfer Reference / UTR:</span>
                  <span className="font-mono font-black text-xs">{refund.transactionReference}</span>
                </div>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-1 rounded-md">
                  Transferred via Real-Time IMPS / UPI
                </span>
              </div>
            )}

            <p className="text-[11px] text-stone-500 italic">
              💬 Instant notifications are dispatched to your WhatsApp (+91 {refund.whatsappNumber || 'registered phone'}) and SMS whenever your refund status changes.
            </p>
          </div>
        )}

        {/* Timeline */}
        {!isCancelled && !isRefunded && (
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 sm:p-8">
            <h2 className="text-sm font-black text-stone-900 uppercase tracking-wider mb-6 flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-600" /> Order Progress
            </h2>
            <div className="relative flex items-start justify-between">
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-stone-200 z-0" />
              <div className="absolute top-4 left-0 h-0.5 bg-amber-400 z-0 transition-all duration-700"
                style={{ width: currentStep >= 1 ? `${((currentStep - 1) / (TIMELINE_STEPS.length - 1)) * 100}%` : "0%" }} />
              {TIMELINE_STEPS.map((step, idx) => {
                const done   = idx + 1 <= currentStep;
                const active = idx + 1 === currentStep;
                return (
                  <div key={step.key} className="relative z-10 flex flex-col items-center gap-1.5 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${done ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-stone-300 text-stone-400"} ${active ? "ring-4 ring-amber-200" : ""}`}>
                      {done ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{idx + 1}</span>}
                    </div>
                    <span className={`text-[10px] font-bold text-center max-w-[60px] leading-tight ${done ? "text-amber-700" : "text-stone-400"}`}>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Items */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-stone-200 shadow-sm p-6 sm:p-8 space-y-4">
            <h2 className="text-sm font-black text-stone-900 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-stone-100">
              <ShoppingBag className="w-4 h-4 text-amber-600" /> Items ({order.items?.length || 0})
            </h2>
            <div className="space-y-3">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 rounded-2xl bg-stone-50 border border-stone-100">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200">
                    {item.image
                      ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      : <Package className="w-6 h-6 text-stone-300 m-auto mt-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-stone-900 truncate">{item.name}</p>
                    {item.variant && <p className="text-xs text-stone-400 mt-0.5">{item.variant}</p>}
                    <p className="text-xs text-stone-500 mt-0.5">₹{fmt(item.price)} × {item.quantity}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-stone-900 text-sm">₹{fmt(item.total ?? item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Money-back refund CTA box if no refund exists */}
            {!isCancelled && !refund && (
              <div className="mt-4 p-4 rounded-2xl bg-amber-50/60 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    Problem with your order? 100% Refund Guaranteed
                  </h4>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Received damaged or incorrect snacks? Request a refund and get your money transferred directly to your UPI / Bank Account.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRefundModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shrink-0 transition-colors shadow-xs"
                >
                  Request Refund →
                </button>
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="space-y-4">

            {/* Pricing */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 space-y-3">
              <h2 className="text-sm font-black text-stone-900 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-stone-100">
                <IndianRupee className="w-4 h-4 text-amber-600" /> Price Breakdown
              </h2>
              <div className="space-y-2 text-xs font-medium text-stone-600">
                <div className="flex justify-between"><span>Subtotal</span><span className="font-bold text-stone-800">₹{fmt(order.pricing?.subtotal)}</span></div>
                {order.pricing?.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount {order.couponCode ? `(${order.couponCode})` : ""}</span>
                    <span className="font-bold">− ₹{fmt(order.pricing?.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span className={`font-bold ${order.pricing?.deliveryCharge === 0 ? "text-emerald-600" : "text-stone-800"}`}>
                    {order.pricing?.deliveryCharge === 0 ? "FREE" : `₹${fmt(order.pricing?.deliveryCharge)}`}
                  </span>
                </div>
                <div className="flex justify-between"><span>GST</span><span className="font-bold text-stone-800">₹{fmt(order.pricing?.tax)}</span></div>
                <div className="flex justify-between pt-2 border-t border-stone-100 text-sm">
                  <span className="font-black text-stone-900">Total Amount</span>
                  <span className="font-black text-stone-900">₹{fmt(order.pricing?.total)}</span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            {order.shippingAddress && (
              <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 space-y-3">
                <h2 className="text-sm font-black text-stone-900 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-stone-100">
                  <MapPin className="w-4 h-4 text-amber-600" /> Deliver To
                </h2>
                <div className="text-xs text-stone-600 space-y-1 font-medium">
                  <p className="font-bold text-stone-800 text-sm">{order.shippingAddress.name || order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.line1 || order.shippingAddress.addressLine1}</p>
                  {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                  <p>{order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pincode || order.shippingAddress.postalCode}</p>
                  {order.shippingAddress.phone && <p>📞 {order.shippingAddress.phone}</p>}
                </div>
              </div>
            )}

            {/* Payment */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 space-y-3">
              <h2 className="text-sm font-black text-stone-900 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-stone-100">
                <CreditCard className="w-4 h-4 text-amber-600" /> Payment
              </h2>
              <div className="text-xs text-stone-600 font-medium space-y-2">
                <div className="flex justify-between">
                  <span>Method</span>
                  <span className="font-bold text-stone-800 uppercase">{order.paymentMethod?.replace(/_/g, " ") || "Online Payment"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Status</span>
                  <Badge variant={order.paymentStatus === "PAID" || order.paymentStatus === "COMPLETED" ? "success" : order.paymentStatus === "REFUNDED" ? "info" : order.paymentStatus === "PENDING" ? "warning" : "danger"} size="xs">
                    {order.paymentStatus || "PENDING"}
                  </Badge>
                </div>
                {order.razorpayOrderId && (
                  <div className="flex justify-between">
                    <span>Razorpay ID</span>
                    <span className="font-mono text-stone-500 text-[10px] break-all">{order.razorpayOrderId}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/dashboard" className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-700 font-bold text-xs hover:bg-stone-50 transition-colors text-center">
            ← Back to Dashboard
          </Link>
          <Link to="/shop" className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition-colors shadow-md shadow-amber-500/20 text-center">
            Continue Shopping
          </Link>
        </div>
      </div>

      {/* ── REFUND REQUEST MODAL ────────────────────────────────────────────── */}
      <RefundRequestModal
        isOpen={refundModalOpen}
        order={order}
        onClose={() => setRefundModalOpen(false)}
        onSuccess={(createdRefund) => {
          setRefund(createdRefund);
          fetchOrderAndRefund();
        }}
      />
    </div>
  );
}
