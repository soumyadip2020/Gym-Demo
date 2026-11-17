import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Dumbbell, Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck } from "lucide-react";
import { adminLoginFn, adminStaffLoginFn } from "@/lib/admin-fns";

export function AdminLoginView() {
  const ownerLogin = useServerFn(adminLoginFn);
  const staffLogin = useServerFn(adminStaffLoginFn);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();

  const [mode, setMode] = useState<"owner" | "staff">("owner");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [showDigits, setShowDigits] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const codeValue = digits.join("");

  const handleDigitChange = (index: number, raw: string) => {
    const clean = raw.replace(/\D/g, "");
    if (!clean) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }
    if (clean.length > 1) {
      const next = [...digits];
      for (let i = 0; i < 6; i++) {
        next[i] = clean[i] || "";
      }
      setDigits(next);
      inputRefs.current[Math.min(5, clean.length - 1)]?.focus();
      return;
    }
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    if (index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const submitOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!/^\d{6}$/.test(codeValue)) {
      setErrorMsg("Enter all 6 digits of your owner access code.");
      return;
    }
    setBusy(true);
    try {
      const res = await ownerLogin({ data: { code: codeValue } });
      qc.setQueryData(["admin-me"], { admin: res.admin });
      qc.removeQueries({ queryKey: ["admin-overview"] });
      toast.success("Owner command session established");
      await router.invalidate();
      await navigate({ to: "/admin", replace: true });
    } catch (err: any) {
      const msg = err?.message || "Invalid access code";
      setErrorMsg(msg);
      toast.error(msg);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  };

  const submitStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const res = await staffLogin({
        data: {
          email: String(f.get("email") || ""),
          password: String(f.get("password") || ""),
        },
      });
      qc.setQueryData(["admin-me"], { admin: res.admin });
      qc.removeQueries({ queryKey: ["admin-overview"] });
      toast.success(`Signed in as ${res.admin.actor_name}`);
      await router.invalidate();
      await navigate({ to: "/admin", replace: true });
    } catch (err: any) {
      const msg = err?.message || "Staff sign-in failed";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[560px] h-[560px] bg-primary/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <Link to="/" className="flex items-center justify-center gap-2 font-display font-black text-2xl tracking-tighter uppercase italic mb-8">
          <Dumbbell className="w-8 h-8 text-primary" />
          Fitness <span className="text-white/25">365</span>
        </Link>

        <div className="bg-zinc-950/95 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 text-primary mx-auto mb-5">
            <ShieldCheck className="w-6 h-6" />
          </div>

          <div className="text-center mb-6">
            <h1 className="font-display text-2xl font-black uppercase tracking-tight">Admin Login</h1>
            <p className="text-xs text-white/50 mt-1.5">Restricted to authorized gym owners and staff</p>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl mb-6 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setMode("owner");
                setErrorMsg(null);
              }}
              className={`py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                mode === "owner" ? "bg-primary text-black" : "text-white/60 hover:text-white"
              }`}
            >
              Owner 6-Digit PIN
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("staff");
                setErrorMsg(null);
              }}
              className={`py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                mode === "staff" ? "bg-primary text-black" : "text-white/60 hover:text-white"
              }`}
            >
              Staff / Trainer
            </button>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 font-medium">
              {errorMsg}
            </div>
          )}

          {mode === "owner" ? (
            <form onSubmit={submitOwner} className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-primary" /> 6-Digit Access Code
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowDigits((v) => !v)}
                    className="text-[11px] text-white/40 hover:text-white flex items-center gap-1"
                  >
                    {showDigits ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showDigits ? "Hide" : "Show"}
                  </button>
                </div>

                <div className="grid grid-cols-6 gap-2.5">
                  {digits.map((d, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type={showDigits ? "text" : "password"}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={d}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      aria-label={`Digit ${idx + 1}`}
                      className="h-14 text-center text-xl font-black bg-white/5 border border-white/15 rounded-xl focus:border-primary focus:bg-white/10 outline-none transition text-white"
                    />
                  ))}
                </div>
                <p className="text-[11px] text-white/40 mt-3">
                  Verified server-side against <code className="text-white/70">GYM_ADMIN_ACCESS_CODE</code> with brute-force lockout protection.
                </p>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full bg-primary text-black rounded-xl py-4 font-black uppercase tracking-widest text-xs hover:brightness-105 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy ? "Verifying..." : "Unlock Admin Panel"}
                {!busy && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          ) : (
            <form onSubmit={submitStaff} className="space-y-4">
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/60 block mb-1.5">Staff Email</span>
                <div className="relative">
                  <Mail className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="staff@fitness365.app"
                    className="w-full bg-white/5 border border-white/15 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-primary"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/60 block mb-1.5">Password</span>
                <div className="relative">
                  <Lock className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/15 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-primary"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={busy}
                className="w-full bg-primary text-black rounded-xl py-4 font-black uppercase tracking-widest text-xs hover:brightness-105 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {busy ? "Signing In..." : "Sign In to Staff Portal"}
                {!busy && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
            <Link to="/login" className="hover:text-white transition">Member Sign In →</Link>
            <Link to="/" className="hover:text-white transition">Public Site</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
