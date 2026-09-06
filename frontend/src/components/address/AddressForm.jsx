import React, { useState } from 'react';
import { MapPin, User, Phone, Home, Briefcase, MoreHorizontal } from 'lucide-react';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Lakshadweep', 'Puducherry', 'Jammu and Kashmir', 'Ladakh'
];

const LABEL_OPTIONS = [
  { value: 'Home', label: 'Home', icon: Home },
  { value: 'Office', label: 'Office', icon: Briefcase },
  { value: 'Other', label: 'Other', icon: MoreHorizontal }
];

const defaultForm = {
  fullName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
  label: 'Home',
  isDefault: false
};

export const AddressForm = ({ initialData = null, onSubmit, onCancel, loading = false }) => {
  const [form, setForm] = useState({
    ...defaultForm,
    ...(initialData
      ? {
          fullName: initialData.fullName || initialData.name || '',
          phone: initialData.phone || '',
          addressLine1: initialData.addressLine1 || '',
          addressLine2: initialData.addressLine2 || '',
          city: initialData.city || '',
          state: initialData.state || '',
          pincode: initialData.pincode || initialData.postalCode || '',
          label: initialData.label || 'Home',
          isDefault: initialData.isDefault || false
        }
      : {})
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!form.fullName.trim()) newErrors.fullName = 'Full name is required.';
    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) newErrors.phone = 'Enter a valid 10-digit mobile number.';
    if (!form.addressLine1.trim()) newErrors.addressLine1 = 'Address line 1 is required.';
    if (!form.city.trim()) newErrors.city = 'City is required.';
    if (!form.state) newErrors.state = 'State is required.';
    if (!/^\d{6}$/.test(form.pincode.trim())) newErrors.pincode = 'Enter a valid 6-digit pincode.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form);
  };

  const inputBase =
    'w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white text-stone-800 placeholder-stone-300';
  const inputNormal = `${inputBase} border-stone-200 hover:border-stone-300`;
  const inputError = `${inputBase} border-rose-400 bg-rose-50`;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Label selector */}
      <div className="flex gap-3">
        {LABEL_OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => handleChange('label', value)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all ${
              form.label === value
                ? 'border-amber-500 bg-amber-50 text-amber-800'
                : 'border-stone-200 text-stone-500 hover:border-stone-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Full Name */}
      <div className="space-y-1">
        <label className="block text-xs font-bold text-stone-600">Full Name *</label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
          <input
            type="text"
            placeholder="Rahul Sharma"
            value={form.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            className={`${errors.fullName ? inputError : inputNormal} pl-10`}
            autoComplete="name"
          />
        </div>
        {errors.fullName && <p className="text-xs text-rose-600 font-medium">{errors.fullName}</p>}
      </div>

      {/* Phone */}
      <div className="space-y-1">
        <label className="block text-xs font-bold text-stone-600">Mobile Number *</label>
        <div className="relative">
          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
          <input
            type="tel"
            placeholder="9876543210"
            value={form.phone}
            maxLength={10}
            onChange={(e) => handleChange('phone', e.target.value.replace(/\D/g, ''))}
            className={`${errors.phone ? inputError : inputNormal} pl-10`}
            autoComplete="tel"
          />
        </div>
        {errors.phone && <p className="text-xs text-rose-600 font-medium">{errors.phone}</p>}
      </div>

      {/* Address Line 1 */}
      <div className="space-y-1">
        <label className="block text-xs font-bold text-stone-600">Address Line 1 *</label>
        <div className="relative">
          <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-300" />
          <input
            type="text"
            placeholder="Flat / House No., Building, Street"
            value={form.addressLine1}
            onChange={(e) => handleChange('addressLine1', e.target.value)}
            className={`${errors.addressLine1 ? inputError : inputNormal} pl-10`}
            autoComplete="address-line1"
          />
        </div>
        {errors.addressLine1 && <p className="text-xs text-rose-600 font-medium">{errors.addressLine1}</p>}
      </div>

      {/* Address Line 2 */}
      <div className="space-y-1">
        <label className="block text-xs font-bold text-stone-600">Address Line 2 <span className="text-stone-300 font-normal">(optional)</span></label>
        <input
          type="text"
          placeholder="Landmark, Area, Colony"
          value={form.addressLine2}
          onChange={(e) => handleChange('addressLine2', e.target.value)}
          className={inputNormal}
          autoComplete="address-line2"
        />
      </div>

      {/* City + Pincode */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-xs font-bold text-stone-600">City *</label>
          <input
            type="text"
            placeholder="Mumbai"
            value={form.city}
            onChange={(e) => handleChange('city', e.target.value)}
            className={errors.city ? inputError : inputNormal}
            autoComplete="address-level2"
          />
          {errors.city && <p className="text-xs text-rose-600 font-medium">{errors.city}</p>}
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-bold text-stone-600">Pincode *</label>
          <input
            type="text"
            placeholder="400001"
            value={form.pincode}
            maxLength={6}
            onChange={(e) => handleChange('pincode', e.target.value.replace(/\D/g, ''))}
            className={errors.pincode ? inputError : inputNormal}
            autoComplete="postal-code"
          />
          {errors.pincode && <p className="text-xs text-rose-600 font-medium">{errors.pincode}</p>}
        </div>
      </div>

      {/* State */}
      <div className="space-y-1">
        <label className="block text-xs font-bold text-stone-600">State *</label>
        <select
          value={form.state}
          onChange={(e) => handleChange('state', e.target.value)}
          className={`${errors.state ? inputError : inputNormal} cursor-pointer appearance-none`}
        >
          <option value="">Select State</option>
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {errors.state && <p className="text-xs text-rose-600 font-medium">{errors.state}</p>}
      </div>

      {/* Set as Default */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => handleChange('isDefault', e.target.checked)}
          className="w-4 h-4 rounded border-stone-300 text-amber-500 focus:ring-amber-400 cursor-pointer"
        />
        <span className="text-sm font-medium text-stone-700">Set as my default delivery address</span>
      </label>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-stone-200 text-sm font-bold text-stone-600 hover:bg-stone-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-amber-500/20"
        >
          {loading ? 'Saving…' : initialData ? 'Save Changes' : 'Add Address'}
        </button>
      </div>
    </form>
  );
};

export default AddressForm;
