import React, { useState, useEffect, useCallback } from 'react';
import { marketingApi } from '../../api/marketingApi';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../ui/Badge';
import { Megaphone, Plus, Edit3, Trash2, Loader2, LayoutGrid, Store, Package, MessageSquare, Users, Send, Check, ExternalLink, Copy, Phone, Zap } from 'lucide-react';

const PLACEMENT_LABELS = {
  HOMEPAGE: { label: 'Homepage Feature', icon: LayoutGrid, color: 'text-amber-600 bg-amber-50' },
  SHOP: { label: 'Shop Catalog Banner', icon: Store, color: 'text-emerald-600 bg-emerald-50' },
  PRODUCT_PAGE: { label: 'Product Detail Promo', icon: Package, color: 'text-purple-600 bg-purple-50' }
};

export const AdManager = () => {
  const { success: toastSuccess, error: toastError } = useToast();

  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState(null);

  // Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [link, setLink] = useState('/shop');
  const [placement, setPlacement] = useState('HOMEPAGE');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [autoBroadcast, setAutoBroadcast] = useState(false);
  const [createCoupon, setCreateCoupon] = useState('');
  const [saving, setSaving] = useState(false);

  // Broadcast
  const [broadcastingId, setBroadcastingId] = useState(null);
  const [audienceStats, setAudienceStats] = useState(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastAd, setBroadcastAd] = useState(null);
  const [broadcastAudience, setBroadcastAudience] = useState('ALL');
  const [broadcastCoupon, setBroadcastCoupon] = useState('');
  const [broadcastResult, setBroadcastResult] = useState(null);
  const [recipientsList, setRecipientsList] = useState([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [showRecipientsTab, setShowRecipientsTab] = useState(false);

  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await marketingApi.adminGetAllAds();
      if (res.success) {
        setAds(res.data?.ads || []);
      }
    } catch (err) {
      toastError('Failed to fetch advertisements.');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await marketingApi.adminGetBroadcastStats();
      if (res.success) setAudienceStats(res.data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const loadRecipients = async (audience) => {
    setLoadingRecipients(true);
    try {
      const res = await marketingApi.adminGetBroadcastRecipients(audience);
      if (res.success) {
        setRecipientsList(res.data?.recipients || []);
      }
    } catch {
      toastError('Could not load recipient phone numbers.');
    } finally {
      setLoadingRecipients(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingAd(null);
    setTitle('');
    setDescription('');
    setImage('https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?q=80&w=800&auto=format&fit=crop');
    setLink('/shop');
    setPlacement('HOMEPAGE');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setIsActive(true);
    setAutoBroadcast(false);
    setCreateCoupon('');
    setShowModal(true);
  };

  const handleOpenEdit = (ad) => {
    setEditingAd(ad);
    setTitle(ad.title || '');
    setDescription(ad.description || '');
    setImage(ad.image || '');
    setLink(ad.link || '/shop');
    setPlacement(ad.placement || 'HOMEPAGE');
    setStartDate(ad.startDate ? new Date(ad.startDate).toISOString().split('T')[0] : '');
    setEndDate(ad.endDate ? new Date(ad.endDate).toISOString().split('T')[0] : '');
    setIsActive(Boolean(ad.isActive));
    setAutoBroadcast(false);
    setCreateCoupon('');
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
        description: description.trim(),
        image: image.trim(),
        link: link.trim(),
        placement,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        isActive,
        autoBroadcast,
        couponCode: createCoupon.trim()
      };

      if (editingAd) {
        const res = await marketingApi.adminUpdateAd(editingAd._id, payload);
        if (res.success) {
          toastSuccess(`Promo Ad '${title}' updated.`);
          setShowModal(false);
          await fetchAds();
        }
      } else {
        const res = await marketingApi.adminCreateAd(payload);
        if (res.success) {
          toastSuccess(`Promo Ad '${title}' published!` + (autoBroadcast ? ' 📢 WhatsApp broadcast initiated in real-time!' : ''));
          setShowModal(false);
          await fetchAds();
          await fetchStats();
        }
      }
    } catch (err) {
      toastError(err.message || 'Failed to save advertisement.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, adTitle) => {
    if (!window.confirm(`Delete promo advertisement "${adTitle}"?`)) return;
    try {
      const res = await marketingApi.adminDeleteAd(id);
      if (res.success) {
        toastSuccess('Ad deleted.');
        await fetchAds();
      }
    } catch (err) {
      toastError(err.message || 'Failed to delete ad.');
    }
  };

  const handleOpenBroadcast = (ad) => {
    setBroadcastAd(ad);
    setBroadcastAudience('ALL');
    setBroadcastCoupon('');
    setBroadcastResult(null);
    setShowRecipientsTab(false);
    setShowBroadcastModal(true);
    loadRecipients('ALL');
  };

  const handleAudienceChange = (audience) => {
    setBroadcastAudience(audience);
    loadRecipients(audience);
  };

  const handleBroadcastSubmit = async (e) => {
    e.preventDefault();
    if (!broadcastAd) return;
    setBroadcastingId(broadcastAd._id);
    try {
      const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://www.snackora.in';
      const res = await marketingApi.adminBroadcastAdWhatsApp(broadcastAd._id, {
        targetAudience: broadcastAudience,
        couponCode: broadcastCoupon.trim(),
        baseUrl: siteOrigin
      });
      if (res.success) {
        setBroadcastResult(res.data);
        toastSuccess(`✅ WhatsApp broadcast sent to ${res.data.dispatchedCount} users!`);
      }
    } catch (err) {
      toastError(err.message || 'Broadcast failed.');
    } finally {
      setBroadcastingId(null);
    }
  };

  const audienceCount = (type) => {
    if (!audienceStats) return '…';
    if (type === 'ALL') return audienceStats.totalWithPhone ?? 0;
    if (type === 'CUSTOMERS') return audienceStats.customersCount ?? 0;
    if (type === 'B2B') return audienceStats.b2bCount ?? 0;
    return 0;
  };

  const copyAllNumbers = () => {
    const numbers = recipientsList.map(r => r.phone).filter(Boolean).join(', ');
    if (!numbers) {
      toastError('No phone numbers to copy.');
      return;
    }
    navigator.clipboard.writeText(numbers);
    toastSuccess(`📋 Copied ${recipientsList.length} numbers to clipboard!`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-rose-600" />
            Promotional Ads &amp; WhatsApp Broadcast
          </h2>
          <p className="text-xs text-stone-500 mt-1 font-medium">
            Publish non-intrusive promo blocks &amp; broadcast them in real-time to registered customer WhatsApp numbers.
          </p>
          {audienceStats && (
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                {audienceStats.totalWithPhone} Registered Phones
              </span>
              <span className="text-xs text-stone-500 font-medium">
                ({audienceStats.customersCount} retail, {audienceStats.b2bCount} wholesale)
              </span>
            </div>
          )}
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-colors shadow-md shadow-rose-600/20 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Promo Ad
        </button>
      </div>

      {/* Ads Grid */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
      ) : ads.length === 0 ? (
        <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400 text-xs font-bold">
          No promotional ads configured.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ads.map((ad) => {
            const placeInfo = PLACEMENT_LABELS[ad.placement] || { label: ad.placement, color: 'text-stone-700 bg-stone-100' };

            return (
              <div key={ad._id} className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs flex flex-col justify-between p-4 space-y-3">
                <div>
                  <div className="relative h-36 rounded-2xl overflow-hidden bg-stone-100 mb-3 group">
                    <img
                      src={ad.image}
                      alt={ad.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?q=80&w=400&auto=format&fit=crop'; }}
                    />
                    <div className="absolute top-2 left-2 flex gap-1.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${placeInfo.color}`}>
                        {placeInfo.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-black text-stone-900 text-sm">{ad.title}</h4>
                    <Badge variant={ad.isActive ? 'success' : 'default'} size="xs">
                      {ad.isActive ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  {ad.description && <p className="text-xs text-stone-500 mt-1 line-clamp-2">{ad.description}</p>}
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <span className="font-mono text-stone-400 text-[11px] truncate max-w-[120px]">{ad.link}</span>

                  <div className="flex items-center gap-1.5">
                    {/* WhatsApp Broadcast */}
                    <button
                      onClick={() => handleOpenBroadcast(ad)}
                      disabled={broadcastingId === ad._id}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors font-bold text-xs flex items-center gap-1"
                      title="Send WhatsApp Broadcast in Real-Time"
                    >
                      {broadcastingId === ad._id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />}
                      <span>Broadcast</span>
                    </button>
                    <button
                      onClick={() => handleOpenEdit(ad)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-stone-50"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(ad._id, ad.title)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-stone-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-lg font-black text-stone-900">
                {editingAd ? `Edit Promo Ad '${editingAd.title}'` : 'Create Promotional Ad'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-stone-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Ad Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Try Our Himalayan Pink Salt Makhana"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 font-bold focus:ring-2 focus:ring-rose-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Placement Target *</label>
                  <select
                    value={placement}
                    onChange={(e) => setPlacement(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 font-bold bg-white focus:ring-2 focus:ring-rose-400 focus:outline-none"
                  >
                    <option value="HOMEPAGE">Homepage</option>
                    <option value="SHOP">Shop Catalog</option>
                    <option value="PRODUCT_PAGE">Product Detail Page</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Target Link</label>
                  <input
                    type="text"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-rose-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Image URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://images.unsplash.com/..."
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-rose-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Description / Tagline</label>
                <input
                  type="text"
                  placeholder="e.g. 100% natural, slow roasted with virgin olive oil."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-rose-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-rose-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-rose-400 focus:outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span className="font-bold text-stone-800">Advertisement is Active</span>
              </label>

              {/* Real-time broadcast on creation toggle */}
              {!editingAd && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-black text-emerald-900">
                    <input
                      type="checkbox"
                      checked={autoBroadcast}
                      onChange={(e) => setAutoBroadcast(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-emerald-600 fill-emerald-500" />
                      Auto-Broadcast on WhatsApp in Real-Time
                    </span>
                  </label>
                  {autoBroadcast && (
                    <div className="pt-2 animate-in fade-in duration-150">
                      <label className="block font-bold text-emerald-800 mb-1">Attach Promo Coupon Code (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. MAKHANA15"
                        value={createCoupon}
                        onChange={(e) => setCreateCoupon(e.target.value.toUpperCase())}
                        className="w-full px-3 py-1.5 rounded-xl border border-emerald-300 font-mono font-bold uppercase focus:outline-none"
                      />
                      <p className="text-[11px] text-emerald-700 mt-1">
                        📲 Will send personalized WhatsApp promo messages to all <strong>{audienceCount('ALL')}</strong> registered customer numbers immediately when published.
                      </p>
                    </div>
                  )}
                </div>
              )}

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
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black transition-colors disabled:opacity-50 shadow-md shadow-rose-600/20"
                >
                  {saving ? 'Saving…' : editingAd ? 'Save Changes' : 'Publish Ad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Broadcast Modal */}
      {showBroadcastModal && broadcastAd && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                Real-Time WhatsApp Broadcast
              </h3>
              <button
                onClick={() => { setShowBroadcastModal(false); setBroadcastResult(null); }}
                className="text-stone-400 font-bold hover:text-stone-700"
              >✕</button>
            </div>

            {/* Ad preview */}
            <div className="flex items-center gap-3 bg-stone-50 rounded-2xl p-3">
              <img
                src={broadcastAd.image}
                alt={broadcastAd.title}
                className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?q=80&w=100&auto=format&fit=crop'; }}
              />
              <div className="min-w-0">
                <p className="text-sm font-black text-stone-900 truncate">{broadcastAd.title}</p>
                {broadcastAd.description && (
                  <p className="text-xs text-stone-500 line-clamp-1">{broadcastAd.description}</p>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-stone-200 text-xs font-black">
              <button
                type="button"
                onClick={() => setShowRecipientsTab(false)}
                className={`pb-2 px-3 border-b-2 transition-colors ${!showRecipientsTab ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-stone-400 hover:text-stone-700'}`}
              >
                📢 Broadcast Dispatch
              </button>
              <button
                type="button"
                onClick={() => setShowRecipientsTab(true)}
                className={`pb-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${showRecipientsTab ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-stone-400 hover:text-stone-700'}`}
              >
                <Phone className="w-3.5 h-3.5" />
                Audience List ({recipientsList.length})
              </button>
            </div>

            {!showRecipientsTab ? (
              !broadcastResult ? (
                <form onSubmit={handleBroadcastSubmit} className="space-y-4 text-xs">
                  {/* Audience Selector */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-2">Target Registered Audience</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['ALL', 'CUSTOMERS', 'B2B'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleAudienceChange(type)}
                          className={`py-2 px-3 rounded-xl border-2 font-black text-[11px] transition-all ${
                            broadcastAudience === type
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-stone-200 text-stone-500 hover:border-stone-300'
                          }`}
                        >
                          <div>{type === 'ALL' ? '👥 All' : type === 'CUSTOMERS' ? '🛒 Customers' : '🏢 B2B'}</div>
                          <div className="font-mono mt-0.5 text-[10px]">{audienceCount(type)} registered</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional Coupon */}
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Coupon Code <span className="font-normal text-stone-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SNACK10"
                      value={broadcastCoupon}
                      onChange={(e) => setBroadcastCoupon(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-200 font-mono font-bold focus:ring-2 focus:ring-emerald-400 focus:outline-none uppercase placeholder:uppercase placeholder:font-sans placeholder:font-normal"
                    />
                  </div>

                  {/* Gateway Notice */}
                  {!audienceStats?.hasCloudGateway && (
                    <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3 text-amber-900 text-[11px] leading-relaxed">
                      <p className="font-bold flex items-center gap-1.5 text-amber-800">
                        ⚡ 1-Click Direct WhatsApp Mode Active
                      </p>
                      <p className="text-amber-700 mt-0.5">
                        Your server generates instant WhatsApp deep-links and in-app notifications. For fully automatic background delivery to phone numbers, configure <span className="font-mono font-bold bg-amber-100 px-1 py-0.5 rounded text-amber-900">WHATSAPP_API_TOKEN</span> in <span className="font-mono text-amber-900">.env</span>.
                      </p>
                      <p className="text-emerald-700 font-bold mt-1">
                        👉 Click the "Audience List" tab above to 1-click chat with registered customers right now!
                      </p>
                    </div>
                  )}

                  {/* Info note */}
                  <div className="text-stone-500 bg-stone-50 rounded-xl p-3 space-y-1.5 leading-relaxed">
                    <p className="font-bold text-stone-700 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-emerald-600 fill-emerald-500" />
                      Instant Multi-Channel Dispatch:
                    </p>
                    <p>• Dispatches WhatsApp promo messages to all <strong>{audienceCount(broadcastAudience)}</strong> phone numbers.</p>
                    <p>• Pushes in-app notifications directly into customers' notification bells.</p>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => { setShowBroadcastModal(false); setBroadcastResult(null); }}
                      className="flex-1 py-2.5 rounded-xl border border-stone-200 font-bold text-stone-600 hover:bg-stone-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={broadcastingId === broadcastAd._id}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black transition-colors disabled:opacity-50 shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
                    >
                      {broadcastingId === broadcastAd._id ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Dispatching in Real-Time…</>
                      ) : (
                        <><Send className="w-4 h-4" /> Broadcast in Real-Time</>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* Result Panel */
                <div className="space-y-4 text-xs">
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-black text-emerald-800 text-sm">Real-Time Broadcast Complete!</p>
                      <p className="text-emerald-600 mt-0.5">
                        Successfully dispatched to <strong>{broadcastResult.dispatchedCount}</strong> registered users.
                      </p>
                    </div>
                  </div>

                  {/* Summary List */}
                  {broadcastResult.dispatchSummary && broadcastResult.dispatchSummary.length > 0 && (
                    <div>
                      <p className="font-bold text-stone-700 mb-2">📋 Recipient Dispatch Log</p>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 border border-stone-200 rounded-2xl p-2 bg-stone-50">
                        {broadcastResult.dispatchSummary.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white text-[11px]">
                            <div>
                              <span className="font-black text-stone-900">{item.name || 'Customer'}</span>
                              <span className="font-mono text-stone-400 ml-2">+{item.phone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                Dispatched ✅
                              </span>
                              {item.directChatUrl && (
                                <a
                                  href={item.directChatUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-600 hover:text-emerald-800 font-bold"
                                  title="Open direct WhatsApp chat"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {broadcastResult.directShareUrl && (
                    <div>
                      <p className="font-bold text-stone-700 mb-2">📎 Global WhatsApp Share Link</p>
                      <a
                        href={broadcastResult.directShareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-[#25D366] text-white font-bold rounded-xl px-4 py-2.5 hover:bg-[#128C7E] transition-colors w-full justify-center"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open WhatsApp Broadcast
                      </a>
                    </div>
                  )}

                  <button
                    onClick={() => { setShowBroadcastModal(false); setBroadcastResult(null); }}
                    className="w-full py-2.5 rounded-xl border border-stone-200 font-bold text-stone-600 hover:bg-stone-50"
                  >
                    Close
                  </button>
                </div>
              )
            ) : (
              /* Registered Audience Phone Numbers Tab */
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <p className="text-stone-500 font-medium">
                    Registered users reachable on WhatsApp ({recipientsList.length}):
                  </p>
                  <button
                    type="button"
                    onClick={copyAllNumbers}
                    className="px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 font-bold text-stone-700 flex items-center gap-1 text-[11px]"
                  >
                    <Copy className="w-3 h-3" /> Copy All
                  </button>
                </div>

                {loadingRecipients ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
                ) : recipientsList.length === 0 ? (
                  <div className="text-center py-8 bg-stone-50 rounded-2xl border border-dashed text-stone-400">
                    No registered phone numbers in this segment.
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-1.5 border border-stone-200 rounded-2xl p-2 bg-stone-50">
                    {recipientsList.map((user) => (
                      <div key={user._id} className="flex items-center justify-between p-2 rounded-xl bg-white text-[11px]">
                        <div>
                          <p className="font-black text-stone-900">{user.name}</p>
                          <p className="font-mono text-stone-400">+{user.cleanPhone || user.phone}</p>
                        </div>
                        <a
                          href={`https://wa.me/${user.cleanPhone}?text=${encodeURIComponent(`🍿 *Special Offer from Snackora!* 🔥 ${broadcastAd.title} 👉 Check out: ${typeof window !== 'undefined' ? window.location.origin : 'https://www.snackora.in'}${broadcastAd.link || '/shop'}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" /> Chat
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdManager;
