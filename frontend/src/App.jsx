import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';

// Layout — eagerly loaded (on every page, no benefit from lazy)
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import B2BStatusBanner from './components/layout/B2BStatusBanner';

// Guards — eagerly loaded
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleRoute from './components/auth/RoleRoute';

// ── Route-level Code Splitting ────────────────────────────────────────────────
// Each page becomes a separate JS chunk, loaded only when the user navigates there.
const HomePage           = lazy(() => import('./pages/HomePage'));
const ShopPage           = lazy(() => import('./pages/ShopPage'));
const ProductDetailPage  = lazy(() => import('./pages/ProductDetailPage'));
const LoginPage          = lazy(() => import('./pages/LoginPage'));
const RegisterPage       = lazy(() => import('./pages/RegisterPage'));
const B2BRegisterPage    = lazy(() => import('./pages/B2BRegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const CartPage           = lazy(() => import('./pages/CartPage'));
const WishlistPage       = lazy(() => import('./pages/WishlistPage'));
const CheckoutPage       = lazy(() => import('./pages/CheckoutPage'));
const OrderDetailPage    = lazy(() => import('./pages/OrderDetailPage'));
const DashboardPage      = lazy(() => import('./pages/DashboardPage'));
const AdminPage          = lazy(() => import('./pages/AdminPage'));
const LegalPolicyPage    = lazy(() => import('./pages/LegalPolicyPage'));
const UnauthorizedPage   = lazy(() => import('./pages/UnauthorizedPage'));
const NotFoundPage       = lazy(() => import('./pages/NotFoundPage'));
const DesignSystemPage   = lazy(() => import('./pages/DesignSystemPage'));



/**
 * Minimal route loading skeleton.
 * Keeps Navbar/Footer visible so the shell never goes blank during chunk load.
 */
function PageLoader() {
  return (
    <div
      className="flex items-center justify-center min-h-[60vh]"
      role="status"
      aria-label="Loading page"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-stone-500 font-medium">Loading…</span>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <div className="min-h-screen flex flex-col bg-[#FCFAF7] text-stone-900 font-sans">
                <Navbar />
                <B2BStatusBanner />
                <main className="flex-1">
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Public Routes */}
                      <Route path="/"                 element={<HomePage />} />
                      <Route path="/shop"              element={<ShopPage />} />
                      <Route path="/products"          element={<ShopPage />} />
                      <Route path="/products/:slug"    element={<ProductDetailPage />} />
                      <Route path="/shop/:slug"        element={<ProductDetailPage />} />
                      <Route path="/login"             element={<LoginPage />} />
                      <Route path="/register"          element={<RegisterPage />} />
                      <Route path="/register-b2b"      element={<B2BRegisterPage />} />
                      <Route path="/b2b"               element={<B2BRegisterPage />} />
                      <Route path="/forgot-password"        element={<ForgotPasswordPage />} />
                      <Route path="/forgot-password/:token" element={<ForgotPasswordPage />} />
                      <Route path="/reset-password"         element={<ForgotPasswordPage />} />
                      <Route path="/reset-password/:token"  element={<ForgotPasswordPage />} />
                      <Route path="/cart"              element={<CartPage />} />
                      <Route path="/wishlist"          element={<WishlistPage />} />


                      {/* Policy & Legal Routes */}
                      <Route path="/terms"             element={<LegalPolicyPage defaultTab="terms" />} />
                      <Route path="/privacy"           element={<LegalPolicyPage defaultTab="privacy" />} />
                      <Route path="/refund-policy"     element={<LegalPolicyPage defaultTab="refund" />} />
                      <Route path="/shipping-policy"   element={<LegalPolicyPage defaultTab="shipping" />} />

                      {/* Authenticated: Checkout */}
                      <Route
                        path="/checkout"
                        element={
                          <ProtectedRoute>
                            <CheckoutPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Authenticated: Order Detail */}
                      <Route
                        path="/orders/:id"
                        element={
                          <ProtectedRoute>
                            <OrderDetailPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Authenticated: User Dashboard & Aliases */}
                      <Route
                        path="/dashboard"
                        element={
                          <ProtectedRoute>
                            <DashboardPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="/orders"    element={<Navigate to="/dashboard" replace />} />
                      <Route path="/my-orders" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/account"   element={<Navigate to="/dashboard" replace />} />
                      <Route path="/profile"   element={<Navigate to="/dashboard" replace />} />


                      {/* Admin Only */}
                      <Route
                        path="/admin"
                        element={
                          <RoleRoute allowedRoles={['ADMIN']}>
                            <AdminPage />
                          </RoleRoute>
                        }
                      />

                      <Route path="/unauthorized"  element={<UnauthorizedPage />} />
                      <Route path="/design-system" element={<DesignSystemPage />} />
                      <Route path="*"              element={<NotFoundPage />} />

                    </Routes>
                  </Suspense>
                </main>
                <Footer />
              </div>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
