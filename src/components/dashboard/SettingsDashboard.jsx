import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Save, Loader2, Link as LinkIcon, Building2, Star, Users, Plus, Trash2, Shield, UserCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function SettingsDashboard() {
  const { tenantId } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  
  const [settings, setSettings] = useState({
    hotel_name: '',
    manager_email: '',
    feedback_email: '',
    wifi_password: '',
    google_review_link: '',
    ota_review_link: '',
    facebook_url: '',
    instagram_url: '',
    twitter_url: ''
  });

  // Team Management State
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'receptionist' });
  const [teamMsg, setTeamMsg] = useState('');

  useEffect(() => {
    if (tenantId) {
      fetchSettings();
      fetchTeamMembers();
    }
  }, [tenantId]);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('hotel_settings')
      .select('profile')
      .eq('tenant_id', tenantId)
      .single();
    
    if (data && data.profile) {
      setSettings(prev => ({ ...prev, ...data.profile }));
    }
    setLoading(false);
  };

  const fetchTeamMembers = async () => {
    const { data } = await supabase
      .from('tenant_users')
      .select('id, email, role, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (data) setTeamMembers(data);
    setLoadingTeam(false);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddingUser(true);
    setTeamMsg('');

    try {
      const { data, error } = await supabase.functions.invoke('create-tenant-manager', {
        body: {
          email: newUser.email,
          password: newUser.password,
          tenant_id: tenantId,
          role: newUser.role
        }
      });

      if (error) throw error;
      
      // Check if the response body contains an error
      if (data?.error) throw new Error(data.error);

      setTeamMsg(`✓ ${newUser.role === 'manager' ? 'Manager' : 'Front Desk'} account created for ${newUser.email}`);
      setNewUser({ email: '', password: '', role: 'receptionist' });
      setShowAddUser(false);
      fetchTeamMembers();
    } catch (err) {
      setTeamMsg(`✗ ${err.message}`);
    }
    setAddingUser(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const { error } = await supabase
      .from('hotel_settings')
      .update({ profile: settings })
      .eq('tenant_id', tenantId);
    
    setSaving(false);
    if (!error) {
      setSaveMsg('Settings saved successfully!');
      setTimeout(() => setSaveMsg(''), 3000);
    } else {
      setSaveMsg('Error saving settings.');
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto font-sans">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Hotel Settings</h2>
          <p className="text-slate-500 mt-1">Manage your hotel profile, links, and team.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* General Info */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" /> General Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Hotel Name</label>
              <input 
                type="text" 
                value={settings.hotel_name || ''}
                onChange={e => handleChange('hotel_name', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Manager Email</label>
              <input 
                type="email" 
                value={settings.manager_email || ''}
                onChange={e => handleChange('manager_email', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Feedback Alert Email (Where bad reviews go)</label>
              <input 
                type="email" 
                value={settings.feedback_email || ''}
                onChange={e => handleChange('feedback_email', e.target.value)}
                placeholder="e.g. alerts@hotel.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Guest Wi-Fi Password</label>
              <input 
                type="text" 
                value={settings.wifi_password || ''}
                onChange={e => handleChange('wifi_password', e.target.value)}
                placeholder="Leave blank to hide from guests"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
          </div>
        </div>

        {/* Review Links */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" /> Review Links
          </h3>
          <p className="text-sm text-slate-500 mb-6">These links are automatically embedded in your Check-Out Thank You emails.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Google Review Link</label>
              <div className="relative">
                <LinkIcon className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                <input 
                  type="url" 
                  placeholder="https://g.page/r/..."
                  value={settings.google_review_link || ''}
                  onChange={e => handleChange('google_review_link', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">OTA Review Link (Booking, Expedia, etc)</label>
              <div className="relative">
                <LinkIcon className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                <input 
                  type="url" 
                  placeholder="https://booking.com/..."
                  value={settings.ota_review_link || ''}
                  onChange={e => handleChange('ota_review_link', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-pink-500" /> Social Media
          </h3>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Facebook Page URL</label>
              <div className="relative">
                <LinkIcon className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                <input 
                  type="url" 
                  value={settings.facebook_url || ''}
                  onChange={e => handleChange('facebook_url', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Instagram Profile URL</label>
              <div className="relative">
                <LinkIcon className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                <input 
                  type="url" 
                  value={settings.instagram_url || ''}
                  onChange={e => handleChange('instagram_url', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Twitter/X Profile URL</label>
              <div className="relative">
                <LinkIcon className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                <input 
                  type="url" 
                  value={settings.twitter_url || ''}
                  onChange={e => handleChange('twitter_url', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex justify-end items-center gap-4 sticky bottom-8 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-200/50">
          <span className="text-sm font-medium text-emerald-600">{saveMsg}</span>
          <button 
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Settings
          </button>
        </div>

      </form>

      {/* Team Management Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 mt-6 mb-12">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" /> Team Management
          </h3>
          <button
            onClick={() => setShowAddUser(!showAddUser)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
          >
            {showAddUser ? 'Cancel' : <><Plus className="w-4 h-4" /> Add Team Member</>}
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-6">
          <strong>Managers</strong> can see everything: Settings, CRM & Email, Rooms & QR, plus Feedback, Tickets, and Chat.
          <br />
          <strong>Front Desk (Receptionist)</strong> can only see: Feedback, Service Tickets, and Guest Chat.
        </p>

        {teamMsg && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${teamMsg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {teamMsg}
          </div>
        )}

        {/* Add User Form */}
        {showAddUser && (
          <form onSubmit={handleAddUser} className="bg-slate-50 rounded-2xl p-6 border border-slate-200 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  required
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                  placeholder="staff@hotel.com"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={newUser.password}
                  onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                  placeholder="Min 6 characters"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  <option value="receptionist">Front Desk (Receptionist)</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={addingUser}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {addingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {addingUser ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        )}

        {/* Team List */}
        {loadingTeam ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : teamMembers.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No team members found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teamMembers.map(member => (
              <div key={member.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-5 py-4 border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${member.role === 'manager' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {member.role === 'manager' ? <Shield className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{member.email || 'No email on record'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Added {new Date(member.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${member.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  {member.role === 'manager' ? 'Manager' : 'Front Desk'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
