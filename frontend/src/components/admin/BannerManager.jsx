import React, { useState, useEffect, useCallback } from 'react';
import { marketingApi } from '../../api/marketingApi';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../ui/Badge';
import CloudinaryUpload from '../ui/CloudinaryUpload';
import { Image as ImageIcon, Plus, Edit3, Trash2, Loader2, ExternalLink, Calendar } from 'lucide-react';

export const BannerManager = () => {
  const { success: toastSuccess, error: toastError } = useToast();

  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);

  // Form
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [image, setImage] = useState('');
  const [ctaText, setCtaText] = useState('Shop Now');
  const [ctaUrl, setCtaUrl] = useState('/shop');
  const [displayOrder, setDisplayOrder] = useState('0');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await marketingApi.adminGetAllBanners();
      if (res.success) {
        setBanners(res.data?.banners || []);
      }
    } catch (err) {
      toastError('Failed to fetch banners.');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const handleOpenCreate = () => {
    setEditingBanner(null);
    setTitle('');
    setSubtitle('');
    setImage('https://images.unsplash.com/photo-1599490659213-e2b9527bd087?q=80&w=1200&auto=format&fit=crop');
    setCtaText('Explore Collection');
    setCtaUrl('/shop');
    setDisplayOrder('0');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setIsActive(true);
    setShowModal(true);
  };

  const handleOpenEdit = (b) => {
    setEditingBanner(b);
    setTitle(b.title || '');
    setSubtitle(b.subtitle || '');
    setImage(b.image || b.imageUrl || '');
    setCtaText(b.ctaText || b.cta || 'Shop Now');
    setCtaUrl(b.ctaUrl || b.ctaLink || '/shop');
    setDisplayOrder(String(b.displayOrder || 0));
    setStartDate(b.startDate ? new Date(b.startDate).toISOString().split('T')[0] : '');
    setEndDate(b.endDate ? new Date(b.endDate).toISOString().split('T')[0] : '');
    setIsActive(Boolean(b.isActive));
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !image.trim()) {
      toastError('Title and image URL are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        image: image.trim(),
        ctaText: ctaText.trim(),
        ctaUrl: ctaUrl.trim(),
        displayOrder: Number(displayOrder) || 0,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        isActive
      };

      if (editingBanner) {
        const res = await marketingApi.adminUpdateBanner(editingBanner._id, payload);
        if (res.success) {
          toastSuccess(`Banner '${title}' updated.`);
          setShowModal(false);
          await fetchBanners();
        }
      } else {
        const res = await marketingApi.adminCreateBanner(payload);
        if (res.success) {
          toastSuccess(`Banner '${title}' created.`);
          setShowModal(false);
          await fetchBanners();
        }
      }
    } catch (err) {
      toastError(err.message || 'Failed to save banner.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, bannerTitle) => {
    if (!window.confirm(`Delete banner "${bannerTitle}"?`)) return;
    try {
      const res = await marketingApi.adminDeleteBanner(id);
      if (res.success) {
        toastSuccess('Banner deleted.');
        await fetchBanners();
      }
    } catch (err) {
      toastError(err.message || 'Failed to delete banner.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-600" />
            Homepage Hero Banners
          </h2>
          <p className="text-xs text-stone-500 mt-1 font-medium">
            Manage full-width promotional banners rendered on the Snackora homepage hero section.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-colors shadow-md shadow-indigo-600/20 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Banner
        </button>
      </div>

      {/* Grid of Banners */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
      ) : banners.length === 0 ? (
        <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400 text-xs font-bold">
          No banners configured. Tap "Create Banner" to publish your first hero slide.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {banners.map((b) => (
            <div key={b._id} className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs space-y-3 p-4 flex flex-col justify-between">
              <div>
                <div className="relative h-44 rounded-2xl overflow-hidden bg-stone-100 mb-3 group">
                  <img
                    src={b.image || b.imageUrl}
                    alt={b.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?q=80&w=600&auto=format&fit=crop'; }}
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge variant={b.isActive ? 'success' : 'default'} size="xs">
                      {b.isActive ? 'Live' : 'Draft'}
                    </Badge>
                    <span className="px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold">
                      Order: {b.displayOrder || 0}
                    </span>
                  </div>
                </div>

                <h4 className="font-black text-stone-900 text-base">{b.title}</h4>
                {b.subtitle && <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{b.subtitle}</p>}
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-600 flex items-center gap-1">
                  CTA: {b.ctaText || b.cta || 'Shop Now'} → {b.ctaUrl || b.ctaLink}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(b)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-indigo-600 hover:bg-stone-50"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(b._id, b.title)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-stone-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-lg font-black text-stone-900">
                {editingBanner ? `Edit Banner '${editingBanner.title}'` : 'Create Hero Banner'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-stone-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Banner Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pure Artisanal Crunchy Makhana"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Subtitle / Caption</label>
                <input
                  type="text"
                  placeholder="e.g. Handcrafted with cold-pressed oils and 100% natural spices."
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <CloudinaryUpload
                  label="Banner Image *"
                  value={image}
                  onChange={(url) => setImage(url)}
                  folder="snackora/banners"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Button CTA Text</label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Target URL</label>
                  <input
                    type="text"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-bold text-stone-800">Publish to Homepage</span>
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
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black transition-colors disabled:opacity-50 shadow-md shadow-indigo-600/20"
                >
                  {saving ? 'Saving…' : editingBanner ? 'Save Changes' : 'Publish Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BannerManager;
