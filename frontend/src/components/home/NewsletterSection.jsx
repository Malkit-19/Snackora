import React, { useState } from 'react';
import { Mail, CheckCircle2, Send, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import newsletterApi from '../../api/newsletterApi';

export const NewsletterSection = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const { success, error } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      error('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await newsletterApi.subscribe(email.trim());
      setSubscribed(true);
      setEmail('');
      success(res.message || "You're all set! Thanks for subscribing.");
    } catch (err) {
      error(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14">
      <div className="relative rounded-3xl bg-amber-500/10 border border-amber-200/80 p-8 sm:p-12 text-center overflow-hidden">
        <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full bg-amber-600/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Stay in Touch</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Get snack updates.
          </h2>

          <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
            New products, special offers and tasty news delivered to your inbox.
          </p>

          {subscribed ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-center gap-2 text-sm font-semibold animate-in zoom-in-95">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>You're on the list! Keep an eye on your inbox.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto pt-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-stone-400 absolute left-4 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-white text-stone-900 text-sm rounded-xl border border-stone-300 pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                />
              </div>

              <Button
                type="submit"
                loading={loading}
                className="py-3 px-6 text-sm font-semibold shadow-md shadow-amber-600/20"
                rightIcon={Send}
              >
                Subscribe
              </Button>
            </form>
          )}

          <p className="text-[11px] text-stone-400 pt-1">
            No spam. Unsubscribe anytime with one click.
          </p>
        </div>
      </div>
    </section>
  );
};

export default NewsletterSection;
