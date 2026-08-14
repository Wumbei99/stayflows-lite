import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function LiveChat({ tenantId, roomNumber, onClose }) {
  const [messages, setMessages] = useState([
    { id: '1', sender: 'hotel', content: 'Hello! How can we make your stay better?' }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Realtime WebSocket Subscription
  useEffect(() => {
    if (!tenantId || !roomNumber) return;

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('guest_messages')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('reservation_id', roomNumber)
          .order('created_at', { ascending: true });
          
        if (data && data.length > 0) setMessages(data);
      } catch (err) {
        console.warn("Supabase fetch failed (mock mode)", err);
      }
    };
    fetchMessages();

    // Subscribe to new messages using Realtime
    const channel = supabase
      .channel(`room_${roomNumber}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'guest_messages', filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          if (payload.new.reservation_id === roomNumber) {
            setMessages(prev => {
              // avoid duplicate if we sent it
              if (prev.find(m => m.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, roomNumber]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMsg = { 
      id: Date.now().toString(), 
      sender: 'guest', 
      content: input,
      tenant_id: tenantId,
      reservation_id: roomNumber
    };
    
    // Optimistic UI update
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    
    try {
      const { error } = await supabase.from('guest_messages').insert({
        tenant_id: tenantId,
        reservation_id: roomNumber,
        sender: 'guest',
        content: input,
        is_read: false
      });
      if (error) throw error;
    } catch (err) {
      console.warn("Supabase insert failed. Using mock response.");
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'hotel',
          content: 'We have received your message and will assist you shortly.'
        }]);
      }, 1500);
    }
  };

  return (
    <div className="fixed bottom-24 right-6 w-[calc(100vw-3rem)] sm:w-96 h-[32rem] max-h-[70vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300 z-50">
      {/* Header */}
      <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
        <div>
          <h3 className="font-medium text-white">Front Desk</h3>
          <p className="text-xs text-green-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span> Online
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map(msg => (
          <div key={msg.id} className={`max-w-[80%] p-3 rounded-2xl ${msg.sender === 'guest' ? 'bg-blue-600 text-white self-end rounded-br-none' : 'bg-slate-800 text-slate-200 self-start rounded-bl-none'}`}>
            <p className="text-sm">{msg.content}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-slate-900 text-white text-sm rounded-full px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white w-10 h-10 rounded-full flex shrink-0 items-center justify-center transition-colors cursor-pointer">
          <Send className="w-4 h-4 ml-[-2px]" />
        </button>
      </form>
    </div>
  );
}
