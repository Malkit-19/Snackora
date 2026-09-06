import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Clock, CheckCircle, Building2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const B2BStatusBanner = () => {
  const { user, isB2B, isPendingB2B, isApprovedB2B } = useAuth();

  if (!isB2B) return null;

  if (isPendingB2B) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-3 text-amber-900">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 animate-pulse" />
            <div>
              <span className="font-bold">B2B Application Under Verification: </span>
              Your business profile for <strong className="underline">{user?.b2bProfile?.companyName}</strong> is being reviewed by Snackora Admin.
              Wholesale pricing and bulk MOQs will activate upon verification.
            </div>
          </div>
          <Link
            to="/dashboard"
            className="text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-200/70 hover:bg-amber-200 px-3 py-1.5 rounded-lg shrink-0 transition-colors"
          >
            Check Application Status
          </Link>
        </div>
      </div>
    );
  }

  if (isApprovedB2B) {
    return (
      <div className="bg-indigo-900 text-white px-4 py-2.5 shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-300 shrink-0" />
            <span>
              <strong>B2B Wholesale Partner Mode:</strong> Displaying exclusive tier pricing & MOQ for{' '}
              <span className="text-amber-300 font-semibold">{user?.b2bProfile?.companyName}</span> (GSTIN: {user?.b2bProfile?.gstin})
            </span>
          </div>
          <span className="text-[11px] bg-indigo-800 text-indigo-200 px-2.5 py-1 rounded-full font-medium">
            GST Invoicing Enabled
          </span>
        </div>
      </div>
    );
  }

  if (user?.b2bProfile?.verificationStatus === 'REJECTED') {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3 text-sm text-red-900">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <div>
            <span className="font-bold">B2B Application Declined: </span>
            {user?.b2bProfile?.rejectionReason || 'Please contact our compliance desk for verification details.'}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default B2BStatusBanner;
