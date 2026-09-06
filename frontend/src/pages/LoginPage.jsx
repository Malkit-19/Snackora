import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { validateEmail, validatePassword } from '../utils/validators';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight,
  ShieldCheck, Building2, UserCheck, Sparkles, AlertCircle
} from 'lucide-react';

export const LoginPage = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = location.state?.from?.pathname || '/';

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }));
  };

  const validate = () => {
    const e = {};
    const emailErr = validateEmail(form.email);
    const pwErr = form.password ? null : 'Password is required.';
    if (emailErr) e.email = emailErr;
    if (pwErr) e.password = pwErr;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const data = await login(form.email.trim(), form.password);
      success(`Welcome back, ${data.user.name}!`);
      if (data.user.role === 'ADMIN') navigate('/admin');
      else navigate(redirectPath);
    } catch (err) {
      toastError(err.message || 'Invalid credentials. Please try again.');
      setErrors({ general: err.message || 'Invalid credentials.' });
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (email, password) => {
    setForm({ email, password });
    setErrors({});
  };

  // Demo accounts are ONLY available in local development — never shipped in production builds
  const isDev = import.meta.env.DEV;

  const demoAccounts = isDev ? [
    { label: 'Admin', email: 'snackora26@gmail.com', password: 'Tiklam@1902', icon: ShieldCheck, color: 'purple' },
    { label: 'Approved B2B', email: 'wholesaler@snackora.in', password: 'B2b@12345', icon: Building2, color: 'indigo' },
    { label: 'Pending B2B', email: 'pendingb2b@snackora.in', password: 'Pending@12345', icon: Building2, color: 'amber' },
    { label: 'Customer', email: 'customer@snackora.in', password: 'Customer@12345', icon: UserCheck, color: 'emerald' }
  ] : [];


  const colorMap = {
    purple: 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200',
    indigo: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200',
    amber: 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200',
    emerald: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
  };

  return (
    <div className="min-h-screen bg-[#FCFAF7] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Card */}
        <div className="bg-white border border-stone-200/90 rounded-3xl shadow-xl shadow-stone-200/60 p-8 sm:p-10 space-y-7">

          {/* Header */}
          <div className="text-center">
            <Link to="/" className="inline-flex items-center justify-center gap-2 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-amber-600/30">
                S
              </div>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Welcome back!
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Good to see you again.
            </p>
          </div>

          {/* Global Error Banner */}
          {errors.general && (
            <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{errors.general}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="you@snackora.in"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'login-email-error' : undefined}
                  className={`
                    w-full bg-stone-50 rounded-xl border pl-10 pr-4 py-2.5 text-sm
                    focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-colors
                    ${errors.email ? 'border-rose-400 bg-rose-50' : 'border-stone-300'}
                  `}
                />
              </div>
              {errors.email && (
                <p id="login-email-error" role="alert" className="text-xs text-rose-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'login-pw-error' : undefined}
                  className={`
                    w-full bg-stone-50 rounded-xl border pl-10 pr-11 py-2.5 text-sm
                    focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-colors
                    ${errors.password ? 'border-rose-400 bg-rose-50' : 'border-stone-300'}
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-2.5 text-stone-400 hover:text-stone-600 p-0.5 rounded transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p id="login-pw-error" role="alert" className="text-xs text-rose-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.password}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full flex items-center justify-center gap-2 py-3 px-6 rounded-2xl
                bg-amber-600 hover:bg-amber-700 text-white font-black text-sm
                shadow-md shadow-amber-600/30 transition-all
                disabled:opacity-60 disabled:cursor-not-allowed
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
              "
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing In…
                </>
              ) : (
                <>Sign In to Account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* OAuth Divider */}
          <div className="relative flex items-center gap-3 pt-1">
            <div className="flex-1 border-t border-stone-200" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 shrink-0">or continue with</span>
            <div className="flex-1 border-t border-stone-200" />
          </div>

          {/* OAuth Buttons — UI prepared, backend endpoint ready */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled
              aria-label="Continue with Google (coming soon)"
              className="
                flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-2xl
                bg-white border border-stone-200 text-stone-600 text-xs font-bold
                hover:bg-stone-50 transition-colors opacity-60 cursor-not-allowed
              "
            >
              {/* Google 'G' SVG */}
              <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>

            <button
              type="button"
              disabled
              aria-label="Continue with Apple (coming soon)"
              className="
                flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-2xl
                bg-stone-900 border border-stone-700 text-white text-xs font-bold
                hover:bg-stone-800 transition-colors opacity-60 cursor-not-allowed
              "
            >
              {/* Apple  SVG */}
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Apple
            </button>
          </div>
          <p className="text-xs text-center text-stone-400">1-click social sign-in coming soon.</p>

          {/* Demo Quick Fill */}
          <div className="pt-2 border-t border-stone-100">
            <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 text-center mb-2.5">
              Demo Credentials
            </p>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map(({ label, email, password, icon: Icon, color }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => quickFill(email, password)}
                  className={`flex items-center gap-1.5 p-2 rounded-xl border font-semibold text-xs transition-colors ${colorMap[color]}`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Register Links */}
        <div className="text-center space-y-2 text-xs text-stone-500 pb-4">
          <p>
            New here?{' '}
            <Link to="/register" className="font-bold text-amber-700 hover:underline">
              Create an Account
            </Link>
          </p>
          <p>
            Buying in bulk?{' '}
            <Link to="/register-b2b" className="font-bold text-indigo-700 hover:underline">
              Apply for Wholesale
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
