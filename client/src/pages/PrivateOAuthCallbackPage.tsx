import { consumePrivateOAuthAttempt, startLogin } from "@/const";
import { AlertCircle, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

export default function PrivateOAuthCallbackPage() {
  const [error, setError] = useState("");
  useEffect(() => {
    async function exchange() {
      const params = new URLSearchParams(window.location.search);
      const attempt = consumePrivateOAuthAttempt();
      const code = params.get("code");
      const state = params.get("state");
      if (!attempt || !code || !state || state !== attempt.state) { setError("This private sign-in response could not be verified. Restart the sign-in flow to continue safely."); return; }
      try {
        const response = await fetch("/api/private-oauth/token", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, code_verifier: attempt.verifier, redirect_uri: attempt.redirectUri }) });
        const result = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(result.error || "The private authorization exchange failed.");
        window.location.assign("/dashboard");
      } catch (cause) { setError(cause instanceof Error ? cause.message : "The private authorization exchange failed."); }
    }
    void exchange();
  }, []);
  return <main className="grid min-h-screen place-items-center bg-[#090a0f] px-5 text-slate-100"><section className="surface w-full max-w-md p-7 text-center">{error ? <><AlertCircle className="mx-auto mb-4 text-rose-300" size={32}/><h1 className="font-serif text-3xl">Private sign-in needs another try</h1><p className="mt-3 text-sm leading-6 text-slate-400">{error}</p><button onClick={() => void startLogin()} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-400 px-4 py-2.5 font-medium text-slate-950"><RefreshCw size={17}/>Restart private sign-in</button></> : <><Loader2 className="mx-auto mb-4 animate-spin text-violet-300" size={32}/><p className="micro-label">PRIVATE OAUTH</p><h1 className="mt-2 font-serif text-3xl">Securing your XinUS session</h1><p className="mt-3 text-sm leading-6 text-slate-400">Verifying your one-time authorization code and opening your private workspace.</p><ShieldCheck className="mx-auto mt-5 text-emerald-300" size={21}/></>}</section></main>;
}
