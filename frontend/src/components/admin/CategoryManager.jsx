import React, { useState, useEffect, useCallback } from 'react';
import axiosClient from '../../api/axiosClient';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import CloudinaryUpload from '../ui/CloudinaryUpload';
import { Tags, Plus, Edit2, Trash2, RefreshCw, Layers } from 'lucide-react';

export const CategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    isActive: true
  });

  const { success: toastSuccess, error: toastError } = useToast();

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/categories');
      if (res.success) {
        setCategories(res.data?.categories || res.data || []);
      }
    } catch (err) {
      toastError(err.message || 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setForm({ name: '', slug: '', description: '', image: '', isActive: true });
    setModalOpen(true);
  };

  const openEditModal = (c) => {
    setEditingCategory(c);
    setForm({
      name: c.name || '',
      slug: c.slug || '',
      description: c.description || '',
      image: c.image || '',
      isActive: c.isActive !== false
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name) {
      toastError('Category name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        slug: form.slug || form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
      };

      if (editingCategory) {
        const res = await axiosClient.put(`/categories/${editingCategory._id}`, payload);
        if (res.success) toastSuccess(`Category "${form.name}" updated.`);
      } else {
        const res = await axiosClient.post('/categories', payload);
        if (res.success) toastSuccess(`Category "${form.name}" created.`);
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      toastError(err.message || 'Failed to save category.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Are you sure you want to delete category "${c.name}"?`)) return;
    try {
      const res = await axiosClient.delete(`/categories/${c._id}`);
      if (res.success) {
        toastSuccess(`Category "${c.name}" removed.`);
        setCategories((prev) => prev.filter((item) => item._id !== c._id));
      }
    } catch (err) {
      toastError(err.message || 'Failed to delete category.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <Tags className="w-5 h-5 text-amber-600" /> Snack Categories Management
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Organize products into customer-facing departments (Makhana, Cookies, Chips, Dairy, etc.).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchCategories} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Category
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <Spinner size="lg" />
          <p className="text-xs text-stone-400 mt-2">Loading category structure...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((c) => (
            <div
              key={c._id}
              className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-amber-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={c.isActive !== false ? 'success' : 'danger'} size="xs" dot>
                    {c.isActive !== false ? 'Active' : 'Inactive'}
                  </Badge>
                  <span className="text-[10px] text-stone-400 font-mono">/{c.slug}</span>
                </div>
                <h3 className="text-base font-black text-stone-900">{c.name}</h3>
                <p className="text-xs text-stone-500 line-clamp-2 mt-1">
                  {c.description || 'No description provided.'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <Button size="xs" variant="outline" onClick={() => openEditModal(c)}>
                  <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
                <Button size="xs" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(c)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-lg font-black text-stone-900">
                {editingCategory ? `Edit "${editingCategory.name}"` : 'Create New Category'}
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
                <label className="text-stone-700">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Roasted Makhana"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-700">URL Slug</label>
                <input
                  type="text"
                  placeholder="e.g. roasted-makhana (auto-generated if empty)"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-700">Description</label>
                <textarea
                  rows={3}
                  placeholder="Short summary for category banner..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <CloudinaryUpload
                  label="Category Image"
                  value={form.image}
                  onChange={(url) => setForm({ ...form, image: url })}
                  folder="snackora/categories"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="catActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="catActive" className="text-stone-700 cursor-pointer">
                  Active in shop filters
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManager;
