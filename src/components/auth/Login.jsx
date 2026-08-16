import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Hotel, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await signIn(email, password);
      // Navigate to the smart redirect — PostLoginRedirect will show a
      // spinner until AuthContext finishes resolving the user's role,
      // then sends them to /admin or /dashboard automatically.
      navigate('/post-login');
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex font-sans selection:bg-blue-500/30 bg-white">
      {/* Background Image (Right Side) */}
      <img 
        src="/login-bg.jpg" 
        alt="Luxury Hotel Room" 
        className="absolute right-0 top-0 bottom-0 w-full md:w-[65%] lg:w-[60%] h-full object-cover object-center z-0"
      />

      {/* Seamless Gradient Overlay (Fading from left to right) */}
      <div className="absolute inset-0 bg-gradient-to-t from-white via-white/90 to-transparent md:hidden z-10"></div>
      <div className="hidden md:block absolute left-0 top-0 bottom-0 w-[55%] lg:w-[45%] bg-gradient-to-l from-transparent via-white/80 to-white z-10"></div>
      
      {/* Absolute Solid Background for the far left where the form sits */}
      <div className="hidden md:block absolute left-0 top-0 bottom-0 w-[45%] lg:w-[35%] bg-white z-10"></div>

      {/* Form Container (Left Side) */}
      <div className="w-full md:w-[50%] lg:w-[40%] relative z-20 flex flex-col justify-center py-12 px-8 sm:px-12 lg:px-16 xl:px-20 min-h-screen">
        
        <div className="w-full max-w-sm mx-auto md:mx-0 mt-[-40px]">
          {/* Logo & Header */}
          <div className="flex flex-col items-start mb-16">
            <div className="flex items-center gap-4 mb-2">
              <img src="/favicon.png" alt="StayFlows Logo" className="w-12 h-12 object-contain" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold tracking-tight text-slate-900 leading-none">StayFlows Lite</span>
                <span className="text-[11px] text-slate-800 font-medium tracking-wide">Intelligent Hospitality CRM and Guest Feedback</span>
              </div>
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-normal text-slate-800 tracking-tight mb-2">
              Welcome back
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              Please enter your credentials to access the PMS.
            </p>
          </div>

          <div className="bg-transparent">
            {error && (
              <div className="mb-6 bg-red-50/90 backdrop-blur border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-start gap-3 text-sm shadow-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label htmlFor="email" className="block text-xs font-bold text-slate-400 tracking-widest uppercase mb-2">
                  Professional Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-300" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full pl-10 px-4 py-3.5 border border-slate-200 rounded-xl bg-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all"
                    placeholder="staff@hotel.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-xs font-bold text-slate-400 tracking-widest uppercase">
                    Password
                  </label>
                  <a href="#" className="text-xs font-bold text-amber-500 hover:text-amber-600 transition-colors">
                    Forgot Password?
                  </a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-300" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full pl-10 px-4 py-3.5 border border-slate-200 rounded-xl bg-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-md shadow-slate-900/10 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
                </button>
              </div>
            </form>
          </div>
          
        </div>
      </div>
    </div>
  );
}
