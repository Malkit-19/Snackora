import React, { useState, useEffect, useCallback } from 'react';
import axiosClient from '../../api/axiosClient';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { MessageSquare, CheckCircle2, Clock, RefreshCw, Search } from 'lucide-react';

export const B2BRequestManager = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const { success: toastSuccess, error: toastError } = useToast();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/admin/b2b/requests');
      if (res.success) {
        setRequests(res.data?.requests || res.data || []);
      }
    } catch (err) {
      toastError(err.message || 'Failed to load B2B requests.');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleUpdateStatus = async (requestId, newStatus) => {
    setUpdatingId(requestId);
    try {
      const res = await axiosClient.patch(`/admin/b2b/requests/${requestId}`, { status: newStatus });
      if (res.success) {
        toastSuccess(`Request status updated to ${newStatus}`);
        setRequests((prev) =>
          prev.map((r) => (r._id === requestId ? { ...r, status: newStatus } : r))
        );
      }
    } catch (err) {
      toastError(err.message || 'Failed to update request status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    return (
      !search ||
      r.companyName?.toLowerCase().includes(search.toLowerCase()) ||
      r.requestType?.toLowerCase().includes(search.toLowerCase()) ||
      r.message?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" /> B2B Custom Quotes & Business Requests
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Custom packaging, corporate gifting, private labeling, and high-volume dispatch inquiries.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Search by Company, Request Type, or Message..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <Spinner size="lg" />
          <p className="text-xs text-stone-400 mt-2">Loading quote inquiries...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-12 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400 text-xs">
          No custom business requests found.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => (
            <div
              key={req._id}
              className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4 hover:border-indigo-300 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                    {req.requestType?.replace('_', ' ') || 'CUSTOM_QUOTE'}
                  </span>
                  <h3 className="text-base font-black text-stone-900 mt-1">
                    {req.companyName || req.user?.name || 'Wholesale Inquirer'}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={req.status || 'SUBMITTED'}
                    disabled={updatingId === req._id}
                    onChange={(e) => handleUpdateStatus(req._id, e.target.value)}
                    className="text-xs font-bold rounded-lg px-2.5 py-1.5 border bg-stone-50 text-stone-800 border-stone-200 focus:bg-white focus:outline-none"
                  >
                    <option value="SUBMITTED">SUBMITTED</option>
                    <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                    <option value="QUOTED">QUOTED</option>
                    <option value="ACCEPTED">ACCEPTED</option>
                    <option value="REJECTED">REJECTED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              <p className="text-xs text-stone-700 bg-stone-50 p-4 rounded-2xl border border-stone-100 leading-relaxed">
                "{req.message || req.description || 'No additional details provided.'}"
              </p>

              <div className="flex flex-wrap items-center justify-between text-[11px] text-stone-400 font-medium pt-2 border-t border-stone-100">
                <span>Quantity Requested: {req.estimatedVolume || req.quantity || 'Flexible'}</span>
                <span>Submitted on {new Date(req.createdAt).toLocaleDateString('en-IN')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default B2BRequestManager;
