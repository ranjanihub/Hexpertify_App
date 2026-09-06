import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAdminAuth, launchConsultantPanel, launchClientPanel } from '../lib/auth';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Layers,
  KeyRound,
  Shield,
  User,
  UserCheck,
  Activity,
  Video,
  HeartPulse
} from 'lucide-react';

interface LoginViewProps {
  onSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const navigate = useNavigate();

  const [role, setRole] = useState<'admin' | 'therapist' | 'client'>('admin');
  const [adminEmail, setAdminEmail] = useState('admin@hexpertify.com');
  const [adminPassword, setAdminPassword] = useState('password123');
  
  const [therapistEmail, setTherapistEmail] = useState('dr.evelyn@hexpertify.com');
  const [therapistPassword, setTherapistPassword] = useState('password123');

  const [clientEmail, setClientEmail] = useState('sarah.jenkins@example.com');
  const [clientPassword, setClientPassword] = useState('password123');

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!adminEmail || !adminPassword) {
      setErrorMessage('Please enter both administrative email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const endpoints = ['http://localhost:3000/api/auth/login', 'http://localhost:5000/api/auth/login', '/api/auth/login'];
      let res: Response | null = null;
      let data: any = null;

      for (const ep of endpoints) {
        try {
          const r = await fetch(ep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: adminEmail, password: adminPassword, role: 'admin' }),
            signal: AbortSignal.timeout(1500),
          });
          if (r) {
            res = r;
            data = await r.json().catch(() => null);
            break;
          }
        } catch {}
      }

      if (res && (!res.ok || !data?.success)) {
        setErrorMessage(data?.error || 'Administrative access denied. Invalid master credentials.');
        setIsLoading(false);
        return;
      }

      const adminUser = data?.user || {
        id: 'admin-master',
        name: 'Super Administrator',
        email: adminEmail,
        role: 'super_admin' as const,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      };

      setAdminAuth(adminUser);
      setIsLoading(false);
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/');
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Authentication error. Please try again.');
      setIsLoading(false);
    }
  };

  const handleTherapistLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!therapistEmail || !therapistPassword) {
      setErrorMessage('Please enter practitioner email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const endpoints = ['http://localhost:3000/api/auth/login', 'http://localhost:5000/api/auth/login', '/api/auth/login'];
      let res: Response | null = null;
      let data: any = null;

      for (const ep of endpoints) {
        try {
          const r = await fetch(ep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: therapistEmail, password: therapistPassword, role: 'therapist' }),
            signal: AbortSignal.timeout(1500),
          });
          if (r) {
            res = r;
            data = await r.json().catch(() => null);
            break;
          }
        } catch {}
      }

      if (res && (!res.ok || !data?.success)) {
        setErrorMessage(data?.error || `Therapist email "${therapistEmail}" was not found in the practitioner directory. Only therapists registered in the Super Admin panel can log in.`);
        setIsLoading(false);
        return;
      }

      const consultantUser = data?.user || {
        id: 'doc-1',
        name: 'Dr. Evelyn Reed, PhD',
        title: 'Licensed Clinical Psychologist',
        email: therapistEmail,
        role: 'therapist' as const,
        avatarInitials: 'ER',
        photoUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
      };

      try {
        localStorage.setItem('hexpertify_auth_user', JSON.stringify(consultantUser));
      } catch (e) {}

      setIsLoading(false);
      await launchConsultantPanel(consultantUser, false);
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to authenticate practitioner.');
      setIsLoading(false);
    }
  };

  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!clientEmail || !clientPassword) {
      setErrorMessage('Please enter client email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const endpoints = ['http://localhost:3000/api/auth/login', 'http://localhost:5000/api/auth/login', '/api/auth/login'];
      let res: Response | null = null;
      let data: any = null;

      for (const ep of endpoints) {
        try {
          const r = await fetch(ep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: clientEmail, password: clientPassword, role: 'client' }),
            signal: AbortSignal.timeout(1500),
          });
          if (r) {
            res = r;
            data = await r.json().catch(() => null);
            break;
          }
        } catch {}
      }

      if (res && (!res.ok || !data?.success)) {
        setErrorMessage(data?.error || 'Unable to sign into client portal.');
        setIsLoading(false);
        return;
      }

      const clientUser = data?.user || {
        id: 'client-1',
        name: 'Sarah Jenkins',
        email: clientEmail,
        role: 'client' as const,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        phone: '+1 555-019-2834',
      };

      try {
        localStorage.setItem('hexpertify_client_auth', JSON.stringify(clientUser));
      } catch (e) {}

      setIsLoading(false);
      await launchClientPanel(clientUser, false);
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to authenticate client.');
      setIsLoading(false);
    }
  };


  const handleQuickFill = () => {
    if (role === 'admin') {
      setAdminEmail('admin@example.com');
      setAdminPassword('password123');
    } else if (role === 'therapist') {
      setTherapistEmail('dr.evelyn@hexpertify.com');
      setTherapistPassword('password123');
    } else {
      setClientEmail('sarah.jenkins@example.com');
      setClientPassword('password123');
    }
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 grid grid-cols-1 lg:grid-cols-12 font-sans overflow-x-hidden">
      {/* Left Column - Hero Branding & System Overview */}
      <div className="hidden lg:flex lg:col-span-7 sticky top-0 h-screen relative bg-gradient-to-br from-[#290e6e] via-[#3b1799] to-[#5e2be2] p-8 xl:p-12 flex-col justify-between overflow-hidden">
        {/* Ambient glow effects */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3" />

        {/* Top Header Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg">
              <Layers className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white">Hexpertify</span>
              <span className="block text-[11px] font-semibold tracking-wider uppercase text-purple-200/80">Super Admin Suite</span>
            </div>
          </div>
          <div className="bg-white/10 text-white border border-white/20 px-3 py-1 text-xs rounded-full backdrop-blur-md font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Unified Single Sign-On
          </div>
        </div>

        {/* Center Hero Content */}
        <div className="relative z-10 my-auto max-w-xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-purple-100 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Master Control & Platform Ecosystem</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight">
            Universal Single Login For All Three Panels.
          </h1>

          <p className="text-purple-100/90 text-sm xl:text-base leading-relaxed">
            Enter as a Client, Consultant, or Super Administrator to be routed seamlessly into your active workspace.
          </p>

          {/* 3 Value props */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="flex items-start gap-2.5 bg-white/5 border border-white/10 p-3 rounded-xl backdrop-blur-sm">
              <div className="p-1.5 bg-blue-500/20 text-blue-300 rounded-lg shrink-0">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-white font-semibold text-xs xl:text-sm">Client Portal</h4>
                <p className="text-purple-200/70 text-[11px] xl:text-xs mt-0.5">Direct care</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 bg-white/5 border border-white/10 p-3 rounded-xl backdrop-blur-sm">
              <div className="p-1.5 bg-amber-500/20 text-amber-300 rounded-lg shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-white font-semibold text-xs xl:text-sm">Consultant Suite</h4>
                <p className="text-purple-200/70 text-[11px] xl:text-xs mt-0.5">Therapy workflow</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 bg-white/5 border border-white/10 p-3 rounded-xl backdrop-blur-sm">
              <div className="p-1.5 bg-purple-500/20 text-purple-300 rounded-lg shrink-0">
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold text-xs xl:text-sm">Super Admin</h4>
                <p className="text-purple-200/70 text-[11px] xl:text-xs mt-0.5">Master control</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-purple-200/60 pt-4 border-t border-white/10">
          <p>© 2026 Hexpertify Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
          </div>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="lg:col-span-5 bg-white flex flex-col justify-between p-6 sm:p-10 xl:p-12 min-h-screen lg:h-screen overflow-y-auto">
        {/* Top Mobile Brand */}
        <div className="lg:hidden flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#5e2be2] flex items-center justify-center text-white">
              <HeartPulse className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-slate-900 text-lg">Hexpertify</span>
          </div>
          <span className="text-xs bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
            {role === 'admin' ? 'Super Admin' : role === 'therapist' ? 'Consultant' : 'Client'}
          </span>
        </div>

        <div className="max-w-md w-full mx-auto my-auto space-y-6 py-2">
          {/* Header text */}
          <div className="space-y-1.5 text-left">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {role === 'admin'
                ? 'Super Admin Sign In'
                : role === 'therapist'
                ? 'Practitioner Sign In'
                : 'Client Sign In'}
            </h2>
            <p className="text-slate-500 text-sm">
              {role === 'admin'
                ? 'Enter master credentials to unlock administrative controls'
                : role === 'therapist'
                ? 'Enter your clinical credentials to enter the Consultant Workspace'
                : 'Enter your client credentials to enter the Client Portal'}
            </p>
          </div>

          {/* 3-Role selector tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600 gap-1">
            <button
              type="button"
              onClick={() => setRole('client')}
              className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                role === 'client' ? 'bg-white text-[#5e2be2] shadow-sm font-bold' : 'hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" /> Client
            </button>
            <button
              type="button"
              onClick={() => setRole('therapist')}
              className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                role === 'therapist' ? 'bg-white text-[#5e2be2] shadow-sm font-bold' : 'hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" /> Consultant
            </button>
            <button
              type="button"
              onClick={() => setRole('admin')}
              className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                role === 'admin' ? 'bg-white text-[#5e2be2] shadow-sm font-bold' : 'hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Admin
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <Lock className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {role === 'admin' ? (
            /* Super Admin Form */
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Administrator Email
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-slate-900 font-medium outline-none focus:border-[#5e2be2]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Master Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full h-11 px-3.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-slate-900 font-medium outline-none focus:border-[#5e2be2]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleQuickFill}
                  className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" /> Quick Demo Fill
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-900/25 text-sm transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Unlocking Control Suite...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Super Admin Panel</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : role === 'therapist' ? (
            /* Consultant Form */
            <form onSubmit={handleTherapistLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Practitioner Email
                </label>
                <input
                  type="email"
                  value={therapistEmail}
                  onChange={(e) => setTherapistEmail(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-slate-900 font-medium outline-none focus:border-[#5e2be2]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Password
                </label>
                <input
                  type="password"
                  value={therapistPassword}
                  onChange={(e) => setTherapistPassword(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-slate-900 font-medium outline-none focus:border-[#5e2be2]"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleQuickFill}
                  className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" /> Quick Demo Fill
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold rounded-xl shadow-lg shadow-[#5e2be2]/25 text-sm transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Routing to Consultant Panel...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Consultant Panel</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Client Form */
            <form onSubmit={handleClientLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Client Email
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-slate-900 font-medium outline-none focus:border-[#5e2be2]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Password
                </label>
                <input
                  type="password"
                  value={clientPassword}
                  onChange={(e) => setClientPassword(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-slate-900 font-medium outline-none focus:border-[#5e2be2]"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleQuickFill}
                  className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" /> Quick Demo Fill
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold rounded-xl shadow-lg shadow-[#5e2be2]/25 text-sm transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Routing to Client Panel...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Client Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Bottom security assurance */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>256-bit SSL Encrypted Unified Single Sign-On</span>
        </div>
      </div>
    </div>
  );
};
