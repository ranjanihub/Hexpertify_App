"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import {
  ShieldCheck,
  User,
  UserCheck,
  Shield,
  ArrowRight,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  AlertCircle
} from "lucide-react";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [role, setRole] = useState<"client" | "therapist" | "admin">("client");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [email, setEmail] = useState("sarah.jenkins@example.com");
  const [password, setPassword] = useState("password123");

  const handleRoleChange = (newRole: "client" | "therapist" | "admin") => {
    setRole(newRole);
    setErrorMsg("");
    if (newRole === "admin") {
      setEmail("admin@hexpertify.com");
    } else if (newRole === "therapist") {
      setEmail("dr.evelyn@hexpertify.com");
    } else {
      setEmail("sarah.jenkins@example.com");
    }
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMsg("");

    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const message = data.error || "Authentication failed. Please check your credentials.";
        setErrorMsg(message);
        toast.error(message);
        setLoading(false);
        return;
      }

      toast.success(data.message || `Welcome, ${data.user?.name || "User"}!`);

      // Clear lingering credentials of opposite roles to prevent cross-portal hijacking
      if (data.role === "client") {
        try {
          localStorage.removeItem("hexpertify_admin_auth");
          localStorage.removeItem("admin_user");
          localStorage.removeItem("hexpertify_admin_token");
          localStorage.removeItem("hexpertify_auth_user");
          localStorage.removeItem("consultant_token");
        } catch {}
      }

      // Construct target URL for the specific panel
      let targetUrl = data.redirectUrl;
      const isLocalDev = typeof window !== "undefined" && (window.location.port === "3000" && window.location.hostname === "localhost");

      if (!targetUrl || targetUrl.includes("localhost:3000") || targetUrl.includes("5175") || targetUrl.includes("5173") || targetUrl.includes("hexpertify-backend")) {
        if (data.role === "super_admin" || data.role === "admin") {
          targetUrl = isLocalDev ? "http://localhost:5000/admin" : "/admin";
        } else if (data.role === "therapist") {
          targetUrl = isLocalDev ? "http://localhost:5000/consultant" : "/consultant";
        } else {
          targetUrl = isLocalDev ? "http://localhost:5000/client" : "/client";
        }
      }

      const ssoUserParam = encodeURIComponent(JSON.stringify(data.user));
      const ssoTicketParam = data.ssoTicket ? `&sso_ticket=${encodeURIComponent(data.ssoTicket)}` : "";
      const delimiter = targetUrl.includes("?") ? "&" : "?";
      window.location.href = `${targetUrl}${delimiter}sso_user=${ssoUserParam}${ssoTicketParam}`;
    } catch (error: any) {
      console.error("Login error:", error);
      setErrorMsg(error.message || "An unexpected network error occurred.");
      toast.error("Failed to connect to authentication server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-slate-200 shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-amber-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-black text-lg tracking-tight">Hexpertify</span>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-purple-200 border border-white/20">
              Role-Based Access
            </span>
          </div>
          <CardTitle className="text-xl font-bold text-white">
            {role === "admin"
              ? "Super Admin Master Sign In"
              : role === "therapist"
              ? "Practitioner & Therapist Portal"
              : "Client Consultation Portal"}
          </CardTitle>
          <CardDescription className="text-purple-200/90 text-xs">
            {role === "admin"
              ? "Full administrative control over all operations, users, therapists, and CMS."
              : role === "therapist"
              ? "Manage clinical tasks, assign activities and assessments to your clients."
              : "Access your consultation sessions, personalized activities, and assessments."}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-5">
          {/* Role Selection Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600 gap-1">
            <button
              type="button"
              onClick={() => handleRoleChange("client")}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                role === "client"
                  ? "bg-white text-purple-700 shadow-sm font-bold"
                  : "hover:text-slate-900"
              }`}
            >
              <User className="w-3.5 h-3.5" /> Client
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange("therapist")}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                role === "therapist"
                  ? "bg-white text-purple-700 shadow-sm font-bold"
                  : "hover:text-slate-900"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" /> Therapist
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange("admin")}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                role === "admin"
                  ? "bg-white text-purple-700 shadow-sm font-bold"
                  : "hover:text-slate-900"
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Admin
            </button>
          </div>

          {/* Role-specific Notice */}
          {role === "therapist" && (
            <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Practitioner Verification:</strong> Only therapists registered in the <strong>Super Admin database</strong> can log in to the Consultant Suite.
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <Lock className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <FieldGroup className="space-y-4">
              <Field>
                <FieldLabel htmlFor="email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {role === "admin"
                    ? "Administrator Email"
                    : role === "therapist"
                    ? "Registered Practitioner Email"
                    : "Client Email"}
                </FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="h-10 text-sm font-medium"
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 pr-10 text-sm font-medium"
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
              </Field>

              <Field>
                <Button
                  type="submit"
                  className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying Permissions...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {role === "admin"
                          ? "Enter Super Admin Suite"
                          : role === "therapist"
                          ? "Enter Consultant Suite"
                          : "Enter Client Portal"}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    try {
                      localStorage.removeItem("hexpertify_admin_auth");
                      localStorage.removeItem("admin_user");
                      localStorage.removeItem("hexpertify_admin_token");
                      localStorage.removeItem("hexpertify_auth_user");
                      localStorage.removeItem("consultant_token");
                    } catch {}
                    const backendBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || (window.location.port === "3000" ? "http://localhost:5000" : "");
                    window.location.href = `${backendBase}/api/auth/google?role=${role}`;
                  }}
                  className="w-full h-11 border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer text-sm shadow-xs mt-3"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Login with Google</span>
                </Button>

                <FieldDescription className="text-center text-xs text-slate-500 pt-2">
                  {role === "client" ? (
                    <>
                      Don&apos;t have an account?{" "}
                      <Link href="/services" className="font-semibold text-purple-600 hover:underline">
                        Book a Consultation
                      </Link>
                    </>
                  ) : (
                    <span>
                      Protected by 256-bit SSL encrypted role authentication.
                    </span>
                  )}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
