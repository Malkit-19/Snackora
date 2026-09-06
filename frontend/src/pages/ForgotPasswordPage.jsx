import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useToast } from '../context/ToastContext';
import { validateEmail } from '../utils/validators';
import {
  Mail,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Send,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Link2,
  Check
} from 'lucide-react';
import Button from '../components/ui/Button';

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { token: routeToken } = useParams();
  const [searchParams] = useSearchParams();
  const urlEmail = searchParams.get('email') || '';
  const urlToken = routeToken || searchParams.get('token') || '';

  // Steps: 'REQUEST_EMAIL' | 'VERIFY_CODE' | 'VERIFYING_LINK' | 'SET_NEW_PASSWORD' | 'LINK_EXPIRED' | 'SUCCESS'
  const [step, setStep] = useState(urlToken ? 'VERIFYING_LINK' : 'REQUEST_EMAIL');
  const [email, setEmail] = useState(urlEmail);
  const [emailError, setEmailError] = useState('');

  // Verification Data
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState(urlToken);
  const [verifiedMethod, setVerifiedMethod] = useState(''); // 'CODE' | 'LINK'
  const [verifyError, setVerifyError] = useState('');

  // Password Form States
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Async & Timers
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { success: toastSuccess, error: toastError } = useToast();

  // Handle countdown for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Auto-verify when user lands on page via Email 1-Click Link
  const verifyLinkToken = useCallback(async (tokenVal, emailVal) => {
    if (!tokenVal) {
      setStep('REQUEST_EMAIL');
      return;
    }
    setLoading(true);
    setStep('VERIFYING_LINK');
    try {
      const res = await authApi.verifyResetCode({
        email: emailVal ? emailVal.trim() : undefined,
        token: tokenVal.trim()
      });
      if (res?.success) {
        const verifiedEmail = res.data?.email || emailVal || '';
        setEmail(verifiedEmail);
        setToken(tokenVal.trim());
        setVerifiedMethod('LINK');
        setStep('SET_NEW_PASSWORD');
        toastSuccess('Reset link verified successfully! Please choose your new password.');
      } else {
        setStep('LINK_EXPIRED');
        setVerifyError(res?.message || 'This reset link has expired or is invalid.');
      }
    } catch (err) {
      setStep('LINK_EXPIRED');
      setVerifyError(err.message || 'This reset link has expired or has already been used.');
    } finally {
      setLoading(false);
    }
  }, [toastSuccess]);

  useEffect(() => {
    if (urlToken) {
      verifyLinkToken(urlToken, urlEmail);
    }
  }, [urlToken, urlEmail, verifyLinkToken]);

  // ── Step 1: Request OTP & Email Link ──────────────────────────────────────────
  const handleRequestEmail = async (e) => {
    e.preventDefault();
    const err = validateEmail(email);
    if (err) {
      setEmailError(err);
      return;
    }
    setEmailError('');
    setLoading(true);

    try {
      const res = await authApi.forgotPassword(email.trim());
      toastSuccess(res.message || 'Verification code and reset link sent to your email.');
      setStep('VERIFY_CODE');
      setResendCooldown(60);
    } catch (apiErr) {
      toastError(apiErr.message || 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Resend Code ───────────────────────────────────────────────────────
  const handleResendCode = async () => {
    if (resendCooldown > 0 || !email) return;
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email.trim());
      toastSuccess(res.message || 'A fresh 6-digit code has been sent to your email.');
      setResendCooldown(60);
    } catch (apiErr) {
      toastError(apiErr.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify 6-Digit Code ──────────────────────────────────────────────
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setVerifyError('');

    const cleanOtp = otp.trim().replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      setVerifyError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.verifyResetCode({
        email: email.trim(),
        otp: cleanOtp
      });

      if (res?.success) {
        setOtp(cleanOtp);
        setVerifiedMethod('CODE');
        setStep('SET_NEW_PASSWORD');
        toastSuccess('Code verified! You can now set your new password.');
      } else {
        setVerifyError(res?.message || 'Invalid verification code. Please check your email.');
      }
    } catch (apiErr) {
      setVerifyError(apiErr.message || 'Invalid or expired verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Save New Password & Replace in MongoDB ───────────────────────────
  const handleSaveNewPassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!password || password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        email: email.trim(),
        password: password.trim()
      };

      if (verifiedMethod === 'CODE' || otp) {
        payload.otp = otp.trim();
      }
      if (verifiedMethod === 'LINK' || token) {
        payload.token = token.trim();
      }

      const res = await authApi.resetPassword(payload);

      if (res?.success) {
        toastSuccess(res.message || 'Password successfully updated!');
        setStep('SUCCESS');
      } else {
        setPasswordError(res?.message || 'Failed to update password.');
      }
    } catch (apiErr) {
      setPasswordError(apiErr.message || 'Password update failed. Please request a new code.');
      toastError(apiErr.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 6) score += 25;
    if (password.length >= 8) score += 25;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 25;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 25;
    return score;
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-[#FCFAF7] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-stone-200/90 rounded-3xl shadow-xl shadow-stone-200/60 p-8 sm:p-10 space-y-7 transition-all">

          {/* ── STATE: VERIFYING LINK SPINNER ─────────────────────────────────── */}
          {step === 'VERIFYING_LINK' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center animate-pulse">
                <Link2 className="w-7 h-7 text-amber-600 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-stone-900">Verifying Reset Link...</h2>
              <p className="text-xs text-stone-500 font-normal">
                Please wait while we validate your secure 1-click password reset token.
              </p>
            </div>
          )}

          {/* ── STATE: LINK EXPIRED ERROR ─────────────────────────────────────── */}
          {step === 'LINK_EXPIRED' && (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-xs">
                <AlertCircle className="w-9 h-9" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Link Expired or Invalid</h2>
                <p className="text-xs sm:text-sm text-stone-500 font-normal mt-2 leading-relaxed">
                  {verifyError || 'This password reset link has expired or has already been used.'}
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <Button
                  fullWidth
                  size="md"
                  onClick={() => {
                    setStep('REQUEST_EMAIL');
                    setToken('');
                    setOtp('');
                  }}
                  className="font-semibold shadow-md shadow-amber-600/20"
                >
                  Request a Fresh Reset Link &rarr;
                </Button>
                <Link
                  to="/login"
                  className="text-xs font-semibold text-stone-500 hover:text-stone-800 flex items-center justify-center gap-1.5 py-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
              </div>
            </div>
          )}

          {/* ── STEP 1: REQUEST EMAIL ─────────────────────────────────────────── */}
          {step === 'REQUEST_EMAIL' && (
            <>
              <div className="text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4 shadow-xs">
                  <KeyRound className="w-7 h-7 text-amber-600" />
                </div>
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Forgot your password?</h1>
                <p className="text-xs sm:text-sm text-stone-500 font-normal mt-1 leading-relaxed">
                  No worries. Enter your email and we'll send you a link to get back in.
                </p>
              </div>

              <form onSubmit={handleRequestEmail} noValidate className="space-y-5">
                <div>
                  <label htmlFor="fp-email" className="text-xs font-semibold uppercase tracking-wider text-stone-600 block mb-1.5">
                    Registered Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      id="fp-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                      placeholder="e.g. name@domain.com"
                      aria-invalid={!!emailError}
                      className={`w-full bg-stone-50 border rounded-xl pl-10 pr-4 py-2.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-colors ${
                        emailError ? 'border-rose-400 bg-rose-50' : 'border-stone-300'
                      }`}
                    />
                  </div>
                  {emailError && (
                    <p role="alert" className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {emailError}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  loading={loading}
                  fullWidth
                  size="md"
                  className="py-3 font-semibold shadow-md shadow-amber-600/20"
                  rightIcon={Send}
                >
                  Send Verification Code & Link
                </Button>

                <div className="text-center pt-2">
                  <Link to="/login" className="text-xs font-semibold text-stone-500 hover:text-stone-800 flex items-center justify-center gap-1.5 transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                  </Link>
                </div>
              </form>
            </>
          )}

          {/* ── STEP 2: ENTER & VERIFY 6-DIGIT CODE ────────────────────────────── */}
          {step === 'VERIFY_CODE' && (
            <>
              <div className="text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4 shadow-xs">
                  <ShieldCheck className="w-7 h-7 text-amber-600" />
                </div>
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Enter 6-Digit Code</h1>
                <p className="text-xs sm:text-sm text-stone-500 font-normal mt-1.5 leading-relaxed">
                  We've sent a 6-digit verification code to <strong className="text-stone-900">{email}</strong>.
                </p>
              </div>

              <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl text-[12px] text-amber-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-amber-950">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  Two Easy Ways to Reset:
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-amber-900/90 text-[11px]">
                  <li>Enter the <strong>6-digit code</strong> below and click <strong>Verify Code</strong></li>
                  <li><strong>OR</strong> tap the <strong>1-Click Reset Link</strong> sent directly in your email</li>
                </ul>
              </div>

              <form onSubmit={handleVerifyCode} noValidate className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                      6-Digit Code *
                    </label>
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendCooldown > 0 || loading}
                      className="text-xs font-semibold text-amber-700 hover:underline disabled:text-stone-400 disabled:no-underline"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                    </button>
                  </div>

                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      required
                      value={otp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setOtp(val);
                        setVerifyError('');
                      }}
                      placeholder="123456"
                      className={`w-full bg-stone-50 border rounded-xl pl-10 pr-4 py-2.5 text-lg tracking-[8px] font-bold text-center focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-colors ${
                        verifyError ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-stone-300 text-stone-900'
                      }`}
                    />
                  </div>
                  {verifyError && (
                    <p role="alert" className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {verifyError}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  loading={loading}
                  fullWidth
                  size="md"
                  className="py-3 font-semibold shadow-md shadow-amber-600/20"
                  rightIcon={Check}
                >
                  Verify Code & Continue
                </Button>

                <div className="flex items-center justify-between pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('REQUEST_EMAIL');
                      setOtp('');
                      setVerifyError('');
                    }}
                    className="text-stone-500 hover:text-stone-800 font-medium flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Change email address
                  </button>
                  <Link to="/login" className="text-stone-500 hover:text-stone-800 font-medium">
                    Cancel
                  </Link>
                </div>
              </form>
            </>
          )}

          {/* ── STEP 3: UNIFIED SET NEW PASSWORD INTERFACE ─────────────────────── */}
          {/* (Identical interface for both Flow A - Code and Flow B - Email Link) */}
          {step === 'SET_NEW_PASSWORD' && (
            <>
              <div className="text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4 shadow-xs">
                  <Lock className="w-7 h-7 text-amber-600" />
                </div>
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Create New Password</h1>
                <p className="text-xs sm:text-sm text-stone-500 font-normal mt-1.5 leading-relaxed">
                  Enter and confirm your new password to update your Snackora account.
                </p>
              </div>

              {/* Verified Badge Banner */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold truncate max-w-[200px] sm:max-w-[240px]">{email}</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  {verifiedMethod === 'LINK' ? '✓ Link Verified' : '✓ Code Verified'}
                </span>
              </div>

              <form onSubmit={handleSaveNewPassword} noValidate className="space-y-4">
                {/* New Password */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-600 block mb-1.5">
                    New Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoFocus
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                      placeholder="Minimum 6 characters"
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-10 pr-10 py-2.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 p-0.5"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {password && (
                    <div className="mt-1.5 space-y-1">
                      <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            strength <= 25 ? 'bg-rose-500 w-1/4' :
                            strength <= 50 ? 'bg-amber-500 w-2/4' :
                            strength <= 75 ? 'bg-blue-500 w-3/4' : 'bg-emerald-500 w-full'
                          }`}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-stone-400 font-medium">
                        <span>Strength: {strength <= 25 ? 'Weak' : strength <= 50 ? 'Fair' : strength <= 75 ? 'Good' : 'Strong'}</span>
                        <span>Min 6 characters</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-600 block mb-1.5">
                    Confirm New Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                      placeholder="Re-enter your new password"
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-10 pr-10 py-2.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 p-0.5"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && password && (
                    <p className={`text-[11px] mt-1 font-medium flex items-center gap-1 ${password === confirmPassword ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {password === confirmPassword ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Passwords match
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5" /> Passwords do not match
                        </>
                      )}
                    </p>
                  )}
                </div>

                {passwordError && (
                  <p role="alert" className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {passwordError}
                  </p>
                )}

                <Button
                  type="submit"
                  loading={loading}
                  fullWidth
                  size="md"
                  className="py-3 font-semibold shadow-md shadow-amber-600/20 mt-2"
                  rightIcon={Sparkles}
                >
                  Save New Password & Log In
                </Button>
              </form>
            </>
          )}

          {/* ── STEP 4: SUCCESS CONFIRMATION ─────────────────────────────────── */}
          {step === 'SUCCESS' && (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Password Reset Complete!</h2>
                <p className="text-sm text-stone-500 font-normal mt-2 leading-relaxed">
                  Your new password has been saved. You can now sign in with your updated credentials.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  fullWidth
                  size="lg"
                  onClick={() => navigate('/login')}
                  className="font-semibold shadow-md shadow-amber-600/20"
                >
                  Proceed to Sign In &rarr;
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

