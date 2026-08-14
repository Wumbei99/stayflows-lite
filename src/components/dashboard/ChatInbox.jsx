import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Send, Search, Circle, CheckCheck, BedDouble } from 'lucide-react';

export default function ChatInbox() {
  const { tenantId } = useOutletContext();
  const [conversations, setConversations] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [alertActive, setAlertActive] = useState(false);
  const scrollRef = useRef(null);
  const alertIntervalRef = useRef(null);
  const audioCtxRef = useRef(null);
  const audioUnlockedRef = useRef(false);

  // Unlock audio on first user interaction (required by browser autoplay policy)
  useEffect(() => {
    const unlockAudio = () => {
      if (audioUnlockedRef.current) return;
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        // Play a silent buffer to unlock
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        audioCtxRef.current = ctx;
        audioUnlockedRef.current = true;
        console.log('[ChatInbox] Audio unlocked successfully');
      } catch (e) {
        console.warn('[ChatInbox] Audio unlock failed:', e);
      }
    };

    document.addEventListener('click', unlockAudio, { once: false });
    document.addEventListener('keydown', unlockAudio, { once: false });

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Web Audio API beep generator using pre-unlocked context
  const playBeep = () => {
    try {
      // Try to use the pre-unlocked context, or create a fresh one
      let ctx = audioCtxRef.current;
      if (!ctx || ctx.state === 'closed') {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;
      }
      // Resume if suspended
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // First beep
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.value = 880;
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.setValueAtTime(0, now + 0.15);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Second beep (higher pitch)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1100;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.4, now + 0.25);
      gain2.gain.setValueAtTime(0, now + 0.4);
      osc2.start(now + 0.25);
      osc2.stop(now + 0.4);
    } catch (e) {
      console.warn('[ChatInbox] Beep failed:', e);
      // Fallback: try system beep via Notification API
      try {
        if (Notification.permission === 'granted') {
          new Notification('New Guest Message', { body: 'A guest has sent a message', silent: false });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission();
        }
      } catch (e2) {}
    }
  };

  const startAlertSound = () => {
    if (alertIntervalRef.current) return; // Already beeping
    setAlertActive(true);
    playBeep(); // Immediate first beep
    alertIntervalRef.current = setInterval(playBeep, 2000);
  };

  const stopAlertSound = () => {
    if (alertIntervalRef.current) {
      clearInterval(alertIntervalRef.current);
      alertIntervalRef.current = null;
    }
    setAlertActive(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (alertIntervalRef.current) clearInterval(alertIntervalRef.current); };
  }, []);

  // Fetch all conversations (grouped by room_number)
  useEffect(() => {
    if (!tenantId) return;
    fetchConversations();

    const channel = supabase
      .channel('inbox-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'guest_messages',
        filter: `tenant_id=eq.${tenantId}`
      }, (payload) => {
        // Update conversation list
        fetchConversations();
        // Start alert sound for new guest messages
        if (payload.new.sender_type === 'guest') {
          startAlertSound();
        }
        // If we're viewing this room, add the message (with dedup)
        if (selectedRoom && payload.new.room_number === selectedRoom) {
          setMessages(prev => {
            // Prevent duplicate from optimistic update
            const hasOptimistic = prev.some(m => 
              m.message === payload.new.message && 
              m.sender_type === payload.new.sender_type && 
              typeof m.id === 'string' && m.id.includes('.')
            );
            if (hasOptimistic) {
              return prev.map(m => 
                (m.message === payload.new.message && m.sender_type === payload.new.sender_type && typeof m.id === 'string' && m.id.includes('.'))
                  ? payload.new : m
              );
            }
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          scrollToBottom();
        }
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantId, selectedRoom]);

  const fetchConversations = async () => {
    // Get latest message per room to build conversation list
    const { data } = await supabase
      .from('guest_messages')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (data) {
      // Group by room_number, keep latest message
      const grouped = {};
      data.forEach(msg => {
        if (!grouped[msg.room_number]) {
          grouped[msg.room_number] = {
            room_number: msg.room_number,
            latest_message: msg.message,
            latest_time: msg.created_at,
            sender_type: msg.sender_type,
            unread: data.filter(m => m.room_number === msg.room_number && m.sender_type === 'guest' && !m.is_read).length
          };
        }
      });
      setConversations(Object.values(grouped).sort((a, b) => new Date(b.latest_time) - new Date(a.latest_time)));
    }
    setLoading(false);
  };

  const selectConversation = async (roomNumber) => {
    setSelectedRoom(roomNumber);
    
    // Only stop the beep if there are no other unread conversations
    const otherUnread = conversations.some(c => c.room_number !== roomNumber && c.unread > 0);
    if (!otherUnread) {
      stopAlertSound();
    }
    const { data } = await supabase
      .from('guest_messages')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('room_number', roomNumber)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);

    // Mark guest messages as read
    await supabase
      .from('guest_messages')
      .update({ is_read: true })
      .eq('tenant_id', tenantId)
      .eq('room_number', roomNumber)
      .eq('sender_type', 'guest');

    scrollToBottom();
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedRoom) return;

    const text = input.trim();
    setInput('');

    // Optimistic UI update
    const optimisticMsg = {
      id: Math.random().toString(),
      tenant_id: tenantId,
      room_number: selectedRoom,
      message: text,
      sender_type: 'staff',
      is_read: true,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom();

    await supabase.from('guest_messages').insert({
      tenant_id: tenantId,
      room_number: selectedRoom,
      message: text,
      sender_type: 'staff',
      is_read: true
    });
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 100);
  };

  const timeAgo = (dateStr) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const filtered = conversations.filter(c =>
    c.room_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-sm animate-in fade-in duration-500 font-sans">
      
      {/* Left: Conversation List */}
      <div className="w-80 border-r border-slate-200 flex flex-col shrink-0 bg-white">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
            Guest Inbox
            {alertActive && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by room..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <div className="text-center py-10 text-slate-400 text-sm">Loading...</div>}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm px-6">
              No conversations yet. Messages from guests will appear here.
            </div>
          )}
          {filtered.map(conv => (
            <button
              key={conv.room_number}
              onClick={() => selectConversation(conv.room_number)}
              className={`w-full text-left px-4 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${
                selectedRoom === conv.room_number ? 'bg-blue-50 border-l-[3px] border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <BedDouble className="w-4 h-4 text-slate-500" />
                  <span className="font-semibold text-slate-900 text-sm">Room {conv.room_number}</span>
                </div>
                <span className="text-[11px] text-slate-400">{timeAgo(conv.latest_time)}</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 truncate pr-4 flex-1">
                  {conv.sender_type === 'staff' && <span className="text-slate-400">You: </span>}
                  {conv.latest_message}
                </p>
                {conv.unread > 0 && (
                  <span className="w-5 h-5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                    {conv.unread}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Chat Messages */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {!selectedRoom ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-medium text-slate-600 mb-1">Select a conversation</h3>
              <p className="text-sm">Choose a room from the left to start chatting</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                  {selectedRoom}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Room {selectedRoom}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" /> Guest is online
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {messages.map((msg, i) => {
                const isStaff = msg.sender_type === 'staff';
                return (
                  <div key={msg.id || i} className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[65%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      isStaff 
                        ? 'bg-blue-600 text-white rounded-br-sm' 
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                    }`}>
                      <p>{msg.message}</p>
                      <div className={`text-[10px] mt-1.5 flex items-center gap-1 ${isStaff ? 'text-blue-200 justify-end' : 'text-slate-400'}`}>
                        {timeAgo(msg.created_at)}
                        {isStaff && <CheckCheck className="w-3 h-3" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Box */}
            <div className="bg-white px-6 py-4 border-t border-slate-200 shrink-0">
              <form onSubmit={sendReply} className="flex items-center gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={`Reply to Room ${selectedRoom}...`}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="w-11 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 disabled:bg-slate-300 shrink-0"
                >
                  <Send className="w-5 h-5 ml-0.5" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
