import { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { MessageSquare, Star, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function FeedbackDashboard() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get tenantId from DashboardLayout's Outlet context, or fall back to URL param
  const { tenantId: contextTenantId } = useOutletContext() || {};
  const [searchParams] = useSearchParams();
  const tenantId = contextTenantId || searchParams.get('t') || '00000000-0000-0000-0000-000000000123';

  useEffect(() => {
    // 1. Initial Fetch
    const fetchData = async () => {
      try {
        const { data: fbData } = await supabase
          .from('in_house_feedback')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false });
        
        if (fbData) setFeedbacks(fbData);

        // Fetch distinct rooms that have messages
        const { data: chatData } = await supabase
          .from('guest_messages')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false });
        
        if (chatData) {
          // Group by room to get latest message per room
          const grouped = chatData.reduce((acc, curr) => {
            if (!acc[curr.reservation_id]) {
              acc[curr.reservation_id] = curr;
            }
            return acc;
          }, {});
          setChats(Object.values(grouped));
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };

    fetchData();

    // 2. Realtime Subscriptions
    const fbChannel = supabase.channel('dashboard_feedbacks')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'in_house_feedback' }, (payload) => {
        setFeedbacks(prev => [payload.new, ...prev]);
      }).subscribe();

    const chatChannel = supabase.channel('dashboard_chats')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'guest_messages' }, (payload) => {
        setChats(prev => {
          const others = prev.filter(c => c.reservation_id !== payload.new.reservation_id);
          return [payload.new, ...others];
        });
      }).subscribe();

    return () => {
      supabase.removeChannel(fbChannel);
      supabase.removeChannel(chatChannel);
    };
  }, []);

  const markResolved = async (id) => {
    await supabase.from('in_house_feedback').update({ status: 'Resolved' }).eq('id', id);
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: 'Resolved' } : f));
  };

  const avgRating = feedbacks.length > 0 
    ? (feedbacks.reduce((sum, fb) => sum + fb.rating, 0) / feedbacks.length).toFixed(1) 
    : '0.0';

  const needsAttention = feedbacks.filter(f => f.rating <= 3 && f.status === 'Unread').length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 font-sans">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Today's Pulse</h2>
          <p className="text-slate-500 mt-1">Real-time overview of your property</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <Star className="w-16 h-16 text-yellow-500" />
          </div>
          <span className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">Avg Rating</span>
          <span className="text-4xl font-bold text-slate-900">{avgRating}</span>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <MessageSquare className="w-16 h-16 text-blue-500" />
          </div>
          <span className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">Active Chats</span>
          <span className="text-4xl font-bold text-slate-900">{chats.length}</span>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-rose-600 p-6 rounded-3xl shadow-lg shadow-red-500/20 flex flex-col text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-20">
            <AlertTriangle className="w-16 h-16" />
          </div>
          <span className="text-sm font-semibold mb-2 uppercase tracking-wider flex items-center gap-2">
            Needs Attention
          </span>
          <span className="text-4xl font-bold">{needsAttention}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Feedback */}
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden flex flex-col h-[550px]">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <Star className="w-4 h-4 text-yellow-600" />
              </span>
              Guest Feedback
            </h2>
          </div>
          <div className="p-4 flex-1 overflow-auto space-y-4">
            {loading && <p className="text-slate-400 text-center py-10">Loading...</p>}
            {!loading && feedbacks.length === 0 && <p className="text-slate-400 text-center py-10">No feedback yet today.</p>}
            {feedbacks.map(fb => (
              <div key={fb.id} className={`p-6 rounded-2xl border transition-all ${fb.rating <= 3 && fb.status === 'Unread' ? 'bg-red-50/50 border-red-100' : 'bg-slate-50 border-slate-100 hover:shadow-md hover:bg-white'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-4">
                    <span className="bg-slate-900 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-sm">
                      Room {fb.room_number}
                    </span>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < fb.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {new Date(fb.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                {fb.category && (
                  <span className="inline-block px-3 py-1 bg-white border border-slate-200 text-slate-600 text-xs rounded-lg mb-3 font-medium shadow-sm">
                    {fb.category}
                  </span>
                )}
                {fb.message && <p className="text-slate-700 text-sm leading-relaxed">{fb.message}</p>}
                
                {fb.rating <= 3 && fb.status === 'Unread' && (
                  <div className="mt-4 pt-4 border-t border-red-200/50">
                    <button onClick={() => markResolved(fb.id)} className="text-sm bg-red-100 text-red-700 font-medium px-4 py-2 rounded-xl hover:bg-red-200 transition-colors cursor-pointer">
                      Mark as Resolved
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Live Chat Inbox */}
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden flex flex-col h-[550px]">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-blue-600" />
              </span>
              Active Chats
            </h2>
          </div>
          <div className="p-4 flex-1 overflow-auto space-y-3">
            {loading && <p className="text-slate-400 text-center py-10">Loading...</p>}
            {!loading && chats.length === 0 && <p className="text-slate-400 text-center py-10">No active chats.</p>}
            {chats.map(chat => {
              const isUnread = chat.sender === 'guest' && !chat.is_read;
              return (
                <div key={chat.id} className={`p-5 rounded-2xl border transition-all cursor-pointer flex gap-4 items-center ${isUnread ? 'bg-blue-50 border-blue-100 shadow-sm' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${isUnread ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {chat.reservation_id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-semibold ${isUnread ? 'text-slate-900' : 'text-slate-700'}`}>Room {chat.reservation_id}</span>
                      <span className="text-xs text-slate-400">{new Date(chat.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <p className={`text-sm truncate ${isUnread ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                      {chat.sender === 'hotel' ? 'You: ' : ''}{chat.content}
                    </p>
                  </div>
                  {isUnread && (
                    <div className="w-3 h-3 bg-blue-600 rounded-full shrink-0 shadow-sm shadow-blue-500/50"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
