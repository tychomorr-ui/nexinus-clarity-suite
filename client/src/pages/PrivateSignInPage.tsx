import { startLogin } from "@/const";
import { AlertCircle, ArrowRight, KeyRound, Loader2, LockKeyhole, ShieldCheck, UserRoundPlus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type Mode = "sign-in" | "create";

function returnTarget() {
  const requested = new URLSearchParams(window.location.search).get("returnTo");
  return requested?.startsWith("/api/private-oauth/authorize") ? requested : "/dashboard";
}

export default function PrivateSignInPage() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const retry = new URLSearchParams(window.location.search).get("auth") === "retry";
  const target = useMemo(returnTarget, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch(mode === "create" ? "/api/private-oauth/register" : "/api/private-oauth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "create" ? { name, handle, email: email || undefined, password } : { handle, password }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Private sign-in could not be completed.");
      window.location.assign(target);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Private sign-in could not be completed.");
    } finally {
      setPending(false);
    }
  }

  return <main className="min-h-screen bg-[#090a0f] px-5 py-10 text-slate-100"><div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
    <section className="space-y-6"><p className="micro-label">XINUS PRIVATE ACCESS</p><h1 className="font-serif text-5xl leading-tight text-white">Your private intelligence workspace.</h1><p className="max-w-xl text-lg leading-8 text-slate-400">XinUS now uses a first-party authorization-code flow with PKCE. Your private sign-in stays within the XinUS workspace and your activity remains scoped to your account.</p><div className="grid gap-3 sm:grid-cols-2"><div className="surface-soft p-4"><ShieldCheck className="mb-3 text-emerald-300" size={22}/><p className="font-medium">Private by design</p><p className="mt-1 text-sm text-slate-400">User activity is isolated by account and product access.</p></div><div className="surface-soft p-4"><KeyRound className="mb-3 text-violet-300" size={22}/><p className="font-medium">PKCE protected</p><p className="mt-1 text-sm text-slate-400">Authorization codes are short-lived, one-time, and verifier-bound.</p></div></div></section>
    <section className="surface p-6 shadow-2xl shadow-black/30"><div className="mb-6 flex rounded-xl bg-white/[.035] p-1"><button type="button" className={`flex-1 rounded-lg px-3 py-2 text-sm ${mode === "sign-in" ? "bg-violet-500/20 text-violet-100" : "text-slate-400"}`} onClick={() => { setMode("sign-in"); setError(""); }}>Private sign in</button><button type="button" className={`flex-1 rounded-lg px-3 py-2 text-sm ${mode === "create" ? "bg-violet-500/20 text-violet-100" : "text-slate-400"}`} onClick={() => { setMode("create"); setError(""); }}>Create private account</button></div>
      {retry && <div className="mb-4 flex gap-2 rounded-xl border border-amber-400/20 bg-amber-300/10 p-3 text-sm text-amber-100"><AlertCircle size={18} className="shrink-0"/>Your previous authorization link expired. Sign in again to create a new private, secure session.</div>}
      {error && <div className="mb-4 flex gap-2 rounded-xl border border-rose-400/20 bg-rose-300/10 p-3 text-sm text-rose-100"><AlertCircle size={18} className="shrink-0"/>{error}</div>}
      <form className="space-y-4" onSubmit={submit}>{mode === "create" && <><label className="block text-sm text-slate-300">Name<input value={name} onChange={event => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white outline-none focus:border-violet-400" placeholder="How XinUS should address you" required/></label><label className="block text-sm text-slate-300">Email <span className="text-slate-500">(optional)</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white outline-none focus:border-violet-400" placeholder="you@example.com"/></label></>}
        <label className="block text-sm text-slate-300">Private handle<input value={handle} onChange={event => setHandle(event.target.value)} autoComplete="username" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white outline-none focus:border-violet-400" placeholder="your.private.handle" required/></label>
        <label className="block text-sm text-slate-300">Private password<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === "create" ? "new-password" : "current-password"} minLength={12} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white outline-none focus:border-violet-400" placeholder="At least 12 characters" required/></label>
        <button type="submit" disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-violet-300 disabled:opacity-60">{pending ? <><Loader2 size={18} className="animate-spin"/>Securing your private session…</> : <>{mode === "create" ? <UserRoundPlus size={18}/> : <LockKeyhole size={18}/>} {mode === "create" ? "Create private account" : "Continue privately"}<ArrowRight size={17}/></>}</button>
      </form><button type="button" onClick={() => void startLogin()} className="mt-5 w-full text-sm text-slate-400 underline-offset-4 hover:text-white hover:underline">Restart the private OAuth flow</button></section>
  </div></main>;
}
