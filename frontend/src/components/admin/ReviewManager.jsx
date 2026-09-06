import React, { useState, useEffect, useCallback } from 'react';
import axiosClient from '../../api/axiosClient';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { Star, Trash2, CheckCircle2, XCircle, RefreshCw, MessageSquare } from 'lucide-react';

export const ReviewManager = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const { success: toastSuccess, error: toastError } = useToast();

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/admin/reviews');
      if (res.success) {
        setReviews(res.data?.reviews || res.data || []);
      }
    } catch (err) {
      // Fallback: try fetching all reviews
      try {
        const altRes = await axiosClient.get('/reviews');
        if (altRes.success) setReviews(altRes.data?.reviews || altRes.data || []);
      } catch {
        toastError('Failed to load reviews.');
      }
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Delete this product review?')) return;
    try {
      const res = await axiosClient.delete(`/reviews/${reviewId}`);
      if (res.success) {
        toastSuccess('Review removed.');
        setReviews((prev) => prev.filter((r) => r._id !== reviewId));
      }
    } catch (err) {
      toastError(err.message || 'Failed to delete review.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" /> Product Reviews Moderation
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Verified customer ratings, feedback, and moderation management.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchReviews} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <Spinner size="lg" />
          <p className="text-xs text-stone-400 mt-2">Loading customer reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="p-12 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400 text-xs">
          No customer reviews submitted yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((r) => (
            <div
              key={r._id}
              className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs flex flex-col justify-between space-y-3 hover:border-amber-300 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${s <= r.rating ? 'text-amber-500 fill-amber-500' : 'text-stone-200'}`}
                      />
                    ))}
                    <span className="text-xs font-bold text-stone-700 ml-1.5">{r.rating}/5</span>
                  </div>

                  <span className="text-[11px] text-stone-400">
                    {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>

                {r.title && <h4 className="font-bold text-stone-900 text-sm">{r.title}</h4>}
                <p className="text-xs text-stone-600 leading-relaxed italic">
                  "{r.comment || r.body || 'No written comment'}"
                </p>

                <div className="pt-2 flex items-center justify-between text-[11px] text-stone-400">
                  <span>By: <strong className="text-stone-700">{r.userName || r.user?.name || 'Customer'}</strong></span>
                  {r.isVerifiedPurchase && <Badge variant="success" size="xs">Verified Buyer</Badge>}
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-stone-100">
                <Button size="xs" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(r._id)}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewManager;
