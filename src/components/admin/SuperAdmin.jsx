import { useState, useEffect } from 'react';
import { Building2, Plus, Copy, Power, Link, Users, Check, X, ExternalLink, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function SuperAdmin() {
  const { signOut } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    managerEmail: '',
    managerPassword: '',
    googleReviewLink: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    const { data } = await supabase.from('tenants').select('*, hotel_settings(profile)').order('created_at', { ascending: false });
    if (data) setTenants(data);
    setLoading(false);
  };

  const generateSlug = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
  };

  const handleNameChange = (val) => {
    setFormData(prev => ({ ...prev, name: val, slug: generateSlug(val) }));
  };

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: tenant, error } = await supabase.from('tenants').insert({
        name: formData.name,
        slug: formData.slug,
        is_active: true
      }).select().single();

      if (error) throw error;

      await supabase.from('hotel_settings').insert({
        tenant_id: tenant.id,
        profile: {
          hotel_name: formData.name,
          manager_email: formData.managerEmail,
          google_review_link: formData.googleReviewLink,
          logo_url: ''
        }
      });

      // Provision manager user account using the new secure Edge Function
      if (formData.managerEmail && formData.managerPassword) {
        const { error: funcError } = await supabase.functions.invoke('create-tenant-manager', {
          body: {
            email: formData.managerEmail,
            password: formData.managerPassword,
            tenant_id: tenant.id
          }
        });

        if (funcError) {
          throw new Error(`Tenant created, but manager account provisioning failed: ${funcError.message}`);
        }
      }

      setFormData({ name: '', slug: '', managerEmail: '', managerPassword: '', googleReviewLink: '' });
      setShowForm(false);
      fetchTenants();
    } catch (err) {
      console.error(err);
      alert('Error creating hotel: ' + err.message);
    }
    setSaving(false);
  };

  const toggleActive = async (tenant) => {
    await supabase.from('tenants').update({ is_active: !tenant.is_active }).eq('id', tenant.id);
    setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, is_active: !t.is_active } : t));
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const guestUrl = (id) => `${window.location.origin}/guest-feedback?t=${id}`;
  const dashUrl = (id) => `${window.location.origin}/dashboard?t=${id}`;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-[-15%] left-[-5%] w-[400px] h-[400px] bg-blue-600/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[400px] h-[400px] bg-purple-600/8 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Platform Admin</h1>
              <p className="text-slate-400 text-sm mt-0.5">{tenants.length} hotel{tenants.length !== 1 ? 's' : ''} registered</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-white/10 text-white font-medium rounded-2xl transition-all shadow-lg hover:shadow-xl cursor-pointer"
            >
              {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {showForm ? 'Cancel' : 'Add Hotel'}
            </button>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-200 text-slate-900 font-medium rounded-2xl transition-all shadow-lg hover:shadow-xl cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Create Hotel Form */}
        {showForm && (
          <form onSubmit={handleCreateTenant} className="bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 border border-white/5 mb-10 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
              <Plus className="w-5 h-5 text-blue-400" /> Register a New Hotel
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">Hotel Name *</label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Sunset Beach Resort"
                  className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">URL Slug *</label>
                <input
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="sunset-beach-resort"
                  className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">Manager Email *</label>
                <input
                  required
                  type="email"
                  value={formData.managerEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, managerEmail: e.target.value }))}
                  placeholder="gm@sunsetbeach.com"
                  className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">Manager Password *</label>
                <input
                  required
                  type="password"
                  value={formData.managerPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, managerPassword: e.target.value }))}
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">Google Review Link</label>
                <input
                  type="url"
                  value={formData.googleReviewLink}
                  onChange={(e) => setFormData(prev => ({ ...prev, googleReviewLink: e.target.value }))}
                  placeholder="https://g.page/sunsetbeach/review"
                  className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-2xl transition-all shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Hotel'}
              </button>
            </div>
          </form>
        )}

        {/* Tenants List */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">Loading hotels...</div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No hotels registered yet.</p>
            <p className="text-slate-500 text-sm mt-1">Click "Add Hotel" to register your first property.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {tenants.map((tenant) => {
              const profile = tenant.hotel_settings?.[0]?.profile || {};
              return (
                <div key={tenant.id} className="bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden hover:border-white/10 transition-all group">
                  <div className="p-6 flex flex-col lg:flex-row lg:items-center gap-6">
                    {/* Hotel Info */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${tenant.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold truncate">{tenant.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-slate-500 text-sm font-mono">/{tenant.slug}</span>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${tenant.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${tenant.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                            {tenant.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => toggleActive(tenant)}
                        title={tenant.is_active ? 'Deactivate' : 'Activate'}
                        className={`p-3 rounded-xl transition-colors cursor-pointer ${tenant.is_active ? 'bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400' : 'bg-slate-800 hover:bg-emerald-900/30 text-slate-400 hover:text-emerald-400'}`}
                      >
                        <Power className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Links Bar */}
                  <div className="px-6 pb-5 flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 flex items-center gap-2 bg-slate-950/50 rounded-xl px-4 py-3 border border-slate-800/50">
                      <Link className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="text-sm text-slate-400 truncate flex-1 font-mono">{guestUrl(tenant.id)}</span>
                      <button
                        onClick={() => copyToClipboard(guestUrl(tenant.id), `guest-${tenant.id}`)}
                        className="shrink-0 text-slate-500 hover:text-white transition-colors cursor-pointer"
                        title="Copy Guest Feedback URL"
                      >
                        {copiedId === `guest-${tenant.id}` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="flex-1 flex items-center gap-2 bg-slate-950/50 rounded-xl px-4 py-3 border border-slate-800/50">
                      <Users className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="text-sm text-slate-400 truncate flex-1 font-mono">{dashUrl(tenant.id)}</span>
                      <button
                        onClick={() => copyToClipboard(dashUrl(tenant.id), `dash-${tenant.id}`)}
                        className="shrink-0 text-slate-500 hover:text-white transition-colors cursor-pointer"
                        title="Copy Dashboard URL"
                      >
                        {copiedId === `dash-${tenant.id}` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Meta */}
                  {profile.manager_email && (
                    <div className="px-6 pb-5 text-sm text-slate-500">
                      Manager: <span className="text-slate-400">{profile.manager_email}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
