import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FileText, CheckCircle, XCircle, Clock, Eye, Send, Loader2, Mail, MessageSquareHeart } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const TEMPLATE_TYPES = [
  { id: 'checkin_welcome', name: 'Welcome Email', icon: Mail, description: 'Sent automatically on check-in' },
  { id: 'mid_stay', name: 'Mid-Stay Check-in', icon: Clock, description: 'Sent mid-way through the stay' },
  { id: 'checkout_thanks', name: 'Thank You & Review', icon: MessageSquareHeart, description: 'Sent automatically on check-out' }
];

export default function CrmDashboard() {
  const { tenantId } = useOutletContext();
  const [activeTab, setActiveTab] = useState('templates');
  const [activeTemplateId, setActiveTemplateId] = useState('checkin_welcome');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Template State
  const [template, setTemplate] = useState({ subject: '', body: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    if (tenantId) {
      fetchLogs();
      fetchTemplate(activeTemplateId);
    }
  }, [tenantId, activeTemplateId]);

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('crm_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    
    if (data) setLogs(data);
  };

  const fetchTemplate = async (templateId) => {
    setLoading(true);
    const { data } = await supabase
      .from('crm_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('name', templateId)
      .single();
    
    if (data) {
      setTemplate({ subject: data.subject, body: data.body });
    } else {
      // Defaults based on type
      let defaultSubject = '';
      let defaultBody = '';

      if (templateId === 'checkin_welcome') {
        defaultSubject = 'Welcome to your stay!';
        defaultBody = 'We are absolutely thrilled to host you. Please use this digital concierge to request room service, extra towels, or chat with the front desk directly.';
      } else if (templateId === 'checkout_thanks') {
        defaultSubject = 'Thank you for staying with us!';
        defaultBody = 'We hope you had a wonderful time. We would love to hear your feedback!';
      } else if (templateId === 'mid_stay') {
        defaultSubject = 'A personal check-in regarding your stay';
        defaultBody = 'I wanted to personally reach out and see how your stay is going so far. My top priority is making sure you have a beautiful and comfortable experience with us.\n\nIf there is absolutely anything you need — whether it is extra towels, a room temperature adjustment, or just a quick question — please do not hesitate to let me know. Even if you are just "managing" through a minor inconvenience, I want to hear about it so I can fix it.\n\nI am here to help, and I want to make sure your time here is perfect.';
      }
      
      setTemplate({ subject: defaultSubject, body: defaultBody });
      
      await supabase.from('crm_templates').insert({
        tenant_id: tenantId,
        name: templateId,
        subject: defaultSubject,
        body: defaultBody
      });
    }
    setLoading(false);
  };

  const handleSaveTemplate = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('crm_templates')
      .upsert({ 
        tenant_id: tenantId, 
        name: activeTemplateId,
        subject: template.subject, 
        body: template.body 
      }, { onConflict: 'tenant_id, name' });
    
    setSaving(false);
    if (!error) {
      setSaveMsg('Saved successfully!');
      setTimeout(() => setSaveMsg(''), 3000);
    } else {
      setSaveMsg('Error saving template.');
    }
  };

  const activeTemplateMeta = TEMPLATE_TYPES.find(t => t.id === activeTemplateId);

  return (
    <div className="max-w-6xl mx-auto font-sans">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">CRM & Messaging</h2>
          <p className="text-slate-500 mt-1">Manage automated guest communications.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200 mb-8">
        <button 
          onClick={() => setActiveTab('templates')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors cursor-pointer ${activeTab === 'templates' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Email Templates
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors cursor-pointer ${activeTab === 'logs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Communication Logs
        </button>
      </div>

      {activeTab === 'templates' ? (
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Template Switcher Sidebar */}
          <div className="w-full lg:w-64 shrink-0 space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Automated Emails</h3>
            {TEMPLATE_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => setActiveTemplateId(type.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all cursor-pointer ${activeTemplateId === type.id ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'bg-transparent text-slate-600 hover:bg-slate-50 border border-transparent'}`}
              >
                <div className={`p-2 rounded-xl ${activeTemplateId === type.id ? 'bg-blue-100/50' : 'bg-slate-100'}`}>
                  <type.icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{type.name}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Editor Area */}
          <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Editor Form */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col h-full">
              {loading ? (
                <div className="flex-1 flex justify-center items-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 leading-none">{activeTemplateMeta.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">{activeTemplateMeta.description}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-5 flex-1">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Subject Line</label>
                      <input 
                        type="text" 
                        value={template.subject}
                        onChange={e => setTemplate({...template, subject: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                      />
                    </div>
                    <div className="flex-1 flex flex-col">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Message Body</label>
                      <textarea 
                        value={template.body}
                        onChange={e => setTemplate({...template, body: e.target.value})}
                        className="w-full flex-1 min-h-[200px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none" 
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-100">
                    <span className="text-sm font-medium text-emerald-600">{saveMsg}</span>
                    <button 
                      onClick={handleSaveTemplate}
                      disabled={saving}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-70"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Save Template
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Live Preview */}
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 flex flex-col items-center justify-center relative overflow-hidden hidden xl:flex">
               <div className="absolute top-4 left-4 flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm text-xs font-semibold text-slate-500 border border-slate-100">
                 <Eye className="w-3 h-3" /> Live Preview
               </div>

               {/* Phone Mockup */}
               <div className="w-[300px] bg-white rounded-[2rem] shadow-2xl overflow-hidden border-[6px] border-slate-800 mt-4 relative">
                  {/* Header */}
                  <div className="bg-slate-900 text-white text-center py-6 px-6 relative overflow-hidden">
                     <h2 className="text-xl font-bold relative z-10">Hotel Name</h2>
                  </div>
                  {/* Body */}
                  <div className="p-6 text-center bg-slate-50/50">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">{template.subject || "Subject"}</h3>
                    <div className="text-slate-600 text-sm whitespace-pre-wrap mb-8 text-left leading-relaxed">
                      {template.body || "Your message will appear here."}
                    </div>
                    
                    {activeTemplateId === 'checkout_thanks' ? (
                      <div className="space-y-3">
                        <button className="w-full bg-white text-slate-800 font-medium py-2.5 rounded-xl shadow-md cursor-default text-sm flex items-center justify-center gap-2 border border-slate-200">
                          <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                          Leave a Google Review
                        </button>
                        <button className="w-full bg-[#003580] text-white font-medium py-2.5 rounded-xl shadow-md cursor-default text-sm flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M2 2h20v20H2V2zm3.2 3.2v13.6h5.3v-4.5h1.7c3.1 0 5.6-1.8 5.6-4.6 0-2.7-2.5-4.5-5.6-4.5H5.2zm3.4 2.8h2.8c1.4 0 2.3.7 2.3 1.7s-.9 1.7-2.3 1.7H8.6V8z"/></svg>
                          Review on Booking.com
                        </button>
                        <div className="flex justify-center gap-4 mt-6 pt-4 border-t border-slate-200">
                          {/* Facebook */}
                          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center" title="Facebook">
                            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                          </div>
                          {/* Instagram */}
                          <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center" title="Instagram">
                            <svg className="w-5 h-5 text-pink-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                          </div>
                          {/* Twitter/X */}
                          <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center" title="Twitter/X">
                            <svg className="w-4 h-4 text-sky-600" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button className="w-full bg-blue-600 text-white font-medium py-3 rounded-xl shadow-md cursor-default text-sm">
                        Access Digital Concierge
                      </button>
                    )}
                  </div>
               </div>
            </div>
          </div>
          
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          {logs.length === 0 ? (
            <div className="text-center py-20 text-slate-400 flex flex-col items-center">
              <Send className="w-12 h-12 text-slate-200 mb-4" />
              <p>No emails have been sent yet.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Guest Email</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Template</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{log.guest_email}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-medium border border-slate-200">{log.template_name}</span>
                    </td>
                    <td className="px-6 py-4">
                      {log.status === 'sent' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" /> Sent
                        </span>
                      ) : log.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 font-semibold">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      ) : (
                        <span title={log.status} className="inline-flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 font-semibold cursor-help">
                          <XCircle className="w-3.5 h-3.5" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400 text-right">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
