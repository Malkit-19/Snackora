import React, { useState, useEffect, useCallback } from 'react';
import { refundApi } from '../../api/refundApi';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../ui/Badge';
import { QRCodeSVG } from 'qrcode.react';
import {
  RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle,
  Search, Loader2, Smartphone, Building2, MessageSquare,
  Copy, Check, Zap, IndianRupee, Phone, User, CreditCard, 
  ShieldCheck, Package, QrCode, ExternalLink
} from 'lucide-react';

const STATUS_BADGE_VARIANTS = {
  REQUESTED:       { variant: 'warning', label: 'Requested' },
  UNDER_REVIEW:    { variant: 'info',    label: 'Under Review' },
  APPROVED:        { variant: 'success', label: 'Approved' },
  REJECTED:        { variant: 'danger',  label: 'Rejected' },
  REFUND_INITIATED:{ variant: 'warning', label: 'Refund Initiated' },
  REFUNDED:        { variant: 'success', label: 'Refunded' }
};

function CopyButton({ text, label = '' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Copy ${label}`}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-600 text-[10px] font-bold transition-colors shrink-0"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export const RefundManager = () => {
  const { success: toastSuccess, error: toastError } = useToast();

  const [refunds, setRefunds]       = useState([]);
  const [summary, setSummary]       = useState({});
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Action Modal State
  const [activeRefund, setActiveRefund]       = useState(null);
  const [targetStatus, setTargetStatus]       = useState('UNDER_REVIEW');
  const [adminNotes, setAdminNotes]           = useState('');
  const [rejectedReason, setRejectedReason]   = useState('');
  const [transactionRef, setTransactionRef]   = useState('');
  const [restockToInventory, setRestockToInventory] = useState(true);
  const [updating, setUpdating]               = useState(false);

  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await refundApi.adminGetAllRefunds(params);
      if (res.success) {
        setRefunds(res.data?.refunds || []);
        setSummary(res.data?.summary || {});
        setTotalAmount(res.data?.totalRefundAmount || 0);
      }
    } catch (err) {
      toastError('Failed to fetch refund requests.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm, toastError]);

  useEffect(() => { fetchRefunds(); }, [fetchRefunds]);

  const openModal = (rf) => {
    setActiveRefund(rf);
    setTargetStatus(rf.status === 'REQUESTED' ? 'UNDER_REVIEW' : rf.status);
    setAdminNotes(rf.adminNotes || '');
    setRejectedReason(rf.rejectedReason || '');
    setTransactionRef(rf.transactionReference || '');
    setRestockToInventory(true);
  };

  const handleGrantRefund = async (rf) => {
    // 1-click instant refund grant
    setActiveRefund(rf);
    setTargetStatus('REFUNDED');
    setAdminNotes('Refund granted and processed by Admin in real-time.');
    setTransactionRef('');
    setRejectedReason('');
    setRestockToInventory(true);
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!activeRefund) return;

    setUpdating(true);
    try {
      const res = await refundApi.adminUpdateRefundStatus(activeRefund._id, {
        status: targetStatus,
        adminNotes: adminNotes.trim(),
        rejectedReason: rejectedReason.trim(),
        transactionReference: transactionRef.trim(),
        restockToInventory: (targetStatus === 'APPROVED' || targetStatus === 'REFUNDED') && restockToInventory
      });

      if (res.success) {
        toastSuccess(
          targetStatus === 'REFUNDED'
            ? `⚡ Refund GRANTED for Order ${activeRefund.orderNumber}! Customer notified via WhatsApp, SMS & In-App.`
            : `Refund #${activeRefund._id} status updated to ${targetStatus}.`
        );
        setActiveRefund(null);
        setAdminNotes('');
        setRejectedReason('');
        setTransactionRef('');
        await fetchRefunds();
      }
    } catch (err) {
      toastError(err.message || 'Failed to update refund status.');
    } finally {
      setUpdating(false);
    }
  };

  const waLink = (phone) => {
    if (!phone) return null;
    const digits = String(phone).replace(/\D/g, '');
    const full = digits.length === 10 ? `91${digits}` : digits;
    return `https://wa.me/${full}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-indigo-600" />
            Refund & Return Management
          </h2>
          <p className="text-xs text-stone-500 mt-1 font-medium">
            Review customer refund requests, grant instant payouts via UPI / Bank, and restock returned inventory.
          </p>
        </div>
        <button
          onClick={fetchRefunds}
          disabled={loading}
          className="p-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
          <span className="text-xs font-bold text-stone-400 uppercase">Total Requests</span>
          <p className="text-xl font-black text-stone-900 mt-1">{refunds.length}</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200">
          <span className="text-xs font-bold text-amber-800 uppercase">Pending Action</span>
          <p className="text-xl font-black text-amber-900 mt-1">
            {(summary.REQUESTED || 0) + (summary.UNDER_REVIEW || 0)}
          </p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
          <span className="text-xs font-bold text-emerald-800 uppercase">Refunded</span>
          <p className="text-xl font-black text-emerald-900 mt-1">{summary.REFUNDED || 0}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200">
          <span className="text-xs font-bold text-purple-800 uppercase">Total Refund Value</span>
          <p className="text-xl font-black text-purple-900 mt-1">₹{totalAmount}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {['ALL', 'REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REFUNDED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === st ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {st.replace('_', ' ')}
              {st !== 'ALL' && summary[st] ? ` (${summary[st]})` : ''}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search Order / UPI / Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Refund Cards */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
      ) : refunds.length === 0 ? (
        <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400 text-xs font-bold">
          No refund requests found.
        </div>
      ) : (
        <div className="space-y-4">
          {refunds.map((rf) => {
            const badgeInfo = STATUS_BADGE_VARIANTS[rf.status] || { variant: 'default', label: rf.status };
            const isPending = rf.status === 'REQUESTED' || rf.status === 'UNDER_REVIEW' || rf.status === 'APPROVED';
            const isRefunded = rf.status === 'REFUNDED';

            return (
              <div
                key={rf._id}
                className={`bg-white rounded-3xl border shadow-sm overflow-hidden ${
                  isPending ? 'border-amber-200' : isRefunded ? 'border-emerald-200' : 'border-stone-200'
                }`}
              >
                {/* Top bar */}
                <div className={`px-6 py-3 flex items-center justify-between ${
                  isPending ? 'bg-amber-50' : isRefunded ? 'bg-emerald-50' : 'bg-stone-50'
                } border-b ${isPending ? 'border-amber-100' : 'border-stone-100'}`}>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-stone-900 text-sm">{rf.orderNumber}</span>
                    <Badge variant={badgeInfo.variant} size="xs">{badgeInfo.label}</Badge>
                    {isPending && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                        ⚡ Action Required
                      </span>
                    )}
                    {isRefunded && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                        ✅ Completed
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-stone-900 text-base">₹{rf.amount}</span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                  {/* Customer Info */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider block">Customer</span>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-stone-400" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-stone-900">{rf.user?.name || 'Customer'}</p>
                        <p className="text-[10px] text-stone-400">{rf.user?.email}</p>
                      </div>
                    </div>
                    <div className="text-[11px] space-y-1 pl-1">
                      <p className="text-stone-600 font-medium">
                        📞 <span className="font-mono">{rf.user?.phone || '—'}</span>
                      </p>
                      {rf.whatsappNumber && (
                        <a
                          href={waLink(rf.whatsappNumber)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline"
                        >
                          <MessageSquare className="w-3 h-3 text-emerald-600" />
                          💬 WhatsApp +91 {rf.whatsappNumber}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Payout Details */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider block">
                      Payout Details ({rf.payoutPreference || 'UPI'})
                    </span>

                    {rf.payoutPreference === 'BANK_TRANSFER' ? (
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-stone-400 block text-[10px]">Account Holder</span>
                            <span className="font-bold text-stone-900">{rf.bankDetails?.accountHolderName || '—'}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="text-stone-400 block text-[10px]">Account No.</span>
                            <span className="font-mono font-black text-stone-900">{rf.bankDetails?.accountNumber || '—'}</span>
                          </div>
                          <CopyButton text={rf.bankDetails?.accountNumber} label="Account Number" />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="text-stone-400 block text-[10px]">IFSC Code</span>
                            <span className="font-mono font-black text-stone-900">{rf.bankDetails?.ifscCode || '—'}</span>
                          </div>
                          <CopyButton text={rf.bankDetails?.ifscCode} label="IFSC" />
                        </div>
                        <p className="text-stone-500">
                          🏦 Bank: <strong>{rf.bankDetails?.bankName || '—'}</strong>
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="text-stone-400 block text-[10px]">UPI ID / VPA</span>
                            <span className="font-mono font-black text-amber-900 text-xs">
                              {rf.upiId || '—'}
                            </span>
                          </div>
                          <CopyButton text={rf.upiId} label="UPI ID" />
                        </div>
                        <p className="text-stone-500">
                          <Smartphone className="w-3 h-3 inline mr-0.5 text-amber-600" />
                          Instant UPI transfer to customer's registered VPA
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Refund Summary */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider block">Request Details</span>
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-[11px] space-y-1.5">
                      <p><span className="text-stone-400">Reason:</span> <strong className="text-stone-900">{rf.reason}</strong></p>
                      <p className="text-stone-500 italic truncate" title={rf.description}>"{rf.description}"</p>
                      <p><span className="text-stone-400">Payment Method:</span> <strong>{rf.order?.paymentMethod || '—'}</strong></p>
                      {rf.transactionReference && (
                        <p className="flex items-center gap-1">
                          <span className="text-stone-400">Txn Ref:</span>
                          <span className="font-mono font-black text-emerald-700">{rf.transactionReference}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="px-5 sm:px-6 pb-5 flex flex-wrap gap-2.5">
                  {!isRefunded && rf.status !== 'REJECTED' && (
                    <button
                      type="button"
                      onClick={() => handleGrantRefund(rf)}
                      className="flex-1 min-w-[160px] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-4 h-4" />
                      ⚡ Grant & Process Refund
                    </button>
                  )}
                  {rf.upiId && !isRefunded && (
                    <a
                      href={`upi://pay?pa=${encodeURIComponent(rf.upiId)}&pn=${encodeURIComponent(rf.user?.name || 'Customer')}&am=${encodeURIComponent(rf.amount)}&cu=INR&tn=${encodeURIComponent('Snackora Refund ' + rf.orderNumber)}`}
                      className="px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Smartphone className="w-3.5 h-3.5" /> Pay in UPI App
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => openModal(rf)}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    Review & Update Status
                  </button>
                  {rf.whatsappNumber && (
                    <a
                      href={waLink(rf.whatsappNumber)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Chat
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ACTION MODAL ──────────────────────────────────────────────────────── */}
      {activeRefund && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-150 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-lg font-black text-stone-900">
                  {targetStatus === 'REFUNDED' ? '⚡ Grant & Process Real-Time Refund' : 'Update Refund Status'}
                </h3>
                <p className="text-xs text-stone-400 font-mono mt-0.5">Order: {activeRefund.orderNumber}</p>
              </div>
              <button onClick={() => setActiveRefund(null)} className="text-stone-400 font-bold text-lg hover:text-stone-700">✕</button>
            </div>

            {/* Refund Summary & Customer Details */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-400">Customer</span>
                <span className="font-bold text-stone-900">{activeRefund.user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Refund Amount</span>
                <span className="font-black text-stone-900 text-sm">₹{activeRefund.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Payout Channel</span>
                <span className="font-bold text-stone-800">{activeRefund.payoutPreference === 'UPI' ? `UPI — ${activeRefund.upiId}` : `Bank — ${activeRefund.bankDetails?.accountNumber || 'N/A'}`}</span>
              </div>
              {activeRefund.whatsappNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Customer WhatsApp</span>
                  <a
                    href={waLink(activeRefund.whatsappNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <MessageSquare className="w-3 h-3" /> +91 {activeRefund.whatsappNumber}
                  </a>
                </div>
              )}
              <p className="text-[11px] text-stone-500 pt-1 italic border-t border-stone-200">"{activeRefund.description}"</p>
            </div>

            {/* Direct UPI Scan & Pay Card for Admin (When Customer Provided UPI ID) */}
            {activeRefund.upiId && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-stone-50 border-2 border-amber-300 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-stone-900 text-xs flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-amber-600" />
                    Customer's Instant UPI QR Scanner
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    ⚡ Instant Real-Time Credit
                  </span>
                </div>

                <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-amber-200">
                  <div className="p-2 bg-white rounded-lg border border-stone-200 shrink-0">
                    <QRCodeSVG
                      value={`upi://pay?pa=${encodeURIComponent(activeRefund.upiId)}&pn=${encodeURIComponent(activeRefund.user?.name || 'Customer')}&am=${encodeURIComponent(activeRefund.amount)}&cu=INR&tn=${encodeURIComponent('Snackora Refund ' + activeRefund.orderNumber)}`}
                      size={80}
                      level="M"
                    />
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="text-stone-500 text-[11px]">Pay directly to customer UPI:</p>
                    <p className="font-mono font-black text-amber-900 text-xs bg-amber-50 px-2 py-0.5 rounded-md inline-block border border-amber-200">
                      {activeRefund.upiId}
                    </p>
                    <div>
                      <a
                        href={`upi://pay?pa=${encodeURIComponent(activeRefund.upiId)}&pn=${encodeURIComponent(activeRefund.user?.name || 'Customer')}&am=${encodeURIComponent(activeRefund.amount)}&cu=INR&tn=${encodeURIComponent('Snackora Refund ' + activeRefund.orderNumber)}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 underline mt-0.5"
                      >
                        <Smartphone className="w-3 h-3" /> Tap to Open GPay / PhonePe / Paytm →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {targetStatus === 'REFUNDED' && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5 text-[11px] text-emerald-900">
                <p className="font-black text-sm flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-600" /> Real-Time Refund Grant
                </p>
                <p>As soon as you click "Grant Refund", the customer will receive:</p>
                <ul className="space-y-0.5 ml-3 list-disc">
                  <li>💬 Instant WhatsApp notification with transaction reference</li>
                  <li>📱 Real-time SMS alert to registered mobile number</li>
                  <li>🔔 In-App notification panel update</li>
                  <li>📧 Email confirmation and receipt</li>
                </ul>
              </div>
            )}

            <form onSubmit={handleStatusSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Update Status *</label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 font-bold text-xs bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
                >
                  <option value="UNDER_REVIEW">UNDER REVIEW</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REFUND_INITIATED">REFUND INITIATED</option>
                  <option value="REFUNDED">REFUNDED ✅ (Completed — Sends Notifications)</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              {/* Transaction Reference when granting refund */}
              {(targetStatus === 'APPROVED' || targetStatus === 'REFUNDED') && (
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Transaction Reference / UTR <span className="text-stone-400 font-normal">(Optional — auto-generated if empty)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 423589098765 or leave blank to auto-generate"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 font-mono text-xs bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              )}

              {(targetStatus === 'APPROVED' || targetStatus === 'REFUNDED') && (
                <label className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restockToInventory}
                    onChange={(e) => setRestockToInventory(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-emerald-900 block">
                      Restock returned items into Physical Inventory
                    </span>
                    <span className="text-[10px] text-emerald-700">Automatically adds returned item quantities back to stock</span>
                  </div>
                </label>
              )}

              {targetStatus === 'REJECTED' && (
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Rejection Reason *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Provide reason for rejecting the customer refund request..."
                    value={rejectedReason}
                    onChange={(e) => setRejectedReason(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-stone-700 mb-1">Admin Notes / Internal Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Internal audit notes (not shown to customer)..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveRefund(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className={`flex-1 py-2.5 rounded-xl text-white text-xs font-black transition-colors disabled:opacity-50 shadow-md flex items-center justify-center gap-1.5 ${
                    targetStatus === 'REFUNDED'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : targetStatus === 'REJECTED'
                      ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                  }`}
                >
                  {updating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                  ) : targetStatus === 'REFUNDED' ? (
                    <><Zap className="w-4 h-4" /> Grant Refund & Notify Customer</>
                  ) : (
                    'Save Status'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundManager;
