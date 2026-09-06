import React from 'react';
import {
  LayoutDashboard, Users, Package, Tags, ShoppingCart, Building2,
  MessageSquare, Warehouse, RotateCcw, Ticket, Image, Megaphone,
  Star, Bell, Settings, LogOut, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ADMIN_SIDEBAR_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'categories', label: 'Categories', icon: Tags },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'b2b-applications', label: 'B2B Applications', icon: Building2 },
  { id: 'b2b-requests', label: 'B2B Requests', icon: MessageSquare },
  { id: 'inventory', label: 'Inventory', icon: Warehouse },
  { id: 'refunds', label: 'Refunds', icon: RotateCcw },
  { id: 'coupons', label: 'Coupons', icon: Ticket },
  { id: 'banners', label: 'Banners', icon: Image },
  { id: 'ads', label: 'Ads', icon: Megaphone },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'logout', label: 'Logout', icon: LogOut, isDanger: true }
];

export const AdminSidebar = ({ activeTab, onSelectTab }) => {
  const { logout, user } = useAuth();

  const handleItemClick = (item) => {
    if (item.id === 'logout') {
      if (window.confirm('Are you sure you want to log out of the Admin Console?')) {
        logout();
      }
    } else {
      onSelectTab(item.id);
    }
  };

  return (
    <aside className="w-64 bg-stone-900 text-stone-300 min-h-screen p-4 flex flex-col justify-between shrink-0 shadow-2xl">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="px-3 py-2 flex items-center gap-3 border-b border-stone-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-amber-500 flex items-center justify-center text-white font-black shadow-md">
            S
          </div>
          <div>
            <span className="font-black text-white text-base tracking-tight block">Snackora Admin</span>
            <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Console 2.0
            </span>
          </div>
        </div>

        {/* Navigation List (16 Items) */}
        <nav className="space-y-1">
          {ADMIN_SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  item.isDanger
                    ? 'text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 mt-4 border-t border-stone-800 pt-3'
                    : isActive
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50'
                    : 'text-stone-400 hover:bg-stone-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.isDanger ? 'text-rose-400' : 'text-stone-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Admin User Footer */}
      <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800/60 mt-6 text-xs space-y-1">
        <p className="font-bold text-white truncate">{user?.name || 'Administrator'}</p>
        <p className="text-[11px] text-stone-500 truncate">{user?.email}</p>
      </div>
    </aside>
  );
};

export default AdminSidebar;
