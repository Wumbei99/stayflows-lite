import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Clock, CheckCircle2, Loader2, AlertTriangle,
  Droplets, Sparkles, Wrench, BedDouble,
  ArrowRight, ChevronDown, RefreshCw
} from 'lucide-react';

const STATUS_COLUMNS = [
  { key: 'pending', label: 'New Requests', color: 'bg-amber-500', textColor: 'text-amber-500', lightBg: 'bg-amber-50', icon: Clock },
  { key: 'in_progress', label: 'In Progress', color: 'bg-blue-500', textColor: 'text-blue-500', lightBg: 'bg-blue-50', icon: Loader2 },
  { key: 'resolved', label: 'Resolved', color: 'bg-emerald-500', textColor: 'text-emerald-500', lightBg: 'bg-emerald-50', icon: CheckCircle2 },
];

const REQUEST_ICONS = {
  'Extra Towels': Droplets,
  'Room Cleaning': Sparkles,
  'Maintenance': Wrench,
  'Late Checkout': BedDouble,
};

const PRIORITY_STYLES = {
  urgent: { label: 'Urgent', bg: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: 'High', bg: 'bg-orange-100 text-orange-700 border-orange-200' },
  normal: { label: 'Normal', bg: 'bg-slate-100 text-slate-600 border-slate-200' },
  low: { label: 'Low', bg: 'bg-slate-50 text-slate-400 border-slate-100' },
};

export default function ServiceKanban() {
  const { tenantId } = useOutletContext();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedId, setDraggedId] = useState(null);

  useEffect(() => {
    if (tenantId) {
      fetchRequests();
      
      // Real-time subscription for live updates
      const channel = supabase
        .channel('service-requests-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'service_requests',
          filter: `tenant_id=eq.${tenantId}`
        }, () => {
          fetchRequests();
        }).subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [tenantId]);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('service_requests')
      .select('*, rooms(room_number, room_type)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    
    if (data) setRequests(data);
    setLoading(false);
  };

  const moveRequest = async (requestId, newStatus) => {
    await supabase
      .from('service_requests')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', requestId);

    setRequests(prev =>
      prev.map(r => r.id === requestId ? { ...r, status: newStatus, updated_at: new Date().toISOString() } : r)
    );
  };

  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, status) => {
    e.preventDefault();
    if (draggedId) {
      moveRequest(draggedId, status);
      setDraggedId(null);
    }
  };

  const timeAgo = (dateStr) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Service Requests</h2>
          <p className="text-slate-500 mt-1">Drag tickets between columns to update their status</p>
        </div>
        <button onClick={fetchRequests} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors cursor-pointer">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
          <ConciergeBellIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-1">No service requests yet</h3>
          <p className="text-slate-500">When guests tap a request from their QR code portal, tickets will appear here in real-time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {STATUS_COLUMNS.map(col => {
            const colRequests = requests.filter(r => r.status === col.key);
            const ColIcon = col.icon;
            return (
              <div 
                key={col.key}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.key)}
                className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[300px]"
              >
                {/* Column Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl ${col.lightBg} ${col.textColor} flex items-center justify-center`}>
                      <ColIcon className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-slate-900">{col.label}</h3>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${col.lightBg} ${col.textColor}`}>
                    {colRequests.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="p-3 space-y-3">
                  {colRequests.length === 0 && (
                    <div className="text-center text-slate-400 text-sm py-8 border-2 border-dashed border-slate-100 rounded-2xl">
                      Drop tickets here
                    </div>
                  )}
                  {colRequests.map(req => {
                    const ReqIcon = REQUEST_ICONS[req.request_type] || AlertTriangle;
                    const priority = PRIORITY_STYLES[req.priority] || PRIORITY_STYLES.normal;
                    return (
                      <div
                        key={req.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, req.id)}
                        className={`bg-slate-50 hover:bg-slate-100 rounded-2xl p-4 cursor-grab active:cursor-grabbing border border-slate-100 hover:border-slate-200 transition-all hover:shadow-md ${draggedId === req.id ? 'opacity-50 scale-95' : ''}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <ReqIcon className="w-5 h-5 text-slate-600" />
                            <span className="font-semibold text-slate-900 text-sm">{req.request_type}</span>
                          </div>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${priority.bg}`}>
                            {priority.label}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-medium bg-white px-2 py-1 rounded-lg border border-slate-100">
                            🏨 Room {req.rooms?.room_number || '—'}
                          </span>
                          <span>{timeAgo(req.created_at)}</span>
                        </div>

                        {/* Quick action buttons for moving between columns */}
                        {col.key !== 'resolved' && (
                          <div className="mt-3 pt-3 border-t border-slate-200/50">
                            <button
                              onClick={() => moveRequest(req.id, col.key === 'pending' ? 'in_progress' : 'resolved')}
                              className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                                col.key === 'pending' 
                                  ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' 
                                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                              }`}
                            >
                              {col.key === 'pending' ? 'Start Working' : 'Mark Resolved'}
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ConciergeBellIcon({ className }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20h18"/><path d="M12 2v2"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>;
}
