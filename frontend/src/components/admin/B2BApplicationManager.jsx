import React, { useState, useEffect, useCallback } from 'react';
import axiosClient from '../../api/axiosClient';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import {
  Building2, CheckCircle2, XCircle, Clock, RefreshCw,
  Search, ShieldCheck, Mail, Phone, MapPin, FileText
} from 'lucide-react';

export const B2BApplicationManager = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionLoading, setActionLoading] = useState(null);

  const { success: toastSuccess, error: toastError } = useToast();

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/admin/b2b/applications');
      if (res.success) {
        setApplications(res.data?.applications || res.data || []);
      }
    } catch (err) {
      toastError(err.message || 'Failed to load B2B applications.');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleDecision = async (appId, status) => {
    const reason = status === 'REJECTED' ? prompt('Please enter reason for rejection:') : undefined;
    if (status === 'REJECTED' && reason === null) return; // User cancelled prompt

    setActionLoading(appId);
    try {
      const res = await axiosClient.patch(`/admin/b2b/applications/${appId}`, {
        status,
        rejectionReason: reason || undefined
      });

      if (res.success) {
        toastSuccess(`B2B partner application marked as ${status}.`);
        setApplications((prev) =>
          prev.map((a) => (a._id === appId ? { ...a, verificationStatus: status, status } : a))
        );
      }
    } catch (err) {
      toastError(err.message || `Failed to update application status.`);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredApps = applications.filter((a) => {
    const status = a.verificationStatus || a.status || 'PENDING';
    const matchSearch =
      !search ||
      a.companyName?.toLowerCase().includes(search.toLowerCase()) ||
      a.ownerName?.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase()) ||
      a.gstin?.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === 'ALL' || status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" /> B2B Wholesale Partner Applications
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Review GST, company details, and approve wholesale pricing privileges.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchApplications} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by Company, Owner, GSTIN, Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending Review</option>
          <option value="APPROVED">Approved Wholesale Partners</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="py-16 text-center">
          <Spinner size="lg" />
          <p className="text-xs text-stone-400 mt-2">Loading partner applications...</p>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="p-12 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400 text-xs">
          No B2B wholesale applications found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredApps.map((app) => {
            const status = app.verificationStatus || app.status || 'PENDING';
            const isProcessing = actionLoading === app._id;

            return (
              <div
                key={app._id}
                className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-300 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'danger' : 'warning'}
                      size="xs"
                      dot
                    >
                      {status}
                    </Badge>
                    <span className="text-[11px] text-stone-400">
                      {new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-stone-900">{app.companyName || 'Business Entity'}</h3>
                    <p className="text-xs text-stone-600 font-semibold">
                      👤 {app.ownerName || app.contactPerson || 'Authorized Representative'}
                    </p>
                  </div>

                  <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1.5 text-xs text-stone-600">
                    <div className="flex justify-between">
                      <span className="text-stone-400">GSTIN:</span>
                      <span className="font-mono font-bold text-stone-900">{app.gstin || 'Not Provided'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Business Type:</span>
                      <span className="font-bold text-stone-800">{app.businessType || 'Retailer / Distributor'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Email:</span>
                      <span className="text-stone-800">{app.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Phone:</span>
                      <span className="text-stone-800">{app.phone}</span>
                    </div>
                    {app.city && (
                      <div className="flex justify-between">
                        <span className="text-stone-400">Location:</span>
                        <span className="text-stone-800">{app.city}, {app.state}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                  {status === 'PENDING' ? (
                    <>
                      <Button
                        size="xs"
                        variant="primary"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={isProcessing}
                        onClick={() => handleDecision(app._id, 'APPROVED')}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve Wholesale
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        className="text-rose-600 hover:bg-rose-50"
                        disabled={isProcessing}
                        onClick={() => handleDecision(app._id, 'REJECTED')}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={isProcessing}
                      onClick={() => handleDecision(app._id, status === 'APPROVED' ? 'REJECTED' : 'APPROVED')}
                    >
                      Change to {status === 'APPROVED' ? 'Rejected' : 'Approved'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default B2BApplicationManager;
