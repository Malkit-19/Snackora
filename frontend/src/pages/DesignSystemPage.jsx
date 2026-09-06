import React, { useState } from 'react';
import {
  Button,
  Input,
  Select,
  Modal,
  Toast,
  Badge,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Spinner,
  Skeleton,
  Dropdown,
  Pagination,
  EmptyState,
  ErrorState
} from '../components/ui';

import {
  PriceDisplay,
  QuantitySelector,
  RatingStars,
  WishlistButton,
  AddToCartButton,
  ProductCard,
  ProductGrid
} from '../components/product';

import {
  Sparkles,
  ShoppingBag,
  Mail,
  Lock,
  Search,
  Building2,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Eye,
  Sliders,
  Smartphone,
  Tablet,
  Monitor,
  Heart
} from 'lucide-react';

export const DesignSystemPage = () => {
  // Test states for interactive controls
  const [activeTab, setActiveTab] = useState('ui');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSize, setModalSize] = useState('md');
  const [toasts, setToasts] = useState([]);
  const [isWholesale, setIsWholesale] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [testQty, setTestQty] = useState(1);
  const [testB2bQty, setTestB2bQty] = useState(25);
  const [interactiveRating, setInteractiveRating] = useState(4);
  const [wishlistActive, setWishlistActive] = useState(false);
  const [previewWidth, setPreviewWidth] = useState('100%');

  // Input states
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const [selectValue, setSelectValue] = useState('');

  // Sample products for ProductCard & ProductGrid test
  const sampleProducts = [
    {
      _id: 'p1',
      name: 'Snackora Classic Golden Butter Cookies',
      slug: 'classic-butter-cookies',
      category: { name: 'Cookies' },
      unit: '150g pack',
      retailPrice: 149,
      retailDiscountPrice: 129,
      wholesalePrice: 89,
      b2bMoq: 24,
      stock: 45,
      isFeatured: true,
      description: 'Slow-baked golden butter cookies with a melt-in-mouth texture and pure cream aroma.',
      ratings: { average: 4.8, count: 42 },
      images: [{ url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=600&q=80' }]
    },
    {
      _id: 'p2',
      name: 'Snackora Fiery Peri Peri Roasted Makhana',
      slug: 'peri-peri-makhana',
      category: { name: 'Makhana' },
      unit: '80g pouch',
      retailPrice: 175,
      wholesalePrice: 105,
      b2bMoq: 25,
      stock: 8, // Low stock test
      isFeatured: true,
      description: 'Crispy popped lotus seeds dusted with bold peri-peri chili, garlic, and sea salt.',
      ratings: { average: 4.9, count: 112 },
      images: [{ url: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=600&q=80' }]
    },
    {
      _id: 'p3',
      name: 'Amul Pasteurized Table Butter',
      slug: 'amul-pasteurized-butter-500g',
      category: { name: 'Dairy' },
      unit: '500g block',
      retailPrice: 275,
      wholesalePrice: 235,
      b2bMoq: 10,
      stock: 0, // Out of stock test
      isFeatured: false,
      description: 'Pure salted dairy butter made from fresh pasteurized cream.',
      ratings: { average: 5.0, count: 210 },
      images: [{ url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=600&q=80' }]
    },
    {
      _id: 'p4',
      name: 'Snackora 20g Whey Protein Bar - Choco Peanut',
      slug: 'protein-bar-choco-peanut',
      category: { name: 'Protein' },
      unit: '60g bar',
      retailPrice: 120,
      wholesalePrice: 72,
      b2bMoq: 30,
      stock: 120,
      isFeatured: true,
      description: 'Clean workout fuel loaded with roasted peanuts, whey isolate, and dark chocolate.',
      ratings: { average: 4.7, count: 85 },
      images: [{ url: 'https://images.unsplash.com/photo-1622484216850-8b17b2b73bc3?auto=format&fit=crop&w=600&q=80' }]
    }
  ];

  const triggerToast = (variant) => {
    const id = Date.now();
    const titles = {
      success: 'Order Placed Successfully',
      error: 'Invalid Coupon Code',
      warning: 'B2B MOQ Requirement',
      info: 'Product Added to Wishlist'
    };
    const messages = {
      success: 'Your order #SNK-9901 has been confirmed and scheduled for packing.',
      error: 'The coupon code "SUMMER50" has expired or is invalid for this cart.',
      warning: 'Wholesale pricing requires a minimum purchase of 24 units for this item.',
      info: 'Saved Snackora Golden Butter Cookies to your personal wishlist.'
    };

    setToasts((prev) => [
      ...prev,
      { id, variant, title: titles[variant], message: messages[variant] }
    ]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#FCFAF7] py-10 px-4 sm:px-6 lg:px-8 space-y-10">
      {/* Header Banner */}
      <div className="max-w-7xl mx-auto bg-stone-900 text-white p-8 sm:p-10 rounded-3xl shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Snackora Design System — Module 2
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              Component & Product Design Library
            </h1>
            <p className="text-sm text-stone-300 mt-1 max-w-xl">
              "Your Everyday Cravings, Delivered." Complete accessible, responsive UI primitives and food-commerce product components.
            </p>
          </div>

          {/* Quick Wholesale Toggle */}
          <div className="bg-stone-800/80 border border-stone-700 p-4 rounded-2xl shrink-0 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Pricing Persona Simulation
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={!isWholesale ? 'primary' : 'secondary'}
                onClick={() => setIsWholesale(false)}
              >
                Retail Customer
              </Button>
              <Button
                size="sm"
                variant={isWholesale ? 'b2b' : 'secondary'}
                onClick={() => setIsWholesale(true)}
              >
                <Building2 className="w-3.5 h-3.5 mr-1" />
                Approved B2B
              </Button>
            </div>
          </div>
        </div>

        {/* Responsive Width Selector */}
        <div className="mt-8 pt-6 border-t border-stone-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-stone-400 font-semibold">
            <span>Test Responsive Breakpoints:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: '320px (Compact Mobile)', width: '320px', icon: Smartphone },
              { label: '375px (Mobile)', width: '375px', icon: Smartphone },
              { label: '425px (Large Mobile)', width: '425px', icon: Smartphone },
              { label: '768px (Tablet)', width: '768px', icon: Tablet },
              { label: '1024px (Laptop)', width: '1024px', icon: Monitor },
              { label: '1440px (Desktop Wide)', width: '100%', icon: Monitor }
            ].map((bp) => {
              const Icon = bp.icon;
              return (
                <button
                  key={bp.label}
                  type="button"
                  onClick={() => setPreviewWidth(bp.width)}
                  className={`
                    px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all
                    ${previewWidth === bp.width
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }
                  `}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{bp.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="max-w-7xl mx-auto flex items-center gap-2 border-b border-stone-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('ui')}
          className={`
            px-4 py-2 rounded-xl text-sm font-bold transition-all
            ${activeTab === 'ui'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-stone-600 hover:bg-stone-100'
            }
          `}
        >
          1. Core UI Primitives
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('product')}
          className={`
            px-4 py-2 rounded-xl text-sm font-bold transition-all
            ${activeTab === 'product'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-stone-600 hover:bg-stone-100'
            }
          `}
        >
          2. Product Design Components
        </button>
      </div>

      {/* Container with dynamic width for viewport simulation */}
      <div
        className="mx-auto transition-all duration-300"
        style={{ maxWidth: previewWidth === '100%' ? '80rem' : previewWidth }}
      >
        {activeTab === 'ui' && (
          <div className="space-y-12">
            {/* 1. Buttons */}
            <section className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="pb-4 border-b border-stone-100">
                <h2 className="text-xl font-black text-stone-900">Button Component</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Variants: Primary, Secondary, Outline, Ghost, Danger, B2B. Sizes: SM, MD, LG.
                </p>
              </div>

              {/* Variants */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block">
                  Theme Variants
                </span>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary">Primary Amber</Button>
                  <Button variant="secondary">Secondary Stone</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger Rose</Button>
                  <Button variant="b2b">B2B Wholesale</Button>
                </div>
              </div>

              {/* Sizes */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block">
                  Sizes & Icons
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm" leftIcon={Sparkles}>Small (sm)</Button>
                  <Button size="md" leftIcon={ShoppingBag}>Medium (md)</Button>
                  <Button size="lg" rightIcon={CheckCircle2}>Large (lg)</Button>
                </div>
              </div>

              {/* States */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block">
                  Interactive States
                </span>
                <div className="flex flex-wrap gap-3">
                  <Button loading>Loading...</Button>
                  <Button disabled>Disabled</Button>
                  <Button variant="b2b" loading>Processing B2B...</Button>
                  <Button variant="danger" disabled>Unavailable</Button>
                </div>
              </div>
            </section>

            {/* 2. Inputs & Selects */}
            <section className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="pb-4 border-b border-stone-100">
                <h2 className="text-xl font-black text-stone-900">Input & Select Components</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Accessible form controls with proper ARIA labeling, helper texts, and validation errors.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <Input
                  label="Standard Text Input"
                  placeholder="e.g. Snackora Makhana"
                  helperText="Search for products or brands"
                  leftIcon={Search}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />

                <Input
                  label="Input with Validation Error"
                  type="email"
                  value="invalid-email-address"
                  error="Please provide a valid business email address"
                  leftIcon={Mail}
                  onChange={() => {}}
                />

                <Input
                  label="Disabled Input"
                  value="Read-only System Key"
                  disabled
                  leftIcon={Lock}
                  onChange={() => {}}
                />

                <Select
                  label="Category Select"
                  placeholder="Select a category"
                  value={selectValue}
                  onChange={(e) => setSelectValue(e.target.value)}
                  options={[
                    { value: 'cookies', label: 'Artisanal Cookies' },
                    { value: 'protein', label: 'Protein Bars & Bites' },
                    { value: 'dairy', label: 'Amul Dairy Essentials' },
                    { value: 'makhana', label: 'Roasted Gourmet Makhana' }
                  ]}
                  helperText="Filter catalog by product type"
                />

                <Select
                  label="Select with Validation Error"
                  error="Business entity type is required for B2B registration"
                  options={[
                    { value: 'retailer', label: 'Supermarket' }
                  ]}
                />

                <Select
                  label="Disabled Select"
                  disabled
                  options={[
                    { value: 'none', label: 'Not Available' }
                  ]}
                />
              </div>
            </section>

            {/* 3. Modal Dialog */}
            <section className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-4 shadow-sm">
              <div className="pb-4 border-b border-stone-100">
                <h2 className="text-xl font-black text-stone-900">Modal Component</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Accessible dialog with backdrop blur, keyboard trap, and Esc key dismissal.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => { setModalSize('sm'); setModalOpen(true); }}>
                  Open Small Modal
                </Button>
                <Button variant="secondary" onClick={() => { setModalSize('md'); setModalOpen(true); }}>
                  Open Medium Modal
                </Button>
                <Button variant="outline" onClick={() => { setModalSize('lg'); setModalOpen(true); }}>
                  Open Large Modal
                </Button>
              </div>

              <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                size={modalSize}
                title="B2B Wholesale Policy & Terms"
                description="Guidelines for minimum order quantities and GST tax invoicing"
                footer={
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="b2b" size="sm" onClick={() => setModalOpen(false)}>
                      Accept Terms
                    </Button>
                  </>
                }
              >
                <div className="space-y-3 text-sm text-stone-600">
                  <p>
                    All wholesale orders require adherence to individual product Minimum Order Quantities (MOQ).
                  </p>
                  <p>
                    Deliveries are scheduled with temperature-controlled logistics for Amul Dairy products and shock-proof cartons for Makhana & Cookies.
                  </p>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                    Tip: Press <strong>Escape</strong> or click outside to dismiss this dialog.
                  </div>
                </div>
              </Modal>
            </section>

            {/* 4. Toasts & Alerts */}
            <section className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="pb-4 border-b border-stone-100">
                <h2 className="text-xl font-black text-stone-900">Toast Component</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Non-intrusive alert toasts with auto-dismiss and screen-reader accessibility.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button variant="primary" size="sm" onClick={() => triggerToast('success')}>
                  Trigger Success Toast
                </Button>
                <Button variant="danger" size="sm" onClick={() => triggerToast('error')}>
                  Trigger Error Toast
                </Button>
                <Button variant="secondary" size="sm" onClick={() => triggerToast('warning')}>
                  Trigger Warning Toast
                </Button>
                <Button variant="outline" size="sm" onClick={() => triggerToast('info')}>
                  Trigger Info Toast
                </Button>
              </div>

              {/* Toast Render Stack */}
              <div className="space-y-3 pt-4 border-t border-stone-100">
                <p className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Active Toast Previews ({toasts.length})
                </p>
                {toasts.length === 0 ? (
                  <p className="text-xs text-stone-400 italic">Click buttons above to trigger toasts</p>
                ) : (
                  <div className="space-y-2">
                    {toasts.map((t) => (
                      <Toast
                        key={t.id}
                        id={t.id}
                        variant={t.variant}
                        title={t.title}
                        message={t.message}
                        onClose={removeToast}
                        duration={0} // Keep open for preview
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* 5. Badges, Cards, Dropdown, Pagination */}
            <section className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="pb-4 border-b border-stone-100">
                <h2 className="text-xl font-black text-stone-900">Badges, Cards & Navigation</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Semantic tags, modular cards, dropdown menus, and pagination controls.
                </p>
              </div>

              {/* Badges */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block">
                  Badge Variants
                </span>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">Default Stone</Badge>
                  <Badge variant="primary" dot>Primary Amber</Badge>
                  <Badge variant="success" dot>In Stock</Badge>
                  <Badge variant="warning" dot>Low Stock (8 left)</Badge>
                  <Badge variant="danger">Out of Stock</Badge>
                  <Badge variant="b2b" dot>Wholesale Partner</Badge>
                  <Badge variant="admin">Super Admin</Badge>
                </div>
              </div>

              {/* Compound Card */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block">
                  Compound Card Component
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card hoverable>
                    <CardHeader>
                      <h4 className="font-black text-stone-900">Standard Card with Header</h4>
                    </CardHeader>
                    <CardBody>
                      Clean white surface with subtle borders, perfect for product specs and business metrics.
                    </CardBody>
                    <CardFooter>
                      <span className="text-xs text-stone-400">Card Footer Action Area</span>
                    </CardFooter>
                  </Card>

                  {/* Dropdown in Card */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-stone-900">Dropdown Menu</h4>
                        <Dropdown
                          trigger={
                            <Button size="sm" variant="secondary">
                              Actions <Sliders className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          }
                          items={[
                            { label: 'View Profile', icon: Eye, onClick: () => {} },
                            { label: 'Refresh Cache', icon: RefreshCw, onClick: () => {} },
                            { divider: true },
                            { label: 'Delete Account', icon: Trash2, danger: true, onClick: () => {} }
                          ]}
                        />
                      </div>
                    </CardHeader>
                    <CardBody>
                      Click the "Actions" button above to test the accessible popover dropdown.
                    </CardBody>
                  </Card>
                </div>
              </div>

              {/* Pagination */}
              <div className="space-y-3 pt-4 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                    Pagination Component
                  </span>
                  <span className="text-xs font-semibold text-stone-500">
                    Active Page: {currentPage} of 10
                  </span>
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={10}
                  onPageChange={setCurrentPage}
                />
              </div>
            </section>

            {/* 6. Spinners & Skeletons */}
            <section className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="pb-4 border-b border-stone-100">
                <h2 className="text-xl font-black text-stone-900">Spinners & Skeletons</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Loading indicators and pulse placeholder skeletons.
                </p>
              </div>

              {/* Spinners */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block">
                  SVG Spinners
                </span>
                <div className="flex items-center gap-6">
                  <Spinner size="xs" />
                  <Spinner size="sm" />
                  <Spinner size="md" />
                  <Spinner size="lg" />
                  <Spinner size="xl" variant="b2b" />
                </div>
              </div>

              {/* Skeletons */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block">
                  Skeleton Placeholders
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <p className="text-xs text-stone-400">Text Lines</p>
                    <Skeleton variant="text" lines={3} />
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs text-stone-400">Circular Avatars</p>
                    <div className="flex gap-3">
                      <Skeleton variant="circular" width="48px" height="48px" />
                      <Skeleton variant="circular" width="40px" height="40px" />
                      <Skeleton variant="circular" width="32px" height="32px" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs text-stone-400">Product Card Skeleton</p>
                    <Skeleton variant="card" />
                  </div>
                </div>
              </div>
            </section>

            {/* 7. Empty & Error States */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <EmptyState
                title="Your Cart is Empty"
                description="Explore our roasted makhana, buttery cookies, and dairy staples to add your first craving."
                actionText="Explore Snacks"
                onAction={() => {}}
              />

              <ErrorState
                title="Could Not Connect to Catalog"
                message="Unable to reach the Snackora API service. Please verify your connection."
                retryText="Retry Connection"
                onRetry={() => {}}
              />
            </section>
          </div>
        )}

        {activeTab === 'product' && (
          <div className="space-y-12">
            {/* 1. PriceDisplay & Ratings & Quantities in isolation */}
            <section className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="pb-4 border-b border-stone-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-stone-900">
                    Product Micro-Components
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    PriceDisplay, RatingStars, QuantitySelector, WishlistButton, AddToCartButton.
                  </p>
                </div>
                <Badge variant={isWholesale ? 'b2b' : 'primary'}>
                  {isWholesale ? 'B2B Mode Active' : 'Retail Mode Active'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Price Display */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block">
                    PriceDisplay
                  </span>
                  <PriceDisplay
                    retailPrice={175}
                    retailDiscountPrice={149}
                    wholesalePrice={105}
                    b2bMoq={25}
                    isWholesale={isWholesale}
                    size="md"
                  />
                </div>

                {/* Rating Stars */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block">
                    RatingStars (Interactive)
                  </span>
                  <RatingStars
                    rating={interactiveRating}
                    count={142}
                    interactive
                    onChange={setInteractiveRating}
                  />
                  <p className="text-[11px] text-stone-400">Click stars to rate</p>
                </div>

                {/* Quantity Selector */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block">
                    QuantitySelector {isWholesale ? '(MOQ: 24)' : '(Retail: 1)'}
                  </span>
                  <QuantitySelector
                    value={isWholesale ? testB2bQty : testQty}
                    onChange={isWholesale ? setTestB2bQty : setTestQty}
                    min={isWholesale ? 24 : 1}
                    max={100}
                    b2bMoq={isWholesale ? 24 : undefined}
                    isWholesale={isWholesale}
                  />
                </div>

                {/* Wishlist & Cart Actions */}
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block">
                    Wishlist & Cart Buttons
                  </span>
                  <div className="flex items-center gap-3">
                    <WishlistButton
                      isWishlisted={wishlistActive}
                      onToggle={() => setWishlistActive(!wishlistActive)}
                    />
                    <AddToCartButton
                      product={sampleProducts[0]}
                      isWholesale={isWholesale}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Single ProductCard Showcase */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-stone-900">
                    ProductCard Component
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Demonstrating stock states: Normal stock, Low stock alert, and Out of stock.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <ProductCard
                  product={sampleProducts[0]}
                  isWholesale={isWholesale}
                  isWishlisted={wishlistActive}
                  onToggleWishlist={() => setWishlistActive(!wishlistActive)}
                  showQuantitySelector
                />
                <ProductCard
                  product={sampleProducts[1]}
                  isWholesale={isWholesale}
                  showQuantitySelector
                />
                <ProductCard
                  product={sampleProducts[2]}
                  isWholesale={isWholesale}
                  showQuantitySelector
                />
              </div>
            </section>

            {/* 3. Responsive ProductGrid Showcase */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-stone-900">
                    Responsive ProductGrid Component
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Adapts dynamically from 320px single column to 1440px 4-column balanced layout.
                  </p>
                </div>
              </div>

              <ProductGrid
                products={sampleProducts}
                isWholesale={isWholesale}
                onAddToCart={(prod, qty) => triggerToast('success')}
              />
            </section>

            {/* 4. ProductGrid Loading Skeleton State */}
            <section className="space-y-4">
              <h3 className="text-lg font-black text-stone-900">
                ProductGrid Loading State (Skeletons)
              </h3>
              <ProductGrid loading skeletonCount={4} />
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default DesignSystemPage;
