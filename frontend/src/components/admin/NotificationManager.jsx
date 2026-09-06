import React, { useState, useEffect, useCallback } from 'react';
import axiosClient from '../../api/axiosClient';
import { inventoryApi } from '../../api/inventoryApi';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import {
  Bell, Send, RefreshCw, AlertCircle, Info, Sparkles, CheckCircle2,
  Gift, MessageSquare, Phone, ExternalLink, Calendar, Zap, Loader2
} from 'lucide-react';

export const NotificationManager = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [restockingProductId, setRestockingProductId] = useState(null);

  // Broadcast Form
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState('SYSTEM');

  // WhatsApp Direct Messenger State
  const [waPhone, setWaPhone] = useState('');
  const [waMessage, setWaMessage] = useState('');
  const [waSending, setWaSending] = useState(false);
  const [waLastResult, setWaLastResult] = useState(null);

  // Birthday Engine Trigger State
  const [bdayRunning, setBdayRunning] = useState(false);
  const [bdayResult, setBdayResult] = useState(null);

  const { success: toastSuccess, error: toastError } = useToast();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/notifications?limit=50');
      if (res.success) {
        setNotifications(res.data?.notifications || res.data || []);
      }
    } catch (err) {
      console.warn('Failed to fetch admin notifications:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!title || !message) {
      toastError('Title and message are required.');
      return;
    }

    setSending(true);
    try {
      const res = await axiosClient.post('/notifications', {
        title,
        message,
        type: targetType
      });

      if (res.success) {
        toastSuccess('Notification broadcast sent successfully!');
        setTitle('');
        setMessage('');
        fetchNotifications();
      }
    } catch (err) {
      toastError(err.message || 'Failed to send broadcast.');
    } finally {
      setSending(false);
    }
  };

  const handleTriggerBirthdayCheck = async () => {
    setBdayRunning(true);
    setBdayResult(null);
    try {
      const res = await axiosClient.post('/admin/trigger-birthday-check', {});
      if (res.success) {
        setBdayResult(res.data);
        const count = res.data?.totalCelebrated || 0;
        toastSuccess(`Birthday check finished! ${count} user(s) received free cookie coupons & WhatsApp greetings.`);
        fetchNotifications();
      }
    } catch (err) {
      toastError(err.message || 'Birthday trigger check failed.');
    } finally {
      setBdayRunning(false);
    }
  };

  const handleQuickRestockFromNotification = async (productId, productName) => {
    if (!productId) return;
    setRestockingProductId(productId);
    try {
      const res = await inventoryApi.quickRestock(productId, 50);
      if (res.success) {
        toastSuccess(`⚡ Restocked '${productName || 'Product'}' with +50 units!`);
        await fetchNotifications();
      } else {
        toastError(res.message || 'Quick restock failed.');
      }
    } catch (err) {
      toastError(err.message || 'Failed to restock product.');
    } finally {
      setRestockingProductId(null);
    }
  };

  const handleSendWhatsApp = async (e) => {
    e.preventDefault();
    if (!waPhone.trim() || !waMessage.trim()) {
      toastError('Phone number and message are required.');
      return;
    }

    setWaSending(true);
    setWaLastResult(null);
    try {
      const res = await axiosClient.post('/admin/send-whatsapp', {
        phone: waPhone.trim(),
        message: waMessage.trim()
      });

      if (res.success) {
        setWaLastResult(res.data);
        if (res.data?.provider === 'META_CLOUD_API' || res.data?.provider === 'TWILIO_WHATSAPP') {
          toastSuccess(`Message delivered directly to +${res.data?.to} via WhatsApp Cloud API!`);
        } else {
          toastSuccess(`WhatsApp message prepared for +${res.data?.to}!`);
          if (res.data?.waLink) {
            window.open(res.data.waLink, '_blank');
          }
        }
        setWaMessage('');
      }
    } catch (err) {
      toastError(err.message || 'WhatsApp message dispatch failed.');
    } finally {
      setWaSending(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-600" /> Notifications & WhatsApp Engagement Hub
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Real-time multi-channel communication: in-app notifications, birthday reward automation, and live WhatsApp messaging.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchNotifications} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* 2-Column Grid: Birthday Engine + Direct WhatsApp Messenger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Automated Birthday Engine */}
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-50 to-orange-50 p-6 rounded-3xl border border-amber-200 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-amber-950 flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-600" /> Automated Birthday Reward Engine
            </h3>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
              Active Daily
            </span>
          </div>

          <p className="text-xs text-amber-900/80 leading-relaxed font-medium">
            Tracks user Date of Birth (DOB), automatically creates personalized <strong>Free Cookies coupons (100% OFF)</strong>, in-app alerts, and pre-fills real-time WhatsApp greetings.
          </p>

          <div className="pt-2">
            <Button
              size="sm"
              onClick={handleTriggerBirthdayCheck}
              disabled={bdayRunning}
              className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md shadow-amber-600/20"
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              {bdayRunning ? 'Checking Birthdays...' : '🎂 Run Birthday Check & Rewards Now'}
            </Button>
          </div>

          {bdayResult && (
            <div className="p-3.5 bg-white/90 rounded-2xl border border-amber-200 text-xs space-y-2 text-stone-800">
              <div className="flex items-center justify-between font-bold">
                <span>Date: {bdayResult.processedDate}</span>
                <span className="text-emerald-700">{bdayResult.totalCelebrated} Celebrated Today</span>
              </div>
              {bdayResult.users && bdayResult.users.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {bdayResult.users.map((u, i) => (
                    <div key={i} className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-[11px] flex justify-between items-center gap-2">
                      <div className="truncate">
                        <strong>{u.name}</strong> ({u.email})
                        <span className="block text-stone-500">Coupon: <strong className="text-amber-700">{u.couponCode}</strong></span>
                      </div>
                      {u.whatsappResult?.waLink ? (
                        <a
                          href={u.whatsappResult.waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" /> WhatsApp Wish
                        </a>
                      ) : (
                        <Badge variant="success" size="xs">Dispatched</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-stone-500 italic">No birthdays scheduled for today.</p>
              )}
            </div>
          )}
        </div>


        {/* 2. Direct Real-Time WhatsApp Messenger */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-50 to-teal-50 p-6 rounded-3xl border border-emerald-200 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-emerald-950 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" /> Direct WhatsApp Messenger
            </h3>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
              Real-Time
            </span>
          </div>

          <form onSubmit={handleSendWhatsApp} className="space-y-3 text-xs font-semibold">
            <div>
              <label className="text-emerald-950 block mb-1">Customer Phone Number *</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-emerald-600 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-emerald-950 block mb-1">WhatsApp Message Text *</label>
              <textarea
                rows={2}
                required
                placeholder="Type your message, order update, or special promotion..."
                value={waMessage}
                onChange={(e) => setWaMessage(e.target.value)}
                className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Template Quick Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.snackora.in';
                  setWaMessage(`🎉 Happy Birthday from Snackora! 🍪 Enjoy a FREE pack of Gourmet Butter Cookies with code BDAY-SPECIAL at ${siteUrl}/shop?category=cookies`);
                }}
                className="px-2 py-1 rounded-lg bg-emerald-200/60 hover:bg-emerald-200 text-xs text-emerald-900 font-bold transition-colors"
              >
                🎂 Birthday Cookie Gift
              </button>
              <button
                type="button"
                onClick={() => {
                  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.snackora.in';
                  setWaMessage(`📦 Your Snackora order has been freshly baked and packed at our central hub! Fast delivery arriving soon. Track at: ${siteUrl}/dashboard`);
                }}
                className="px-2 py-1 rounded-lg bg-emerald-200/60 hover:bg-emerald-200 text-xs text-emerald-900 font-bold transition-colors"
              >
                🚚 Order Dispatch Alert
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
              <Button
                type="submit"
                size="sm"
                disabled={waSending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {waSending ? 'Preparing...' : 'Dispatch WhatsApp Message'}
              </Button>

              {waLastResult?.waLink && (
                <a
                  href={waLastResult.waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all animate-pulse"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Open in WhatsApp Web / App <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {waLastResult && (
              <div className="p-3 bg-white/90 rounded-2xl border border-emerald-300 text-xs space-y-1.5 text-stone-800">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Message Prepared for +{waLastResult.to}
                  </span>
                  <Badge variant="success" size="xs">{waLastResult.provider}</Badge>
                </div>
                {waLastResult.provider === 'DIRECT_WHATSAPP_LIVE' && (
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    💡 <em>Click the green button above to deliver instantly via WhatsApp Web or mobile app. For 100% automated background delivery without clicking, configure Meta Cloud API or Twilio in backend <code className="bg-stone-100 px-1 py-0.5 rounded text-[10px]">.env</code>.</em>
                  </p>
                )}
              </div>
            )}
          </form>
        </div>
      </div>


      {/* Broadcast Composer */}
      <div className="bg-stone-50 p-6 sm:p-8 rounded-3xl border border-stone-200 space-y-4">
        <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
          <Send className="w-4 h-4 text-purple-600" /> Send Global In-App Notification Broadcast
        </h3>

        <form onSubmit={handleBroadcast} className="space-y-4 text-xs font-semibold">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-stone-700">Notification Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Flash Sale: 20% OFF Himalayan Makhana!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-stone-700">Channel / Type</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-stone-800"
              >
                <option value="SYSTEM">System Notice</option>
                <option value="PROMOTION">Promotional Alert</option>
                <option value="B2B">B2B Wholesale Bulletin</option>
                <option value="ORDER">Order Update</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-stone-700">Message Body *</label>
            <textarea
              rows={3}
              required
              placeholder="Enter message text that will be delivered to user notification feeds..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" size="sm" disabled={sending} className="shadow-sm">
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {sending ? 'Broadcasting...' : 'Broadcast Notification'}
            </Button>
          </div>
        </form>
      </div>

      {/* Notification Stream */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400">Recent Notifications Feed</h3>
        {loading ? (
          <div className="py-12 text-center">
            <Spinner size="md" />
            <p className="text-xs text-stone-400 mt-2">Loading notification stream...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400 text-xs">
            No notifications logged in the system.
          </div>
        ) : (
          <div className="divide-y divide-stone-100 bg-white border border-stone-200 rounded-2xl overflow-hidden">
            {notifications.map((n) => {
              const hasProductId = n.metadata?.productId;
              const isLowStock = n.metadata?.isLowStock || n.title?.includes('Low Stock') || n.message?.includes('left in stock');

              return (
                <div key={n._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/60 transition-colors">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={isLowStock ? 'warning' : 'primary'} size="xs">{n.type || 'SYSTEM'}</Badge>
                      <span className="font-bold text-xs text-stone-900">{n.title}</span>
                    </div>
                    <p className="text-xs text-stone-600">{n.message}</p>
                    {hasProductId && (
                      <div className="pt-1">
                        <button
                          type="button"
                          disabled={restockingProductId === hasProductId}
                          onClick={() => handleQuickRestockFromNotification(hasProductId, n.metadata?.productName || n.title)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-colors shadow-xs disabled:opacity-50"
                        >
                          {restockingProductId === hasProductId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Zap className="w-3.5 h-3.5 fill-white" />
                          )}
                          ⚡ 1-Click Restock (+50 Units) Now
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-stone-400 shrink-0">
                    {new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationManager;
