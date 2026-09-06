import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, Check, CheckCheck, Package, CreditCard, RefreshCw,
  Building2, Sparkles, Info, ChevronRight, ExternalLink, Loader2
} from 'lucide-react';
import { notificationApi } from '../../api/notificationApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const TYPE_ICONS = {
  ORDER: { icon: Package, color: 'text-amber-600 bg-amber-50' },
  PAYMENT: { icon: CreditCard, color: 'text-emerald-600 bg-emerald-50' },
  REFUND: { icon: RefreshCw, color: 'text-indigo-600 bg-indigo-50' },
  B2B: { icon: Building2, color: 'text-purple-600 bg-purple-50' },
  B2B_STATUS: { icon: Building2, color: 'text-purple-600 bg-purple-50' },
  PROMOTION: { icon: Sparkles, color: 'text-rose-600 bg-rose-50' },
  SYSTEM: { icon: Info, color: 'text-stone-600 bg-stone-100' }
};

export const NotificationDropdown = () => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationApi.getNotifications({ limit: 10 });
      if (res.success) {
        setNotifications(res.data?.notifications || []);
        setUnreadCount(res.data?.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err.message);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 45 seconds when user is logged in
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await notificationApi.markAsRead(id);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((c) => Math.max(c - 1, 0));
      }
    } catch (err) {
      toastError('Failed to mark notification as read.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await notificationApi.markAllAsRead();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
        toastSuccess('All notifications marked as read.');
      }
    } catch (err) {
      toastError('Failed to mark all as read.');
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        aria-label="Notifications"
        className="relative p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs animate-in zoom-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-stone-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 hover:underline"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-stone-100">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-stone-400 space-y-2">
                <Bell className="w-8 h-8 mx-auto text-stone-300" />
                <p className="text-xs font-medium">You have no notifications right now.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const config = TYPE_ICONS[n.type] || TYPE_ICONS.SYSTEM;
                const Icon = config.icon;

                return (
                  <div
                    key={n._id}
                    className={`p-4 transition-colors flex items-start gap-3 text-left ${
                      n.read ? 'bg-white opacity-80 hover:bg-stone-50/70' : 'bg-amber-50/40 hover:bg-amber-50/70'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${config.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={`text-xs ${n.read ? 'font-bold text-stone-800' : 'font-black text-stone-900'}`}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <button
                            type="button"
                            onClick={(e) => handleMarkAsRead(n._id, e)}
                            title="Mark as read"
                            className="text-stone-400 hover:text-stone-700 p-0.5 rounded-sm shrink-0"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <p className="text-[11px] text-stone-500 line-clamp-2 mt-0.5 leading-relaxed">
                        {n.message}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1">
                        <span className="text-[10px] text-stone-400 font-medium">
                          {new Date(n.createdAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>

                        {n.link && (
                          <Link
                            to={n.link}
                            onClick={() => {
                              if (!n.read) handleMarkAsRead(n._id, { stopPropagation: () => {} });
                              setIsOpen(false);
                            }}
                            className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-0.5 hover:underline"
                          >
                            View <ChevronRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
