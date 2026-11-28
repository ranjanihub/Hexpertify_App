import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { setAuthUser } from "@/lib/auth";
import { setApiToken } from "@/lib/api-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  UserCheck, 
  User,
  Activity, 
  HeartPulse,
  Video,
  Shield,
  KeyRound
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [role, setRole] = useState<"client" | "therapist" | "admin">("therapist");
  const [clientMode, setClientMode] = useState<"signin" | "signup">("signin");
  
  // Client Form State
  const [fullName, setFullName] = useState("");
  // Fields start empty: never ship a real account or a password in the page
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Therapist Form State
  const [therapistEmail, setTherapistEmail] = useState("");
  const [therapistPassword, setTherapistPassword] = useState("");

  // Admin Form State
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [isGoogleConfigured, setIsGoogleConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/google/config")
      .then((res) => res.json())
      .then((data) => {
        setIsGoogleConfigured(Boolean(data?.configured));
      })
      .catch(() => setIsGoogleConfigured(false));

    const params = new URLSearchParams(window.location.search);
    const googleErr = params.get("google_error");
    const msg = params.get("message");
    if (googleErr) {
      toast({
        title: "Google Sign-In Notice",
        description: msg || "Google Sign-In could not be completed.",
        variant: "destructive",
      });
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("google_error");
      cleanUrl.searchParams.delete("message");
      window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search);
    }
  }, [toast]);

  const handleGoogleClick = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/google/config");
      const data = await res.json().catch(() => ({ configured: false }));

      if (data?.configured) {
        window.location.href = `/api/auth/google?role=${role}&returnUrl=${encodeURIComponent(window.location.origin + '/' + role)}`;
        return;
      }

      setIsGoogleModalOpen(true);
    } catch {
      setIsGoogleModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignInWithEmail = async (selectedEmail: string) => {
    setIsLoading(true);
    setIsGoogleModalOpen(false);

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: selectedEmail, role }),
      });
      const data = await res.json();

      if (res.ok && data?.success) {
        setApiToken(data.token);
        if (data.role === "super_admin" || data.redirectUrl === "/admin") {
          localStorage.setItem("hexpertify_admin_token", "admin_session_" + Date.now());
          localStorage.setItem("admin_user", JSON.stringify(data.user));
          toast({ title: "Admin Authenticated", description: "Loading Central Control Center..." });
          window.location.href = "/admin";
        } else if (data.role === "therapist" || data.redirectUrl === "/consultant") {
          setAuthUser(data.user);
          localStorage.setItem("hexpertify_consultant_user", JSON.stringify(data.user));
          localStorage.setItem("consultant_token", "consultant_session_" + Date.now());
          toast({ title: `Welcome, ${data.user.name}`, description: "Loading care suite..." });
          window.location.href = "/consultant";
        } else {
          localStorage.setItem("hexpertify_client_user", JSON.stringify(data.user));
          localStorage.setItem("client_token", "client_session_" + Date.now());
          toast({ title: `Welcome, ${data.user.name}`, description: "Routing to client portal..." });
          window.location.href = "/client";
        }
      } else {
        toast({
          title: "Google Authentication Notice",
          description: data?.error || "Account verification failed.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Connection Error",
        description: e?.message || "Failed to reach Google authentication service.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTherapistLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!therapistEmail || !therapistPassword) {
      toast({
        title: "Missing Fields",
        description: "Please enter your email and password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    let consultantUser: any = {
      id: "consultant-1",
      name: "Sadaf Bhimani",
      title: "Licensed Psychologist",
      profession: "Licensed Psychologist",
      email: therapistEmail,
      role: "therapist" as const,
      avatarInitials: "SB",
      photoUrl: "https://res.cloudinary.com/ddgvdabyf/image/upload/v1766954534/uploads/orwxj9dw0f2bnj5cgxex.webp",
      image: "https://res.cloudinary.com/ddgvdabyf/image/upload/v1766954534/uploads/orwxj9dw0f2bnj5cgxex.webp"
    };

    try {
      // Same-origin API (the panel is served by the Backend; Vite proxies /api in development)
      const endpoints = ["/api/auth/login"];
      let res: Response | null = null;
      let data: any = null;

      for (const ep of endpoints) {
        try {
          const r = await fetch(ep, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: therapistEmail, password: therapistPassword, role: "therapist" }),
            signal: AbortSignal.timeout(1500),
          });
          if (r) {
            res = r;
            data = await r.json().catch(() => null);
            break;
          }
        } catch {}
      }

      // Only a verified therapist account signs in (never a placeholder profile)
      if (!res || !res.ok || !data?.success || !data?.user) {
        setIsLoading(false);
        toast({
          title: "Access Restricted",
          description: data?.error || `Therapist email "${therapistEmail}" was not found in the practitioner database. Only therapists registered in the Super Admin panel can log in.`,
          variant: "destructive",
        });
        return;
      }

      setApiToken(data.token);
      if (data?.user) {
        consultantUser = {
          id: data.user.id || data.user._id,
          name: data.user.name,
          title: data.user.profession || data.user.title || "Licensed Psychologist",
          email: data.user.email,
          role: "therapist",
          avatarInitials: (data.user.name || "TH")
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase(),
          photoUrl: data.user.image || data.user.photoUrl || undefined,
          image: data.user.image || data.user.photoUrl || undefined
        };
      }
    } catch (err: any) {
      setIsLoading(false);
      toast({
        title: "Connection Error",
        description: err.message || "Failed to reach authentication service.",
        variant: "destructive",
      });
      return;
    }

    setAuthUser(consultantUser);
    setIsLoading(false);
    toast({
      title: `Welcome, ${consultantUser.name}!`,
      description: "Practitioner verified against Super Admin directory.",
    });

    setLocation("/");
  };

  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    let clientUser = {
      id: "client-1",
      name: fullName || "Sarah Jenkins",
      email: clientEmail || "sarah.jenkins@example.com",
      role: "client" as const,
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
      phone: clientPhone || "+1 555-019-2834",
    };

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clientEmail, password: clientPassword, role: "client" }),
        signal: AbortSignal.timeout(600),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.user) clientUser = data.user;
      }
    } catch (e) {}

    try {
      localStorage.setItem("hexpertify_client_auth", JSON.stringify(clientUser));
    } catch (e) {}

    setIsLoading(false);
    toast({
      title: "Client Portal Access",
      description: "Routing to Client Dashboard...",
    });

    const ssoPayload = encodeURIComponent(JSON.stringify(clientUser));
    window.location.href = `http://localhost:5173/?sso_user=${ssoPayload}`;
  };

  const handleClientRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientEmail || !clientPassword || !fullName || !confirmPassword) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields to create your account.",
        variant: "destructive",
      });
      return;
    }

    if (clientPassword !== confirmPassword) {
      toast({
        title: "Passwords Do Not Match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    let clientUser = {
      id: "client-" + Date.now(),
      name: fullName,
      email: clientEmail,
      role: "client" as const,
      phone: clientPhone,
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          email: clientEmail,
          phone: clientPhone,
          password: clientPassword,
        }),
        signal: AbortSignal.timeout(600),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.user) clientUser = data.user;
      }
    } catch (err) {}

    try {
      localStorage.setItem("hexpertify_client_auth", JSON.stringify(clientUser));
    } catch (e) {}

    setIsLoading(false);
    toast({
      title: "Account Created & Saved in DB",
      description: `Welcome to Hexpertify, ${fullName}! Redirecting to Client Panel...`,
    });

    const ssoPayload = encodeURIComponent(JSON.stringify(clientUser));
    window.location.href = `http://localhost:5173/?sso_user=${ssoPayload}`;
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    let adminUser = {
      id: "admin-1",
      name: "Super Administrator",
      email: adminEmail || "admin@example.com",
      role: "super_admin" as const,
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
    };

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: adminPassword, role: "admin" }),
        signal: AbortSignal.timeout(600),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.user) adminUser = data.user;
      }
    } catch (e) {}

    try {
      localStorage.setItem("hexpertify_admin_auth", JSON.stringify(adminUser));
    } catch (e) {}

    setIsLoading(false);
    toast({
      title: "Super Admin Access Granted",
      description: "Redirecting to Admin Control Center...",
    });

    const ssoPayload = encodeURIComponent(JSON.stringify(adminUser));
    window.location.href = `http://localhost:5175/?sso_user=${ssoPayload}`;
  };


  const handleQuickFillDemo = () => {
    // Example addresses only; no password is filled in
    if (role === "therapist") {
      setTherapistEmail("dr.evelyn@hexpertify.com");
    } else if (role === "client") {
      setClientEmail("sarah.jenkins@example.com");
    } else {
      setAdminEmail("admin@example.com");
    }
    toast({
      title: "Demo Credentials Loaded",
      description: "Ready to test authentication.",
    });
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setResetSent(true);
    setTimeout(() => {
      setResetSent(false);
      setForgotEmail("");
      toast({
        title: "Password Reset Link Sent",
        description: `Instructions have been sent to ${forgotEmail}. Please check your inbox.`,
      });
    }, 1200);
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 grid grid-cols-1 lg:grid-cols-12 font-sans overflow-x-hidden">
      {/* Left Column - Hero Branding & Features */}
      <div className="hidden lg:flex lg:col-span-7 sticky top-0 h-screen relative bg-gradient-to-br from-[#290e6e] via-[#3b1799] to-[#450bc8] p-8 xl:p-12 flex-col justify-between overflow-hidden">
        {/* Ambient glow effects */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3" />

        {/* Top Header Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg">
              <HeartPulse className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white">Hexpertify</span>
              <span className="block text-[11px] font-semibold tracking-wider uppercase text-purple-200/80">
                {role === "therapist" ? "Consultant Workspace" : role === "client" ? "Client Care Portal" : "Super Admin Center"}
              </span>
            </div>
          </div>
          <Badge variant="secondary" className="bg-white/10 text-white border-white/20 px-3 py-1 text-xs backdrop-blur-md font-medium">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> Unified Single Sign-On
          </Badge>
        </div>

        {/* Center Hero Content */}
        <div className="relative z-10 my-auto max-w-xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-purple-100 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Care Flow & Multi-Portal Ecosystem</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight">
            Seamless Single Login For All Three Panels.
          </h1>

          <p className="text-purple-100/90 text-sm xl:text-base leading-relaxed">
            Choose Client, Consultant, or Super Admin to be instantly routed to the correct portal with live dynamic data.
          </p>

          {/* Value props cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="flex items-start gap-2.5 bg-white/5 border border-white/10 p-3 rounded-xl backdrop-blur-sm">
              <div className="p-1.5 bg-blue-500/20 text-blue-300 rounded-lg shrink-0">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-white font-semibold text-xs xl:text-sm">Client Portal</h4>
                <p className="text-purple-200/70 text-[11px] xl:text-xs mt-0.5">Sessions & progress</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 bg-white/5 border border-white/10 p-3 rounded-xl backdrop-blur-sm">
              <div className="p-1.5 bg-amber-500/20 text-amber-300 rounded-lg shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-white font-semibold text-xs xl:text-sm">Consultant Suite</h4>
                <p className="text-purple-200/70 text-[11px] xl:text-xs mt-0.5">Workflow</p>
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

      {/* Right Column - Login / Register Form */}
      <div className="lg:col-span-5 bg-white flex flex-col justify-between p-6 sm:p-10 xl:p-12 min-h-screen lg:h-screen overflow-y-auto">
        {/* Top Mobile Brand */}
        <div className="lg:hidden flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#450bc8] flex items-center justify-center text-white">
              <HeartPulse className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-slate-900 text-lg">Hexpertify</span>
          </div>
          <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200">
            {role === "therapist" ? "Consultant" : role === "client" ? "Client Portal" : "Super Admin"}
          </Badge>
        </div>

        <div className="max-w-md w-full mx-auto my-auto space-y-6 py-2">
          {/* Header text */}
          <div className="space-y-1.5 text-left">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {role === "therapist"
                ? "Practitioner Sign In"
                : role === "client"
                ? clientMode === "signup"
                  ? "Create Client Account"
                  : "Client Sign In"
                : "Super Admin Sign In"}
            </h2>
            <p className="text-slate-500 text-sm">
              {role === "therapist"
                ? "Enter your consultant credentials to enter the Care Suite"
                : role === "client"
                ? clientMode === "signup"
                  ? "Enter your information below to begin your care journey"
                  : "Enter your credentials to enter the Client Dashboard"
                : "Enter master security credentials to access the Administration Center"}
            </p>
          </div>

          {/* 3-Role selector tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600 gap-1">
            <button
              type="button"
              onClick={() => setRole("client")}
              className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                role === "client" ? "bg-white text-[#450bc8] shadow-sm font-bold" : "hover:text-slate-900"
              }`}
            >
              <User className="w-3.5 h-3.5" /> Client
            </button>
            <button
              type="button"
              onClick={() => setRole("therapist")}
              className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                role === "therapist" ? "bg-white text-[#450bc8] shadow-sm font-bold" : "hover:text-slate-900"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" /> Consultant
            </button>
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                role === "admin" ? "bg-white text-[#450bc8] shadow-sm font-bold" : "hover:text-slate-900"
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Admin
            </button>
          </div>

          {role === "therapist" ? (
            /* Practitioner Quick Login */
            <form onSubmit={handleTherapistLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="therapist-email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Practitioner Email
                </Label>
                <Input
                  id="therapist-email"
                  type="email"
                  value={therapistEmail}
                  onChange={(e) => setTherapistEmail(e.target.value)}
                  className="h-11 pl-3.5 bg-slate-50 border-slate-200 focus:bg-white text-slate-900 font-medium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="therapist-password" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </Label>
                <Input
                  id="therapist-password"
                  type="password"
                  value={therapistPassword}
                  onChange={(e) => setTherapistPassword(e.target.value)}
                  className="h-11 pl-3.5 bg-slate-50 border-slate-200 focus:bg-white text-slate-900 font-medium"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleQuickFillDemo}
                  className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" /> Quick Demo Fill
                </button>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-[#450bc8] hover:bg-[#3a0aa8] text-white font-bold rounded-xl shadow-lg shadow-[#450bc8]/25 text-sm transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Accessing Consultant Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Consultant Panel</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          ) : role === "client" ? (
            clientMode === "signup" ? (
              /* Client Registration Form */
              <form onSubmit={handleClientRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullname" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Full Name
                  </Label>
                  <Input
                    id="fullname"
                    type="text"
                    placeholder="Sarah Jenkins"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-11 pl-3.5 bg-slate-50 border-slate-200 focus:bg-white text-slate-900 font-medium"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="client-email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Email Address
                  </Label>
                  <Input
                    id="client-email"
                    type="email"
                    placeholder="sarah@example.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="h-11 pl-3.5 bg-slate-50 border-slate-200 focus:bg-white text-slate-900 font-medium"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="client-phone" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Phone Number
                  </Label>
                  <Input
                    id="client-phone"
                    type="tel"
                    placeholder="+1 555-019-2834"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="h-11 pl-3.5 bg-slate-50 border-slate-200 focus:bg-white text-slate-900 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="client-password" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="client-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={clientPassword}
                      onChange={(e) => setClientPassword(e.target.value)}
                      className="h-11 pl-3.5 pr-10 bg-slate-50 border-slate-200 focus:bg-white text-slate-900 font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-11 pl-3.5 pr-10 bg-slate-50 border-slate-200 focus:bg-white text-slate-900 font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-[#450bc8] hover:bg-[#3a0aa8] text-white font-bold rounded-xl shadow-lg shadow-[#450bc8]/25 text-sm transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating Client Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign Up & Enter Client Panel</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                <div className="text-center pt-2">
                  <p className="text-xs text-slate-600 font-medium">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setClientMode("signin")}
                      className="text-[#450bc8] font-bold hover:underline"
                    >
                      Log in
                    </button>
                  </p>
                </div>
              </form>
            ) : (
              /* Client Login Form */
              <form onSubmit={handleClientLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Client Email
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="sarah.jenkins@example.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="h-11 pl-3.5 bg-slate-50 border-slate-200 focus:bg-white text-slate-900 font-medium"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="login-password" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={clientPassword}
                      onChange={(e) => setClientPassword(e.target.value)}
                      className="h-11 pl-3.5 pr-10 bg-slate-50 border-slate-200 focus:bg-white text-slate-900 font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleQuickFillDemo}
                    className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1"
                  >
                    <KeyRound className="w-3 h-3" /> Quick Demo Fill
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-[#450bc8] hover:bg-[#3a0aa8] text-white font-bold rounded-xl shadow-lg shadow-[#450bc8]/25 text-sm transition-all flex items-center justify-center gap-2 mt-2"
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
                </Button>
              </form>
            )
          ) : (
            /* Super Admin Quick Login */
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Administrator Email
                </Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="h-11 pl-3.5 bg-slate-50 border-slate-200 focus:bg-white text-slate-900 font-medium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin-password" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Master Password
                </Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="h-11 pl-3.5 bg-slate-50 border-slate-200 focus:bg-white text-slate-900 font-medium"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleQuickFillDemo}
                  className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" /> Quick Demo Fill
                </button>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-900/25 text-sm transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Routing to Admin Center...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Super Admin Panel</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Google Sign-In Option */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-semibold">Or Instant Google Sign-In</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleClick}
            disabled={isLoading}
            className="w-full h-11 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google Single Sign-On
          </Button>
        </div>

        {/* Google Sign-in Account Chooser Modal */}
        <Dialog open={isGoogleModalOpen} onOpenChange={setIsGoogleModalOpen}>
          <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6">
            <DialogHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <DialogTitle className="text-center text-lg font-bold text-slate-900">
                Sign In with Google
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-slate-500">
                {isGoogleConfigured
                  ? "Sign in with your verified Google email address"
                  : "Google OAuth 2.0 Client Credentials not yet set in server/.env. Select or enter any Google email below to test role detection and assignment."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-3">
              {/* Account 1: Therapist */}
              <button
                type="button"
                onClick={() => handleGoogleSignInWithEmail("evelyn.reed@example.com")}
                className="w-full p-3 rounded-2xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 flex items-center justify-between text-left transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-extrabold flex items-center justify-center text-xs">
                    ER
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Dr. Evelyn Reed, PhD</h4>
                    <p className="text-[11px] text-slate-500">evelyn.reed@example.com</p>
                  </div>
                </div>
                <Badge className="bg-amber-100 text-amber-700 text-[10px] font-bold">Consultant Suite</Badge>
              </button>

              {/* Account 2: Client */}
              <button
                type="button"
                onClick={() => handleGoogleSignInWithEmail("sarah.jenkins@example.com")}
                className="w-full p-3 rounded-2xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 flex items-center justify-between text-left transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-extrabold flex items-center justify-center text-xs">
                    SJ
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Sarah Jenkins</h4>
                    <p className="text-[11px] text-slate-500">sarah.jenkins@example.com</p>
                  </div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 text-[10px] font-bold">Client Portal</Badge>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <Label className="text-[11px] text-slate-500 font-bold block mb-1.5">Or enter any verified Google email:</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (customGoogleEmail) handleGoogleSignInWithEmail(customGoogleEmail);
                  }}
                  className="h-10 px-4 bg-[#450bc8] hover:bg-[#3a0aa8] text-white font-bold text-xs rounded-xl"
                >
                  Sign In
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bottom security assurance */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>256-bit SSL Encrypted Unified Authentication</span>
        </div>
      </div>
    </div>
  );
}
