import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { adminApi } from '../api/adminApi';
import { orderApi } from '../api/orderApi';
import { b2bApi } from '../api/b2bApi';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { UserManager } from '../components/admin/UserManager';
import { ProductManager } from '../components/admin/ProductManager';
import { CategoryManager } from '../components/admin/CategoryManager';
import { OrderManager } from '../components/admin/OrderManager';
import { B2BApplicationManager } from '../components/admin/B2BApplicationManager';
import { B2BRequestManager } from '../components/admin/B2BRequestManager';
import { InventoryManager } from '../components/admin/InventoryManager';
import { RefundManager } from '../components/admin/RefundManager';
import { CouponManager } from '../components/admin/CouponManager';
import { BannerManager } from '../components/admin/BannerManager';
import { AdManager } from '../components/admin/AdManager';
import { ReviewManager } from '../components/admin/ReviewManager';
import { NotificationManager } from '../components/admin/NotificationManager';
import { ShipmentManager } from '../components/admin/ShipmentManager';
import { Badge } from '../components/ui/Badge';

import {
  IndianRupee, ShoppingCart, Users, Building2, Clock, AlertTriangle,
  RotateCcw, RefreshCw, Calendar, TrendingUp, Package, Layers, PieChart,
  CreditCard, ShieldCheck, Search, Filter, Loader2, ArrowUpRight
} from 'lucide-react';

const DATE_RANGE_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: '7days', label: '7 Days' },
  { id: '30days', label: '30 Days' },
  { id: '3months', label: '3 Months' },
  { id: '12months', label: '12 Months' },
  { id: 'custom', label: 'Custom' }
];

export const AdminPage = () => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [dateRange, setDateRange] = useState('30days');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Dashboard Data State
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // Secondary Tab States (Orders, B2B Apps, B2B Reqs)
  const [orders, setOrders] = useState([]);
  const [applications, setApplications] = useState([]);
  const [requests, setRequests] = useState([]);
  const [tabLoading, setTabLoading] = useState(false);

  // Fetch Real Analytics Data
  const fetchAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const params = { range: dateRange };
      if (dateRange === 'custom') {
        if (customFrom) params.from = customFrom;
        if (customTo) params.to = customTo;
      }
      const res = await adminApi.getDashboardAnalytics(params);
      if (res.success) {
        setAnalytics(res.data);
      }
    } catch (err) {
      toastError('Failed to fetch dashboard analytics.');
    } finally {
      setLoadingAnalytics(false);
    }
  }, [dateRange, customFrom, customTo, toastError]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchAnalytics();
    }
  }, [activeTab, fetchAnalytics]);

  const cards = analytics?.cards || {};
  const graphs = analytics?.graphs || {};

  return (
    <div className="flex min-h-screen bg-[#FCFAF7]">
      {/* 16-Item Admin Sidebar */}
      <AdminSidebar activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)} />

      {/* Main Content Area */}
      <main className="flex-1 p-6 sm:p-10 space-y-8 overflow-x-hidden">

        {/* ── TOP HEADER ──────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-purple-950 via-stone-900 to-amber-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30 text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4" /> Executive Control Dashboard
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {activeTab === 'dashboard' ? 'Real-Time Analytics & KPIs' : `Manage ${activeTab.toUpperCase().replace('-', ' ')}`}
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 font-normal">
              Logged in as Super Admin: <span className="text-purple-300 font-semibold">{user?.email}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAnalytics}
              disabled={loadingAnalytics}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-2 text-xs font-semibold"
            >
              <RefreshCw className={`w-4 h-4 ${loadingAnalytics ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* ── DASHBOARD VIEW ──────────────────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">

            {/* DATE RANGE FILTERS */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-600">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span>Time Period Filter:</span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {DATE_RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDateRange(opt.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      dateRange === opt.id
                        ? 'bg-purple-950 text-purple-100 shadow-sm'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Inputs */}
              {dateRange === 'custom' && (
                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-medium"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-medium"
                  />
                  <button
                    onClick={fetchAnalytics}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 text-white font-semibold text-xs"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            {/* 7 REAL STAT CARDS */}
            {loadingAnalytics ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                <span className="ml-3 text-sm text-stone-500 font-medium">Loading sales overview…</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                  {/* 1. Total Revenue */}
                  <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Total Revenue</span>
                      <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                        <IndianRupee className="w-5 h-5" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-stone-900">₹{cards.totalRevenue || 0}</p>
                    <p className="text-xs text-emerald-600 font-semibold mt-2 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" /> Net Confirmed Sales
                    </p>
                  </div>

                  {/* 2. Total Orders */}
                  <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Total Orders</span>
                      <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
                        <ShoppingCart className="w-5 h-5" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-stone-900">{cards.totalOrders || 0}</p>
                    <p className="text-xs text-stone-400 font-medium mt-2">Recorded across platform</p>
                  </div>

                  {/* 3. Customers */}
                  <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Retail Customers</span>
                      <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700">
                        <Users className="w-5 h-5" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-stone-900">{cards.customers || 0}</p>
                    <p className="text-xs text-stone-400 font-medium mt-2">Registered Customer accounts</p>
                  </div>

                  {/* 4. B2B Users */}
                  <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Approved B2B Users</span>
                      <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                        <Building2 className="w-5 h-5" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-stone-900">{cards.b2bUsers || 0}</p>
                    <p className="text-xs text-indigo-600 font-semibold mt-2">Wholesale Partners</p>
                  </div>

                  {/* 5. Pending B2B */}
                  <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Pending B2B Apps</span>
                      <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
                        <Clock className="w-5 h-5" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-stone-900">{cards.pendingB2B || 0}</p>
                    <p className="text-xs text-amber-600 font-semibold mt-2">Awaiting verification</p>
                  </div>

                  {/* 6. Low Stock */}
                  <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Low Stock Alerts</span>
                      <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-700">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-stone-900">{cards.lowStock || 0}</p>
                    <p className="text-xs text-rose-600 font-semibold mt-2">Items below safety threshold</p>
                  </div>

                  {/* 7. Refund Requests */}
                  <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Refund Requests</span>
                      <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700">
                        <RotateCcw className="w-5 h-5" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-stone-900">{cards.refundRequests || 0}</p>
                    <p className="text-xs text-purple-600 font-semibold mt-2">Pending Resolution</p>
                  </div>

                </div>

                {/* 7 REAL-DATA GRAPH PANELS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                  {/* Graph 1: Revenue & Orders Timeline */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                      <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-600" /> Revenue & Order Trend
                      </h3>
                      <span className="text-xs font-bold text-stone-400">{graphs.revenueOverTime?.length || 0} Data Points</span>
                    </div>

                    <div className="space-y-3">
                      {graphs.revenueOverTime && graphs.revenueOverTime.length > 0 ? (
                        graphs.revenueOverTime.map((row) => (
                          <div key={row._id} className="flex items-center justify-between text-xs p-3 rounded-2xl bg-stone-50 border border-stone-100">
                            <span className="font-bold text-stone-700">{row._id}</span>
                            <div className="text-right">
                              <span className="font-black text-stone-900 text-sm">₹{row.revenue}</span>
                              <span className="text-stone-400 ml-2 font-medium">({row.orders} orders)</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-xs text-stone-400">
                          No revenue recorded in selected timeframe. Place orders to populate trend data.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Graph 2: Customer vs B2B Sales Breakdown */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                      <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-indigo-600" /> Retail vs B2B Wholesale Revenue
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 rounded-2xl bg-stone-50 border border-stone-100 space-y-1">
                        <span className="text-xs font-bold text-stone-400 uppercase">Retail Customers</span>
                        <p className="text-2xl font-black text-stone-900">₹{graphs.customerVsB2B?.retail?.revenue || 0}</p>
                        <p className="text-xs text-stone-500 font-medium">{graphs.customerVsB2B?.retail?.ordersCount || 0} Orders</p>
                      </div>

                      <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-1">
                        <span className="text-xs font-bold text-indigo-700 uppercase">Approved B2B</span>
                        <p className="text-2xl font-black text-indigo-950">₹{graphs.customerVsB2B?.b2b?.revenue || 0}</p>
                        <p className="text-xs text-indigo-700 font-medium">{graphs.customerVsB2B?.b2b?.ordersCount || 0} Wholesale Orders</p>
                      </div>
                    </div>
                  </div>

                  {/* Graph 3: Top Selling Products */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                      <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                        <Package className="w-5 h-5 text-amber-600" /> Top Performing Products
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {graphs.topProducts && graphs.topProducts.length > 0 ? (
                        graphs.topProducts.map((p, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs p-3 rounded-2xl bg-stone-50 border border-stone-100">
                            <div>
                              <p className="font-bold text-stone-900 text-sm">{p._id}</p>
                              <p className="text-stone-400 font-mono text-[11px]">{p.sku} • {p.unitsSold} units sold</p>
                            </div>
                            <span className="font-black text-amber-700 text-sm">₹{p.totalRevenue}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-xs text-stone-400">
                          Top product performance will update dynamically when orders are placed.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Graph 4: Category Sales Distribution */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                      <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-purple-600" /> Category Revenue Breakdown
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {graphs.categorySales && graphs.categorySales.length > 0 ? (
                        graphs.categorySales.map((cat, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs p-3 rounded-2xl bg-stone-50 border border-stone-100">
                            <span className="font-bold text-stone-800">{cat._id}</span>
                            <div className="text-right">
                              <span className="font-black text-stone-900">₹{cat.totalSales}</span>
                              <span className="text-stone-400 ml-2 font-medium">({cat.unitsSold} units)</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-xs text-stone-400">
                          Category distribution data available.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Graph 5: Payment Methods Breakdown */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                      <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-emerald-600" /> Payment Methods Breakdown
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {graphs.paymentMethods && graphs.paymentMethods.length > 0 ? (
                        graphs.paymentMethods.map((pm, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs p-3 rounded-2xl bg-stone-50 border border-stone-100">
                            <span className="font-black text-stone-900">{pm._id}</span>
                            <div className="text-right">
                              <span className="font-bold text-emerald-700">₹{pm.totalAmount}</span>
                              <span className="text-stone-400 ml-2 font-medium">({pm.count} orders)</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-xs text-stone-400">
                          Payment method distribution data available.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Graph 6: Refunds Summary */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                      <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                        <RotateCcw className="w-5 h-5 text-rose-600" /> Refunds Summary
                      </h3>
                    </div>

                    <div className="p-5 rounded-2xl bg-stone-50 border border-stone-100 text-xs text-stone-500 space-y-2">
                      <div className="flex justify-between font-bold text-stone-800">
                        <span>Total Refund Requests</span>
                        <span>{cards.refundRequests || 0}</span>
                      </div>
                      <p className="text-[11px] text-stone-400">
                        Refund workflows are handled securely via the Refunds module tab.
                      </p>
                    </div>
                  </div>

                </div>
              </>
            )}
          </div>
        )}

        {/* ── USERS TAB ─────────────────────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm">
            <UserManager />
          </div>
        )}

        {/* ── PRODUCTS TAB ──────────────────────────────────────────────────────── */}
        {activeTab === 'products' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm">
            <ProductManager />
          </div>
        )}

        {/* ── CATEGORIES TAB ────────────────────────────────────────────────────── */}
        {activeTab === 'categories' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm">
            <CategoryManager />
          </div>
        )}

        {/* ── ORDERS TAB ────────────────────────────────────────────────────────── */}
        {activeTab === 'orders' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm">
            <OrderManager />
          </div>
        )}

        {/* ── B2B APPLICATIONS TAB ──────────────────────────────────────────────── */}
        {activeTab === 'b2b-applications' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm">
            <B2BApplicationManager />
          </div>
        )}

        {/* ── B2B REQUESTS TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'b2b-requests' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm">
            <B2BRequestManager />
          </div>
        )}

        {/* ── INVENTORY TAB ─────────────────────────────────────────────────────── */}
        {activeTab === 'inventory' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm">
            <InventoryManager />
          </div>
        )}

        {/* ── REFUNDS TAB ───────────────────────────────────────────────────────── */}
        {activeTab === 'refunds' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm">
            <RefundManager />
          </div>
        )}

        {/* ── COUPONS TAB ───────────────────────────────────────────────────────── */}
        {activeTab === 'coupons' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm">
            <CouponManager />
          </div>
        )}

        {/* ── BANNERS TAB ───────────────────────────────────────────────────────── */}
        {activeTab === 'banners' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm">
            <BannerManager />
          </div>
        )}

        {/* ── ADS TAB ───────────────────────────────────────────────────────────── */}
        {activeTab === 'ads' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm">
            <AdManager />
          </div>
        )}

        {/* ── REVIEWS TAB ───────────────────────────────────────────────────────── */}
        {activeTab === 'reviews' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm">
            <ReviewManager />
          </div>
        )}

        {/* ── NOTIFICATIONS TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'notifications' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm">
            <NotificationManager />
          </div>
        )}

        {/* ── SETTINGS & SHIPMENTS TAB ──────────────────────────────────────────── */}
        {(activeTab === 'settings' || activeTab === 'shipments') && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm">
            <ShipmentManager />
          </div>
        )}

      </main>
    </div>
  );
};

export default AdminPage;

