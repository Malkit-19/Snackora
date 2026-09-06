import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  validateEmail, validatePhone, validatePassword, validateConfirmPassword
} from '../utils/validators';
import {
  User, Phone, Mail, Lock, Eye, EyeOff,
  ArrowRight, Building2, UserCheck, CheckCircle2, AlertCircle,
  Calendar, Gift, Sparkles, MessageSquare
} from 'lucide-react';

export const RegisterPage = () => {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    dob: '',
    whatsappOptIn: true,
    password: '',
    confirmPassword: '',
    role: 'CUSTOMER'
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required.';
    else if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters.';

    const phoneErr = validatePhone(form.phone);
    if (phoneErr) e.phone = phoneErr;

    const emailErr = validateEmail(form.email);
    if (emailErr) e.email = emailErr;

    if (form.dob) {
      const birthDate = new Date(form.dob);
      const today = new Date();
      if (isNaN(birthDate.getTime()) || birthDate > today) {
        e.dob = 'Please select a valid past date of birth.';
      }
    }

    const pwErr = validatePassword(form.password);
    if (pwErr) e.password = pwErr;

    const cpwErr = validateConfirmPassword(form.password, form.confirmPassword);
    if (cpwErr) e.confirmPassword = cpwErr;

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const data = await register({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        dob: form.dob || undefined,
        whatsappOptIn: form.whatsappOptIn,
        password: form.password,
        role: form.role
      });
      success(`Welcome to Snackora, ${data.user.name}! Your account is ready.`);
      navigate('/');
    } catch (err) {
      const msg = err.message || 'Registration failed. Please try again.';
      toastError(msg);
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };


  const roleOptions = [
    {
      id: 'CUSTOMER',
      label: 'Customer',
      description: 'Shop for snacks at retail prices',
      icon: UserCheck
    },
    {
      id: 'B2B_WHOLESALER',
      label: 'B2B Wholesaler',
      description: 'Bulk orders at wholesale margins',
      icon: Building2
    }
  ];

  const FieldError = ({ id, msg }) =>
    msg ? (
      <p id={id} role="alert" className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {msg}
      </p>
    ) : null;

  const fieldClass = (err) =>
    `w-full bg-stone-50 rounded-xl border pl-10 pr-4 py-2.5 text-sm
     focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-colors
     ${err ? 'border-rose-400 bg-rose-50' : 'border-stone-300'}`;

  return (
    <div className="min-h-screen bg-[#FCFAF7] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="bg-white border border-stone-200/90 rounded-3xl shadow-xl p-8 sm:p-10 space-y-6">

          {/* Header */}
          <div className="text-center">
            <Link to="/" className="inline-flex items-center justify-center mb-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-amber-600/30">
                S
              </div>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Create your account
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Join Snackora and start snacking.
            </p>
          </div>

          {/* Global error */}
          {errors.general && (
            <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{errors.general}</span>
            </div>
          )}

          {/* Role selector */}
          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-wider text-stone-500">
              I want to
            </p>
            <div className="grid grid-cols-2 gap-3">
              {roleOptions.map(({ id, label, description, icon: Icon }) => {
                const isActive = form.role === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => set('role', id)}
                    aria-pressed={isActive}
                    className={`
                      p-3 rounded-2xl border-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
                      ${isActive
                        ? id === 'CUSTOMER'
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-indigo-500 bg-indigo-50'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 mb-1.5 ${isActive ? (id === 'CUSTOMER' ? 'text-amber-600' : 'text-indigo-600') : 'text-stone-400'}`} />
                    <p className={`text-xs font-black ${isActive ? (id === 'CUSTOMER' ? 'text-amber-900' : 'text-indigo-900') : 'text-stone-700'}`}>
                      {label}
                    </p>
                    <p className="text-[10px] text-stone-400 mt-0.5 leading-tight">{description}</p>
                    {isActive && (
                      <CheckCircle2 className={`w-3.5 h-3.5 mt-1.5 ${id === 'CUSTOMER' ? 'text-amber-600' : 'text-indigo-600'}`} />
                    )}
                  </button>
                );
              })}
            </div>
            {form.role === 'B2B_WHOLESALER' && (
              <p className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-xl font-medium">
                Your account will be under review. Wholesale pricing is unlocked after admin verification.{' '}
                <Link to="/register-b2b" className="font-bold underline">
                  Apply via full B2B form →
                </Link>
              </p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="reg-name" className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1.5">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" aria-hidden="true" />
                <input
                  id="reg-name"
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Priya Sharma"
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'reg-name-error' : undefined}
                  className={fieldClass(errors.name)}
                />
              </div>
              <FieldError id="reg-name-error" msg={errors.name} />
            </div>

            {/* Mobile */}
            <div>
              <label htmlFor="reg-phone" className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1.5">
                Mobile Number *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" aria-hidden="true" />
                <input
                  id="reg-phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? 'reg-phone-error' : undefined}
                  className={fieldClass(errors.phone)}
                />
              </div>
              <FieldError id="reg-phone-error" msg={errors.phone} />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1.5">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" aria-hidden="true" />
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="you@example.com"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'reg-email-error' : undefined}
                  className={fieldClass(errors.email)}
                />
              </div>
              <FieldError id="reg-email-error" msg={errors.email} />
            </div>

            {/* Date of Birth (Birthday Perk) */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="reg-dob" className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-600" /> Date of Birth (Birthday Gift)
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  🎁 Free Cookies Perk
                </span>
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                Share your birthday to receive an exclusive <strong>FREE pack of Gourmet Cookies</strong> and secret discounts every year on your special day!
              </p>
              <input
                id="reg-dob"
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={form.dob}
                onChange={(e) => set('dob', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
              />
              <FieldError id="reg-dob-error" msg={errors.dob} />
            </div>

            {/* WhatsApp Updates Opt-in */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/70 cursor-pointer">
              <input
                type="checkbox"
                checked={form.whatsappOptIn}
                onChange={(e) => set('whatsappOptIn', e.target.checked)}
                className="mt-0.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-emerald-950 font-medium leading-tight">
                💬 <strong>Real-Time WhatsApp Alerts:</strong> Send my order tracking, dispatch updates, and birthday cookies vouchers directly to my WhatsApp number.
              </span>
            </label>


            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1.5">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" aria-hidden="true" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'reg-pw-error' : 'reg-pw-hint'}
                  className={`${fieldClass(errors.password)} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-2.5 text-stone-400 hover:text-stone-600 p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {!errors.password && (
                <p id="reg-pw-hint" className="text-[11px] text-stone-400 mt-1">
                  Min 8 chars • 1 uppercase • 1 number • 1 special character
                </p>
              )}
              <FieldError id="reg-pw-error" msg={errors.password} />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="reg-confirm" className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1.5">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" aria-hidden="true" />
                <input
                  id="reg-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(e) => set('confirmPassword', e.target.value)}
                  placeholder="Re-enter your password"
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? 'reg-cpw-error' : undefined}
                  className={`${fieldClass(errors.confirmPassword)} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  className="absolute right-3.5 top-2.5 text-stone-400 hover:text-stone-600 p-0.5"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.confirmPassword && form.password === form.confirmPassword && !errors.confirmPassword && (
                <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                </p>
              )}
              <FieldError id="reg-cpw-error" msg={errors.confirmPassword} />
            </div>

            {/* Terms notice */}
            <p className="text-[11px] text-stone-400 leading-relaxed">
              By creating an account, you agree to Snackora's{' '}
              <Link to="/terms" className="text-amber-700 hover:underline font-semibold">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-amber-700 hover:underline font-semibold">Privacy Policy</Link>.
            </p>

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
                  Creating Account…
                </>
              ) : (
                <>Create Account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>

        {/* Sign In Link */}
        <p className="text-center text-xs text-stone-500 pb-4">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-amber-700 hover:underline">
            Sign In →
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
