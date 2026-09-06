import React, { useState, useEffect, useCallback } from 'react';
import { marketingApi } from '../../api/marketingApi';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../ui/Badge';
import { Tag, Plus, Edit3, Trash2, Loader2, CheckCircle2, XCircle, Calendar, Percent } from 'lucide-react';

export const CouponManager = () => {
  const { success: toastSuccess, error: toastError } = useToast();

  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);

  // Form fields
  const [code, setCode] = useState('');
  const [type, setType] = useState('PERCENTAGE');
  const [value, setValue] = useState('');
  const [minimumOrder, setMinimumOrder] = useState('0');
  const [maximumDiscount, setMaximumDiscount] = useState('');
  const [expiry, setExpiry] = useState('');
  const [usageLimit, setUsageLimit] = useState('1000');
  const [perUserLimit, setPerUserLimit] = useState('1');
  const [eligibleRole, setEligibleRole] = useState('ALL');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await marketingApi.adminGetAllCoupons();
      if (res.success) {
        setCoupons(res.data?.coupons || []);
      }
    } catch (err) {
      toastError('Failed to fetch coupons.');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setCode('');
    setType('PERCENTAGE');
    setValue('');
    setMinimumOrder('0');
    setMaximumDiscount('');
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setExpiry(nextMonth.toISOString().split('T')[0]);
    setUsageLimit('1000');
    setPerUserLimit('1');
    setEligibleRole('ALL');
    setDescription('');
    setIsActive(true);
    setShowModal(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCoupon(c);
    setCode(c.code);
    setType(c.type || 'PERCENTAGE');
    setValue(String(c.value));
    setMinimumOrder(String(c.minimumOrder || 0));
    setMaximumDiscount(c.maximumDiscount ? String(c.maximumDiscount) : '');
    setExpiry(c.expiry ? new Date(c.expiry).toISOString().split('T')[0] : '');
    setUsageLimit(String(c.usageLimit || 1000));
    setPerUserLimit(String(c.perUserLimit || 1));
    setEligibleRole(c.eligibleRole || 'ALL');
    setDescription(c.description || '');
    setIsActive(Boolean(c.isActive));
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim() || !value) {
      toastError('Code and value are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: code.trim(),
        type,
        value: Number(value),
        minimumOrder: Number(minimumOrder) || 0,
        maximumDiscount: maximumDiscount ? Number(maximumDiscount) : null,
        expiry: new Date(expiry),
        usageLimit: Number(usageLimit) || 1000,
        perUserLimit: Number(perUserLimit) || 1,
        eligibleRole,
        description: description.trim(),
        isActive
      };

      if (editingCoupon) {
        const res = await marketingApi.adminUpdateCoupon(editingCoupon._id, payload);
        if (res.success) {
          toastSuccess(`Coupon '${code.toUpperCase()}' updated.`);
          setShowModal(false);
          await fetchCoupons();
        }
      } else {
        const res = await marketingApi.adminCreateCoupon(payload);
        if (res.success) {
          toastSuccess(`Coupon '${code.toUpperCase()}' created.`);
          setShowModal(false);
          await fetchCoupons();
        }
      }
    } catch (err) {
      toastError(err.message || 'Failed to save coupon.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, couponCode) => {
    if (!window.confirm(`Are you sure you want to delete coupon '${couponCode}'?`)) return;
    try {
      const res = await marketingApi.adminDeleteCoupon(id);
      if (res.success) {
        toastSuccess(`Coupon '${couponCode}' deleted.`);
        await fetchCoupons();
      }
    } catch (err) {
      toastError(err.message || 'Failed to delete coupon.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-600" />
            Coupon & Discount Management
          </h2>
          <p className="text-xs text-stone-500 mt-1 font-medium">
            Create percentage/flat promo codes with minimum order limits, role eligibility, and expiry controls.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition-colors shadow-md shadow-amber-500/20 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Coupon
        </button>
      </div>

      {/* Coupons Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400 text-xs font-bold">
          No coupons created yet. Tap "Create Coupon" to add your first promotion.
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Code</th>
                  <th className="p-4">Discount</th>
                  <th className="p-4">Min Order</th>
                  <th className="p-4">Eligible Role</th>
                  <th className="p-4">Usage</th>
                  <th className="p-4">Expiry</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {coupons.map((c) => (
                  <tr key={c._id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="p-4">
                      <span className="font-mono font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 inline-block text-xs">
                        {c.code}
                      </span>
                      {c.description && <p className="text-[11px] text-stone-400 mt-1">{c.description}</p>}
                    </td>
                    <td className="p-4 font-black text-stone-900">
                      {c.type === 'PERCENTAGE' ? `${c.value}% OFF` : `₹${c.value} FLAT`}
                      {c.maximumDiscount && <span className="block text-[10px] text-stone-400 font-normal">Max ₹{c.maximumDiscount}</span>}
                    </td>
                    <td className="p-4 font-bold text-stone-700">₹{c.minimumOrder || 0}</td>
                    <td className="p-4 font-bold text-stone-600">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 text-[10px] uppercase">{c.eligibleRole || 'ALL'}</span>
                    </td>
                    <td className="p-4 text-stone-500 font-mono">
                      {c.usageCount || 0} / {c.usageLimit || '∞'}
                    </td>
                    <td className="p-4 text-stone-500">
                      {c.expiry ? new Date(c.expiry).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Expiry'}
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant={c.isActive ? 'success' : 'danger'} size="xs">
                        {c.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-4 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-amber-600 hover:bg-stone-100"
                        title="Edit Coupon"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c._id, c.code)}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-rose-600 hover:bg-stone-100"
                        title="Delete Coupon"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-lg font-black text-stone-900">
                {editingCoupon ? `Edit Coupon '${editingCoupon.code}'` : 'Create New Coupon'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-stone-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SNACK20"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 font-mono font-bold uppercase focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Discount Type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 font-bold bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Discount Value *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder={type === 'PERCENTAGE' ? '20' : '50'}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 font-bold focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Max Discount Cap (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Optional for %"
                    value={maximumDiscount}
                    onChange={(e) => setMaximumDiscount(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Minimum Order (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={minimumOrder}
                    onChange={(e) => setMinimumOrder(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Eligible Role</label>
                  <select
                    value={eligibleRole}
                    onChange={(e) => setEligibleRole(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 font-bold bg-white"
                  >
                    <option value="ALL">All Users</option>
                    <option value="CUSTOMER">Retail Customers Only</option>
                    <option value="B2B_WHOLESALER">B2B Wholesalers Only</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Usage Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Description / Campaign Note</label>
                <input
                  type="text"
                  placeholder="e.g. Festival Season 20% discount on orders above ₹499"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="font-bold text-stone-800">Coupon is Active</span>
              </label>

              <div className="flex gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 font-bold text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black transition-colors disabled:opacity-50 shadow-md shadow-amber-500/20"
                >
                  {saving ? 'Saving…' : editingCoupon ? 'Save Changes' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponManager;
