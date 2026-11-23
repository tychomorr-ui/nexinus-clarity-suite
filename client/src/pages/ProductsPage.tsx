import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useTheme } from "@/contexts/ThemeContext";
import { entitledRecentProducts, updateEnabledContextProducts, updateRecentProductKeys } from "@/lib/productsDashboard";
import { trpc } from "@/lib/trpc";
import { ArrowRight, BrainCircuit, Building2, CheckCircle2, Clock3, HeartHandshake, Loader2, LockKeyhole, Moon, Sparkles, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

type ProductKey = "clarity" | "ged_tutor" | "hidden_gems" | "pd_pro" | "recovery" | "task_force_pro" | "sitrep" | "pam";

const iconByProduct: Record<string, typeof BrainCircuit> = {
  clarity: BrainCircuit,
  ged_tutor: Sparkles,
  hidden_gems: Sparkles,
  pd_pro: Building2,
  recovery: HeartHandshake,
  task_force_pro: Building2,
  sitrep: BrainCircuit,
  pam: Sparkles,
};

export default function ProductsPage() {
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const catalog = trpc.products.catalog.useQuery();
  const context = trpc.products.context.get.useQuery();
  const access = trpc.products.access.useQuery();
  const claimRecovery = trpc.products.claimRecoveryAccess.useMutation({ onSuccess: () => { catalog.refetch(); access.refetch(); } });
  const checkout = trpc.billing.checkoutProduct.useMutation({ onSuccess: data => window.location.assign(data.url) });
  const updateContext = trpc.products.context.update.useMutation({ onSuccess: () => context.refetch() });
  const [organizationName, setOrganizationName] = useState("");
  const [payerConfirmed, setPayerConfirmed] = useState(false);
  const [northStar, setNorthStar] = useState("");
  const [preferences, setPreferences] = useState("");
  const [shared, setShared] = useState(true);
  const [shareNorthStar, setShareNorthStar] = useState(true);
  const [sharePreferences, setSharePreferences] = useState(true);
  const [enabledProducts, setEnabledProducts] = useState<ProductKey[]>([]);
  const [recentProductKeys, setRecentProductKeys] = useState<string[]>(() => JSON.parse(localStorage.getItem("xinus-recent-products") ?? "[]") as string[]);

  useEffect(() => {
    if (!context.data) return;
    setNorthStar(context.data.northStar ?? "");
    setPreferences(context.data.preferences ?? "");
    setShared(context.data.sharedAcrossProducts);
    setShareNorthStar(context.data.shareNorthStar);
    setSharePreferences(context.data.sharePreferences);
    setEnabledProducts(Array.isArray(context.data.enabledProducts) ? context.data.enabledProducts as ProductKey[] : []);
  }, [context.data]);

  const openProduct = (key: string, route: string) => {
    const next = updateRecentProductKeys(recentProductKeys, key);
    setRecentProductKeys(next); localStorage.setItem("xinus-recent-products", JSON.stringify(next)); setLocation(route);
  };
  const saveContext = () => updateContext.mutate({ northStar: northStar || null, preferences: preferences || null, sharedAcrossProducts: shared, shareNorthStar, sharePreferences, enabledProducts });
  const recentApps = entitledRecentProducts(recentProductKeys, catalog.data ?? []);
  const streamlineQueue = trpc.suite.streamline.queue.useQuery({ includeSensitive: false });

  return <div className="mx-auto max-w-6xl space-y-8 pb-12">
    <header className="flex flex-col gap-4 pt-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="micro-label">Your product workspace</p><h1 className="mt-2 font-display text-4xl text-stone-50">My XinUS Apps</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Use only the applications that serve your work. Professional products are funded by the organization using them; Recovery access is always free to the person receiving support.</p></div><Button variant="outline" onClick={toggleTheme} className="border-white/10 bg-white/[.03]">{theme === "dark" ? <Sun /> : <Moon />}{theme === "dark" ? "Light mode" : "Dark mode"}</Button></header>

    {recentApps.length > 0 && <section className="surface p-5"><div className="flex items-center gap-2"><Clock3 className="text-violet-200" size={17} /><p className="micro-label">Quick launch</p></div><div className="mt-4 flex flex-wrap gap-3">{recentApps.map(product => <Button key={product.key} onClick={() => openProduct(product.key, product.route)} variant="outline" className="border-white/10 bg-black/15"><ArrowRight />{product.name}</Button>)}</div></section>}
    <section className="surface p-5"><div className="flex items-start justify-between gap-4"><div><p className="micro-label">Today’s private priority queue</p><h2 className="mt-2 font-display text-2xl text-stone-100">Review the next visible moves</h2><p className="mt-2 text-sm leading-6 text-slate-400">Only your active follow-through appears here. PD Pro, Recovery, and Task Force details stay out of this cross-product view unless you open their protected workspaces.</p></div><CheckCircle2 className="text-violet-200" size={20} /></div>{streamlineQueue.isLoading ? <p className="mt-4 text-sm text-slate-500">Preparing your priority queue…</p> : streamlineQueue.error ? <p role="alert" className="mt-4 text-sm text-amber-200">Your priority queue is unavailable right now. Open the relevant app to review its private work directly.</p> : streamlineQueue.data?.length ? <div className="mt-4 grid gap-2">{streamlineQueue.data.map(item => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-black/15 px-3 py-3"><div><p className="text-sm text-stone-100">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.productKey.replaceAll("_", " ")} · {item.kind.replaceAll("_", " ")}</p></div><Button size="sm" variant="outline" onClick={() => { const product = catalog.data?.find(candidate => candidate.key === item.productKey); if (product) openProduct(product.key, product.route); }} className="border-white/10 bg-white/[.03]">Open</Button></div>)}</div> : <p className="mt-4 text-sm text-slate-500">No active cross-product follow-through yet. Create a reviewed Streamline brief inside any XinUS app.</p>}</section>

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{catalog.isLoading ? <Loader2 className="animate-spin text-violet-300" /> : catalog.error ? <div role="alert" className="surface col-span-full p-6 text-sm leading-6 text-amber-200">Your XinUS product catalog is unavailable right now. Refresh this page to restore product access, purchase, and recovery options.</div> : catalog.data?.map(product => {
      const Icon = iconByProduct[product.key] ?? BrainCircuit;
      const organizationFunded = product.billingModel === "organization";
      return <article key={product.key} className={`surface flex min-h-72 flex-col p-6 ${product.entitled ? "ring-1 ring-emerald-300/25" : ""}`}>
        <div className="flex items-start justify-between gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/10 text-violet-200"><Icon size={19} /></div>{product.entitled ? <span className="flex items-center gap-1 text-xs text-emerald-300"><CheckCircle2 size={14} /> Active</span> : <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] uppercase tracking-wider text-slate-400">{product.billingModel === "free" ? "Free" : organizationFunded ? "Organization" : "Standalone"}</span>}</div>
        <h2 className="mt-5 font-display text-2xl text-stone-100">{product.name}</h2><p className="mt-2 flex-1 text-sm leading-6 text-slate-400">{product.description}</p>
        <p className="mt-4 text-xs leading-5 text-slate-500">Payer: {product.payerLabel}</p>
        {product.entitled ? <Button onClick={() => openProduct(product.key, product.route)} className="mt-5 rounded-xl bg-violet-400 text-slate-950"><ArrowRight />Open app</Button>
          : product.billingModel === "free" ? <Button disabled={claimRecovery.isPending} onClick={() => claimRecovery.mutate({ selfAttest: true })} className="mt-5 rounded-xl bg-emerald-300 text-slate-950"><HeartHandshake />Claim free Recovery access</Button>
          : product.purchasable ? <Button disabled={checkout.isPending || (organizationFunded && (!organizationName.trim() || !payerConfirmed))} onClick={() => checkout.mutate({ productKey: product.key, returnPath: "/products", organizationName: organizationFunded ? organizationName : undefined, payerConfirmed: organizationFunded ? payerConfirmed : false })} className="mt-5 rounded-xl bg-amber-300 text-slate-950"><LockKeyhole />{organizationFunded ? "Set up organization access" : `Get access${product.amountUsdCents ? ` · $${(product.amountUsdCents / 100).toFixed(0)}/mo` : ""}`}</Button>
          : <p className="mt-5 text-xs text-slate-500">Included with an enabled XinUS product.</p>}
      </article>;
    })}</section>

    <section className="surface grid gap-6 p-6 lg:grid-cols-[.8fr_1.2fr]"><div><p className="micro-label">Professional purchase</p><h2 className="mt-2 font-display text-2xl text-stone-100">Organization-funded access</h2><p className="mt-3 text-sm leading-6 text-slate-400">PD Pro and Task Force Pro are purchased by the public defender office, probation department, public-safety agency, or other authorized organization—not by the people they serve.</p></div><div className="space-y-4"><Input value={organizationName} onChange={event => setOrganizationName(event.target.value)} className="border-white/10 bg-black/20" placeholder="Purchasing organization name" /><label className="flex items-start gap-3 text-sm text-slate-300"><input checked={payerConfirmed} onChange={event => setPayerConfirmed(event.target.checked)} type="checkbox" className="mt-1" />I am authorized to arrange billing for this organization.</label></div></section>

    {checkout.error && <p role="alert" className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">Checkout could not be opened. No charge was made. Please retry shortly or use a different available product workspace.</p>}
    <section className="surface p-6"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><p className="micro-label">Reflective intelligence</p><h2 className="mt-2 font-display text-2xl text-stone-100">Shared context, under your control</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Choose the active apps and individual context fields XinUS may use. Case records, subject records, and sensitive professional details are never included.</p></div><div className="flex items-center gap-3"><Switch checked={shared} onCheckedChange={setShared} /><span className="text-sm text-slate-300">Share approved context</span></div></div>{context.error ? <p role="alert" className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">Your saved sharing profile could not be loaded. Existing product boundaries remain protected; refresh before changing your preferences.</p> : <><div className="mt-5 flex flex-wrap gap-2">{catalog.data?.filter(product => product.entitled).map(product => <label key={product.key} className="flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-3 py-2 text-xs text-slate-300"><input type="checkbox" checked={enabledProducts.includes(product.key)} onChange={() => setEnabledProducts(current => updateEnabledContextProducts(current, product.key))} />{product.name}</label>)}</div><div className="mt-6 grid gap-4 md:grid-cols-2"><div><label className="mb-2 flex items-center gap-2 text-xs text-slate-300"><Switch checked={shareNorthStar} onCheckedChange={setShareNorthStar} />Share North Star</label><Textarea value={northStar} onChange={event => setNorthStar(event.target.value)} className="min-h-28 border-white/10 bg-black/20" placeholder="North star: the goal XinUS should keep in view." /></div><div><label className="mb-2 flex items-center gap-2 text-xs text-slate-300"><Switch checked={sharePreferences} onCheckedChange={setSharePreferences} />Share working preferences</label><Textarea value={preferences} onChange={event => setPreferences(event.target.value)} className="min-h-28 border-white/10 bg-black/20" placeholder="Preferences: tone, working style, or helpful constraints." /></div></div><div className="mt-4 flex justify-end"><Button disabled={updateContext.isPending} onClick={saveContext} className="rounded-xl bg-violet-400 text-slate-950">{updateContext.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}Save sharing settings</Button></div></>}</section>
  </div>;
}
