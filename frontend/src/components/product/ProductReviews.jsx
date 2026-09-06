import React, { useState } from 'react';
import { User, ThumbsUp, MoreHorizontal, Star } from 'lucide-react';
import { RatingStars } from './RatingStars';
import { EmptyState } from '../ui/EmptyState';

/**
 * Customer reviews section for product detail page.
 * Accepts pre-fetched reviews data; ready for API integration.
 */
export const ProductReviews = ({
  productId,
  ratingsAverage = 0,
  ratingsCount = 0,
  reviews = []   // Array from backend /api/v1/products/:id/reviews (prepared for integration)
}) => {
  const [userRating, setUserRating] = useState(0);
  const [reviewBody, setReviewBody] = useState('');

  // Rating distribution mock until real reviews API is connected
  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => Math.round(r.rating) === star).length;
    const total = reviews.length || 1;
    return { star, count, pct: Math.round((count / total) * 100) };
  });

  return (
    <div className="space-y-8">
      {/* Rating Summary Header */}
      <div className="flex flex-col sm:flex-row gap-8 p-6 bg-stone-50 rounded-3xl border border-stone-200">
        {/* Average score */}
        <div className="text-center shrink-0">
          <p className="text-6xl font-black text-stone-900">{ratingsAverage.toFixed(1)}</p>
          <RatingStars rating={ratingsAverage} size="sm" />
          <p className="text-xs text-stone-400 mt-1 font-medium">
            Based on {ratingsCount} {ratingsCount === 1 ? 'review' : 'reviews'}
          </p>
        </div>

        {/* Breakdown bars */}
        <div className="flex-1 space-y-2">
          {ratingBreakdown.map(({ star, count, pct }) => (
            <div key={star} className="flex items-center gap-3">
              <span className="text-xs font-bold text-stone-500 w-3 shrink-0">{star}</span>
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
              <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-stone-400 w-6 shrink-0">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-5">
        {reviews.length === 0 ? (
          <EmptyState
            title="No reviews yet"
            description="Be the first to share your honest experience with this product."
            actionText={null}
          />
        ) : (
          reviews.map((review) => (
            <div
              key={review._id}
              className="p-5 bg-white rounded-2xl border border-stone-200 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 font-black text-sm flex items-center justify-center shrink-0">
                    {review.user?.name?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900">
                      {review.user?.name || 'Verified Buyer'}
                    </p>
                    <p className="text-[11px] text-stone-400">
                      {new Date(review.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <RatingStars rating={review.rating} size="xs" />
              </div>

              {review.title && (
                <p className="text-sm font-bold text-stone-800">{review.title}</p>
              )}
              <p className="text-sm text-stone-600 leading-relaxed">{review.body}</p>

              {review.helpfulCount > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] text-stone-400 pt-1">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{review.helpfulCount} people found this helpful</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Write a Review Form */}
      <div className="p-6 bg-amber-50/60 border border-amber-200 rounded-3xl space-y-4">
        <h4 className="text-sm font-black text-stone-900">Write a Review</h4>
        <div>
          <label className="text-xs font-bold text-stone-500 block mb-1.5">
            Your Rating
          </label>
          <RatingStars
            rating={userRating}
            interactive
            onRate={setUserRating}
            size="md"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-stone-500 block mb-1.5">
            Your Experience
          </label>
          <textarea
            value={reviewBody}
            onChange={(e) => setReviewBody(e.target.value)}
            rows={3}
            placeholder="Share what you liked, the texture, flavour, or packaging…"
            aria-label="Review body"
            className="w-full bg-white text-stone-900 text-sm rounded-xl border border-stone-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          />
        </div>
        <button
          type="button"
          disabled={!userRating || !reviewBody.trim()}
          className="px-6 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          Submit Review
        </button>
        <p className="text-[11px] text-stone-400">
          Reviews are published after moderation. Only verified purchasers may review.
        </p>
      </div>
    </div>
  );
};

export default ProductReviews;
