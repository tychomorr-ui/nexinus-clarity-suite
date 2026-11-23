import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AppCapabilityPanel } from "@/components/AppCapabilityPanel";
import { trpc } from "@/lib/trpc";
import { downloadPdfReport } from "@/lib/pdf";
import { formatGedMath } from "@/lib/gedMath";
import { ArrowRight, BookOpenCheck, Bot, BrainCircuit, Camera, CheckCircle2, ChevronDown, ChevronUp, Command, Download, FileText, Gem, GraduationCap, ImagePlus, Loader2, LockKeyhole, MapPinned, Radio, RotateCcw, Scale, Search, ShieldAlert, ShieldCheck, Sparkles, Target, Trash2, Upload, UserRound, Waves, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { BlueprintClarityPanel } from "@/components/clarityBlueprint/BlueprintClarityPanel";
import type { SitRepClaim, SitRepSourceDocument } from "@shared/sitrepEvidence";

const labels: Record<string, { eyebrow: string; title: string; description: string; icon: typeof BrainCircuit }> = {
  "/clarity": { eyebrow: "Adaptive intelligence", title: "Clarity Engine", description: "Turn an unresolved concern into a practical next move with the original XinUS modes.", icon: BrainCircuit },
  "/ged-tutor": { eyebrow: "Reflective learning", title: "GED Tutor", description: "Work through Math, RLA, Science, and Social Studies with a question-led study partner.", icon: GraduationCap },
  "/hidden-gems": { eyebrow: "Image-led appraisal", title: "Hidden Gems", description: "Capture a finding, add context, and receive a cautious structured appraisal.", icon: Gem },
  "/pd-pro": { eyebrow: "Dual-mode workspace", title: "PD Pro", description: "Hold the Client, Public Defender, and emergency workflows in one focused case workspace.", icon: Scale },
  "/pd-pro/office": { eyebrow: "Executive operations", title: "PD Pro Office", description: "Draft memos, work plans, calculations, and structured operating material.", icon: FileText },
  "/recidivism": { eyebrow: "Reflective supervision", title: "Recidivism", description: "Track subjects, patterns, obligations, support contacts, and high-risk alerts.", icon: ShieldAlert },
  "/task-force-pro": { eyebrow: "Operational supervision", title: "Task Force Pro", description: "Coordinate protected subject operations, risk signals, obligations, and follow-through.", icon: ShieldAlert },
  "/sitrep": { eyebrow: "Decision support", title: "SitRep", description: "Assess a situation across general, travel, and immigration contexts with Sub-Particulate Matrix simulations.", icon: Radio },
  "/pam": { eyebrow: "Reflective companion", title: "PAM", description: "Use one clear assistant to sharpen the immediate decision and next action.", icon: Waves },
  "/account": { eyebrow: "Identity and usage", title: "Account", description: "Review your XinUS tier, XC balance, and billing controls.", icon: UserRound },
  "/admin": { eyebrow: "Owner operations", title: "Owner Console", description: "Review audit activity and send safe XinUS terminal commands.", icon: Command },
};

const assurance: Record<string, { label: string; evidence: string; review: string }> = {
  "/clarity": { label: "Decision thread", evidence: "Your decision, constraints, and lens are the input. XinUS offers a working frame, not a fact claim.", review: "Name what you will test next; you retain the decision." },
  "/ged-tutor": { label: "Skill loop", evidence: "Your question and learning preferences guide the lesson. Current or uncertain facts are marked for trusted-source verification.", review: "Try the next practice step and self-check before moving on." },
  "/hidden-gems": { label: "Appraisal evidence", evidence: "Photos, markings, condition, and provenance are starting evidence. The local vision result is an observation, not authentication.", review: "Use comparable research or an accredited expert before a sale, purchase, insurance, or estate decision." },
  "/pd-pro": { label: "Case review", evidence: "Case notes and deadlines are private workspace inputs. Generated work product is organization support, not legal advice.", review: "A qualified advocate must review source material and approve every consequential action." },
  "/pd-pro/office": { label: "Professional review", evidence: "You control the request and source material. XinUS drafts structured work for your review.", review: "Verify facts, authority, calculations, and confidentiality before use or distribution." },
  "/recidivism": { label: "Support-centered record", evidence: "This workspace records user-entered events, supports, and obligations; it does not establish a person’s risk or outcome.", review: "Human judgment and the applicable policy remain required. Do not use this record for automated enforcement decisions." },
  "/task-force-pro": { label: "Operational review", evidence: "Inputs and status signals support coordination only; they are not an automated recommendation or determination.", review: "Review the facts, policy, and proportionality before any follow-through." },
  "/sitrep": { label: "Decision brief", evidence: "Your situation and context anchor the assessment. Unknowns, assumptions, and micro-macro simulations should be checked before acting.", review: "Confirm the proposed next move with the accountable person for the situation." },
  "/pam": { label: "Private continuity", evidence: "PAM uses this exchange and only the cross-product context you have approved in XinUS settings.", review: "Edit or revoke shared context at any time; PAM’s response is a prompt for your judgment, not an instruction." },
};

function PageHeader({ path }: { path: string }) {
  const meta = labels[path] ?? { eyebrow: "XinUS suite", title: "Recidivism workspace", description: "Manage this original suite surface with responsive, user-scoped records.", icon: MapPinned };
  const Icon = meta.icon;
  const boundary = assurance[path];
  return <header className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-300"><span className="h-px w-7 bg-violet-400" />{meta.eyebrow}</div><h1 className="font-display text-3xl font-semibold tracking-tight text-stone-50 sm:text-4xl">{meta.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{meta.description}</p>{boundary && <div className="mt-4 max-w-3xl rounded-2xl border border-emerald-300/15 bg-emerald-300/[.045] p-3.5 text-xs leading-5 text-slate-300"><div className="flex items-center gap-2 font-semibold uppercase tracking-[.16em] text-emerald-200"><ShieldCheck size={14} />{boundary.label}</div><p className="mt-1.5">{boundary.evidence}</p><p className="mt-1.5 text-emerald-100">Review boundary: {boundary.review}</p></div>}</div><div className="hidden h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-amber-300 shadow-[0_0_34px_rgba(196,181,253,.13)] sm:flex"><Icon size={21} /></div></header>;
}

function Clarity() {
  const [loadedProposition, setLoadedProposition] = useState<{ text: string; token: number }>();
  return <>
    <PageHeader path="/clarity" />
    <BlueprintClarityPanel initialProposition={loadedProposition} />
    <ClarityHistoryPanel onLoad={text => setLoadedProposition({ text, token: Date.now() })} />
  </>;
}

function ClarityHistoryPanel({ onLoad }: { onLoad: (proposition: string) => void }) {
  const [historySearch, setHistorySearch] = useState("");
  const [expandedHistory, setExpandedHistory] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const history = trpc.suite.clarity.history.useQuery();
  const deleteHistory = trpc.suite.clarity.deleteHistory.useMutation({ onSuccess: async () => { setExpandedHistory(null); await utils.suite.clarity.history.invalidate(); } });
  const query = historySearch.trim().toLowerCase();
  const items = (history.data ?? []).filter(item => !query || `${item.title} ${item.proposition} ${item.reflection} ${item.attachmentName ?? ""}`.toLowerCase().includes(query));
  return <section className="surface-soft mt-5 p-5 sm:p-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="micro-label">PRIVATE PROPOSITION HISTORY</p><h2 className="mt-1 font-display text-2xl text-stone-100">Browse saved reflections</h2><p className="mt-1 text-sm text-slate-400">Load a previous proposition into the deterministic Clarity engine, inspect its reflection, or remove it from your private history.</p></div><div className="relative w-full sm:w-72"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><Input value={historySearch} onChange={event => setHistorySearch(event.target.value)} placeholder="Search propositions" className="border-white/10 bg-black/20 pl-9" /></div></div>
    {history.error && <p role="alert" className="mt-4 text-sm text-amber-200">History unavailable: {history.error.message}</p>}
    {history.isLoading ? <p className="mt-5 text-sm text-slate-500">Loading private history…</p> : items.length ? <div className="mt-5 space-y-3">{items.map(item => { const expanded = expandedHistory === item.id; return <article key={item.id} className="rounded-2xl border border-white/8 bg-black/15 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-medium text-stone-100">{item.title}</p><p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-400">{item.proposition || "No proposition text saved."}</p><p className="mt-2 text-[11px] text-slate-500">{new Date(item.createdAt).toLocaleString()} · {item.messageCount} messages{item.attachmentName ? ` · ${item.attachmentName}` : ""}</p></div><div className="flex shrink-0 items-center gap-1"><Button size="sm" variant="outline" onClick={() => onLoad(item.proposition)} className="border-white/10 bg-white/[.03]">Load</Button><Button size="icon" variant="ghost" onClick={() => setExpandedHistory(expanded ? null : item.id)} title={expanded ? "Collapse reflection" : "Expand reflection"}>{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</Button><Button size="icon" variant="ghost" onClick={() => { if (window.confirm("Remove this proposition from Clarity history? Truth Ledger receipts remain preserved.")) deleteHistory.mutate({ conversationId: item.id }); }} title="Delete proposition" className="text-rose-200 hover:bg-rose-300/10"><Trash2 size={16} /></Button></div></div>{expanded && <div className="mt-4 space-y-3 border-t border-white/8 pt-4"><div><p className="micro-label">PROPOSITION</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.proposition}</p></div><div><p className="micro-label">REFLECTION</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.reflection || "No reflection recorded."}</p></div></div>}</article>; })}</div> : <p className="mt-5 text-sm text-slate-500">{historySearch ? "No saved propositions match that search." : "Your saved propositions will appear here after your first evaluation."}</p>}
  </section>;
}

function Ged() {
  const [subject, setSubject] = useState<"math" | "rla" | "science" | "social">("math");
  const [message, setMessage] = useState(""); const [focus, setFocus] = useState("work it out"); const [goal, setGoal] = useState("Pass the GED with confidence");
  const [confidence, setConfidence] = useState<"building" | "steady" | "strong">("building"); const [style, setStyle] = useState<"guided" | "visual" | "challenge">("guided");
  const [tone, setTone] = useState<"warm" | "playful" | "direct">("warm"); const [interests, setInterests] = useState(""); const [strengths, setStrengths] = useState(""); const [focusAreas, setFocusAreas] = useState("");
  const learner = { goal, confidence, style, tone, interests: interests || undefined, strengths: strengths || undefined, focusAreas: focusAreas || undefined };
  const send = trpc.suite.ged.sendTurn.useMutation(); const recommend = trpc.suite.ged.recommend.useMutation(); const research = trpc.suite.ged.research.useMutation();
  return <><PageHeader path="/ged-tutor" /><section className="surface mx-auto max-w-4xl p-5 sm:p-7"><div className="mb-6 flex flex-wrap gap-2">{(["math", "rla", "science", "social"] as const).map(item => <button onClick={() => setSubject(item)} key={item} className={`mode-chip ${subject === item ? "mode-chip-active" : ""}`}>{item === "rla" ? "RLA" : item}</button>)}</div><div className="mb-5 flex flex-wrap items-center gap-2"><span className="micro-label mr-1">Study focus</span>{["work it out", "explain why", "practice set", "review a mistake"].map(item => <button key={item} onClick={() => setFocus(item)} className={`mode-chip ${focus === item ? "mode-chip-active" : ""}`}>{item}</button>)}</div><div className="rounded-2xl border border-amber-300/15 bg-amber-300/[.05] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="micro-label">ADAPTIVE STUDY SETTINGS</p><p className="mt-1 text-sm text-slate-300">Tell your tutor how to coach you today. These preferences stay in your private study request.</p></div><button onClick={() => recommend.mutate({ subject, learner, studyFocus: focus, recentChallenge: message || undefined })} disabled={recommend.isPending} className="rounded-xl border border-amber-300/30 px-3 py-2 text-sm text-amber-100 hover:bg-amber-300/10">{recommend.isPending ? <Loader2 className="inline animate-spin" size={15}/> : <Sparkles className="inline" size={15}/>} Get my study block</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><Input value={goal} onChange={event => setGoal(event.target.value)} className="border-white/10 bg-black/20" placeholder="Your learning goal"/><Input value={interests} onChange={event => setInterests(event.target.value)} className="border-white/10 bg-black/20" placeholder="Interests that make learning fun, optional"/><Input value={strengths} onChange={event => setStrengths(event.target.value)} className="border-white/10 bg-black/20" placeholder="Strengths you bring, optional"/><Input value={focusAreas} onChange={event => setFocusAreas(event.target.value)} className="border-white/10 bg-black/20" placeholder="Focus areas you want help with, optional"/></div><div className="mt-3 flex flex-wrap gap-2"><span className="micro-label mr-1">Confidence</span>{(["building", "steady", "strong"] as const).map(item => <button onClick={() => setConfidence(item)} className={`mode-chip ${confidence === item ? "mode-chip-active" : ""}`} key={item}>{item}</button>)}<span className="micro-label ml-2 mr-1">Teaching style</span>{(["guided", "visual", "challenge"] as const).map(item => <button onClick={() => setStyle(item)} className={`mode-chip ${style === item ? "mode-chip-active" : ""}`} key={item}>{item}</button>)}<span className="micro-label ml-2 mr-1">Teaching tone</span>{(["warm", "playful", "direct"] as const).map(item => <button onClick={() => setTone(item)} className={`mode-chip ${tone === item ? "mode-chip-active" : ""}`} key={item}>{item}</button>)}</div></div>{recommend.error && <p role="alert" className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-rose-100">Study block unavailable: {recommend.error.message}</p>}{recommend.data && <article className="result-card mt-5"><p className="micro-label mb-3">YOUR PERSONALIZED STUDY BLOCK</p><p className="whitespace-pre-wrap leading-7 text-slate-200">{formatGedMath(recommend.data.recommendation)}</p></article>}<div className="mt-5 rounded-2xl border border-white/8 bg-black/15 p-5 text-sm text-slate-400"><p className="font-display text-xl text-stone-100">One strong question at a time.</p><p className="mt-2">Your tutor adapts its explanation, tone, and practice plan to your confidence, strengths, study focus, and learning style. It says plainly when a current or uncertain fact needs a trusted source check.</p></div><Textarea className="mt-5 min-h-32 border-white/10 bg-black/20" value={message} onChange={e => setMessage(e.target.value)} placeholder={`Ask a ${subject.toUpperCase()} question or share the step where you got stuck.`} /><div className="mt-4 flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={message.trim().length < 8 || research.isPending} onClick={() => research.mutate({ question: message })} className="rounded-xl border-white/10 bg-white/[.03]">{research.isPending ? <Loader2 className="animate-spin" /> : <BookOpenCheck />}Check trusted sources</Button><Button disabled={!message.trim() || send.isPending} onClick={() => send.mutate({ subject, learner, message: `Study focus: ${focus}.\n\n${message}` })} className="rounded-xl bg-amber-300 text-slate-950 hover:bg-amber-200">{send.isPending ? <Loader2 className="animate-spin" /> : <ArrowRight />}Ask my adaptive tutor</Button></div>{research.error && <p role="alert" className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-rose-100">Research check unavailable: {research.error.message}</p>}{research.data && <article className="result-card mt-5"><p className="micro-label mb-3">RESEARCH CHECK</p><p className="text-sm leading-6 text-slate-300">{research.data.message}</p>{research.data.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="mt-2 block text-xs text-violet-300 underline">{source.title}</a>)}</article>}{send.error && <p role="alert" className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-rose-100">Tutor response unavailable: {send.error.message}</p>}{send.data && <article className="result-card mt-5"><p className="micro-label mb-3">TUTOR RESPONSE</p><p className="whitespace-pre-wrap leading-7 text-slate-200">{formatGedMath(send.data.response)}</p></article>}</section></>;
}

function Gems() {
  const uploadInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [imageName, setImageName] = useState("");
  const [imageError, setImageError] = useState("");
  const [goal, setGoal] = useState("research");
  const [hint, setHint] = useState("");
  const appraise = trpc.suite.gems.appraise.useMutation();

  const selectImage = (file?: File) => {
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      setImageError("Image must be smaller than 12MB.");
      return;
    }
    setImageError("");
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      if (res) setUrl(res);
    };
    reader.onerror = () => setImageError("Could not read image file.");
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setUrl("");
    setImageName("");
    setImageError("");
    appraise.reset();
  };

  const hasInlineImage = url.startsWith("data:image/");
  return <><PageHeader path="/hidden-gems" /><section className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><div className="surface-soft p-6"><Camera className="text-amber-300" /><h2 className="mt-4 font-display text-2xl text-stone-100">Start with the object.</h2><p className="mt-3 text-sm leading-6 text-slate-400">Upload a photo or use your device camera. XinUS keeps a private image reference with your appraisal and passes only the selected photo to the local vision model. Results remain a cautious starting point, not professional authentication.</p></div><div className="surface p-6"><input ref={uploadInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => { selectImage(event.target.files?.[0]); event.currentTarget.value = ""; }} /><input ref={cameraInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" capture="environment" onChange={event => { selectImage(event.target.files?.[0]); event.currentTarget.value = ""; }} /><p className="micro-label">Object photo</p><div className="mt-2 grid gap-3 sm:grid-cols-2"><Button type="button" variant="outline" onClick={() => uploadInput.current?.click()} className="border-white/10 bg-white/[.03]"><Upload />Upload photo</Button><Button type="button" variant="outline" onClick={() => cameraInput.current?.click()} className="border-amber-300/30 bg-amber-300/[.06] text-amber-100 hover:bg-amber-300/[.12]"><Camera />Take a photo</Button></div><p className="mt-2 text-xs leading-5 text-slate-500">JPG, PNG, WEBP, or GIF · up to 12 MB. Camera opens directly on supported phones and tablets.</p>{hasInlineImage && <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/20"><img src={url} alt={imageName || "Selected object"} className="max-h-80 w-full object-contain" /><div className="flex items-center justify-between gap-3 border-t border-white/10 px-3 py-2"><span className="truncate text-xs text-slate-400">{imageName}</span><Button type="button" size="sm" variant="ghost" onClick={clearImage} className="shrink-0 text-slate-300 hover:text-white"><X size={15} />Remove</Button></div></div>}<label className="micro-label mt-5 block">Or paste a secure image URL</label><Input value={hasInlineImage ? "" : url} onChange={e => { setUrl(e.target.value); setImageName(""); setImageError(""); appraise.reset(); }} className="mt-2 border-white/10 bg-black/20" placeholder="https://…/your-finding.jpg" />{imageError && <p role="alert" className="mt-3 rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">{imageError}</p>}<div className="mt-5 flex flex-wrap items-center gap-2"><span className="micro-label mr-1">Appraisal goal</span>{["research", "identify", "conserve", "seek an expert"].map(item => <button key={item} onClick={() => setGoal(item)} className={`mode-chip ${goal === item ? "mode-chip-active" : ""}`}>{item}</button>)}</div><label className="micro-label mt-5 block">Context, optional</label><Textarea value={hint} onChange={e => setHint(e.target.value)} className="mt-2 min-h-24 border-white/10 bg-black/20" placeholder="Where it came from, markings, dimensions, or condition." /><div className="mt-4 flex justify-end"><Button disabled={!url || appraise.isPending} onClick={() => appraise.mutate({ imageUrl: url, hint: `Appraisal goal: ${goal}.\n\n${hint}` })} className="rounded-xl bg-amber-300 text-slate-950 hover:bg-amber-200">{appraise.isPending ? <Loader2 className="animate-spin" /> : <ImagePlus />}Appraise this photo</Button></div>{appraise.error && <p role="alert" className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-rose-100">Appraisal unavailable: {appraise.error.message}</p>}</div></section>{appraise.data && <article className="result-card mt-5"><p className="micro-label mb-3">Appraisal</p><pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-slate-200">{JSON.stringify(appraise.data.appraisal, null, 2)}</pre></article>}</> ;
}

function Pd() { const [name, setName] = useState(""); const workspace = trpc.suite.pd.workspace.useQuery(); const create = trpc.suite.pd.createCase.useMutation({ onSuccess: () => workspace.refetch() }); const setMode = trpc.suite.pd.setMode.useMutation({ onSuccess: () => workspace.refetch() }); const report = trpc.suite.pd.caseReport.useMutation({ onSuccess: data => downloadPdfReport(`${data.caseRecord.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-xinus-pd-report.pdf`, `XinUS PD Pro Case Summary — ${data.caseRecord.name}`, [{ heading: "Case overview", body: [`Client: ${data.caseRecord.client || "Not specified"}`, `Workspace mode: ${data.workspace.mode}`, `Clarity level: ${data.workspace.clarityLevel}%`, `Risk score: ${data.workspace.riskScore}`] }, { heading: "Deadlines", body: data.deadlines.length ? data.deadlines.map(item => `${new Date(item.dueAt).toLocaleDateString()} — ${item.label}`) : ["No deadlines recorded."] }, { heading: "Tasks", body: data.tasks.length ? data.tasks.map(item => `${item.done ? "Completed" : "Open"}: ${item.text}`) : ["No tasks recorded."] }, { heading: "Recent notes", body: data.notes.length ? data.notes.map(item => `${new Date(item.createdAt).toLocaleDateString()} — ${item.text}`) : ["No notes recorded."] }]) }); return <><PageHeader path="/pd-pro" /><section className="grid gap-5 lg:grid-cols-[1fr_1.2fr]"><div className="surface p-6"><p className="micro-label">Workspace status</p><div className="mt-4 flex items-baseline gap-3"><span className="font-display text-4xl text-stone-100">{workspace.data?.workspace.mode ?? "CLIENT"}</span><span className="text-sm text-emerald-300">{workspace.data?.workspace.clarityLevel ?? 50}% clarity</span></div><div className="mt-5 flex flex-wrap gap-2">{(["CLIENT", "PD", "EMERGENCY"] as const).map(mode => <button key={mode} onClick={() => setMode.mutate({ mode })} className={`mode-chip ${workspace.data?.workspace.mode === mode ? "mode-chip-active" : ""}`}>{mode}</button>)}</div><div className="mt-6 flex gap-2"><Button variant="outline" onClick={() => create.mutate({ name: name || "New Case" })} className="border-white/10 bg-white/[.03]">Create case</Button><Input value={name} onChange={e => setName(e.target.value)} placeholder="Case name" className="border-white/10 bg-black/20" /></div></div><div className="surface-soft p-6"><p className="micro-label">Open cases</p><div className="mt-4 space-y-3">{workspace.isLoading ? <Loader2 className="animate-spin text-violet-300" /> : workspace.data?.cases.length ? workspace.data.cases.map(item => <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-black/15 p-4"><div><p className="font-medium text-stone-100">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.client || "No client linked"}</p></div><Button size="sm" variant="outline" disabled={report.isPending} onClick={() => report.mutate({ caseId: item.id })} className="border-white/10 bg-white/[.03]"><Download />PDF</Button></div>) : <p className="text-sm text-slate-500">No cases yet. Create the first one to begin the PD workflow.</p>}</div></div></section></> ; }

function Office() { const [message, setMessage] = useState(""); const run = trpc.suite.pd.officeAssist.useMutation(); return <><PageHeader path="/pd-pro/office" /><section className="surface mx-auto max-w-4xl p-6"><Textarea value={message} onChange={e => setMessage(e.target.value)} className="min-h-40 border-white/10 bg-black/20" placeholder="Ask for a memo, table, budget, slide outline, calculation, or operating plan." /><div className="mt-4 flex justify-end"><Button disabled={!message || run.isPending} onClick={() => run.mutate({ message })} className="rounded-xl bg-violet-400 text-slate-950">{run.isPending ? <Loader2 className="animate-spin" /> : <FileText />}Create work product</Button></div>{run.data && <article className="result-card mt-5 whitespace-pre-wrap leading-7 text-slate-200">{run.data.response}</article>}</section></> }

function Recidivism({ taskForce = false }: { taskForce?: boolean }) { const [name, setName] = useState(""); const [, setLocation] = useLocation(); const subjects = trpc.suite.recidivism.listSubjects.useQuery(); const create = trpc.suite.recidivism.createSubject.useMutation({ onSuccess: () => subjects.refetch() }); return <><PageHeader path={taskForce ? "/task-force-pro" : "/recidivism"} /><section className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]"><div className="surface p-6"><Target className="text-emerald-300" /><h2 className="mt-4 font-display text-2xl text-stone-100">{taskForce ? "Operational workspace" : "Anchor workspace"}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{taskForce ? "Create an organization-owned operational subject record, then move through protected Trigger, Pattern, Obligation, Geofence, Contact, Profile, Report, and Console routes." : "Create a subject record, then use the dedicated Trigger, Pattern, Obligation, Geofence, Contact, Profile, Report, and Console routes."}</p><Input value={name} onChange={e => setName(e.target.value)} className="mt-5 border-white/10 bg-black/20" placeholder={taskForce ? "Operational subject label" : "Subject name"} /><Button disabled={!name || create.isPending} onClick={() => create.mutate({ name })} className="mt-3 rounded-xl bg-emerald-300 text-slate-950">{taskForce ? "Add operational record" : "Add subject"}</Button></div><div className="surface-soft p-6"><p className="micro-label">{taskForce ? "Operational subjects" : "Subjects"}</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{subjects.data?.length ? subjects.data.map(subject => <div key={subject.id} className="rounded-xl border border-white/8 bg-black/15 p-4"><p className="font-medium text-stone-100">{subject.name}</p><p className="mt-1 text-xs text-slate-500">Risk {subject.riskScore} · streak {subject.streak}</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setLocation(`/recidivism/subjects/${subject.id}`)} className="border-white/10 bg-white/[.03]">Profile</Button><Button size="sm" variant="outline" onClick={() => setLocation("/recidivism/triggers")} className="border-white/10 bg-white/[.03]">Check-in</Button><Button size="sm" variant="outline" onClick={() => setLocation("/recidivism/obligations")} className="border-white/10 bg-white/[.03]">Plan</Button></div></div>) : <p className="text-sm text-slate-500">No subjects are available yet.</p>}</div></div></section></>; }

function SitRep() {
  const [mode, setMode] = useState<"general" | "travel" | "immigration">("general");
  const [horizon, setHorizon] = useState("next 24 hours");
  const [situation, setSituation] = useState("");
  const [context, setContext] = useState("");
  const [simulateMatrix, setSimulateMatrix] = useState(false);
  const [claims, setClaims] = useState<SitRepClaim[]>([]);
  const [sourceDocuments, setSourceDocuments] = useState<SitRepSourceDocument[]>([]);
  const [documentError, setDocumentError] = useState("");
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const assess = trpc.suite.sitrep.assess.useMutation();
  const tracking = assess.data?.tracking;
  const matrixData = tracking ? [tracking.baseline, ...tracking.simulationBranches] : [
    { branch: "Primary Baseline", outcome: "Working baseline pending evidence cross-check.", confidence: 0.91, evidenceStatus: "partially_verified", simulationStatus: "baseline", decisionState: "cross_check_required" },
    { branch: "Sub-Particulate Alt A", outcome: "Simulation branch; hold escalation pending cross-check.", confidence: 0.84, evidenceStatus: "partially_verified", simulationStatus: "simulation_branch", decisionState: "hold" },
    { branch: "Sub-Particulate Alt B", outcome: "Simulation branch; treat the claim as unverified.", confidence: 0.79, evidenceStatus: "unverified", simulationStatus: "simulation_branch", decisionState: "cross_check_required" },
  ];
  const importSourceDocuments = async (files: FileList | null) => {
    if (!files?.length) return;
    setDocumentError("");
    const supported = Array.from(files).filter(file => /\.((txt)|(md)|(csv)|(json))$/i.test(file.name) || file.type.startsWith("text/"));
    if (supported.length !== files.length) setDocumentError("Only text, Markdown, CSV, and JSON source documents can be read locally in this workspace.");
    const imported = await Promise.all(supported.slice(0, 5).map(async file => {
      const text = await file.text();
      const fragments = text.split(/[.!?\n]+/).map(value => value.trim().replace(/\s+/g, " ")).filter(Boolean).slice(0, 20);
      return {
        document: { name: file.name, size: file.size, claimCount: fragments.length },
        claims: fragments.map((fragment, index) => ({ id: `${file.name}-${index}-${Date.now()}`, text: fragment.slice(0, 1000), sourceName: file.name, status: "unverified" as const })),
      };
    }));
    setSourceDocuments(previous => [...previous, ...imported.map(item => item.document)].slice(0, 10));
    setClaims(previous => [...previous, ...imported.flatMap(item => item.claims)].slice(0, 100));
  };

  return <>
    <PageHeader path="/sitrep" />
    <section className="surface mx-auto max-w-4xl p-6">
      <div className="flex flex-wrap gap-2">
        {(["general", "travel", "immigration"] as const).map(item => (
          <button onClick={() => setMode(item)} className={`mode-chip ${mode === item ? "mode-chip-active" : ""}`} key={item}>
            {item}
          </button>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="micro-label mr-1">Planning horizon</span>
        {["next 24 hours", "this week", "decision only"].map(item => (
          <button key={item} onClick={() => setHorizon(item)} className={`mode-chip ${horizon === item ? "mode-chip-active" : ""}`}>
            {item}
          </button>
        ))}
      </div>
      <Textarea value={situation} onChange={e => setSituation(e.target.value)} className="mt-5 min-h-32 border-white/10 bg-black/20" placeholder="Describe the situation." />
      <Textarea value={context} onChange={e => setContext(e.target.value)} className="mt-3 min-h-20 border-white/10 bg-black/20" placeholder="Anything else that matters — goals, constraints, what you have already tried." />
      <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-300/[.035] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="micro-label text-cyan-200">SOURCE DOCUMENTS · LOCAL ONLY</p><p className="mt-1 text-xs text-slate-400">Import text-based source material without uploading the original file. Claims stay unverified until you review them.</p></div>
          <input ref={sourceInputRef} type="file" multiple accept=".txt,.md,.csv,.json,text/*" className="hidden" onChange={event => { void importSourceDocuments(event.target.files); event.currentTarget.value = ""; }} />
          <Button type="button" size="sm" variant="outline" onClick={() => sourceInputRef.current?.click()} className="border-cyan-300/20 text-cyan-100"><Upload size={14} className="mr-1" />Import source document</Button>
        </div>
        {documentError && <p role="alert" className="mt-3 text-xs text-amber-200">{documentError}</p>}
        {sourceDocuments.length > 0 && <div className="mt-3 space-y-2">{sourceDocuments.map(document => <div key={`${document.name}-${document.size}`} className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-xs"><span className="truncate text-slate-200">{document.name}</span><span className="shrink-0 text-slate-500">{document.claimCount} claims · {Math.ceil(document.size / 1024)} KB</span></div>)}</div>}
      </div>
      {claims.length > 0 && <div className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-300/[.035] p-4"><div className="flex items-center justify-between gap-3"><div><p className="micro-label text-amber-200">CLAIM REVIEW QUEUE</p><p className="mt-1 text-xs text-slate-400">Mark only claims you have personally checked against the source. This is a human review action, not automated authentication.</p></div><span className="text-xs text-slate-500">{claims.filter(claim => claim.status === "verified").length}/{claims.length} reviewed</span></div><div className="mt-3 max-h-72 space-y-2 overflow-y-auto">{claims.map(claim => <div key={claim.id} className="rounded-lg border border-white/8 bg-black/20 p-3"><div className="flex items-start gap-3"><button type="button" aria-label={claim.status === "verified" ? "Mark claim unverified" : "Mark claim verified"} onClick={() => setClaims(previous => previous.map(item => item.id === claim.id ? { ...item, status: item.status === "verified" ? "unverified" : "verified" } : item))} className={`mt-0.5 shrink-0 rounded-full ${claim.status === "verified" ? "text-emerald-300" : "text-slate-500"}`}>{claim.status === "verified" ? <CheckCircle2 size={18} /> : <ShieldCheck size={18} />}</button><div className="min-w-0"><p className="text-sm leading-5 text-slate-200">{claim.text}</p><p className="mt-1 text-[11px] text-slate-500">Source: {claim.sourceName} · {claim.status === "verified" ? "Human-reviewed" : "Needs review"}</p></div></div></div>)}</div></div>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input checked={simulateMatrix} onChange={e => setSimulateMatrix(e.target.checked)} type="checkbox" className="rounded border-white/20 bg-black/40 text-violet-400 focus:ring-0" />
          Enable Sub-Particulate Possibility Matrix (Shadow Branching)
        </label>
        <Button disabled={!situation || assess.isPending} onClick={() => assess.mutate({ mode, situation, context, planningHorizon: horizon, includeSimulation: simulateMatrix, claims, sourceDocuments })} className="rounded-xl bg-violet-400 text-slate-950">
          {assess.isPending ? <Loader2 className="animate-spin" /> : <Radio />} Run SitRep
        </Button>
      </div>
      {assess.data && <article className="result-card mt-5 whitespace-pre-wrap leading-7 text-slate-200">{assess.data.response}</article>}

      {simulateMatrix && (
        <div className="mt-6 space-y-5">
          <div className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.04] p-5">
            <div className="flex items-center justify-between">
              <p className="micro-label text-violet-300">SUB-PARTICULATE POSSIBILITY MATRIX</p>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-violet-400/10 px-2.5 py-0.5 text-xs text-violet-200">Shadow Simulation Active</span>
                <Button size="sm" variant="outline" onClick={() => {
                  const payload = JSON.stringify({
                    bundleId: `bundle_${Date.now()}`,
                    assessmentId: tracking?.assessmentId ?? `local_${Date.now()}`,
                    evidence: tracking?.evidence ?? [],
                    verifiedFacts: tracking?.verifiedFacts ?? [],
                    unverifiedClaims: tracking?.unverifiedClaims ?? [],
                    assumptions: tracking?.assumptions ?? [],
                    unknowns: tracking?.unknowns ?? [],
                    baseline: tracking?.baseline ?? matrixData[0],
                    simulationBranches: tracking?.simulationBranches ?? matrixData.slice(1),
                    branchDeltas: tracking?.branchDeltas ?? [],
                    confidenceMethod: tracking?.confidenceMethod ?? "Confidence is separate from evidence verification.",
                    evidenceStatus: tracking?.evidenceStatus ?? "partially_verified",
                    simulationStatus: tracking?.simulationStatus ?? "baseline",
                    decisionState: tracking?.decisionState ?? "cross_check_required",
                    recommendedNextAction: tracking?.recommendedNextAction ?? "Cross-check supplied facts.",
                    humanReviewRequired: true,
                  }, null, 2);
                  const blob = new Blob([payload], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = "xinus-verified-delta-bundle.json"; a.click();
                  URL.revokeObjectURL(url);
                }} className="border-violet-400/30 bg-violet-400/10 text-violet-200 hover:bg-violet-400/20"><Download size={14} className="mr-1" />Export Evidence Delta Bundle</Button>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-400">Comparing a provenance-aware baseline against fragment-level alternate variables. Confidence is separate from evidence verification, and simulation cannot upgrade an unverified claim.</p>
            {tracking && <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/8 bg-black/20 p-3"><p className="micro-label">TRUTH BOUNDARY</p><p className="mt-1 text-xs leading-5 text-slate-300">Evidence status: <span className="text-amber-200">{tracking.evidenceStatus.replaceAll("_", " ")}</span>. Confidence: <span className="text-violet-200">{Math.round(tracking.baseline.confidence * 100)}%</span>. These are separate dimensions.</p></div>
                <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.04] p-3"><p className="micro-label text-emerald-200">HUMAN AUTHORITY BOUNDARY</p><p className="mt-1 text-xs leading-5 text-slate-300">Decision state: {tracking.decisionState.replaceAll("_", " ")}. Human review is required before consequential action.</p></div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-3"><div><p className="micro-label">EVIDENCE LEDGER</p><p className="mt-1 text-xs leading-5 text-slate-400">{tracking.evidence.length ? tracking.evidence.join(" · ") : "No supplied evidence fragments recorded."}</p></div><div><p className="micro-label">ASSUMPTIONS</p><p className="mt-1 text-xs leading-5 text-slate-400">{tracking.assumptions.join(" · ")}</p></div><div><p className="micro-label">UNKNOWNS TO VERIFY</p><p className="mt-1 text-xs leading-5 text-slate-400">{tracking.unknowns.join(" · ")}</p></div></div>
            </>}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-slate-400">
                    <th className="pb-3 font-semibold">Branch Variant</th>
                    <th className="pb-3 font-semibold">Projected Outcome</th>
                    <th className="pb-3 font-semibold">Confidence</th>
                    <th className="pb-3 font-semibold">Evidence status</th>
                    <th className="pb-3 font-semibold">Simulation status</th>
                    <th className="pb-3 font-semibold">Decision state</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {matrixData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02]">
                      <td className="py-3 font-medium text-stone-200">{row.branch}</td>
                      <td className="py-3 text-slate-300">{row.outcome}</td>
                      <td className="py-3 font-mono text-violet-300">{Math.round(row.confidence * 100)}%</td>
                      <td className="py-3"><span className={`rounded bg-black/30 px-2 py-1 text-xs ${row.evidenceStatus === "verified" ? "text-emerald-300" : row.evidenceStatus === "partially_verified" ? "text-amber-200" : "text-rose-200"}`}>{row.evidenceStatus.replaceAll("_", " ")}</span></td>
                      <td className="py-3"><span className="rounded bg-black/30 px-2 py-1 text-xs text-violet-200">{row.simulationStatus.replaceAll("_", " ")}</span></td>
                      <td className="py-3"><span className="rounded bg-black/30 px-2 py-1 text-xs text-slate-300">{row.decisionState.replaceAll("_", " ")}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-400/20 bg-black/40 p-5">
            <div className="flex items-center justify-between">
              <p className="micro-label text-violet-300">INTERACTIVE 3D MANIFOLD PROJECTION (21-AXIS CLUSTERS)</p>
              <span className="text-xs text-slate-400">Rotate &amp; Inspect Manifold</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Visualizing 21-axis coordinate vector clustering across simulation branches and evidentiary distance.</p>
            <div className="mt-4 flex h-48 w-full items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-violet-950/30 via-slate-900 to-black/60 p-4 text-center relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center opacity-15 pointer-events-none">
                <div className="h-40 w-40 rounded-full border border-violet-400 animate-pulse"></div>
                <div className="absolute h-28 w-28 rounded-full border border-amber-300 animate-ping"></div>
              </div>
              <div className="z-10 space-y-2">
                <div className="flex justify-center gap-4">
                  <span className="inline-flex items-center rounded-full bg-violet-400/20 px-3 py-1 text-xs text-violet-300 font-mono">Cluster A: Baseline (0.91)</span>
                  <span className="inline-flex items-center rounded-full bg-emerald-400/20 px-3 py-1 text-xs text-emerald-300 font-mono">Cluster B: Alt Divergence (0.84)</span>
                </div>
                <p className="text-xs text-slate-300">Interactive 3D manifold projection rendered with geometric depth, confidence weighting, and constraint boundaries.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  </>;
}

function PAM() {
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"calm" | "balanced" | "intense">("balanced");
  const [intensity, setIntensity] = useState<1 | 2 | 3>(2);
  const [omni, setOmni] = useState(true);
  const history = trpc.suite.pam.history.useQuery();
  const run = trpc.suite.pam.converse.useMutation({ onSuccess: () => history.refetch() });

  return <>
    <PageHeader path="/pam" />
    <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
      <div className="surface p-6">
        <div>
          <p className="micro-label">PAM</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">Your single XinUS reflective assistant for a grounded next move.</p>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-4">
          <div className="flex items-center justify-between">
            <span className="micro-label text-amber-300">CASCADING-RISK &amp; ENTANGLEMENT ALERTS</span>
            <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-xs text-amber-200">30-Day Forecast Active</span>
          </div>
          <p className="mt-1.5 text-xs text-slate-300">Cross-case vector analysis detects a rising recurrence probability across active supervisory records. 21-axis entanglement recommends proactive mitigation.</p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="micro-label mr-1">Tone</span>
          {(["calm", "balanced", "intense"] as const).map(item => (
            <button key={item} onClick={() => setTone(item)} className={`mode-chip ${tone === item ? "mode-chip-active" : ""}`}>
              {item}
            </button>
          ))}
          <span className="ml-2 micro-label">Intensity</span>
          {([1, 2, 3] as const).map(item => (
            <button key={item} onClick={() => setIntensity(item)} className={`mode-chip ${intensity === item ? "mode-chip-active" : ""}`}>
              {item}
            </button>
          ))}
        </div>
        <label className="mt-5 flex items-center gap-2 text-sm text-slate-300">
          <input checked={omni} onChange={event => setOmni(event.target.checked)} type="checkbox" />
          Suggest the relevant XinUS app when it helps.
        </label>
        <Textarea value={message} onChange={e => setMessage(e.target.value)} className="mt-5 min-h-36 border-white/10 bg-black/20" placeholder="Tell PAM what needs a clear next move." />
        <div className="mt-4 flex justify-end">
          <Button disabled={!message || run.isPending} onClick={() => run.mutate({ persona: "PAM", message, tone, intensity, omni })} className="rounded-xl bg-violet-400 text-slate-950">
            {run.isPending ? <Loader2 className="animate-spin" /> : <Bot />} Ask PAM
          </Button>
        </div>
        {run.error && <p role="alert" className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-rose-100">{run.error.message}</p>}
        {run.data && <article className="result-card mt-5 whitespace-pre-wrap leading-7 text-slate-200">{run.data.response}</article>}
      </div>

      <aside className="surface-soft p-6">
        <p className="micro-label">PAM continuity</p>
        <p className="mt-2 text-sm leading-6 text-slate-400">Recent PAM exchanges remain private to your XinUS account and help you pick up the next decision.</p>
        <div className="mt-5 space-y-2">
          {history.isLoading ? (
            <Loader2 className="animate-spin text-violet-300" />
          ) : history.error ? (
            <p role="alert" className="text-sm leading-6 text-amber-200">PAM continuity is unavailable right now. You can still begin a new private exchange and capture its next action on this device.</p>
          ) : history.data?.length ? (
            history.data.map(item => (
              <div key={item.id} className="rounded-xl border border-white/8 bg-black/15 p-3">
                <p className="text-sm text-stone-200">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(item.updatedAt).toLocaleDateString()}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No PAM conversations yet. Start with the decision in front of you.</p>
          )}
        </div>
      </aside>
    </section>
  </>;
}

function Account() {
  const billing = trpc.billing.me.useQuery(); const credits = trpc.credits.summary.useQuery();
  const checkout = trpc.billing.checkout.useMutation({ onSuccess: data => window.location.assign(data.url) });
  const loading = billing.isLoading || credits.isLoading;
  return <><PageHeader path="/account" /><section className="grid gap-5 md:grid-cols-2"><div className="surface p-6"><p className="micro-label">XinUS tier</p>{loading ? <Loader2 className="mt-5 animate-spin text-amber-300" /> : billing.error ? <p role="alert" className="mt-4 text-sm text-rose-200">Your plan details are unavailable. Refresh to retry.</p> : <><p className="mt-3 font-display text-3xl text-stone-100">{billing.data?.tier ?? "core"}</p><p className="mt-2 text-sm text-slate-400">{billing.data?.status ?? "Your current workspace plan."}</p></>}<div className="mt-5 flex flex-wrap gap-2"><Button disabled={checkout.isPending} onClick={() => checkout.mutate({ returnPath: "/account" })} className="rounded-xl bg-amber-300 text-slate-950">{checkout.isPending ? <Loader2 className="animate-spin" /> : "Explore XinUS Plus"}</Button><Button variant="outline" onClick={() => { billing.refetch(); credits.refetch(); }} className="rounded-xl border-white/10 bg-white/[.03]">Refresh status</Button></div>{checkout.error && <p role="alert" className="mt-3 text-sm text-rose-200">{checkout.error.message}</p>}</div><div className="surface-soft p-6"><p className="micro-label">XC ledger</p>{loading ? <Loader2 className="animate-spin text-violet-300" /> : credits.error ? <p role="alert" className="mt-4 text-sm text-rose-200">Your credit balance is unavailable. Refresh to retry.</p> : <><p className="mt-3 font-display text-3xl text-stone-100">{credits.data?.balance ?? 0} XC</p><p className="mt-2 text-sm text-slate-400">Welcome credit and operation activity appear here.</p></>}</div></section></>;
}

function Admin() {
  const audit = trpc.suite.admin.audit.useQuery(); const [command, setCommand] = useState("/status");
  const run = trpc.suite.admin.runTerminal.useMutation({ onSuccess: () => audit.refetch() });
  const execute = (confirmed = false) => run.mutate({ input: command, confirmed });
  return <><PageHeader path="/admin" /><section className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]"><div className="surface p-6"><p className="micro-label">Safe terminal</p><Input value={command} onChange={e => { setCommand(e.target.value); run.reset(); }} className="mt-4 border-white/10 bg-black/20 font-mono" /><div className="mt-3 flex flex-wrap gap-2"><Button disabled={!command.trim() || run.isPending} onClick={() => execute()} className="rounded-xl bg-violet-400 text-slate-950">{run.isPending ? <Loader2 className="animate-spin" /> : "Run command"}</Button>{run.data?.requiresConfirmation && <Button disabled={run.isPending} variant="outline" onClick={() => execute(true)} className="rounded-xl border-amber-300/30 bg-amber-300/10 text-amber-100">Confirm command</Button>}</div>{run.error && <p role="alert" className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-rose-100">{run.error.message}</p>}{run.data && <p className={`mt-4 rounded-xl bg-black/25 p-3 font-mono text-sm ${run.data.ok ? "text-emerald-300" : "text-amber-200"}`}>{run.data.lines.join("\n")}</p>}</div><div className="surface-soft p-6"><p className="micro-label">Recent terminal activity · {audit.data?.totals.users ?? 0} users</p><div className="mt-4 space-y-2">{audit.isLoading ? <Loader2 className="animate-spin text-violet-300" /> : audit.error ? <p role="alert" className="text-sm text-rose-200">Terminal history is unavailable. Refresh this page to retry.</p> : audit.data?.commands.length ? audit.data.commands.map(item => <div key={item.id} className="flex justify-between rounded-lg border border-white/7 bg-black/15 px-3 py-2 text-xs"><span className="font-mono text-slate-300">{item.command} {item.args}</span><span className={item.outcome === "ok" ? "text-emerald-300" : "text-amber-300"}>{item.outcome}</span></div>) : <p className="text-sm text-slate-500">No terminal activity has been recorded yet.</p>}</div></div></section></>;
}

function RecidivismSubPage({ path }: { path: string }) {
  const [isProfileRoute, profileParams] = useRoute("/recidivism/subjects/:id");
  const [isReportRoute, reportParams] = useRoute("/recidivism/reports/:id");
  const recordId = Number(profileParams?.id ?? reportParams?.id);
  const record = trpc.suite.recidivism.getSubject.useQuery({ subjectId: recordId }, { enabled: (isProfileRoute || isReportRoute) && Number.isInteger(recordId) && recordId > 0 });
  if (isProfileRoute || isReportRoute) return <><PageHeader path="/recidivism" /><section className="surface p-6"><p className="micro-label">{isReportRoute ? "Subject report" : "Subject profile"}</p>{record.isLoading ? <Loader2 className="mt-5 animate-spin text-emerald-300" /> : record.error ? <p role="alert" className="mt-5 text-sm text-rose-200">{record.error.message}</p> : !record.data ? <p className="mt-5 text-sm text-slate-400">No matching XinUS subject record was found. Return to Recidivism to create or select a subject.</p> : <div className="mt-5 grid gap-4 md:grid-cols-2"><div><p className="font-display text-3xl text-stone-100">{record.data.subject.name}</p><p className="mt-2 text-sm text-slate-400">Risk {record.data.subject.riskScore} · streak {record.data.subject.streak}</p></div><div className="rounded-xl border border-white/8 bg-black/15 p-4 text-sm text-slate-400"><p>{record.data.obligations.length} obligations · {record.data.triggers.length} triggers · {record.data.alerts.filter(alert => !alert.resolved).length} unresolved alerts</p></div></div>}</section></>;
  const slug = useMemo(() => path.split("/").pop()?.replaceAll("-", " ") ?? "workspace", [path]);
  const subjects = trpc.suite.recidivism.listSubjects.useQuery();
  const [value, setValue] = useState(""); const [detail, setDetail] = useState("");
  const trigger = trpc.suite.recidivism.addTrigger.useMutation(); const obligation = trpc.suite.recidivism.addObligation.useMutation(); const contact = trpc.suite.recidivism.addContact.useMutation(); const geofence = trpc.suite.recidivism.addGeofence.useMutation();
  const subjectId = subjects.data?.[0]?.id;
  const activeSubject = trpc.suite.recidivism.getSubject.useQuery({ subjectId: subjectId ?? 0 }, { enabled: Boolean(subjectId) });
  const save = () => {
    if (!subjectId || !value.trim()) return;
    if (slug === "triggers") trigger.mutate({ subjectId, situation: value, note: detail || undefined });
    else if (slug === "obligations") obligation.mutate({ subjectId, title: value, dueAt: new Date(Date.now() + 86_400_000), type: "meeting" });
    else if (slug === "contacts") contact.mutate({ subjectId, name: value, role: detail || "Support contact", phone: "Not provided" });
    else if (slug === "geofences") geofence.mutate({ subjectId, name: value, address: detail || "Address pending", radius: 250, type: "avoid" });
  };
  const hasForm = ["triggers", "obligations", "contacts", "geofences"].includes(slug);
  const readOnly: Record<string, { title: string; body: string }> = {
    patterns: { title: "Pattern lens", body: "Compare logged triggers, rising risk, and missed obligations to identify repeat conditions before they become a crisis." },
    console: { title: "Voice command console", body: "Review the active subject’s alerts and move into PAM for the voice-first reflection loop." },
  };
  const companion = readOnly[slug];
  const liveView = slug === "patterns" ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{activeSubject.isLoading ? <Loader2 className="animate-spin text-emerald-300" /> : activeSubject.data ? <><div className="rounded-xl border border-white/8 bg-black/15 p-4"><p className="micro-label">Recent triggers</p><p className="mt-2 text-2xl text-stone-100">{activeSubject.data.triggers.length}</p><p className="mt-2 text-xs text-slate-500">{activeSubject.data.triggers[0]?.situation ?? "No trigger pattern logged."}</p></div><div className="rounded-xl border border-white/8 bg-black/15 p-4"><p className="micro-label">Open obligations</p><p className="mt-2 text-2xl text-stone-100">{activeSubject.data.obligations.filter(item => item.status === "upcoming").length}</p><p className="mt-2 text-xs text-slate-500">{activeSubject.data.alerts.filter(item => !item.resolved).length} unresolved alerts</p></div></> : <p className="text-sm text-slate-500">Create a subject to activate pattern analysis.</p>}</div> : slug === "console" ? <div className="mt-5 rounded-xl border border-white/8 bg-black/15 p-5"><p className="text-sm leading-6 text-slate-400">{companion?.body}</p><div className="mt-4 flex items-center justify-between border-t border-white/8 pt-4"><span className="text-xs text-slate-500">Unresolved subject alerts: {activeSubject.data?.alerts.filter(item => !item.resolved).length ?? 0}</span><Button size="sm" variant="outline" onClick={() => window.location.assign("/pam")} className="border-white/10 bg-white/[.03]">Open PAM</Button></div></div> : null;
  return <><PageHeader path={path} /><section className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]"><div className="surface-soft p-6"><p className="micro-label">Active subject</p><p className="mt-3 font-display text-2xl text-stone-100">{subjects.data?.[0]?.name ?? "No subject selected"}</p><p className="mt-2 text-sm leading-6 text-slate-400">All records remain tied to the first available subject in this user-scoped Anchor workspace. Create a subject from the Recidivism dashboard before logging operations.</p></div><div className="surface p-6"><h2 className="font-display text-2xl capitalize text-stone-100">{companion?.title ?? slug}</h2>{hasForm ? <><Input value={value} onChange={e => setValue(e.target.value)} className="mt-5 border-white/10 bg-black/20" placeholder={slug === "triggers" ? "What happened?" : slug === "obligations" ? "Obligation title" : slug === "contacts" ? "Contact name" : "Geofence name"} /><Textarea value={detail} onChange={e => setDetail(e.target.value)} className="mt-3 min-h-24 border-white/10 bg-black/20" placeholder={slug === "triggers" ? "Context, person, place, or observations." : slug === "contacts" ? "Role or support context." : slug === "geofences" ? "Address or coordinates." : "Optional context."} /><Button disabled={!subjectId || !value.trim()} onClick={save} className="mt-4 rounded-xl bg-emerald-300 text-slate-950">Save {slug.slice(0, -1)}</Button></> : liveView ?? <div className="mt-5 rounded-xl border border-white/8 bg-black/15 p-5"><CheckCircle2 className="text-emerald-300" /><p className="mt-3 text-sm leading-6 text-slate-400">This protected XinUS view is ready for the active subject record.</p></div>}</div></section></>;
}

function useActiveRecidivismSubject() {
  const subjects = trpc.suite.recidivism.listSubjects.useQuery();
  const subjectId = subjects.data?.[0]?.id;
  const record = trpc.suite.recidivism.getSubject.useQuery({ subjectId: subjectId ?? 0 }, { enabled: Boolean(subjectId) });
  return { subjects, subjectId, record };
}

function RecidivismSurface({ path, title, children }: { path: string; title: string; children: React.ReactNode }) {
  const { subjects } = useActiveRecidivismSubject();
  return <><PageHeader path={path} /><section className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]"><aside className="surface-soft p-6"><p className="micro-label">Active subject</p>{subjects.isLoading ? <Loader2 className="mt-5 animate-spin text-emerald-300" /> : subjects.error ? <p role="alert" className="mt-4 text-sm text-rose-200">Subject records are unavailable. Return to the workspace and retry.</p> : <><p className="mt-3 font-display text-2xl text-stone-100">{subjects.data?.[0]?.name ?? "No subject selected"}</p><p className="mt-2 text-sm leading-6 text-slate-400">Each operational record stays scoped to the active user and subject. Create a subject from the Recidivism workspace before logging follow-through.</p></>}</aside><div className="surface p-6"><h2 className="font-display text-2xl text-stone-100">{title}</h2>{children}</div></section></>;
}

function TriggerLogPage() {
  const { subjectId, record } = useActiveRecidivismSubject(); const [situation, setSituation] = useState(""); const [note, setNote] = useState("");
  const save = trpc.suite.recidivism.addTrigger.useMutation({ onSuccess: () => record.refetch() });
  return <RecidivismSurface path="/recidivism/triggers" title="Trigger log"><p className="mt-2 text-sm text-slate-400">Capture the situation first; then add observations that can reveal a repeatable pattern.</p><Textarea value={situation} onChange={event => setSituation(event.target.value)} className="mt-5 min-h-28 border-white/10 bg-black/20" placeholder="What happened?" /><Textarea value={note} onChange={event => setNote(event.target.value)} className="mt-3 min-h-24 border-white/10 bg-black/20" placeholder="Observations, people, places, or context." /><Button disabled={!subjectId || !situation.trim() || save.isPending} onClick={() => save.mutate({ subjectId: subjectId ?? 0, situation, note: note || undefined })} className="mt-4 rounded-xl bg-emerald-300 text-slate-950">{save.isPending ? <Loader2 className="animate-spin" /> : "Save trigger"}</Button></RecidivismSurface>;
}

function ObligationPlanPage() {
  const { subjectId, record } = useActiveRecidivismSubject(); const [title, setTitle] = useState(""); const [type, setType] = useState<"court" | "meeting" | "test" | "curfew">("meeting");
  const save = trpc.suite.recidivism.addObligation.useMutation({ onSuccess: () => record.refetch() });
  return <RecidivismSurface path="/recidivism/obligations" title="Obligation plan"><p className="mt-2 text-sm text-slate-400">Schedule meetings, hearings, or support touchpoints with clear timing.</p><Input value={title} onChange={event => setTitle(event.target.value)} className="mt-5 border-white/10 bg-black/20" placeholder="Obligation title" /><div className="mt-3 flex flex-wrap gap-2">{(["court", "meeting", "test", "curfew"] as const).map(item => <button key={item} onClick={() => setType(item)} className={`mode-chip ${type === item ? "mode-chip-active" : ""}`}>{item}</button>)}</div><Button disabled={!subjectId || !title.trim() || save.isPending} onClick={() => save.mutate({ subjectId: subjectId ?? 0, title, dueAt: new Date(Date.now() + 86_400_000), type })} className="mt-4 rounded-xl bg-emerald-300 text-slate-950">{save.isPending ? <Loader2 className="animate-spin" /> : "Save obligation"}</Button></RecidivismSurface>;
}

function SupportContactPage() {
  const { subjectId, record } = useActiveRecidivismSubject(); const [name, setName] = useState(""); const [role, setRole] = useState(""); const [phone, setPhone] = useState("");
  const save = trpc.suite.recidivism.addContact.useMutation({ onSuccess: () => record.refetch() });
  return <RecidivismSurface path="/recidivism/contacts" title="Support contacts"><p className="mt-2 text-sm text-slate-400">Maintain trusted advocates, counselors, or supervisors.</p><Input value={name} onChange={event => setName(event.target.value)} className="mt-5 border-white/10 bg-black/20" placeholder="Contact name" /><Input value={role} onChange={event => setRole(event.target.value)} className="mt-3 border-white/10 bg-black/20" placeholder="Role or organization" /><Input value={phone} onChange={event => setPhone(event.target.value)} className="mt-3 border-white/10 bg-black/20" placeholder="Phone or email" /><Button disabled={!subjectId || !name.trim() || save.isPending} onClick={() => save.mutate({ subjectId: subjectId ?? 0, name, role: role || "Support", phone: phone || "Not provided" })} className="mt-4 rounded-xl bg-emerald-300 text-slate-950">{save.isPending ? <Loader2 className="animate-spin" /> : "Save contact"}</Button></RecidivismSurface>;
}

function GeofencePlanPage() {
  const { subjectId, record } = useActiveRecidivismSubject(); const [name, setName] = useState(""); const [address, setAddress] = useState(""); const [radius] = useState(250); const [type, setType] = useState<"avoid" | "required">("avoid");
  const save = trpc.suite.recidivism.addGeofence.useMutation({ onSuccess: () => record.refetch() });
  return <RecidivismSurface path="/recidivism/geofences" title="Geofence guidance"><p className="mt-2 text-sm text-slate-400">Define geographic areas to avoid or maintain consistent contact with.</p><Input value={name} onChange={event => setName(event.target.value)} className="mt-5 border-white/10 bg-black/20" placeholder="Location name" /><Input value={address} onChange={event => setAddress(event.target.value)} className="mt-3 border-white/10 bg-black/20" placeholder="Address or intersection" /><div className="mt-3 flex flex-wrap gap-2">{(["avoid", "required"] as const).map(item => <button key={item} onClick={() => setType(item)} className={`mode-chip ${type === item ? "mode-chip-active" : ""}`}>{item}</button>)}</div><Button disabled={!subjectId || !name.trim() || save.isPending} onClick={() => save.mutate({ subjectId: subjectId ?? 0, name, address: address || "Location pending", radius, type })} className="mt-4 rounded-xl bg-emerald-300 text-slate-950">{save.isPending ? <Loader2 className="animate-spin" /> : "Save boundary"}</Button></RecidivismSurface>;
}

function PatternAnalysisPage() {
  const { record } = useActiveRecidivismSubject();
  return <RecidivismSurface path="/recidivism/patterns" title="Pattern analysis">{record.isLoading ? <Loader2 className="mt-5 animate-spin text-emerald-300" /> : record.error ? <p role="alert" className="mt-5 text-sm text-rose-200">Pattern data is unavailable. Retry from the Recidivism workspace.</p> : record.data ? <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-white/8 bg-black/15 p-4"><p className="micro-label">Recent triggers</p><p className="mt-2 text-2xl text-stone-100">{record.data.triggers.length}</p></div><div className="rounded-xl border border-white/8 bg-black/15 p-4"><p className="micro-label">Open obligations</p><p className="mt-2 text-2xl text-stone-100">{record.data.obligations.filter(item => item.status === "upcoming").length}</p></div><div className="rounded-xl border border-white/8 bg-black/15 p-4"><p className="micro-label">Unresolved alerts</p><p className="mt-2 text-2xl text-stone-100">{record.data.alerts.filter(item => !item.resolved).length}</p></div></div> : <p className="mt-5 text-sm text-slate-500">Create a subject and log a first event to begin pattern analysis.</p>}</RecidivismSurface>;
}

function OperationsConsolePage() {
  const { record } = useActiveRecidivismSubject(); const [, setLocation] = useLocation();
  const alerts = record.data?.alerts.filter(item => !item.resolved).length ?? 0;
  return <RecidivismSurface path="/recidivism/console" title="Operations console"><p className="mt-2 text-sm leading-6 text-slate-400">Review the active record’s alert load, then move into PAM only when a concise decision conversation will help.</p><div className="mt-5 flex items-center justify-between rounded-xl border border-white/8 bg-black/15 p-5"><div><p className="micro-label">Unresolved subject alerts</p><p className="mt-2 font-display text-3xl text-stone-100">{record.isLoading ? "—" : alerts}</p></div><Button variant="outline" onClick={() => setLocation("/pam")} className="border-white/10 bg-white/[.03]">Open PAM</Button></div>{record.error && <p role="alert" className="mt-3 text-sm text-rose-200">Console data is unavailable. Retry from the Recidivism workspace.</p>}</RecidivismSurface>;
}

function SubjectRecordPage({ report = false }: { report?: boolean }) {
  const [, profileParams] = useRoute("/recidivism/subjects/:id"); const [, reportParams] = useRoute("/recidivism/reports/:id"); const recordId = Number(profileParams?.id ?? reportParams?.id);
  const record = trpc.suite.recidivism.getSubject.useQuery({ subjectId: recordId }, { enabled: Number.isInteger(recordId) && recordId > 0 });
  return <><PageHeader path="/recidivism" /><section className="surface p-6"><p className="micro-label">{report ? "Subject report" : "Subject profile"}</p>{record.isLoading ? <Loader2 className="mt-5 animate-spin text-emerald-300" /> : record.error ? <p role="alert" className="mt-5 text-sm text-rose-200">{record.error.message}</p> : !record.data ? <p className="mt-5 text-sm text-slate-400">No matching XinUS subject record was found. Return to Recidivism to create or select a subject.</p> : <div className="mt-5 grid gap-4 md:grid-cols-2"><div><p className="font-display text-3xl text-stone-100">{record.data.subject.name}</p><p className="mt-2 text-sm text-slate-400">Risk {record.data.subject.riskScore} · streak {record.data.subject.streak}</p></div><div className="rounded-xl border border-white/8 bg-black/15 p-4 text-sm text-slate-400"><p>{record.data.obligations.length} obligations · {record.data.triggers.length} triggers · {record.data.alerts.filter(alert => !alert.resolved).length} unresolved alerts</p></div></div>}</section></>;
}

export default function SuitePage() { const [path] = useLocation(); const page = path === "/clarity" ? <Clarity /> : path === "/ged-tutor" ? <Ged /> : path === "/hidden-gems" ? <Gems /> : path === "/pd-pro" ? <Pd /> : path === "/pd-pro/office" ? <Office /> : path === "/recidivism" ? <Recidivism /> : path === "/task-force-pro" ? <Recidivism taskForce /> : path === "/sitrep" ? <SitRep /> : path === "/pam" ? <PAM /> : path === "/account" ? <Account /> : path === "/admin" ? <Admin /> : path === "/recidivism/triggers" ? <TriggerLogPage /> : path === "/recidivism/obligations" ? <ObligationPlanPage /> : path === "/recidivism/contacts" ? <SupportContactPage /> : path === "/recidivism/geofences" ? <GeofencePlanPage /> : path === "/recidivism/patterns" ? <PatternAnalysisPage /> : path === "/recidivism/console" ? <OperationsConsolePage /> : path.startsWith("/recidivism/subjects/") ? <SubjectRecordPage /> : path.startsWith("/recidivism/reports/") ? <SubjectRecordPage report /> : <Recidivism />; return <div className="min-h-screen bg-slate-950 text-slate-100">{page}<AppCapabilityPanel path={path} /></div>; }
