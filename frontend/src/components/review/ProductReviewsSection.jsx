import React, { useState, useEffect, useCallback } from 'react';
import { Star, CheckCircle2, ThumbsUp, MessageSquare, Edit3, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { reviewApi } from '../../api/reviewApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const ProductReviewsSection = ({ productId, productName }) => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ averageRating: 0, totalReviews: 0, ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
  const [loading, setLoading] = useState(true);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [titleInput, setTitleInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState(null);

  const fetchReviews = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const res = await reviewApi.getProductReviews(productId);
      if (res.success) {
        setReviews(res.data?.reviews || []);
        setSummary(res.data?.summary || { averageRating: 0, totalReviews: 0, ratingDistribution: {} });
      }
    } catch (err) {
      console.warn('Failed to load reviews:', err.message);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      toastError('Please log in to submit a review.');
      return;
    }
    if (!commentInput.trim()) {
      toastError('Please write a review comment.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingReviewId) {
        const res = await reviewApi.updateReview(editingReviewId, {
          rating: ratingInput,
          title: titleInput.trim(),
          comment: commentInput.trim()
        });
        if (res.success) {
          toastSuccess('Your review has been updated.');
          setEditingReviewId(null);
          setShowForm(false);
          await fetchReviews();
        }
      } else {
        const res = await reviewApi.createReview(productId, {
          rating: ratingInput,
          title: titleInput.trim(),
          comment: commentInput.trim()
        });
        if (res.success) {
          toastSuccess('Thank you! Your verified review has been published.');
          setShowForm(false);
          setTitleInput('');
          setCommentInput('');
          setRatingInput(5);
          await fetchReviews();
        }
      }
    } catch (err) {
      toastError(err.message || 'Failed to submit review. (Note: Only verified purchasers can review).');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete your review?')) return;
    try {
      const res = await reviewApi.deleteReview(reviewId);
      if (res.success) {
        toastSuccess('Review deleted.');
        await fetchReviews();
      }
    } catch (err) {
      toastError(err.message || 'Failed to delete review.');
    }
  };

  const handleStartEdit = (review) => {
    setEditingReviewId(review._id);
    setRatingInput(review.rating);
    setTitleInput(review.title || '');
    setCommentInput(review.comment || review.body || '');
    setShowForm(true);
  };

  return (
    <div className="space-y-8 pt-8 border-t border-stone-200">
      {/* Header & Overall Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-stone-900 flex items-center gap-2.5">
            Customer Reviews & Ratings
          </h2>
          <p className="text-xs text-stone-500 mt-1 font-medium">
            Authentic verified reviews from real Snackora customers.
          </p>
        </div>

        {user && !showForm && (
          <button
            type="button"
            onClick={() => {
              setEditingReviewId(null);
              setRatingInput(5);
              setTitleInput('');
              setCommentInput('');
              setShowForm(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors shadow-md shadow-amber-500/20 self-start md:self-auto"
          >
            Write a Customer Review
          </button>
        )}
      </div>

      {/* Ratings Overview Card */}
      <div className="bg-stone-50 rounded-3xl p-6 sm:p-8 border border-stone-200 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        {/* Big Score */}
        <div className="text-center md:border-r md:border-stone-200 md:pr-6">
          <div className="text-5xl font-black text-stone-900 tracking-tight">
            {summary.averageRating > 0 ? summary.averageRating.toFixed(1) : '5.0'}
          </div>
          <div className="flex justify-center gap-1 my-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= Math.round(summary.averageRating || 5)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-stone-300'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-stone-500 font-bold">
            Based on {summary.totalReviews} review{summary.totalReviews === 1 ? '' : 's'}
          </p>
        </div>

        {/* Star Bars Breakdown */}
        <div className="md:col-span-2 space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = summary.ratingDistribution?.[star] || 0;
            const percentage = summary.totalReviews > 0 ? (count / summary.totalReviews) * 100 : (star === 5 ? 100 : 0);

            return (
              <div key={star} className="flex items-center gap-3 text-xs">
                <span className="font-bold text-stone-600 w-12 flex items-center gap-1">
                  {star} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                </span>
                <div className="flex-1 h-2 rounded-full bg-stone-200 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="font-mono text-stone-400 w-8 text-right text-[11px]">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review Submission / Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmitReview} className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-amber-300 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h3 className="font-black text-stone-900 text-base">
              {editingReviewId ? 'Edit Your Review' : `Review '${productName}'`}
            </h3>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingReviewId(null); }}
              className="text-stone-400 hover:text-stone-700 font-bold"
            >
              ✕
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Your Rating *</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRatingInput(star)}
                  className="p-1 text-stone-300 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= (hoverRating || ratingInput)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-stone-300'
                    }`}
                  />
                </button>
              ))}
              <span className="self-center font-black text-stone-800 text-xs ml-2">
                {ratingInput} of 5 Stars
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">Headline / Title (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Incredibly fresh and crunchy makhana!"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Your Review * <span className="text-stone-400 font-normal">(Tell others about taste, freshness, crunch)</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Share your honest feedback on flavour, texture, and packaging..."
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-stone-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Only verified purchasers who ordered this product can submit reviews.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingReviewId(null); }}
                className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition-colors disabled:opacity-50 shadow-md shadow-amber-500/20"
              >
                {submitting ? 'Submitting…' : editingReviewId ? 'Save Changes' : 'Submit Review'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
        ) : reviews.length === 0 ? (
          <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400 text-xs font-medium space-y-1">
            <MessageSquare className="w-8 h-8 mx-auto text-stone-300 mb-2" />
            <p className="font-bold text-stone-700">No reviews yet for {productName}</p>
            <p>Be the first verified customer to share your thoughts!</p>
          </div>
        ) : (
          reviews.map((rev) => {
            const isMyReview = user && (rev.user?._id === user._id || rev.user === user._id);

            return (
              <div key={rev._id} className="p-5 sm:p-6 rounded-2xl bg-white border border-stone-200 space-y-3 shadow-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${
                              s <= rev.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-stone-300'
                            }`}
                          />
                        ))}
                      </div>
                      {rev.title && <h4 className="font-black text-stone-900 text-sm">{rev.title}</h4>}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-400">
                      <span className="font-bold text-stone-700">{rev.userName || rev.user?.name || 'Snackora Customer'}</span>
                      {rev.isVerifiedPurchase && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Verified Purchase
                        </span>
                      )}
                      <span>• {new Date(rev.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {isMyReview && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(rev)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-stone-50"
                        title="Edit Review"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReview(rev._id)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-stone-50"
                        title="Delete Review"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-stone-600 font-medium leading-relaxed">
                  {rev.comment || rev.body}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProductReviewsSection;
