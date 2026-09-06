import React, { useState, useEffect, useCallback } from 'react';
import axiosClient from '../../api/axiosClient';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import {
  ShoppingCart, Search, Eye, Filter, RefreshCw,
  Truck, CheckCircle2, Clock, AlertTriangle, XCircle, MapPin
} from 'lucide-react';

const ORDER_STATUS_COLORS = {
  PLACED: 'warning',
  CONFIRMED: 'info',
  PACKED: 'info',
  SHIPPED: 'primary',
  OUT_FOR_DELIVERY: 'primary',
  DELIVERED: 'success',
  CANCELLED: 'danger'
};

export const OrderManager = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const { success: toastSuccess, error: toastError } = useToast();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/admin/orders');
      if (res.success) {
        setOrders(res.data?.orders || res.data || []);
      }
    } catch (err) {
      toastError(err.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await axiosClient.patch(`/admin/orders/${orderId}/status`, {
        status: newStatus,
        orderStatus: newStatus
      });
      if (res.success) {
        toastSuccess(`Order status updated to ${newStatus}`);
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, orderStatus: newStatus } : o))
        );
        if (selectedOrder?._id === orderId) {
          setSelectedOrder((prev) => ({ ...prev, orderStatus: newStatus }));
        }
      }
    } catch (err) {
      toastError(err.message || 'Failed to update order status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      !search ||
      o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      o.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.user?.email?.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === 'ALL' || o.orderStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-amber-600" /> Customer Orders & Fulfillment
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Track order lifecycle from Placed &rarr; Confirmed &rarr; Packed &rarr; Shipped &rarr; Delivered.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by Order #, Customer Name, Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="PLACED">Placed</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PACKED">Packed</option>
          <option value="SHIPPED">Shipped</option>
          <option value="OUT_FOR_DELIVERY">Out For Delivery</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="py-16 text-center">
          <Spinner size="lg" />
          <p className="text-xs text-stone-400 mt-2">Loading orders ledger...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400 text-xs">
          No orders match the selected criteria.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider font-bold border-b border-stone-200">
              <tr>
                <th className="px-5 py-3.5">Order #</th>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Items</th>
                <th className="px-5 py-3.5">Total (₹)</th>
                <th className="px-5 py-3.5">Payment</th>
                <th className="px-5 py-3.5">Fulfillment Status</th>
                <th className="px-5 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {filteredOrders.map((o) => (
                <tr key={o._id} className="hover:bg-stone-50/60 transition-colors">
                  <td className="px-5 py-3.5 font-bold font-mono text-stone-900">
                    {o.orderNumber || o._id.slice(-6)}
                    <span className="text-[10px] text-stone-400 block font-sans">
                      {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-stone-900">{o.user?.name || o.shippingAddress?.name || 'Customer'}</div>
                    <div className="text-[11px] text-stone-400">{o.user?.email || o.shippingAddress?.phone}</div>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-stone-700">
                    {o.items?.length || 0} items
                    <span className="text-[10px] text-stone-400 block truncate max-w-[140px]">
                      {o.items?.map((i) => i.name || i.product?.name).join(', ')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-black text-stone-900 text-sm">
                    ₹{o.pricing?.total ?? o.totalAmount ?? 0}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={o.paymentStatus === 'COMPLETED' ? 'success' : 'warning'} size="xs">
                      {o.paymentMethod || 'COD'} • {o.paymentStatus || 'PENDING'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      value={o.orderStatus}
                      disabled={updatingId === o._id}
                      onChange={(e) => handleUpdateStatus(o._id, e.target.value)}
                      className={`text-[11px] font-bold rounded-lg px-2 py-1 border transition-colors ${
                        o.orderStatus === 'DELIVERED'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : o.orderStatus === 'CANCELLED'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-amber-50 text-amber-900 border-amber-200'
                      }`}
                    >
                      <option value="PLACED">PLACED</option>
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="PACKED">PACKED</option>
                      <option value="SHIPPED">SHIPPED</option>
                      <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                      <option value="DELIVERED">DELIVERED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button size="xs" variant="outline" onClick={() => setSelectedOrder(o)}>
                      <Eye className="w-3.5 h-3.5 mr-1" /> View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Detail Slide-Over Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-lg font-black text-stone-900">
                  Order Details: {selectedOrder.orderNumber || selectedOrder._id}
                </h3>
                <span className="text-xs text-stone-400">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-stone-400 hover:text-stone-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Address Snapshot */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-1 text-xs">
              <div className="font-bold text-stone-800 flex items-center gap-1.5 mb-1">
                <MapPin className="w-3.5 h-3.5 text-amber-600" /> Delivery Address
              </div>
              <p className="font-bold text-stone-900">{selectedOrder.shippingAddress?.name}</p>
              <p className="text-stone-600">
                {selectedOrder.shippingAddress?.addressLine1 || selectedOrder.shippingAddress?.street}
                {selectedOrder.shippingAddress?.city ? `, ${selectedOrder.shippingAddress.city}` : ''}
                {selectedOrder.shippingAddress?.state ? `, ${selectedOrder.shippingAddress.state}` : ''} -{' '}
                {selectedOrder.shippingAddress?.postalCode || selectedOrder.shippingAddress?.pincode}
              </p>
              <p className="text-stone-500 font-mono mt-1">📞 {selectedOrder.shippingAddress?.phone}</p>
            </div>

            {/* Items List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">Ordered Items</h4>
              <div className="divide-y divide-stone-100 border border-stone-100 rounded-2xl overflow-hidden">
                {selectedOrder.items?.map((item, idx) => (
                  <div key={idx} className="p-3.5 bg-white flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-stone-900">{item.name || item.product?.name || 'Snack Item'}</p>
                      <p className="text-stone-400 text-[11px]">
                        Qty: {item.quantity} × ₹{item.unitPrice || item.price}
                      </p>
                    </div>
                    <span className="font-black text-stone-900">₹{(item.quantity || 1) * (item.unitPrice || item.price || 0)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span>₹{selectedOrder.pricing?.subtotal || selectedOrder.totalAmount || 0}</span>
              </div>
              {selectedOrder.pricing?.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Coupon Discount</span>
                  <span>-₹{selectedOrder.pricing.discount}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <span>Delivery Fee</span>
                <span>₹{selectedOrder.pricing?.deliveryFee || 0}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>GST (5%)</span>
                <span>₹{selectedOrder.pricing?.tax || 0}</span>
              </div>
              <div className="flex justify-between font-black text-sm text-stone-900 pt-2 border-t border-stone-200">
                <span>Grand Total</span>
                <span className="text-amber-700">₹{selectedOrder.pricing?.total || selectedOrder.totalAmount || 0}</span>
              </div>
            </div>

            {/* Quick Status Update in Modal */}
            <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Update Order Fulfillment Status:
                </span>
                <Badge variant={ORDER_STATUS_COLORS[selectedOrder.orderStatus] || 'primary'} size="sm">
                  Current: {selectedOrder.orderStatus}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {['PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={updatingId === selectedOrder._id || selectedOrder.orderStatus === st}
                    onClick={() => handleUpdateStatus(selectedOrder._id, st)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                      selectedOrder.orderStatus === st
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-amber-100/60 hover:border-amber-300'
                    } ${updatingId === selectedOrder._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManager;
