import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Printer, LogIn, LogOut, X, Download, QrCode, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNetwork } from '../../contexts/NetworkContext';
import { enqueueMutation } from '../../lib/offlineQueue';

export default function RoomManagement() {
  const { tenantId } = useOutletContext();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [newRoom, setNewRoom] = useState({ number: '', type: 'Standard' });
  const [checkInModal, setCheckInModal] = useState({ show: false, room: null, email: '', name: '', checkoutDate: '' });
  const [qrModal, setQrModal] = useState({ show: false, room: null });
  const { isOnline } = useNetwork();

  useEffect(() => {
    if (tenantId) fetchRooms();
  }, [tenantId]);

  const fetchRooms = async () => {
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('room_number', { ascending: true });
    
    if (data) setRooms(data);
    setLoading(false);
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    const qrCodeHash = crypto.randomUUID();
    const { error } = await supabase.from('rooms').insert({
      tenant_id: tenantId,
      room_number: newRoom.number,
      room_type: newRoom.type,
      status: 'vacant',
      qr_code_hash: qrCodeHash
    });

    if (!error) {
      setNewRoom({ number: '', type: 'Standard' });
      setShowAdd(false);
      fetchRooms();
    } else {
      alert("Error adding room: " + error.message);
    }
  };

  const handleCheckIn = async (e) => {
    e.preventDefault();
    const { room, email, name, checkoutDate } = checkInModal;
    
    // Optimistic UI Update
    setRooms(prev => prev.map(r => r.id === room.id ? { 
      ...r, 
      status: 'occupied', 
      guest_email: email.trim() || null, 
      guest_name: name?.trim() || null,
      checkout_date: checkoutDate || null 
    } : r));

    const updatePayload = { 
      status: 'occupied', 
      guest_email: email.trim() || null,
      guest_name: name?.trim() || null,
      checkout_date: checkoutDate || null
    };

    if (isOnline) {
      const { error: roomError } = await supabase.from('rooms').update(updatePayload).eq('id', room.id);
      if (roomError) console.error("Error updating room on check-in:", roomError);
    } else {
      await enqueueMutation('rooms', 'UPDATE', updatePayload, { id: room.id });
    }

    if (email.trim()) {
      const logPayload = {
        tenant_id: tenantId,
        guest_email: email.trim(),
        guest_name: name?.trim() || null,
        template_name: 'checkin_welcome',
        status: 'pending'
      };
      
      if (isOnline) {
        await supabase.from('crm_logs').insert(logPayload);
      } else {
        await enqueueMutation('crm_logs', 'INSERT', logPayload);
      }

      // Handle Mid-Stay Check-in Queue if checkout date is provided
      if (checkoutDate) {
        const checkinDate = new Date();
        const checkoutObj = new Date(checkoutDate);
        const midPointMs = checkinDate.getTime() + (checkoutObj.getTime() - checkinDate.getTime()) / 2;
        const midPointDate = new Date(midPointMs);
        
        // Only schedule if midpoint is in the future
        if (midPointDate > new Date()) {
          const midStayPayload = {
            tenant_id: tenantId,
            guest_email: email.trim(),
            guest_name: name?.trim() || null,
            room_number: room.room_number,
            message_type: 'mid_stay',
            scheduled_for: midPointDate.toISOString(),
            status: 'pending'
          };
          if (isOnline) {
            await supabase.from('crm_scheduled_messages').insert(midStayPayload);
          } else {
            await enqueueMutation('crm_scheduled_messages', 'INSERT', midStayPayload);
          }
        }
      }
    }

    setCheckInModal({ show: false, room: null, email: '', name: '', checkoutDate: '' });
  };

  const handleCheckOut = async (room) => {
    if (!window.confirm(`Check out Room ${room.room_number}? This locks the digital concierge and clears chat history.`)) return;
    
    // Optimistic update
    setRooms(prev => prev.map(r => r.id === room.id ? { ...r, status: 'vacant', guest_email: null, guest_name: null, checkout_date: null } : r));

    // Send checkout thank-you email if we have the guest's email
    if (room.guest_email) {
      const logPayload = {
        tenant_id: tenantId,
        guest_email: room.guest_email,
        guest_name: room.guest_name || null,
        template_name: 'checkout_thanks',
        status: 'pending'
      };
      if (isOnline) {
        await supabase.from('crm_logs').insert(logPayload);
      } else {
        await enqueueMutation('crm_logs', 'INSERT', logPayload);
      }
    }

    const roomPayload = { status: 'vacant', guest_email: null, guest_name: null, checkout_date: null };
    
    if (isOnline) {
      await supabase.from('rooms').update(roomPayload).eq('id', room.id);
      await supabase.from('guest_messages').delete().eq('tenant_id', tenantId).eq('room_number', room.room_number);
    } else {
      await enqueueMutation('rooms', 'UPDATE', roomPayload, { id: room.id });
      await enqueueMutation('guest_messages', 'DELETE', null, { tenant_id: tenantId, room_number: room.room_number });
    }
  };

  const getGuestUrl = (roomNumber) => {
    return `${window.location.origin}/guest-feedback?t=${tenantId}&r=${roomNumber}`;
  };

  const downloadQrPng = (room) => {
    const svgEl = document.querySelector(`#qr-download-${room.room_number} svg`);
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement("canvas");
    canvas.width = 600; canvas.height = 600;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 600, 600);
      ctx.drawImage(img, 50, 50, 500, 500);
      const link = document.createElement("a");
      link.download = `Room-${room.room_number}-QR.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const printSingleRoom = (room) => {
    const printWindow = window.open('', '_blank');
    const url = getGuestUrl(room.room_number);
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>QR Code - Room ${room.room_number}</title>
      <style>
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: white; }
        .card { text-align: center; padding: 60px 40px; max-width: 400px; }
        h1 { font-size: 28px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0; }
        .subtitle { font-size: 16px; color: #64748b; margin: 0 0 40px 0; }
        .qr-wrap { display: inline-block; padding: 24px; background: white; border: 2px solid #e2e8f0; border-radius: 24px; }
        .qr-wrap img { display: block; }
        .room-label { margin-top: 32px; font-size: 40px; font-weight: 800; color: #1e293b; letter-spacing: -1px; }
        .room-type { font-size: 14px; color: #94a3b8; margin-top: 4px; text-transform: uppercase; letter-spacing: 2px; }
        .footer { margin-top: 32px; font-size: 13px; color: #94a3b8; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
      </head>
      <body>
        <div class="card">
          <h1>Digital Concierge</h1>
          <p class="subtitle">Scan to access room services, chat & more</p>
          <div class="qr-wrap">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}" width="300" height="300" />
          </div>
          <div class="room-label">Room ${room.room_number}</div>
          <div class="room-type">${room.room_type}</div>
          <p class="footer">Point your smartphone camera at the code above</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

  const printAllRooms = () => {
    const printWindow = window.open('', '_blank');
    const roomCards = rooms.map(room => {
      const url = getGuestUrl(room.room_number);
      return `
        <div class="card">
          <h1>Digital Concierge</h1>
          <p class="subtitle">Scan to access room services</p>
          <div class="qr-wrap">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}" width="250" height="250" />
          </div>
          <div class="room-label">Room ${room.room_number}</div>
          <div class="room-type">${room.room_type}</div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>All QR Codes</title>
      <style>
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: white; }
        .card { text-align: center; padding: 40px; page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 90vh; }
        .card:last-child { page-break-after: auto; }
        h1 { font-size: 26px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0; }
        .subtitle { font-size: 15px; color: #64748b; margin: 0 0 32px 0; }
        .qr-wrap { display: inline-block; padding: 20px; border: 2px solid #e2e8f0; border-radius: 20px; }
        .qr-wrap img { display: block; }
        .room-label { margin-top: 28px; font-size: 36px; font-weight: 800; color: #1e293b; }
        .room-type { font-size: 13px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
      </head>
      <body>${roomCards}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans relative">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Room Management</h2>
          <p className="text-slate-500 mt-1">Check guests in/out and manage room QR codes.</p>
        </div>
        <div className="flex gap-3">
          {rooms.length > 0 && (
            <button onClick={printAllRooms} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors cursor-pointer">
              <Printer className="w-4 h-4" /> Print All QR Cards
            </button>
          )}
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors cursor-pointer shadow-lg shadow-blue-500/20">
            <Plus className="w-4 h-4" /> Add Room
          </button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={handleAddRoom} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">Room Number</label>
            <input required value={newRoom.number} onChange={e => setNewRoom({...newRoom, number: e.target.value})} placeholder="e.g. 405" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">Room Type</label>
            <select value={newRoom.type} onChange={e => setNewRoom({...newRoom, type: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
              <option>Standard</option>
              <option>Deluxe</option>
              <option>Suite</option>
              <option>Penthouse</option>
            </select>
          </div>
          <button type="submit" className="px-8 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors cursor-pointer">
            Save Room
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-20 text-slate-400">Loading rooms...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {rooms.map(room => {
            const isOccupied = room.status === 'occupied';
            return (
              <div key={room.id} className={`bg-white rounded-3xl p-5 border flex flex-col transition-all ${isOccupied ? 'border-emerald-200 shadow-emerald-500/10 shadow-lg' : 'border-slate-200 shadow-sm'}`}>
                {/* Room Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 leading-none mb-1">{room.room_number}</h3>
                    <span className="text-xs font-medium text-slate-500">{room.room_type}</span>
                  </div>
                  {isOccupied ? (
                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Occupied</span>
                  ) : (
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Vacant</span>
                  )}
                </div>

                {/* QR Code Button */}
                <button 
                  onClick={() => setQrModal({ show: true, room })}
                  className="w-full flex items-center justify-center gap-2 py-2.5 mb-3 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-medium rounded-xl transition-colors cursor-pointer border border-slate-200"
                >
                  <QrCode className="w-4 h-4" /> View QR Code
                </button>

                {/* Check-in / Check-out */}
                {isOccupied ? (
                  <button onClick={() => handleCheckOut(room)} className="w-full flex items-center justify-center gap-2 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium rounded-xl transition-colors cursor-pointer">
                    <LogOut className="w-4 h-4" /> Check Out
                  </button>
                ) : (
                  <button onClick={() => setCheckInModal({ show: true, room, email: '', name: '', checkoutDate: '' })} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors cursor-pointer shadow-md shadow-blue-500/20">
                    <LogIn className="w-4 h-4" /> Check In
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ───── QR Code Modal ───── */}
      {qrModal.show && qrModal.room && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setQrModal({ show: false, room: null })}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative text-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setQrModal({ show: false, room: null })} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full cursor-pointer">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-3xl font-extrabold text-slate-900 mb-0">Room {qrModal.room.room_number}</h3>
            <p className="text-slate-500 text-sm mb-6">{qrModal.room.room_type} • {qrModal.room.status === 'occupied' ? '🟢 Occupied' : '⚪ Vacant'}</p>

            <div id={`qr-download-${qrModal.room.room_number}`} className="inline-block bg-white p-5 rounded-2xl border border-slate-200 mb-6 shadow-sm">
              <QRCodeSVG value={getGuestUrl(qrModal.room.room_number)} size={200} level="H" />
            </div>

            <p className="text-xs text-slate-400 mb-6 px-4 break-all">{getGuestUrl(qrModal.room.room_number)}</p>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.open(getGuestUrl(qrModal.room.room_number), '_blank')}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4" /> Open Guest Portal
              </button>
              <div className="flex gap-3">
                <button 
                  onClick={() => downloadQrPng(qrModal.room)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-xl transition-colors cursor-pointer border border-blue-200"
                >
                  <Download className="w-4 h-4" /> Download PNG
                </button>
                <button 
                  onClick={() => printSingleRoom(qrModal.room)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors cursor-pointer border border-slate-200"
                >
                  <Printer className="w-4 h-4" /> Print Card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───── Check-In Modal ───── */}
      {checkInModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setCheckInModal({ show: false, room: null, email: '', name: '', checkoutDate: '' })}>
          <form onSubmit={handleCheckIn} className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setCheckInModal({ show: false, room: null, email: '', name: '', checkoutDate: '' })} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-2xl font-bold text-slate-900 mb-1">Check In: Room {checkInModal.room.room_number}</h3>
            <p className="text-slate-500 text-sm mb-6">This will instantly activate the room's QR code.</p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Guest Name (Optional)</label>
              <input 
                type="text" 
                placeholder="John Doe"
                value={checkInModal.name || ''}
                onChange={e => setCheckInModal({...checkInModal, name: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Guest Email (Optional)</label>
              <input 
                type="email" 
                placeholder="guest@example.com"
                value={checkInModal.email || ''}
                onChange={e => setCheckInModal({...checkInModal, email: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
              <p className="text-xs text-slate-400 mt-2">If provided, we'll send them a Welcome Email automatically.</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Checkout Date (For Mid-Stay Check-in)</label>
              <input 
                type="date" 
                required={!!checkInModal.email}
                min={new Date().toISOString().split('T')[0]}
                value={checkInModal.checkoutDate || ''}
                onChange={e => setCheckInModal({...checkInModal, checkoutDate: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
              <p className="text-xs text-slate-400 mt-2">Required if providing email. We use this to schedule a mid-stay check-in email.</p>
            </div>

            <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors cursor-pointer shadow-lg shadow-blue-500/20">
              Confirm Check-In
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
