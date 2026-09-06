import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { AddressManager } from '../components/address/AddressManager';
import { orderApi } from '../api/orderApi';
import {
  User,
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  ShieldCheck,
  Package,
  ChevronRight,
  Truck,
  XCircle,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUS_BADGE_VARIANTS = {
  PLACED: { variant: 'info', label: 'Placed' },
  CONFIRMED: { variant: 'primary', label: 'Confirmed' },
  PACKED: { variant: 'warning', label: 'Packed' },
  SHIPPED: { variant: 'warning', label: 'Shipped' },
  OUT_FOR_DELIVERY: { variant: 'warning', label: 'Out for Delivery' },
  DELIVERED: { variant: 'success', label: 'Delivered' },
  CANCELLED: { variant: 'danger', label: 'Cancelled' }
};

export const DashboardPage = () => {
  const { user, role, isB2B, isApprovedB2B, isPendingB2B, isAdmin } = useAuth();
  const { error: toastError } = useToast();

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await orderApi.getMyOrders();
      if (res.success) {
        setOrders(res.data?.orders || []);
      }
    } catch (err) {
      toastError('Failed to load order history.');
    } finally {
      setLoadingOrders(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">

      {/* Top Banner Header */}
      <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-600/20">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-stone-900">{user.name}</h1>
              {role === 'CUSTOMER' && <Badge variant="primary">Customer</Badge>}
              {role === 'B2B_WHOLESALER' && (
                <Badge variant={isApprovedB2B ? 'success' : isPendingB2B ? 'warning' : 'danger'}>
                  {isApprovedB2B ? 'Wholesale Partner' : isPendingB2B ? 'Under Review' : 'Not Approved'}
                </Badge>
              )}
              {role === 'ADMIN' && <Badge variant="admin">Store Admin</Badge>}
            </div>
            <p className="text-sm text-stone-500 mt-1">{user.email} • Phone: {user.phone || 'Not provided'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <Link to="/admin">
              <Button variant="outline" className="border-purple-600 text-purple-700 hover:bg-purple-50">
                <ShieldCheck className="w-4 h-4 mr-1.5" />
                Admin Dashboard
              </Button>
            </Link>
          )}
          <Link to="/shop">
            <Button>
              <ShoppingBag className="w-4 h-4 mr-1.5" />
              Browse Shop
            </Button>
          </Link>
        </div>
      </div>

      {/* B2B Wholesale Banner */}
      {isB2B && (
        <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-6">
            <h2 className="text-lg font-black text-stone-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              B2B Wholesale Profile
            </h2>
            <Badge variant={isApprovedB2B ? 'success' : isPendingB2B ? 'warning' : 'danger'}>
              Status: {user.b2bProfile?.verificationStatus || 'PENDING'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Company</p>
              <p className="text-base font-bold text-stone-900 mt-1">{user.b2bProfile?.companyName || user.businessName || '—'}</p>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400">GSTIN</p>
              <p className="text-base font-mono font-bold text-stone-900 mt-1">{user.b2bProfile?.gstin || user.gstNumber || '—'}</p>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Pincode</p>
              <p className="text-base font-mono font-bold text-stone-900 mt-1">{user.b2bProfile?.pincode || '—'}</p>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Business Model</p>
              <p className="text-base font-bold text-stone-900 mt-1">{user.b2bProfile?.businessType || user.businessType || 'Wholesale'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Orders & Address Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left Column: Order History */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100">
            <h2 className="text-lg font-black text-stone-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-600" />
              Order History & Status
            </h2>
            <span className="text-xs font-semibold text-stone-400">{orders.length} Order(s)</span>
          </div>

          {loadingOrders ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <span className="ml-2 text-sm text-stone-500 font-medium">Loading orders…</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-3">
              <Package className="w-10 h-10 text-stone-300 mx-auto" />
              <p className="text-sm font-bold text-stone-700">No Orders Placed Yet</p>
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                Explore our catalog and place your first order. Order history and frozen invoices will appear here.
              </p>
              <Link to="/shop">
                <Button size="sm" variant="secondary">Browse Products</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const badgeInfo = STATUS_BADGE_VARIANTS[order.orderStatus] || { variant: 'default', label: order.orderStatus };
                return (
                  <div
                    key={order._id}
                    className="p-5 rounded-2xl border border-stone-200 bg-white hover:border-amber-300 transition-all space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="font-black text-amber-700 text-sm">{order.orderNumber}</span>
                        <span className="text-xs text-stone-400 ml-2 font-medium">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <Badge variant={badgeInfo.variant} size="xs">
                        {badgeInfo.label}
                      </Badge>
                    </div>

                    {/* Order items preview */}
                    <div className="space-y-2 pt-1 border-t border-stone-100">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs text-stone-700">
                          <span className="truncate max-w-[220px]">
                            {item.quantity}× <strong className="font-semibold">{item.name}</strong>
                          </span>
                          <span className="font-bold text-stone-900">₹{item.total || item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>

                    {/* Total & address preview */}
                    <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                      <span className="text-stone-500 font-medium">
                        Deliver to: <strong className="text-stone-800">{order.shippingAddress?.city}, {order.shippingAddress?.pincode || order.shippingAddress?.postalCode}</strong>
                      </span>
                      <div className="text-right">
                        <span className="text-stone-400 font-medium">Total: </span>
                        <strong className="text-stone-900 font-black text-sm">₹{order.pricing?.total}</strong>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Link
                        to={`/orders/${order._id}`}
                        className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1"
                      >
                        Track & View Order Details &rarr;
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Address Manager */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-stone-900 flex items-center gap-2 pb-4 border-b border-stone-100">
            <MapPin className="w-5 h-5 text-amber-600" />
            Address Book
          </h2>
          <AddressManager />
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;
