/**
 * CloudinaryUpload — Reusable image upload widget for admin panels.
 *
 * Usage:
 *   <CloudinaryUpload
 *     value={imageUrl}
 *     onChange={(url) => setImageUrl(url)}
 *     folder="snackora/products"
 *   />
 *
 * Features:
 *  - Drag & drop or click-to-browse
 *  - Client-side preview before upload
 *  - Uploads via POST /api/upload (multipart)
 *  - Shows Cloudinary URL after upload
 *  - Allows manual URL override
 */
import React, { useRef, useState, useCallback } from 'react';
import axiosClient from '../../api/axiosClient';
import { UploadCloud, X, Link as LinkIcon, CheckCircle2, Loader2 } from 'lucide-react';

const CloudinaryUpload = ({ value = '', onChange, folder = 'snackora', label = 'Image', disabled = false }) => {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(value || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Keep preview in sync if parent changes value externally
  React.useEffect(() => {
    setPreview(value || '');
  }, [value]);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setError('');

    // Local preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    // Upload to backend → Cloudinary
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      if (folder) formData.append('folder', folder);

      const res = await axiosClient.postFormData('/upload', formData);
      if (res?.success && res?.data?.url) {
        setPreview(res.data.url);
        onChange(res.data.url);
      } else {
        throw new Error(res?.message || 'Upload failed');
      }
    } catch (err) {
      setError(err.message || 'Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  }, [folder, onChange]);

  const onInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleClear = () => {
    setPreview('');
    onChange('');
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleUrlSave = (url) => {
    setPreview(url);
    onChange(url);
    setShowUrlInput(false);
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-xs font-semibold text-stone-700">{label}</label>}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        className={`relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all
          ${dragOver ? 'border-amber-400 bg-amber-50' : 'border-stone-200 bg-stone-50 hover:border-amber-300 hover:bg-amber-50/40'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        style={{ minHeight: '120px' }}
      >
        {preview ? (
          <div className="relative w-full h-40 rounded-2xl overflow-hidden">
            <img src={preview} alt="preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-bold">Click to replace</span>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleClear(); }}
                className="absolute top-2 right-2 bg-white/90 hover:bg-red-50 text-red-500 rounded-full p-1 shadow transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                <span className="text-xs text-stone-600 font-semibold">Uploading...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-stone-400">
            {uploading ? (
              <>
                <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
                <span className="text-xs font-semibold text-stone-500">Uploading to Cloudinary...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-8 h-8" />
                <p className="text-xs font-semibold text-stone-500 text-center">
                  Drag & drop or <span className="text-amber-600 underline">browse</span>
                </p>
                <p className="text-[11px] text-stone-400">JPEG, PNG, WebP or GIF — max 8 MB</p>
              </>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={onInputChange}
          className="hidden"
          disabled={disabled || uploading}
        />
      </div>

      {/* Uploaded URL display */}
      {preview && preview.startsWith('http') && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] font-mono text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{preview}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-rose-600 font-semibold">{error}</p>
      )}

      {/* Manual URL input toggle */}
      {!disabled && (
        <div>
          {showUrlInput ? (
            <UrlInputRow
              defaultValue={preview}
              onSave={handleUrlSave}
              onCancel={() => setShowUrlInput(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowUrlInput(true)}
              className="flex items-center gap-1.5 text-[11px] text-stone-400 hover:text-amber-600 transition"
            >
              <LinkIcon className="w-3 h-3" />
              Paste image URL instead
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const UrlInputRow = ({ defaultValue, onSave, onCancel }) => {
  const [val, setVal] = useState(defaultValue || '');
  return (
    <div className="flex gap-2">
      <input
        type="url"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="https://res.cloudinary.com/..."
        className="flex-1 px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
      />
      <button
        type="button"
        onClick={() => onSave(val)}
        className="px-3 py-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold"
      >
        Use
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-2 py-1.5 text-xs text-stone-400 hover:text-stone-600"
      >
        ✕
      </button>
    </div>
  );
};

export default CloudinaryUpload;
