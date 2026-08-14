import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, ConciergeBell, MessageSquare, Star,
  Wifi, Phone, Clock, Droplets, Wrench, 
  ChevronRight, Send, CheckCircle2, Sparkles, AlertCircle, Copy
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function GuestPortal() {
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('t');
  const roomNumber = searchParams.get('r'); // The room number from the static QR code
  
  const [activeTab, setActiveTab] = useState('home');
  const [hotelProfile, setHotelProfile] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load Data
  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    
    const loadData = async () => {
      // Fetch Hotel Settings
      const { data: settings } = await supabase
        .from('hotel_settings')
        .select('profile')
        .eq('tenant_id', tenantId)
        .single();
      
      if (settings?.profile) setHotelProfile(settings.profile);

      // Fetch Room by room number (static QR code)
      if (roomNumber) {
        const { data: room } = await supabase
          .from('rooms')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('room_number', roomNumber)
          .single();
        if (room) setRoomData(room);
      }
      setLoading(false);
    };
    
    loadData();
  }, [tenantId, roomNumber]);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!tenantId) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-6 text-center">
      <div>
        <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Info className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Invalid Link</h1>
        <p className="text-slate-400">Please scan the QR code in your room again.</p>
      </div>
    </div>
  );

  // Occupancy Gating: if the room is vacant, show a lock screen
  if (roomData && roomData.status === 'vacant') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-500/20">
          <Sparkles className="w-10 h-10 text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">{hotelProfile?.hotel_name || 'Welcome'}</h1>
        <p className="text-slate-400 max-w-xs">
          Please check in at the front desk to activate your digital concierge for Room {roomData.room_number}.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30 flex justify-center">
      {/* Mobile Frame Constraint for Desktop Viewing */}
      <div className="w-full max-w-md bg-slate-950 relative shadow-2xl overflow-hidden flex flex-col h-[100dvh]">
        
        {/* Header */}
        <header className="px-6 py-5 z-10 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 flex justify-between items-center shrink-0">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{hotelProfile?.hotel_name || 'Premium Hotel'}</h1>
            {roomData && (
              <p className="text-sm text-blue-400 font-medium">Room {roomData.room_number} • {roomData.room_type}</p>
            )}
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-px">
            <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center">
               <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto px-6 py-6 pb-24 relative z-0">
          <AnimatePresence mode="wait">
            {activeTab === 'home' && <HomeTab key="home" tenantId={tenantId} hotelProfile={hotelProfile} roomData={roomData} />}
            {activeTab === 'concierge' && <ConciergeTab key="concierge" tenantId={tenantId} roomData={roomData} />}
            {activeTab === 'chat' && <ChatTab key="chat" tenantId={tenantId} roomData={roomData} />}
          </AnimatePresence>
        </main>

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 w-full bg-slate-900/90 backdrop-blur-2xl border-t border-white/10 px-6 py-4 pb-safe z-20">
          <div className="flex justify-between items-center max-w-sm mx-auto">
            <NavButton icon={Home} label="Home" isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />
            <NavButton icon={ConciergeBell} label="Requests" isActive={activeTab === 'concierge'} onClick={() => setActiveTab('concierge')} />
            <NavButton icon={MessageSquare} label="Chat" isActive={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
          </div>
        </nav>
      </div>
    </div>
  );
}

// --- SUBCOMPONENTS ---

function NavButton({ icon: Icon, label, isActive, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
    >
      <div className={`p-2 rounded-2xl transition-all ${isActive ? 'bg-blue-500/15' : 'bg-transparent'}`}>
        <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
      </div>
      <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
    </button>
  );
}

function HomeTab({ tenantId, hotelProfile, roomData }) {
  const [rating, setRating] = useState(0);
  const [showInternalForm, setShowInternalForm] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [wifiCopied, setWifiCopied] = useState(false);

  const handleCopyWifi = () => {
    if (hotelProfile?.wifi_password) {
      navigator.clipboard.writeText(hotelProfile.wifi_password);
      setWifiCopied(true);
      setTimeout(() => setWifiCopied(false), 2000);
    }
  };

  const handleStarClick = (stars) => {
    setRating(stars);
    // Smart Interception Logic
    if (stars >= 4 && hotelProfile?.google_review_link) {
      window.open(hotelProfile.google_review_link, '_blank');
      setSubmitted(true);
    } else {
      setShowInternalForm(true);
    }
  };

  const submitInternalFeedback = async () => {
    if (!feedback.trim()) return;
    
    await supabase.from('in_house_feedback').insert({
      tenant_id: tenantId,
      room_number: roomData?.room_number || 'Unknown',
      rating: rating,
      message: feedback,
      category: 'General',
      status: 'Unread'
    });
    
    setShowInternalForm(false);
    setSubmitted(true);
  };

  const guestName = roomData?.guest_name ? roomData.guest_name.split(' ')[0] : null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      
      {guestName && (
        <div className="mb-2">
          <h2 className="text-2xl font-bold text-white">Hi {guestName},</h2>
          <p className="text-slate-400 text-sm">Welcome to your digital concierge.</p>
        </div>
      )}

      {/* Massive Prominent Feedback Card (The Core ROI) */}
      {!submitted ? (
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl shadow-xl shadow-blue-500/20 text-center relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 blur-3xl rounded-full" />
          
          <h2 className="text-2xl font-bold text-white mb-2 relative z-10">How is your stay?</h2>
          <p className="text-blue-100 text-sm mb-6 relative z-10">Your feedback helps us deliver a perfect experience.</p>
          
          {!showInternalForm ? (
            <div className="flex justify-center gap-3 relative z-10">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => handleStarClick(s)}
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="group transition-all duration-200 active:scale-75"
                >
                  <Star 
                    className={`w-11 h-11 transition-all duration-200 drop-shadow-lg ${
                      s <= (hoverRating || rating)
                        ? 'fill-amber-400 text-amber-400 scale-110' 
                        : 'fill-white/10 text-white/40 group-hover:text-white/60'
                    }`} 
                  />
                </button>
              ))}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="relative z-10">
              <p className="text-white font-medium mb-3">How can we improve your stay right now?</p>
              <textarea 
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Let the front desk know..."
                className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white placeholder:text-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm h-24 mb-3 resize-none"
              />
              <button 
                onClick={submitInternalFeedback}
                className="w-full bg-white text-blue-700 font-bold py-3 rounded-xl transition-transform active:scale-95"
              >
                Send to Front Desk
              </button>
            </motion.div>
          )}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl text-center">
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-emerald-400 mb-1">Thank You!</h2>
          <p className="text-emerald-200/70 text-sm">We appreciate your feedback.</p>
        </motion.div>
      )}

      {/* Secondary Concierge Features (Wi-Fi, Menus) */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        {hotelProfile?.wifi_password && (
          <div className="bg-slate-900/50 p-5 rounded-3xl border border-white/5 flex items-center justify-between col-span-2 relative overflow-hidden group">
             <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full" />
             <div className="flex items-center gap-4 relative z-10">
               <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                 <Wifi className="w-5 h-5" />
               </div>
               <div>
                 <span className="text-xs text-slate-400 uppercase tracking-wider block mb-0.5">Wi-Fi Password</span>
                 <h3 className="font-semibold text-lg">{hotelProfile.wifi_password}</h3>
               </div>
             </div>
             <button 
               onClick={handleCopyWifi}
               className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                 wifiCopied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-300 hover:bg-white/10'
               }`}
             >
               {wifiCopied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
             </button>
          </div>
        )}

        <div 
          className="bg-slate-900/50 p-5 rounded-3xl border border-white/5 flex flex-col items-center text-center gap-3 active:scale-95 transition-transform cursor-pointer"
          onClick={() => window.location.href = 'tel:0'}
        >
          <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center">
            <Phone className="w-5 h-5" />
          </div>
          <span className="font-medium text-sm">Emergency</span>
        </div>
        <div className="bg-slate-900/50 p-5 rounded-3xl border border-white/5 flex flex-col items-center text-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <span className="font-medium text-sm">Check-out: 12pm</span>
        </div>
      </div>
    </motion.div>
  );
}

function ConciergeTab({ tenantId, roomData }) {
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const services = [
    { id: 'towels', label: 'Extra Towels', icon: Droplets, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { id: 'cleaning', label: 'Room Cleaning', icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  ];

  const handleRequest = async (service) => {
    if (!roomData) return alert("Please scan a valid room QR code to make requests.");
    
    setSubmitting(true);
    const { error } = await supabase.from('service_requests').insert({
      tenant_id: tenantId,
      room_id: roomData.id,
      request_type: service.label,
      priority: service.id === 'maintenance' ? 'high' : 'normal'
    });

    setSubmitting(false);
    if (!error) {
      setSuccessMsg(`Requested ${service.label}. Staff has been notified.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-2">Service Requests</h2>
        <p className="text-slate-400 text-sm">Tap a service below and our staff will be right with you.</p>
      </div>

      <div className="space-y-3">
        {services.map(service => (
          <button 
            key={service.id}
            onClick={() => handleRequest(service)}
            disabled={submitting}
            className="w-full bg-slate-900/50 hover:bg-slate-900 p-4 rounded-3xl border border-white/5 flex items-center gap-4 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${service.bg} ${service.color}`}>
              <service.icon className="w-7 h-7" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-lg">{service.label}</h3>
              <p className="text-slate-400 text-xs">Request immediately</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function ChatTab({ tenantId, roomData }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!tenantId || !roomData) {
      setLoading(false);
      return;
    }

    // Load existing messages for this room
    const loadMessages = async () => {
      const { data } = await supabase
        .from('guest_messages')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('room_number', roomData.room_number)
        .order('created_at', { ascending: true });
      
      if (data) setMessages(data);
      setLoading(false);
      scrollToBottom();
    };

    loadMessages();

    // Subscribe to new messages
    const subscription = supabase
      .channel(`chat-${tenantId}-${roomData.room_number}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'guest_messages',
        filter: `tenant_id=eq.${tenantId}`
      }, payload => {
        if (payload.new.room_number === roomData.room_number) {
          setMessages(prev => {
            // Prevent duplicate from optimistic update
            const hasMatch = prev.some(m => 
              m.message === payload.new.message && 
              m.sender_type === payload.new.sender_type && 
              typeof m.id === 'string' && m.id.includes('.')
            );
            if (hasMatch) {
              // Replace the optimistic message with the real DB record
              return prev.map(m => 
                (m.message === payload.new.message && m.sender_type === payload.new.sender_type && typeof m.id === 'string' && m.id.includes('.'))
                  ? payload.new : m
              );
            }
            // Also skip if already present as a real record
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          scrollToBottom();
        }
      }).subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [tenantId, roomData]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !roomData) return;

    const msgText = input.trim();
    setInput('');

    // Optimistic UI update
    const optimisticId = Math.random().toString();
    const optimisticMsg = {
      id: optimisticId,
      tenant_id: tenantId,
      room_number: roomData.room_number,
      message: msgText,
      sender_type: 'guest',
      created_at: new Date().toISOString(),
      _pending: true
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom();

    // Retry logic for network resilience
    const trySend = async (retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          const { error } = await supabase.from('guest_messages').insert({
            tenant_id: tenantId,
            room_number: roomData.room_number,
            message: msgText,
            sender_type: 'guest'
          });
          if (!error) {
            setMessages(prev => prev.map(m => m.id === optimisticId ? { ...m, _pending: false } : m));
            return;
          }
        } catch (err) {
          // Network error — will retry
        }
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
      }
      // All retries exhausted
      setMessages(prev => prev.map(m => m.id === optimisticId ? { ...m, _failed: true, _pending: false } : m));
    };

    trySend();
  };

  if (!roomData) return (
    <div className="text-center py-20 text-slate-400">
      Please scan a valid room QR code to chat with front desk.
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full absolute inset-0 pt-6 pb-20">
      <div className="px-6 mb-4 shrink-0">
        <h2 className="text-2xl font-bold">Front Desk Chat</h2>
        <p className="text-slate-400 text-sm flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 
          Usually replies in minutes
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 space-y-4 pb-4">
        {messages.length === 0 && !loading && (
          <div className="text-center text-slate-500 text-sm py-10">
            Send a message to start chatting with our team.
          </div>
        )}
        
        {messages.map((msg, i) => {
          const isGuest = msg.sender_type === 'guest';
          return (
            <div key={msg.id || i} className={`flex ${isGuest ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${isGuest ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-slate-800 text-slate-200 rounded-bl-sm'} ${msg._pending ? 'opacity-60' : ''}`}>
                {msg.message}
                {msg._failed && (
                  <div className="flex items-center gap-1 mt-1 text-red-200 text-[10px]">
                    <AlertCircle className="w-3 h-3" /> Failed to send
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-6 pb-6 shrink-0 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent pt-4">
        <form onSubmit={sendMessage} className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full p-1.5 pl-4 focus-within:border-blue-500/50 transition-colors">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Message front desk..."
            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder:text-slate-500"
          />
          <button 
            type="submit" 
            disabled={!input.trim()}
            className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white disabled:opacity-50 disabled:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </motion.div>
  );
}
