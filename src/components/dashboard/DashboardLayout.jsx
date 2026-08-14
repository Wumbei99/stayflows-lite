import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Mail, LogOut, Hotel, KeyRound, KanbanSquare, MessageCircle, Settings, WifiOff, Wifi, CloudOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNetwork } from '../../contexts/NetworkContext';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getQueueLength } from '../../lib/offlineQueue';

export default function DashboardLayout() {
  const location = useLocation();
  const { tenantId, role, signOut, isSuperAdmin } = useAuth();
  const { isOnline } = useNetwork();
  const [hotelName, setHotelName] = useState('StayFlows Lite');
  const [pendingActions, setPendingActions] = useState(0);

  // Track offline queue length
  useEffect(() => {
    const checkQueue = () => {
      const len = getQueueLength();
      setPendingActions(len);
    };
    checkQueue(); // initial check

    // Listen to custom event fired by enqueueMutation and processOfflineQueue
    const handleQueueChange = (e) => setPendingActions(e.detail.length);
    window.addEventListener('offline-queue-changed', handleQueueChange);

    // Fallback poll every 5s just in case
    const interval = setInterval(checkQueue, 5000);

    return () => {
      window.removeEventListener('offline-queue-changed', handleQueueChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!tenantId) return;

    async function fetchHotelName() {
      const { data } = await supabase
        .from('hotel_settings')
        .select('profile')
        .eq('tenant_id', tenantId)
        .single();
      
      if (data?.profile?.hotel_name) {
        setHotelName(data.profile.hotel_name);
      }
    }
    fetchHotelName();

    // Listen for realtime updates to hotel_settings
    const subscription = supabase.channel('hotel_settings_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'hotel_settings',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          if (payload.new?.profile?.hotel_name) {
            setHotelName(payload.new.profile.hotel_name);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [tenantId]);

  // Role-Based Navigation
  const navigation = [
    // Everyone sees Feedback, Tickets, and Inbox
    { name: 'Feedback', href: `/dashboard/feedback`, icon: LayoutDashboard, match: 'feedback', roles: ['manager', 'receptionist'] },
    { name: 'Service Tickets', href: `/dashboard/tickets`, icon: KanbanSquare, match: 'tickets', roles: ['manager', 'receptionist'] },
    { name: 'Guest Chat', href: `/dashboard/inbox`, icon: MessageCircle, match: 'inbox', roles: ['manager', 'receptionist'] },
    
    // Only managers see Rooms and CRM and Settings
    { name: 'Rooms & QR', href: `/dashboard/rooms`, icon: KeyRound, match: 'rooms', roles: ['manager', 'receptionist'] },
    { name: 'CRM & Email', href: `/dashboard/crm`, icon: Mail, match: 'crm', roles: ['manager'] },
    { name: 'Settings', href: `/dashboard/settings`, icon: Settings, match: 'settings', roles: ['manager'] },
  ];

  // Filter nav items by the user's role
  const visibleNav = navigation.filter(item => isSuperAdmin || item.roles.includes(role));

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('tickets')) return 'Service Tickets';
    if (path.includes('inbox')) return 'Guest Chat Inbox';
    if (path.includes('rooms')) return 'Room & QR Management';
    if (path.includes('crm')) return 'CRM & Email Templates';
    if (path.includes('settings')) return 'Hotel Settings';
    return 'Feedback Dashboard';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <Hotel className="w-5 h-5 text-white" />
          </div>
          <div className="overflow-hidden">
            <span className="font-semibold text-base tracking-tight truncate block" title={hotelName}>
              {hotelName}
            </span>
          </div>
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-1.5">
          {visibleNav.map((item) => {
            const isActive = location.pathname.includes(item.match);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-1.5">
          <button 
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white w-full rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Sign out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center px-8 shadow-sm z-10 shrink-0">
          <h1 className="text-lg font-semibold text-slate-800">{getPageTitle()}</h1>
          <div className="ml-auto flex items-center gap-3">
            {/* Network Status Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200 animate-pulse'
            }`}>
              {isOnline ? (
                <><Wifi className="w-3.5 h-3.5" /> Online</>
              ) : (
                <><WifiOff className="w-3.5 h-3.5" /> Offline</>
              )}
            </div>
            {/* Pending Queue Badge */}
            {pendingActions > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                <CloudOff className="w-3.5 h-3.5" />
                {pendingActions} pending
              </div>
            )}
            {/* Role Badge */}
            <div className="text-sm text-slate-500 font-medium bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              {isSuperAdmin ? 'Super Admin' : role === 'manager' ? 'Hotel Manager' : 'Receptionist'}
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto p-8 bg-slate-50/50">
          <Outlet context={{ tenantId }} />
        </main>
      </div>
    </div>
  );
}
