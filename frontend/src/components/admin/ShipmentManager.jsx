import React, { useState, useEffect, useCallback } from 'react';
import { deliveryApi } from '../../api/deliveryApi';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../ui/Badge';
import {
  Truck, Plus, Search, Filter, Loader2, ExternalLink,
  Package, CheckCircle2, AlertCircle, XCircle, MapPin
} from 'lucide-react';

const SHIPMENT_STATUS_BADGES = {
  LABEL_CREATED: { variant: 'default', label: 'Label Created' },
  PICKED_UP: { variant: 'info', label: 'Picked Up' },
  IN_TRANSIT: { variant: 'warning', label: 'In Transit' },
  OUT_FOR_DELIVERY: { variant: 'warning', label: 'Out for Delivery' },
  DELIVERED: { variant: 'success', label: 'Delivered' },
  CANCELLED: { variant: 'danger', label: 'Cancelled' },
  RETURNED: { variant: 'danger', label: 'Returned' }
};

export const ShipmentManager = () => {
  const { success: toastSuccess, error: toastError } = useToast();

  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orderIdInput, setOrderIdInput] = useState('');
  const [courierName, setCourierName] = useState('Blue Dart Express');
  const [weightKg, setWeightKg] = useState('0.5');
  const [submitting, setSubmitting] = useState(false);

  // Status Modal
  const [activeShipment, setActiveShipment] = useState(null);
  const [targetStatus, setTargetStatus] = useState('IN_TRANSIT');
  const [locationInput, setLocationInput] = useState('City Fulfillment Hub');
  const [messageInput, setMessageInput] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await deliveryApi.adminGetAllShipments(params);
      if (res.success) {
        setShipments(res.data?.shipments || []);
      }
    } catch (err) {
      toastError('Failed to fetch shipments.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm, toastError]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  const handleCreateShipment = async (e) => {
    e.preventDefault();
    if (!orderIdInput.trim()) {
      toastError('Please provide a valid Order ID.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await deliveryApi.adminCreateShipment({
        orderId: orderIdInput.trim(),
        courierName,
        weightKg: Number(weightKg) || 0.5
      });

      if (res.success) {
        toastSuccess(`Shipment created with AWB: ${res.data?.shipment?.trackingNumber}`);
        setShowCreateModal(false);
        setOrderIdInput('');
        await fetchShipments();
      }
    } catch (err) {
      toastError(err.message || 'Failed to create shipment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!activeShipment) return;

    setUpdating(true);
    try {
      const res = await deliveryApi.adminUpdateShipmentStatus(activeShipment._id, {
        status: targetStatus,
        location: locationInput.trim(),
        message: messageInput.trim()
      });

      if (res.success) {
        toastSuccess(`Shipment status updated to ${targetStatus}.`);
        setActiveShipment(null);
        await fetchShipments();
      }
    } catch (err) {
      toastError(err.message || 'Failed to update shipment status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelShipment = async (id, trackingNumber) => {
    if (!window.confirm(`Are you sure you want to cancel shipment ${trackingNumber}?`)) return;
    try {
      const res = await deliveryApi.adminCancelShipment(id, 'Cancelled by warehouse admin');
      if (res.success) {
        toastSuccess(`Shipment ${trackingNumber} cancelled.`);
        await fetchShipments();
      }
    } catch (err) {
      toastError(err.message || 'Failed to cancel shipment.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-600" />
            Shipments & Logistics Fulfillment
          </h2>
          <p className="text-xs text-stone-500 mt-1 font-medium">
            Generate courier manifests, assign Blue Dart / Delhivery / Shiprocket AWBs, and sync delivery status.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-colors shadow-md shadow-indigo-600/20 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Shipment
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {['ALL', 'LABEL_CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === st ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search AWB or Order Number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Shipments Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
      ) : shipments.length === 0 ? (
        <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400 text-xs font-bold">
          No shipments found.
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Order / AWB</th>
                  <th className="p-4">Courier</th>
                  <th className="p-4">Destination</th>
                  <th className="p-4">Weight</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {shipments.map((s) => {
                  const badgeInfo = SHIPMENT_STATUS_BADGES[s.status] || { variant: 'default', label: s.status };

                  return (
                    <tr key={s._id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="p-4">
                        <span className="font-mono font-black text-stone-900 block">{s.orderNumber}</span>
                        <span className="font-mono text-indigo-600 text-[11px] block">{s.trackingNumber}</span>
                      </td>
                      <td className="p-4 font-bold text-stone-800">
                        {s.courier}
                        <span className="block text-[10px] text-stone-400 font-normal uppercase">{s.provider}</span>
                      </td>
                      <td className="p-4 text-stone-600 max-w-xs">
                        <span className="font-bold text-stone-900 block">{s.destination?.fullName}</span>
                        <span className="text-[11px] text-stone-400 truncate block">
                          {s.destination?.city}, {s.destination?.state} - {s.destination?.pincode}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-stone-700">{s.weightKg} kg</td>
                      <td className="p-4 text-center">
                        <Badge variant={badgeInfo.variant} size="xs">{badgeInfo.label}</Badge>
                      </td>
                      <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setActiveShipment(s);
                            setTargetStatus(s.status);
                            setLocationInput('Local Distribution Station');
                            setMessageInput('');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs transition-colors"
                        >
                          Update Status
                        </button>
                        {s.status !== 'CANCELLED' && s.status !== 'DELIVERED' && (
                          <button
                            onClick={() => handleCancelShipment(s._id, s.trackingNumber)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Shipment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-lg font-black text-stone-900">Create Shipment & Generate AWB</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-stone-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateShipment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Order ID *</label>
                <input
                  type="text"
                  required
                  placeholder="Paste Order ID"
                  value={orderIdInput}
                  onChange={(e) => setOrderIdInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 font-mono text-xs focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Logistics Courier Partner *</label>
                <select
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 font-bold bg-white"
                >
                  <option value="Blue Dart Express">Blue Dart Express</option>
                  <option value="Delhivery Surface">Delhivery Surface</option>
                  <option value="Shadowfax Priority">Shadowfax Priority</option>
                  <option value="Ekart Logistics">Ekart Logistics</option>
                  <option value="Shiprocket Hub">Shiprocket Fulfillment</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Package Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 font-bold"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[11px] text-amber-800 space-y-1">
                <span className="font-bold block">Delivery Service Abstraction Active</span>
                <p>Creating shipment will update Order status to <strong>SHIPPED</strong>, generate AWB tracking code, and dispatch email/in-app notifications.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 font-bold text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black transition-colors disabled:opacity-50 shadow-md shadow-indigo-600/20"
                >
                  {submitting ? 'Generating…' : 'Generate Shipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {activeShipment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-lg font-black text-stone-900">Update Shipment Milestone</h3>
              <button onClick={() => setActiveShipment(null)} className="text-stone-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">New Milestone Status *</label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 font-bold bg-white"
                >
                  <option value="PICKED_UP">PICKED UP</option>
                  <option value="IN_TRANSIT">IN TRANSIT</option>
                  <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                  <option value="DELIVERED">DELIVERED (Completed)</option>
                  <option value="RETURNED">RETURNED</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Checkpoint Location</label>
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Activity Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Package arrived at local distribution center"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveShipment(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 font-bold text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black transition-colors disabled:opacity-50"
                >
                  {updating ? 'Updating…' : 'Save Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipmentManager;
