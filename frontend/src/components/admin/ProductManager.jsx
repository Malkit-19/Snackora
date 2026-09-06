import React, { useState, useEffect, useCallback } from 'react';
import axiosClient from '../../api/axiosClient';
import { inventoryApi } from '../../api/inventoryApi';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import CloudinaryUpload from '../ui/CloudinaryUpload';
import {
  Package, Plus, Search, Edit2, Trash2, RefreshCw,
  Sparkles, CheckCircle2, XCircle, AlertTriangle, Layers, Tag,
  Zap, Loader2
} from 'lucide-react';

export const ProductManager = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [restockingId, setRestockingId] = useState(null);

  // Form State
  const [form, setForm] = useState({
    name: '',
    slug: '',
    sku: '',
    category: '',
    flavour: 'Original',
    retailPrice: '',
    wholesalePrice: '',
    moq: 10,
    stock: 100,
    weight: '100g',
    description: '',
    isFeatured: false,
    isAvailable: true,
    imageUrl: ''
  });

  const { success: toastSuccess, error: toastError } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        axiosClient.get('/products?limit=100'),
        axiosClient.get('/categories')
      ]);

      if (prodRes.success) {
        setProducts(prodRes.data?.products || []);
      }
      if (catRes.success) {
        setCategories(catRes.data?.categories || catRes.data || []);
      }
    } catch (err) {
      toastError(err.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleQuickRestock = async (product, quantity = 50) => {
    setRestockingId(product._id);
    try {
      const res = await inventoryApi.quickRestock(product._id, quantity);
      if (res.success) {
        toastSuccess(`⚡ Restocked '${product.name}' with +${quantity} units!`);
        await fetchData();
      } else {
        toastError(res.message || 'Quick restock failed.');
      }
    } catch (err) {
      toastError(err.message || 'Failed to restock product.');
    } finally {
      setRestockingId(null);
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setForm({
      name: '',
      slug: '',
      sku: `SNK-${Math.floor(1000 + Math.random() * 9000)}`,
      category: categories[0]?._id || '',
      flavour: 'Original',
      retailPrice: '',
      wholesalePrice: '',
      moq: 10,
      stock: 100,
      weight: '100g',
      description: '',
      isFeatured: false,
      isAvailable: true,
      imageUrl: ''
    });
    setModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingProduct(p);
    const primaryImg = p.images?.[0]?.url || '';
    setForm({
      name: p.name || '',
      slug: p.slug || '',
      sku: p.sku || '',
      category: p.category?._id || p.category || '',
      flavour: p.flavour || 'Original',
      retailPrice: p.retailPrice ?? p.mrp ?? '',
      wholesalePrice: p.wholesalePrice ?? p.b2bPrice ?? '',
      moq: p.moq ?? p.b2bMoq ?? 10,
      stock: p.stock ?? 0,
      weight: p.weight ?? p.unit ?? '100g',
      description: p.description || '',
      isFeatured: Boolean(p.isFeatured || p.featured),
      isAvailable: Boolean(p.isAvailable !== false && p.active !== false),
      imageUrl: primaryImg
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.retailPrice || !form.category) {
      toastError('Name, Category, and Retail Price are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        retailPrice: Number(form.retailPrice),
        wholesalePrice: form.wholesalePrice ? Number(form.wholesalePrice) : Math.round(Number(form.retailPrice) * 0.7),
        moq: Number(form.moq) || 10,
        stock: Number(form.stock) || 0,
        images: form.imageUrl ? [{ url: form.imageUrl, isPrimary: true, alt: form.name }] : []
      };

      if (editingProduct) {
        const res = await axiosClient.put(`/products/${editingProduct._id}`, payload);
        if (res.success) {
          toastSuccess(`Product "${form.name}" updated successfully.`);
        }
      } else {
        const res = await axiosClient.post('/products', payload);
        if (res.success) {
          toastSuccess(`Product "${form.name}" created successfully.`);
        }
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toastError(err.message || 'Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Are you sure you want to delete "${p.name}"?`)) return;
    try {
      const res = await axiosClient.delete(`/products/${p._id}`);
      if (res.success) {
        toastSuccess(`Product "${p.name}" removed.`);
        setProducts((prev) => prev.filter((item) => item._id !== p._id));
      }
    } catch (err) {
      toastError(err.message || 'Failed to delete product.');
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      p.flavour?.toLowerCase().includes(search.toLowerCase());

    const catId = p.category?._id || p.category;
    const matchCategory = categoryFilter === 'ALL' || catId === categoryFilter;

    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" /> Catalog Products Management
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Create, edit prices, update inventory stock, and manage B2B wholesale MOQ.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" onClick={openCreateModal} className="shadow-sm">
            <Plus className="w-4 h-4 mr-1.5" /> Add Product
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search products by name, SKU, flavour..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="ALL">All Categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Products Grid / Table */}
      {loading ? (
        <div className="py-16 text-center">
          <Spinner size="lg" />
          <p className="text-xs text-stone-400 mt-2">Loading catalog items...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400 text-xs">
          No products match the selected criteria.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider font-bold border-b border-stone-200">
              <tr>
                <th className="px-5 py-3.5">Product</th>
                <th className="px-5 py-3.5">Retail Price</th>
                <th className="px-5 py-3.5">B2B Wholesale</th>
                <th className="px-5 py-3.5">Stock</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {filteredProducts.map((p) => (
                <tr key={p._id} className="hover:bg-stone-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {p.images?.[0]?.url ? (
                        <img
                          src={p.images[0].url}
                          alt={p.name}
                          className="w-10 h-10 rounded-xl object-cover border border-stone-200 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                          📦
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-stone-900">{p.name}</div>
                        <div className="text-[11px] text-stone-400 font-mono">
                          {p.sku} • {p.category?.name || 'Snacks'} • {p.weight || '100g'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-bold text-stone-900">
                    ₹{p.retailPrice ?? p.mrp ?? 0}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-bold text-indigo-700">₹{p.wholesalePrice ?? p.b2bPrice ?? '—'}</span>
                    <span className="text-[10px] text-stone-400 block">MOQ: {p.moq ?? p.b2bMoq ?? 10}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${p.stock <= 10 ? 'text-rose-600 font-black' : 'text-emerald-700'}`}>
                        {p.stock} units
                      </span>
                      {p.stock <= 10 && (
                        <button
                          type="button"
                          disabled={restockingId === p._id}
                          onClick={() => handleQuickRestock(p, 50)}
                          title="Instant Restock +50 Units"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] shadow-xs transition-colors disabled:opacity-50"
                        >
                          {restockingId === p._id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Zap className="w-2.5 h-2.5 fill-white" />}
                          +50
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 space-x-1">
                    <Badge variant={p.isAvailable !== false ? 'success' : 'danger'} size="xs" dot>
                      {p.isAvailable !== false ? 'Active' : 'Hidden'}
                    </Badge>
                    {p.isFeatured && (
                      <Badge variant="warning" size="xs">Featured</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-1">
                    <Button size="xs" variant="outline" onClick={() => openEditModal(p)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="xs" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(p)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200 my-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-lg font-black text-stone-900">
                {editingProduct ? `Edit "${editingProduct.name}"` : 'Add New Snack Product'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-stone-700">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Himalayan Salt Roasted Makhana"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-stone-700">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-stone-700">SKU Code</label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-stone-700">Retail Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="199"
                    value={form.retailPrice}
                    onChange={(e) => setForm({ ...form, retailPrice: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-stone-700">Wholesale Price (₹)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="120"
                    value={form.wholesalePrice}
                    onChange={(e) => setForm({ ...form, wholesalePrice: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-stone-700">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-stone-700">B2B MOQ (Min Order)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.moq}
                    onChange={(e) => setForm({ ...form, moq: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <CloudinaryUpload
                  label="Product Image"
                  value={form.imageUrl}
                  onChange={(url) => setForm({ ...form, imageUrl: url })}
                  folder="snackora/products"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-700">Description</label>
                <textarea
                  rows={3}
                  placeholder="Artisanal snack description, ingredients, shelf life..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-stone-700">
                  <input
                    type="checkbox"
                    checked={form.isAvailable}
                    onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Visible / Active</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-stone-700">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Featured on Homepage</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManager;
