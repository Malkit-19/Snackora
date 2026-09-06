import React, { useState, useEffect, useCallback } from 'react';
import { inventoryApi } from '../../api/inventoryApi';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../ui/Badge';
import {
  Warehouse, AlertTriangle, RefreshCw, Search, Filter, Loader2,
  TrendingUp, TrendingDown, History, Plus, CheckCircle2, ShieldAlert,
  Zap, Sparkles
} from 'lucide-react';

const STATUS_BADGE_VARIANTS = {
  IN_STOCK: { variant: 'success', label: 'In Stock' },
  LOW_STOCK: { variant: 'warning', label: 'Low Stock' },
  OUT_OF_STOCK: { variant: 'danger', label: 'Out of Stock' }
};

const ADJUSTMENT_TYPES = [
  { id: 'ADMIN_ADJUSTMENT', label: 'Admin Physical Adjustment' },
  { id: 'PURCHASE', label: 'New Purchase / Restock' },
  { id: 'DAMAGE', label: 'Damaged Stock' },
  { id: 'EXPIRED', label: 'Expired Product Removal' },
  { id: 'ORDER_RETURNED', label: 'Order Return Restock' }
];

export const InventoryManager = () => {
  const { success: toastSuccess, error: toastError } = useToast();

  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview' | 'ledger'
  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // 1-Click Quick Restock State
  const [restockingId, setRestockingId] = useState(null);

  // Transactions Ledger State
  const [transactions, setTransactions] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Modal State
  const [adjustingProduct, setAdjustingProduct] = useState(null);
  const [newStockInput, setNewStockInput] = useState('');
  const [thresholdInput, setThresholdInput] = useState('');
  const [typeInput, setTypeInput] = useState('ADMIN_ADJUSTMENT');
  const [reasonInput, setReasonInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await inventoryApi.getOverview(params);
      if (res.success) {
        setInventory(res.data?.inventory || []);
        setSummary(res.data?.summary || {});
      }
    } catch (err) {
      toastError('Failed to fetch inventory overview.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm, toastError]);

  const fetchLedger = useCallback(async () => {
    setLoadingLedger(true);
    try {
      const res = await inventoryApi.getTransactions();
      if (res.success) {
        setTransactions(res.data?.transactions || []);
      }
    } catch (err) {
      toastError('Failed to fetch inventory transactions ledger.');
    } finally {
      setLoadingLedger(false);
    }
  }, [toastError]);

  useEffect(() => {
    if (activeSubTab === 'overview') fetchInventory();
    if (activeSubTab === 'ledger') fetchLedger();
  }, [activeSubTab, fetchInventory, fetchLedger]);

  // ── 1-Click Restock Handler ───────────────────────────────────────────────
  const handleQuickRestock = async (productId, productName, quantity = 50) => {
    setRestockingId(productId);
    try {
      const res = await inventoryApi.quickRestock(productId, quantity);
      if (res.success) {
        toastSuccess(`⚡ Restocked '${productName}' with +${quantity} units!`);
        await fetchInventory();
      } else {
        toastError(res.message || 'Quick restock failed.');
      }
    } catch (err) {
      toastError(err.message || 'Failed to restock product.');
    } finally {
      setRestockingId(null);
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    if (!reasonInput || !reasonInput.trim()) {
      toastError('Every manual inventory adjustment requires a mandatory reason.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await inventoryApi.adjustProductInventory(adjustingProduct._id, {
        newStock: newStockInput !== '' ? parseInt(newStockInput, 10) : undefined,
        lowStockThreshold: thresholdInput !== '' ? parseInt(thresholdInput, 10) : undefined,
        type: typeInput,
        reason: reasonInput.trim()
      });

      if (res.success) {
        toastSuccess(`Inventory for '${adjustingProduct.name}' adjusted successfully.`);
        setAdjustingProduct(null);
        setReasonInput('');
        await fetchInventory();
      }
    } catch (err) {
      toastError(err.message || 'Failed to adjust inventory.');
    } finally {
      setSubmitting(false);
    }
  };

  const lowStockAlertItems = inventory.filter((i) => i.stockStatus === 'LOW_STOCK' || i.stockStatus === 'OUT_OF_STOCK');

  return (
    <div className="space-y-6">
      {/* Sub-navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-amber-600" />
            Inventory Control & Audit Ledger
          </h2>
          <p className="text-xs text-stone-500 mt-1 font-medium">
            Formula: <strong className="text-stone-800">Available Stock = Stock − Reserved Stock</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'overview' ? 'bg-amber-500 text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Warehouse className="w-3.5 h-3.5" /> Stock Overview
          </button>
          <button
            onClick={() => setActiveSubTab('ledger')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'ledger' ? 'bg-amber-500 text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Audit Ledger
          </button>
          <button
            onClick={fetchInventory}
            disabled={loading}
            className="p-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── LOW STOCK ALERTS BANNER ────────────────────────────────────────── */}
      {lowStockAlertItems.length > 0 && activeSubTab === 'overview' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 flex-1">
            <span className="font-black text-sm block mb-1">
              Low Stock Alert: {lowStockAlertItems.length} Product(s) Require Re-stocking (Stock ≤ 10)!
            </span>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {lowStockAlertItems.map((item) => (
                <div key={item._id} className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white border border-amber-300 text-amber-950 font-bold text-xs shadow-xs">
                  <span>{item.name} (<strong className="text-rose-600 font-black">{item.availableStock}</strong> avail)</span>
                  <button
                    type="button"
                    disabled={restockingId === item._id}
                    onClick={() => handleQuickRestock(item._id, item.name, 50)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] transition-colors shadow-xs disabled:opacity-50"
                  >
                    {restockingId === item._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 fill-white" />}
                    1-Click Restock (+50)
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SUB-TAB 1: STOCK OVERVIEW ──────────────────────────────────────── */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === st ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search Product or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400 text-xs font-bold">
              No inventory records found.
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Product</th>
                      <th className="p-4">SKU</th>
                      <th className="p-4 text-right">Physical Stock</th>
                      <th className="p-4 text-right">Reserved</th>
                      <th className="p-4 text-right">Available</th>
                      <th className="p-4 text-right">Threshold</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {inventory.map((item) => {
                      const badgeInfo = STATUS_BADGE_VARIANTS[item.stockStatus] || { variant: 'default', label: item.stockStatus };
                      const isLow = item.stockStatus === 'LOW_STOCK' || item.stockStatus === 'OUT_OF_STOCK' || item.availableStock <= 10;

                      return (
                        <tr key={item._id} className="hover:bg-stone-50/60 transition-colors">
                          <td className="p-4 font-bold text-stone-900">{item.name}</td>
                          <td className="p-4 font-mono text-stone-500">{item.sku}</td>
                          <td className="p-4 text-right font-black text-stone-900">{item.stock}</td>
                          <td className="p-4 text-right font-bold text-amber-700">{item.reservedStock}</td>
                          <td className="p-4 text-right font-black text-emerald-700 text-sm">
                            <span className={isLow ? 'text-rose-600 font-black' : 'text-emerald-700 font-black'}>
                              {item.availableStock}
                            </span>
                          </td>
                          <td className="p-4 text-right font-medium text-stone-400">{item.lowStockThreshold}</td>
                          <td className="p-4 text-center">
                            <Badge variant={badgeInfo.variant} size="xs">{badgeInfo.label}</Badge>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                title="Instant Restock +50 units with one click"
                                disabled={restockingId === item._id}
                                onClick={() => handleQuickRestock(item._id, item.name, 50)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] transition-colors shadow-xs disabled:opacity-50"
                              >
                                {restockingId === item._id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Zap className="w-3 h-3 fill-white" />
                                )}
                                +50
                              </button>
                              <button
                                onClick={() => {
                                  setAdjustingProduct(item);
                                  setNewStockInput(item.stock);
                                  setThresholdInput(item.lowStockThreshold);
                                  setReasonInput('');
                                }}
                                className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 font-bold text-xs transition-colors shadow-xs"
                              >
                                Adjust
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SUB-TAB 2: AUDIT LEDGER TRANSACTIONS ──────────────────────────── */}
      {activeSubTab === 'ledger' && (
        <div className="space-y-4">
          {loadingLedger ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400 text-xs font-bold">
              No inventory transactions recorded in audit ledger yet.
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx._id} className="p-4 rounded-2xl border border-stone-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-stone-900">{tx.product?.name || tx.sku}</span>
                      <span className="font-mono text-stone-400 text-[11px]">({tx.sku})</span>
                      <Badge variant="info" size="xs">{tx.type}</Badge>
                    </div>
                    <p className="text-stone-500 mt-1 italic">Reason: "{tx.reason || 'Not specified'}"</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Performed by: <strong className="text-stone-700">{tx.performedBy?.name || 'System Admin'}</strong> • {new Date(tx.createdAt).toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="text-right shrink-0 bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <span className={`text-sm font-black ${tx.quantity >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {tx.quantity >= 0 ? `+${tx.quantity}` : tx.quantity} Units
                    </span>
                    <p className="text-[11px] text-stone-400 font-medium">Stock: {tx.previousStock} → {tx.newStock}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MANUAL ADJUSTMENT MODAL ────────────────────────────────────────── */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-lg font-black text-stone-900">Adjust Product Inventory</h3>
              <button onClick={() => setAdjustingProduct(null)} className="text-stone-400 font-bold">✕</button>
            </div>

            <p className="text-xs text-stone-500">
              Adjusting physical stock for <strong className="text-stone-900">{adjustingProduct.name}</strong> ({adjustingProduct.sku}).
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">New Physical Stock *</label>
                  <input
                    type="number"
                    min={adjustingProduct.reservedStock}
                    required
                    value={newStockInput}
                    onChange={(e) => setNewStockInput(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-stone-300 font-black text-sm"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">Min: {adjustingProduct.reservedStock} (Reserved)</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Low Stock Threshold</label>
                  <input
                    type="number"
                    min={0}
                    value={thresholdInput}
                    onChange={(e) => setThresholdInput(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Transaction Type *</label>
                <select
                  value={typeInput}
                  onChange={(e) => setTypeInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-bold"
                >
                  {ADJUSTMENT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Mandatory Reason * <span className="text-rose-600">(Required)</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Received new consignment of 200 units from supplier."
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition-colors disabled:opacity-50 shadow-md shadow-amber-500/20"
                >
                  {submitting ? 'Saving…' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManager;
