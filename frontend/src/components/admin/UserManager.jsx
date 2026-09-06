import React, { useState, useEffect, useCallback } from 'react';
import axiosClient from '../../api/axiosClient';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import {
  Users, Search, ShieldCheck, Building2, UserCheck, AlertTriangle,
  CheckCircle2, XCircle, RefreshCw, Filter, MoreVertical
} from 'lucide-react';

export const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState(null);

  const { success: toastSuccess, error: toastError } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/admin/users');
      if (res.success) {
        setUsers(res.data?.users || res.data || []);
      }
    } catch (err) {
      toastError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setUpdatingId(user._id);
    try {
      const res = await axiosClient.patch(`/admin/users/${user._id}/status`, { status: newStatus });
      if (res.success) {
        toastSuccess(`User status updated to ${newStatus}`);
        setUsers((prev) =>
          prev.map((u) => (u._id === user._id ? { ...u, status: newStatus, isActive: newStatus === 'ACTIVE' } : u))
        );
      }
    } catch (err) {
      toastError(err.message || 'Failed to update user status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleChangeRole = async (user, newRole) => {
    if (!window.confirm(`Change role of ${user.name} to ${newRole}?`)) return;
    setUpdatingId(user._id);
    try {
      const res = await axiosClient.put(`/admin/users/${user._id}`, { role: newRole });
      if (res.success) {
        toastSuccess(`User role updated to ${newRole}`);
        setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, role: newRole } : u)));
      }
    } catch (err) {
      toastError(err.message || 'Failed to update role.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search);

    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchStatus = statusFilter === 'ALL' || u.status === statusFilter;

    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" /> User Accounts Management
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Total {users.length} registered accounts across Retail, Wholesale B2B, and Staff.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="ALL">All Roles</option>
          <option value="CUSTOMER">Retail Customers</option>
          <option value="B2B_WHOLESALER">B2B Wholesalers</option>
          <option value="ADMIN">Administrators</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="PENDING">Pending Verification</option>
        </select>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="py-16 text-center">
          <Spinner size="lg" />
          <p className="text-xs text-stone-400 mt-2">Loading user directory...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-12 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400 text-xs">
          No users match the selected filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider font-bold border-b border-stone-200">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Joined</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {filteredUsers.map((u) => {
                const isUpdating = updatingId === u._id;
                return (
                  <tr key={u._id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-stone-900">{u.name}</div>
                      <div className="text-[11px] text-stone-400">{u.email} • {u.phone || 'No phone'}</div>
                      {u.b2bProfile?.companyName && (
                        <div className="text-[10px] text-indigo-600 font-bold mt-0.5">
                          🏢 {u.b2bProfile.companyName} (GST: {u.b2bProfile.gstin || 'N/A'})
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <select
                        value={u.role}
                        disabled={isUpdating}
                        onChange={(e) => handleChangeRole(u, e.target.value)}
                        className={`text-[11px] font-bold rounded-lg px-2 py-1 border transition-colors ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : u.role === 'B2B_WHOLESALER'
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            : 'bg-stone-50 text-stone-700 border-stone-200'
                        }`}
                      >
                        <option value="CUSTOMER">CUSTOMER</option>
                        <option value="B2B_WHOLESALER">B2B_WHOLESALER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={u.status === 'ACTIVE' ? 'success' : 'danger'} size="xs" dot>
                        {u.status || 'ACTIVE'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-stone-500 font-medium text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      <Button
                        size="xs"
                        variant={u.status === 'ACTIVE' ? 'outline' : 'primary'}
                        disabled={isUpdating}
                        onClick={() => handleToggleStatus(u)}
                      >
                        {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserManager;
