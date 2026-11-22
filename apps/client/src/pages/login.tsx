import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { setClientAuth, setAuthUser, setAdminAuth, setApiToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CareProviderAvatars } from "@/components/care-provider-avatars";
import { 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2, 
  UserCheck, 
  User, 
  Video, 
  Activity, 
  Mail
} from "lucide-react";

type PublicRole = "client" | "therapist";

const GOOGLE_CLIENT_ID = "258879986278-nmdrlc4o1mebbplscmuvgje6hitj9m4l.apps.googleusercontent.com";

/**
 * Where the API lives: "" = this same domain. The site serves the panels and the API together;
 * only the standalone Vite dev server (another localhost port) falls back to the local API on :5000.
 */
function backendOrigin(): string {
  if (typeof window === "undefined") return "";
  const { hostname, port } = window.location;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  if (isLocal && port !== "5000" && port !== "3000") return "http://localhost:5000";
  return "";
}

async function authApiFetch(endpoint: string, options: RequestInit): Promise<Response> {
  const primaryUrl = endpoint;
  const fallbackUrl = `${backendOrigin()}${endpoint}`;

  try {
    const res = await fetch(primaryUrl, options);
    if (res.ok || (res.status >= 400 && res.status < 500)) {
      return res;
    }
  } catch (e) {
    console.warn(`[Auth Gateway] ${primaryUrl} route unreachable, falling back directly to ${fallbackUrl}`);
  }

  return fetch(fallbackUrl, options);
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          cancel: () => void;
          renderButton?: (element: HTMLElement, options: any) => void;
        };
      };
    };
  }
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [role, setRole] = useState<PublicRole>("client");

  // Clean any role= query parameters from browser URL to keep it clean
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("role")) {
        url.searchParams.delete("role");
        const newSearch = url.searchParams.toString();
        window.history.replaceState({}, document.title, url.pathname + (newSearch ? `?${newSearch}` : ""));
      }
    } catch {}
  }, []);

  const [clientMode, setClientMode] = useState<"signin" | "signup">("signin");
  
  // Client Form State
  const [fullName, setFullName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Therapist Form State
  const [therapistEmail, setTherapistEmail] = useState("");
  const [therapistPassword, setTherapistPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  // Process login response (routes all successful logins to the live site)
  const processAuthSuccess = useCallback((data: any) => {
    const liveSiteUrl = data.redirectUrl || "http://localhost:3000";
    // Signed API token used for payments and admin-only endpoints
    setApiToken(data.token);

    if (data.role === "super_admin" || data.role === "admin" || data.redirectUrl === "/admin") {
      setAdminAuth(data.user);
      try {
        localStorage.setItem("hexpertify_admin_token", "admin_session_" + Date.now());
        localStorage.setItem("admin_user", JSON.stringify(data.user));
      } catch {}
      toast({
        title: "Administrator Authenticated",
        description: "Credentials verified. Opening Admin Suite...",
      });
      window.location.href = "/admin";
      return true;
    } else if (data.role === "therapist" || data.redirectUrl === "/consultant") {
      setAuthUser(data.user);
      try {
        localStorage.setItem("hexpertify_consultant_user", JSON.stringify(data.user));
        localStorage.setItem("consultant_token", "consultant_session_" + Date.now());
      } catch {}
      toast({
        title: `Welcome, ${data.user.name}`,
        description: "Verified therapist. Opening Consultant Suite...",
      });
      window.location.href = "/consultant";
      return true;
    } else {
      try {
        localStorage.removeItem("hexpertify_admin_auth");
        localStorage.removeItem("admin_user");
        localStorage.removeItem("hexpertify_admin_token");
        localStorage.removeItem("hexpertify_auth_user");
        localStorage.removeItem("consultant_token");
      } catch {}
      setClientAuth(data.user);
      try {
        localStorage.setItem("hexpertify_client_user", JSON.stringify(data.user));
        localStorage.setItem("client_token", "client_session_" + Date.now());
      } catch {}
      toast({
        title: `Welcome back, ${data.user.name}!`,
        description: "Authenticated successfully. Opening Client Panel...",
      });
      window.location.href = "/client";
      return true;
    }
  }, [toast]);

  const roleRef = useRef(role);
  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  const gsiInitializedRef = useRef(false);

  // Handle Google Credential Response from One Tap or Google Sign-In
  const handleGoogleCredentialResponse = useCallback(async (response: any) => {
    if (!response?.credential) return;

    setIsLoading(true);
    try {
      const res = await authApiFetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential, role: roleRef.current }),
      });
      const data = await res.json();

      if (res.ok && data?.success) {
        processAuthSuccess(data);
      } else {
        toast({
          title: "Google Sign-In Notice",
          description: data?.error || "Google authentication could not be completed.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Authentication Error",
        description: e?.message || "Failed to communicate with authentication server.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [processAuthSuccess, toast]);

  // Initialize Google One Tap & Google Identity Services (exact match to hexpertify.com)
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const initGsi = () => {
      if (window.google?.accounts?.id && !gsiInitializedRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
            context: "signin",
          });
          gsiInitializedRef.current = true;

          // Display Google One Tap prompt in top right corner (matches hexpertify.com)
          window.google.accounts.id.prompt();

          // Render official Google Sign In button (opens native GIS popup, no redirect URI needed)
          const btnContainer = document.getElementById("google-signin-btn-container");
          if (btnContainer) {
            btnContainer.innerHTML = "";
            window.google.accounts.id.renderButton(btnContainer, {
              type: "standard",
              theme: "outline",
              size: "large",
              text: "signin_with",
              shape: "rectangular",
              logo_alignment: "left",
              width: btnContainer.clientWidth || 380,
            });
          }
        } catch (err) {
          console.error("Failed to initialize Google Identity Services:", err);
        }
      }
    };

    if (!document.getElementById("google-gsi-client")) {
      const script = document.createElement("script");
      script.id = "google-gsi-client";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        timer = setTimeout(initGsi, 400);
      };
      document.body.appendChild(script);
    } else {
      timer = setTimeout(initGsi, 400);
    }

    // Check for Google callback errors from URL
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

    return () => {
      if (timer) clearTimeout(timer);
      try {
        window.google?.accounts?.id?.cancel();
      } catch {}
    };
  }, [handleGoogleCredentialResponse, toast]);

  // Click handler for "Login with Google" button (routes to role panel or live site depending on verified account)
  const handleGoogleButtonClick = () => {
    setIsLoading(true);
    const origin = backendOrigin();
    const targetBase = origin.startsWith("http://localhost") ? "" : origin;
    window.location.href = `${targetBase}/api/auth/google?role=${role}`;
  };

  const handleSelectRole = (newRole: PublicRole) => {
    setRole(newRole);
  };

  // 1. Therapist Login
  const handleTherapistLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!therapistEmail) {
      toast({
        title: "Missing Email",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: therapistEmail.trim().toLowerCase(), password: therapistPassword, role: "therapist" }),
      });
      const data = await res.json();

      if (res.ok && data?.success) {
        processAuthSuccess(data);
        return;
      } else {
        toast({
          title: "Access Verification Failed",
          description: data?.error || `Practitioner email "${therapistEmail}" was not found in the practitioner directory.`,
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Connection Error",
        description: e.message || "Unable to reach verification server.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Client Login
  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientEmail || !clientPassword) {
      toast({
        title: "Missing Information",
        description: "Please enter both your email address and password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clientEmail.trim(), password: clientPassword, role: "client" }),
      });
      const data = await res.json();

      if (res.ok && data?.success) {
        processAuthSuccess(data);
        return;
      } else {
        toast({
          title: "Sign-In Notice",
          description: data?.error || "Unable to sign in. Please check your credentials.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Connection Error",
        description: err?.message || "Failed to reach authentication server.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Client Registration
  const handleClientRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientEmail || !fullName || !clientPassword) {
      toast({
        title: "Missing Information",
        description: "Please provide your full name, email address, and a password.",
        variant: "destructive",
      });
      return;
    }

    if (clientPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApiFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          email: clientEmail.trim().toLowerCase(),
          phone: clientPhone,
          password: clientPassword,
          role: "client"
        }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        // A new client's portal opens after their first completed session: sign in from here afterwards
        if (data.clientPanelAccess === false || !data.ssoTicket) {
          toast({
            title: "Registration Successful",
            description: data.notice || "Your account has been created. Your client portal opens after your first completed session.",
          });
          setClientMode("signin");
          setClientPassword("");
          return;
        }
        toast({
          title: "Registration Successful",
          description: "Your client account has been created. Welcome to Hexpertify!",
        });
        processAuthSuccess(data);
        return;
      } else {
        toast({
          title: "Registration Failed",
          description: data?.error || data?.message || "An account with this email address already exists. Please log in.",
          variant: "destructive",
        });
        return;
      }
    } catch (err: any) {
      toast({
        title: "Connection Error",
        description: err?.message || "Failed to reach registration server.",
        variant: "destructive",
      });
      return;
    } finally {
      setIsLoading(false);
    }
  };


  return (
    // Laptop/desktop: exactly one screen tall, never scrolls (short screens drop the optional hero blocks below)
    <div className="min-h-dvh lg:h-dvh lg:overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-slate-50 font-['Plus_Jakarta_Sans'] antialiased">
      {/* Left Column - Hero Visual Presentation */}
      <div className="hidden lg:flex lg:col-span-7 bg-[#5e2be2] flex-col justify-between p-8 xl:p-12 text-white relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none" />

        {/* Top bar branding */}
        <div className="relative z-10 flex items-center justify-between">
          {/* White logo for the purple panel (the phone header below keeps the purple one on white) */}
          <img src="/hexpertify-logo-white.png" alt="Hexpertify" className="h-12 xl:h-14 w-auto object-contain drop-shadow-sm" />
        </div>

        {/* Center hero copy */}
        <div className="relative z-10 max-w-lg my-auto py-4 space-y-4 xl:space-y-5">
          <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-extrabold leading-[1.15] tracking-tight">
            Connect With Your Care. Track Your Outcomes.
          </h1>

          <p className="text-purple-100/80 text-sm xl:text-base leading-relaxed">
            Select whether you are a patient or practitioner to securely log in. Clients can instantly message their assigned therapist and track care progression.
          </p>

          {/* Feature Highlights */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/15 [@media(max-height:520px)]:hidden">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Video className="w-4 h-4 text-purple-200" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Live Telehealth</h4>
                <p className="text-xs text-purple-200/70">HD encrypted sessions with your clinician</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 text-purple-200" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">PHQ-9 / GAD-7</h4>
                <p className="text-xs text-purple-200/70">Continuous standardized outcome tracking</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom practitioner assurance banner */}
        <div className="relative z-10 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-4 [@media(max-height:560px)]:hidden">
          {/* Real verified consultants from the platform */}
          <CareProviderAvatars />

          <div className="text-xs">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>Licensed Care Providers</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />
            </div>
            <p className="text-purple-200/80 text-[11px]">Direct, confidential care connection with your licensed clinician.</p>
          </div>
        </div>
      </div>

      {/* Right Column - Dedicated Authentication Panel */}
      {/* If a long form (registration) is still taller than a short screen, only this panel scrolls, never the page */}
      <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-8 xl:px-12 xl:py-8 bg-white relative lg:overflow-y-auto">
        {/* Top Header Mobile Branding */}
        <div className="flex lg:hidden items-center justify-between pb-4 border-b border-slate-100">
          <img src="/expertify-logo.png" alt="Hexpertify" className="h-10 w-auto object-contain" />
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-[#5e2be2]">Single-Port</span>
        </div>

        {/* Center Form Container */}
        <div className="my-auto max-w-md w-full mx-auto py-4 space-y-4 [@media(max-height:700px)]:space-y-3">
          <div>
            <h2 className="text-2xl xl:text-3xl font-extrabold text-slate-900 tracking-tight">
              {role === "client" ? "Client Care Portal" : "Practitioner Suite"}
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 [@media(max-height:640px)]:hidden">
              {role === "client"
                ? "Sign in to access your sessions, personalized therapy tools, and care outcomes."
                : "Sign in to manage appointments, review assessments, and chart client progress."}
            </p>
          </div>

          {/* Role Selection Tabs */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center">
            <button
              type="button"
              onClick={() => handleSelectRole("client")}
              className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                role === "client"
                  ? "bg-white text-[#5e2be2] shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <User className="w-4 h-4" />
              <span>I am a Client</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectRole("therapist")}
              className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                role === "therapist"
                  ? "bg-white text-[#5e2be2] shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>I am a Therapist</span>
            </button>
          </div>

          {/* TAB 1: THERAPIST / PRACTITIONER LOGIN */}
          {role === "therapist" && (
            <form onSubmit={handleTherapistLogin} className="space-y-3 animate-fade-in">
              <div className="space-y-1.5">
                <Label htmlFor="therapist-email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Practitioner Email
                </Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <Input
                    id="therapist-email"
                    type="email"
                    placeholder="e.g. evelyn.reed@example.com"
                    value={therapistEmail}
                    onChange={(e) => setTherapistEmail(e.target.value)}
                    className="h-10 pl-10 bg-slate-50 border-slate-200 focus:bg-white text-slate-900 font-medium rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="therapist-password" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <Input
                    id="therapist-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={therapistPassword}
                    onChange={(e) => setTherapistPassword(e.target.value)}
                    className="h-10 pl-10 pr-10 bg-slate-50 border-slate-200 focus:bg-white text-slate-900 font-medium rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Quick Auto-Fill Demo Pill: a therapist registered in the Super Admin panel */}
              <div className="px-3 py-2 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between">
                <span className="text-[11px] text-purple-900 font-medium">Demo: marcus.vance@hexpertify.com</span>
                <button
                  type="button"
                  onClick={() => {
                    setTherapistEmail("marcus.vance@hexpertify.com");
                    setTherapistPassword("password123");
                  }}
                  className="text-[11px] text-[#5e2be2] font-bold hover:underline cursor-pointer"
                >
                  Auto Fill
                </button>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? "Verifying Practitioner..." : "Sign In as Therapist"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          )}

          {/* TAB 2: CLIENT / PATIENT LOGIN */}
          {role === "client" && (
            <div className="space-y-3 animate-fade-in">
              {/* Sign In vs Register sub-toggle */}
              <div className="flex border-b border-slate-200 pb-1 gap-4 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setClientMode("signin")}
                  className={`pb-2 transition-all cursor-pointer ${
                    clientMode === "signin"
                      ? "text-[#5e2be2] border-b-2 border-[#5e2be2]"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Client Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setClientMode("signup")}
                  className={`pb-2 transition-all cursor-pointer ${
                    clientMode === "signup"
                      ? "text-[#5e2be2] border-b-2 border-[#5e2be2]"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Register New Client
                </button>
              </div>

              {clientMode === "signup" ? (
                /* Registration */
                <form onSubmit={handleClientRegister} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullname" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Full Name
                    </Label>
                    <Input
                      id="fullname"
                      type="text"
                      placeholder="e.g. Sarah Jenkins"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-10 pl-3.5 bg-slate-50 border-slate-200 focus:bg-white text-slate-900 font-medium rounded-xl"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-client-email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <Input
                        id="reg-client-email"
                        type="email"
                        placeholder="e.g. sarah.jenkins@example.com"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        className="h-10 pl-10 bg-slate-50 border-slate-200 focus:bg-white text-slate-900 font-medium rounded-xl"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-client-phone" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Phone Number (Optional)
                    </Label>
                    <Input
                      id="reg-client-phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="h-10 pl-3.5 bg-slate-50 border-slate-200 focus:bg-white text-slate-900 font-medium rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-client-password" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Create Password
                    </Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <Input
                        id="reg-client-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 6 characters"
                        value={clientPassword}
                        onChange={(e) => setClientPassword(e.target.value)}
                        minLength={6}
                        className="h-10 pl-10 pr-10 bg-slate-50 border-slate-200 focus:bg-white text-slate-900 font-medium rounded-xl"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-10 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? "Creating Account..." : "Create Client Account & Sign In"}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </form>
              ) : (
                /* Sign In */
                <form onSubmit={handleClientLogin} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="client-email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Client Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <Input
                        id="client-email"
                        type="email"
                        placeholder="e.g. ranjaniranjani5694@gmail.com"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        className="h-10 pl-10 bg-slate-50 border-slate-200 focus:bg-white text-slate-900 font-medium rounded-xl"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="client-password" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <Input
                        id="client-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={clientPassword}
                        onChange={(e) => setClientPassword(e.target.value)}
                        className="h-10 pl-10 pr-10 bg-slate-50 border-slate-200 focus:bg-white text-slate-900 font-medium rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Quick Auto-Fill Demo Pill */}
                  <div className="px-3 py-2 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between">
                    <span className="text-[11px] text-purple-900 font-medium">Demo: ranjaniranjani5694@gmail.com</span>
                    <button
                      type="button"
                      onClick={() => {
                        setClientEmail("ranjaniranjani5694@gmail.com");
                        setClientPassword("client123");
                      }}
                      className="text-[11px] text-[#5e2be2] font-bold hover:underline cursor-pointer"
                    >
                      Auto Fill
                    </button>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-10 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? "Signing In..." : "Sign In to Client Portal"}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* Social Sign-In Divider */}
          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-semibold">Or continue with</span>
            </div>
          </div>

          {/* Google Login Button (Official Google Identity Services Popup - No redirect_uri_mismatch) */}
          <div className="w-full relative">
            <div id="google-signin-btn-container" className="w-full flex items-center justify-center [&>div]:!w-full min-h-[40px]">
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleButtonClick}
                disabled={isLoading}
                className="w-full h-10 border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 shadow-xs transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                <span>Login with Google</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
