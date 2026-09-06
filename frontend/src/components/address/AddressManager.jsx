import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Plus, Pencil, Trash2, Star, Home, Briefcase, MoreHorizontal, CheckCircle2, Loader2 } from 'lucide-react';
import { addressApi } from '../../api/addressApi';
import { AddressForm } from './AddressForm';
import { useToast } from '../../context/ToastContext';

const LABEL_ICONS = {
  Home: Home,
  Office: Briefcase,
  Other: MoreHorizontal
};

/**
 * AddressManager — full CRUD with default toggling.
 *
 * Props:
 *   selectable {boolean}    — if true, renders in "select" mode for checkout
 *   selectedId {string}     — currently selected address id (selectable mode)
 *   onSelect {Function}     — callback(address) when user picks one (selectable mode)
 */
export const AddressManager = ({ selectable = false, selectedId = null, onSelect }) => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const { success: toastSuccess, error: toastError } = useToast();

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await addressApi.getAddresses();
      if (res.success) {
        setAddresses(res.data?.addresses || []);
      }
    } catch (err) {
      toastError('Failed to load addresses.');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const handleAdd = async (formData) => {
    setSaving(true);
    try {
      const res = await addressApi.addAddress(formData);
      if (res.success) {
        toastSuccess('Address added successfully!');
        setShowForm(false);
        await fetchAddresses();
        if (selectable && onSelect && res.data?.address) {
          onSelect(res.data.address);
        }
      }
    } catch (err) {
      toastError(err.message || 'Failed to add address.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (formData) => {
    if (!editingAddress) return;
    setSaving(true);
    try {
      const res = await addressApi.updateAddress(editingAddress._id, formData);
      if (res.success) {
        toastSuccess('Address updated successfully!');
        setEditingAddress(null);
        await fetchAddresses();
      }
    } catch (err) {
      toastError(err.message || 'Failed to update address.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this address?')) return;
    setDeletingId(id);
    try {
      const res = await addressApi.deleteAddress(id);
      if (res.success) {
        toastSuccess('Address removed.');
        setAddresses((prev) => prev.filter((a) => a._id !== id));
      }
    } catch (err) {
      toastError(err.message || 'Failed to delete address.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      const res = await addressApi.setDefault(id);
      if (res.success) {
        toastSuccess('Default address updated.');
        setAddresses((prev) =>
          prev.map((a) => ({ ...a, isDefault: a._id === id }))
        );
      }
    } catch (err) {
      toastError(err.message || 'Failed to update default address.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Address Cards */}
      {addresses.length === 0 && !showForm ? (
        <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
          <MapPin className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-stone-500">No saved addresses yet</p>
          <p className="text-xs text-stone-400 mt-1">Add a delivery address to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((address) => {
            const LabelIcon = LABEL_ICONS[address.label] || MapPin;
            const isSelected = selectable && selectedId === address._id;
            const isEditing = editingAddress?._id === address._id;

            return (
              <div key={address._id} className="space-y-3">
                <div
                  onClick={() => selectable && onSelect && onSelect(address)}
                  className={`rounded-2xl border p-4 transition-all ${
                    selectable ? 'cursor-pointer' : ''
                  } ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50 shadow-md shadow-amber-100'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Selector circle (checkout mode) */}
                    {selectable && (
                      <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? 'border-amber-500 bg-amber-500' : 'border-stone-300'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="inline-flex items-center gap-1 text-xs font-black text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                          <LabelIcon className="w-3 h-3" />
                          {address.label || 'Home'}
                        </span>
                        {address.isDefault && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                            <Star className="w-3 h-3 fill-emerald-600" />
                            Default
                          </span>
                        )}
                      </div>

                      {/* Details */}
                      <p className="text-sm font-bold text-stone-900">{address.fullName || address.name}</p>
                      <p className="text-sm text-stone-500 font-medium">{address.phone}</p>
                      <p className="text-sm text-stone-600 mt-0.5">
                        {address.addressLine1}
                        {address.addressLine2 && `, ${address.addressLine2}`}
                      </p>
                      <p className="text-sm text-stone-600">
                        {address.city}, {address.state} — {address.pincode || address.postalCode}
                      </p>
                    </div>

                    {/* Action buttons */}
                    {!selectable && (
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => { setEditingAddress(address); setShowForm(false); }}
                          className="p-1.5 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit address"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(address._id)}
                          disabled={deletingId === address._id}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Remove address"
                        >
                          {deletingId === address._id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />
                          }
                        </button>
                        {!address.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(address._id)}
                            className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Set as default"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline edit form */}
                {isEditing && (
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5">
                    <h3 className="text-sm font-black text-stone-800 mb-4">Edit Address</h3>
                    <AddressForm
                      initialData={editingAddress}
                      onSubmit={handleEdit}
                      onCancel={() => setEditingAddress(null)}
                      loading={saving}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add new address form */}
      {showForm ? (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5">
          <h3 className="text-sm font-black text-stone-800 mb-4">Add New Address</h3>
          <AddressForm
            onSubmit={handleAdd}
            onCancel={() => setShowForm(false)}
            loading={saving}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setShowForm(true); setEditingAddress(null); }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-stone-300 text-sm font-bold text-stone-500 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add New Address
        </button>
      )}
    </div>
  );
};

export default AddressManager;
