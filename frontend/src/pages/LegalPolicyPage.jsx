import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, FileText, RefreshCw, Truck, ArrowLeft, Building2 } from 'lucide-react';
import SEO from '../components/common/SEO';

export const LegalPolicyPage = ({ defaultTab = 'terms' }) => {
  const location = useLocation();
  const pathTab = location.pathname.includes('privacy')
    ? 'privacy'
    : location.pathname.includes('refund')
      ? 'refund'
      : location.pathname.includes('shipping')
        ? 'shipping'
        : defaultTab;

  const [activeTab, setActiveTab] = useState(pathTab);

  const tabs = [
    { id: 'terms', label: 'Terms of Service', icon: FileText },
    { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck },
    { id: 'refund', label: 'Refund & Returns', icon: RefreshCw },
    { id: 'shipping', label: 'Shipping & Delivery', icon: Truck }
  ];

  return (
    <div className="min-h-screen bg-[#FCFAF7] py-10 px-4 sm:px-6 lg:px-8">
      <SEO
        title={`${tabs.find((t) => t.id === activeTab)?.label || 'Legal Policies'} — Snackora`}
        description="Official Snackora terms of service, customer privacy commitment, return and refund guidelines, and shipping terms."
      />

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-3 text-center sm:text-left">
          <Link
            to="/"
            className="inline-flex items-center text-xs font-semibold text-stone-500 hover:text-amber-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Home
          </Link>
          <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
            Policies & Legal Information
          </h1>
          <p className="text-sm text-stone-500">
            Clear, transparent guidelines for our valued customers and wholesale partners.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-stone-100/80 rounded-2xl border border-stone-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-white text-stone-900 shadow-sm border border-stone-200/80'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-600' : 'text-stone-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Policy Content Body */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-stone-200/80 shadow-xs space-y-8 text-stone-700 text-sm leading-relaxed">
          {activeTab === 'terms' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-stone-900 mb-2">1. Acceptance of Terms</h2>
                <p>
                  By accessing or purchasing through Snackora (www.snackora.in), you agree to be bound by these Terms of Service. All orders are subject to product availability and confirmed store pricing.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-stone-900 mb-2">2. Retail & B2B Wholesale Pricing</h2>
                <p>
                  Snackora offers special wholesale pricing and Minimum Order Quantities (MOQ) for approved B2B business partners. Orders will be processed at the verified active rates shown in your account at checkout.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-stone-900 mb-2">3. Product Quality & Packaging</h2>
                <p>
                  All our handcrafted snacks (Roasted Makhana, Pure Butter Cookies, Gourmet Chips, Amul Essentials) are nitrogen-flushed and batch-tested for maximum freshness.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-stone-900 mb-2">1. Data Privacy Commitment</h2>
                <p>
                  We collect customer names, delivery addresses, phone numbers, and emails strictly to fulfill snack orders and provide order status notifications. We never sell or rent your personal information to third parties.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-stone-900 mb-2">2. Payment Security</h2>
                <p>
                  Snackora does not store customer debit/credit card numbers or UPI PINs. Online payments are processed through Razorpay's PCI-DSS Level 1 compliant gateway with encrypted TLS 1.3 tunnels.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'refund' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-stone-900 mb-2">1. Refund & Replacement Eligibility</h2>
                <p>
                  If you receive damaged, missing, or incorrect products, you can request a return or refund within 48 hours of delivery directly through your Account Dashboard under "My Orders".
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-stone-900 mb-2">2. Refund Timeline</h2>
                <p>
                  Approved online refunds are initiated through Razorpay to your original payment method within 3–5 business days. For COD orders, refund is issued via bank transfer / UPI upon return validation.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-stone-900 mb-2">1. Delivery Timeline & Logistics</h2>
                <p>
                  Standard domestic orders are dispatched within 24 hours from our Mumbai fulfillment center. Metro delivery arrives within 2–3 business days; other locations within 4–6 business days.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-stone-900 mb-2">2. Live Courier Tracking</h2>
                <p>
                  Once dispatched, you will receive an automated tracking link and AWB number to monitor your order through the 6-stage delivery timeline.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LegalPolicyPage;
