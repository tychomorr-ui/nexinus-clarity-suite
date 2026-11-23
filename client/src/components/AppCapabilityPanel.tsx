import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProductWorkboard } from "@/components/ProductWorkboard";
import { trpc } from "@/lib/trpc";
import { CheckSquare, ClipboardList, Compass, FileText, GraduationCap, History, Layers3, Route, ShieldCheck, Sparkles, Target } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type Capability = { title: string; detail: string; action: string; route?: string; icon: typeof Sparkles };

const capabilitiesByPath: Record<string, { title: string; description: string; items: Capability[] }> = {
  "/clarity": { title: "Build the next move", description: "Use Clarity as a decision workspace, not a single response.", items: [
    { title: "Decision canvas", detail: "Frame the decision, constraints, and reversible next move.", action: "Open Clarity mode", icon: Compass },
    { title: "Commitment check-in", detail: "Turn the insight into one accountable action for today.", action: "Use Light Warrior", icon: Target },
    { title: "Reflection history", detail: "Review recent decision frames and notice repeated friction.", action: "Review account", route: "/account", icon: History },
  ] },
  "/ged-tutor": { title: "Build a study rhythm", description: "Move from one question to a repeatable practice plan.", items: [
    { title: "Subject practice", detail: "Switch between Math, RLA, Science, and Social Studies.", action: "Choose a subject", icon: GraduationCap },
    { title: "Mistake review", detail: "Use the next tutor prompt to unpack the step that broke down.", action: "Ask tutor", icon: ClipboardList },
    { title: "Session trail", detail: "Keep your study conversations organized by subject.", action: "Continue practice", icon: History },
  ] },
  "/hidden-gems": { title: "Organize the finding", description: "Capture context and compare findings before acting on an appraisal.", items: [
    { title: "Collection record", detail: "Save the origin, condition, markings, and appraisal context.", action: "Add context", icon: Layers3 },
    { title: "Cautious comparison", detail: "Use multiple findings to clarify confidence rather than treat one result as authentication.", action: "Run another appraisal", icon: Compass },
    { title: "Next-step plan", detail: "Decide whether to research, conserve, photograph, or seek a professional opinion.", action: "Open Clarity", route: "/clarity", icon: Target },
  ] },
  "/pd-pro": { title: "Run the case deliberately", description: "Move from case intake to deadlines, tasks, office work, and a downloadable summary.", items: [
    { title: "Case planning", detail: "Create a case and shift between Client, PD, and Emergency operating modes.", action: "Create a case", icon: ClipboardList },
    { title: "Case report", detail: "Download a secure PDF summary with case details, tasks, deadlines, and notes.", action: "Use PDF export", icon: FileText },
    { title: "Office assist", detail: "Draft structured professional work product in the dedicated PD Pro Office.", action: "Open PD Pro Office", route: "/pd-pro/office", icon: ShieldCheck },
  ] },
  "/recidivism": { title: "Support follow-through", description: "Use the workspace for check-ins, planning, risk signals, and support coordination.", items: [
    { title: "Recovery check-in", detail: "Create a personal record and use the next action to stay anchored.", action: "Create a subject", icon: Target },
    { title: "Trigger and pattern lens", detail: "Log conditions and review recurring patterns before they escalate.", action: "Open triggers", route: "/recidivism/triggers", icon: Route },
    { title: "Support plan", detail: "Track obligations, contacts, and location boundaries in separate protected views.", action: "Open obligations", route: "/recidivism/obligations", icon: CheckSquare },
  ] },
  "/task-force-pro": { title: "Coordinate the next operational move", description: "Use protected supervision records for operational awareness, actions, and follow-through.", items: [
    { title: "Operational check-in", detail: "Review the active subject record before documenting the next general operational step.", action: "Open workspace", icon: ClipboardList },
    { title: "Risk-pattern lens", detail: "Review triggers, obligations, and unresolved alerts through distinct protected views.", action: "Open patterns", route: "/recidivism/patterns", icon: Compass },
    { title: "Coordination plan", detail: "Use contacts and obligations to structure the next follow-up without exposing records across apps.", action: "Open obligations", route: "/recidivism/obligations", icon: CheckSquare },
  ] },
  "/sitrep": { title: "Compare the scenario", description: "Turn a situation into a concise, actionable response plan.", items: [
    { title: "Decision checklist", detail: "Use the assessment to identify the safest next action and what to avoid.", action: "Run assessment", icon: ClipboardList },
    { title: "Scenario framing", detail: "Switch between General, Travel, and Immigration context before assessment.", action: "Choose a mode", icon: Compass },
    { title: "Action routing", detail: "Bring the next action into Clarity if the decision still feels unresolved.", action: "Open Clarity", route: "/clarity", icon: Target },
  ] },
  "/pam": { title: "Stay in motion with PAM", description: "Use PAM as your single concise companion for choices, commitments, and product-aware routing.", items: [
    { title: "PAM guidance", detail: "Set a tone and intensity, then ask PAM to help identify the next move.", action: "Start with PAM", icon: Sparkles },
    { title: "Action capture", detail: "End each conversation with a concrete next step you can take now.", action: "Start a conversation", icon: Target },
    { title: "Product-aware route", detail: "Move directly into the XinUS app that best fits the next action.", action: "My XinUS Apps", route: "/products", icon: Route },
  ] },
};

const firstUseByPath: Record<string, string[]> = {
  "/clarity": ["Name the decision in one sentence.", "Choose a decision lens.", "Save one visible commitment below."],
  "/ged-tutor": ["Choose a subject and study focus.", "Ask one specific question.", "Log progress in the skill tracker after practice."],
  "/hidden-gems": ["Start with an image and the object’s context.", "Save a collection record after appraisal.", "Compare findings before acting on value."],
  "/pd-pro": ["Create a matter with a non-sensitive label.", "Capture an action-oriented note.", "Review extracted tasks and deadlines before exporting."],
  "/recidivism": ["Create a participant-centered subject record.", "Use a brief check-in to name support needs.", "Move to protected trigger or obligation views as needed."],
  "/task-force-pro": ["Create an operational subject label.", "Record a general operational check-in.", "Use protected views for risk, obligation, and contact follow-through."],
  "/sitrep": ["Select the context and planning horizon.", "Describe the situation and constraints.", "Save a checklist or compare two scenarios before acting."],
  "/pam": ["Choose a tone and intensity for PAM.", "State the decision or next obstacle.", "Capture the action you want to keep after the exchange."],
};

export function AppCapabilityPanel({ path }: { path: string }) {
  const [, setLocation] = useLocation();
  const capability = capabilitiesByPath[path] ?? (path.startsWith("/recidivism") ? capabilitiesByPath["/recidivism"] : undefined);
  if (!capability) return null;
  const productKey = path === "/clarity" ? "clarity" : path === "/ged-tutor" ? "ged_tutor" : path === "/hidden-gems" ? "hidden_gems" : path === "/pd-pro" ? "pd_pro" : path === "/task-force-pro" ? "task_force_pro" : path.startsWith("/recidivism") ? "recovery" : path === "/sitrep" ? "sitrep" : path === "/pam" ? "pam" : null;
  const firstUse = firstUseByPath[path] ?? (path.startsWith("/recidivism") ? firstUseByPath["/recidivism"] : undefined);
  return <><section className="surface mt-6 p-6"><p className="micro-label">More ways to work</p><h2 className="mt-2 font-display text-2xl text-stone-100">{capability.title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{capability.description}</p>{firstUse ? <div className="mt-5 rounded-xl border border-violet-300/15 bg-violet-300/[.04] p-4"><p className="micro-label text-violet-200">First visit</p><ol className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-3">{firstUse.map((step, index) => <li key={step} className="flex gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-violet-300/30 text-[11px] text-violet-200">{index + 1}</span>{step}</li>)}</ol></div> : null}<div className="mt-5 grid gap-3 md:grid-cols-3">{capability.items.map(item => <article key={item.title} className="rounded-xl border border-white/8 bg-black/15 p-4"><item.icon size={17} className="text-violet-200" /><h3 className="mt-3 text-sm font-medium text-stone-100">{item.title}</h3><p className="mt-2 min-h-14 text-xs leading-5 text-slate-400">{item.detail}</p><Button size="sm" variant="outline" onClick={() => item.route ? setLocation(item.route) : toast.info(`${item.action} is available in this workspace.`)} className="mt-4 border-white/10 bg-white/[.03]">{item.action}</Button></article>)}</div><AppRecords path={path} /></section>{productKey ? <ProductWorkboard productKey={productKey} /> : null}</>;
}

function AppRecords({ path }: { path: string }) {
  const productKey = path === "/clarity" ? "clarity" : path === "/ged-tutor" ? "ged_tutor" : path === "/hidden-gems" ? "hidden_gems" : path === "/pd-pro" ? "pd_pro" : path === "/task-force-pro" ? "task_force_pro" : path.startsWith("/recidivism") ? "recovery" : path === "/sitrep" ? "sitrep" : path === "/pam" ? "pam" : null;
  return <>{path === "/clarity" ? <ConversationHistory /> : path === "/ged-tutor" ? <GedHistory /> : path === "/hidden-gems" ? <GemHistory /> : path === "/pd-pro" ? <PdCaseStarter /> : path === "/sitrep" ? <SitRepHistory /> : null}{productKey ? <StreamlinePanel productKey={productKey} /> : null}</>;
}

function StreamlinePanel({ productKey }: { productKey: "clarity" | "ged_tutor" | "hidden_gems" | "pd_pro" | "recovery" | "task_force_pro" | "sitrep" | "pam" }) {
  const [intake, setIntake] = useState("");
  const [outcome, setOutcome] = useState("");
  const [draft, setDraft] = useState("");
  const createDraft = trpc.suite.streamline.draft.useMutation({ onSuccess: result => setDraft(result.draft), onError: () => toast.error("Streamline could not prepare a brief. Your input remains in this workspace; retry when ready.") });
  const accept = trpc.suite.streamline.accept.useMutation({ onSuccess: () => { toast.success("Human-reviewed follow-through saved to your private workboard."); setDraft(""); setIntake(""); setOutcome(""); }, onError: () => toast.error("The follow-through was not saved. Review and retry when ready.") });
  return <section className="mt-5 rounded-xl border border-violet-300/15 bg-violet-300/[.04] p-4"><div className="flex items-start justify-between gap-3"><div><p className="micro-label text-violet-200">XinUS Streamline</p><h3 className="mt-1 text-sm font-medium text-stone-100">Turn intake into a reviewable next move</h3><p className="mt-1 text-xs leading-5 text-slate-400">Local AI organizes supplied facts, priority, unknowns, and follow-through. It never sends, escalates, or finalizes anything for you.</p></div><ShieldCheck className="shrink-0 text-violet-200" size={18} /></div><Textarea value={intake} onChange={event => setIntake(event.target.value)} placeholder="Paste a non-sensitive intake, rough note, question, or workload concern…" className="mt-4 min-h-24 border-white/10 bg-black/20" /><Input value={outcome} onChange={event => setOutcome(event.target.value)} placeholder="What would a useful outcome look like?" className="mt-2 border-white/10 bg-black/20" /><Button disabled={!intake.trim() || createDraft.isPending} onClick={() => createDraft.mutate({ productKey, intake, desiredOutcome: outcome || undefined })} size="sm" className="mt-3 bg-violet-300 text-slate-950">{createDraft.isPending ? "Building brief…" : "Create review brief"}</Button>{draft ? <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4"><p className="micro-label">Draft — review before accepting</p><pre className="mt-3 whitespace-pre-wrap font-sans text-xs leading-5 text-slate-300">{draft}</pre><Button disabled={accept.isPending} onClick={() => accept.mutate({ productKey, title: `Review: ${intake.slice(0, 100)}`, details: draft, confirmed: true })} size="sm" variant="outline" className="mt-4 border-white/10 bg-white/[.03]">{accept.isPending ? "Saving…" : "I reviewed this — save follow-through"}</Button></div> : null}</section>;
}

function RecordStrip({ label, children }: { label: string; children: ReactNode }) { return <div className="mt-5 border-t border-white/8 pt-5"><p className="micro-label">{label}</p><div className="mt-3 flex flex-wrap gap-2">{children}</div></div>; }

function ConversationHistory() { const history = trpc.suite.clarity.history.useQuery(); return <RecordStrip label="Recent reflections">{history.isLoading ? <span className="text-xs text-slate-500">Loading your reflections…</span> : history.error ? <span className="text-xs text-amber-200">Reflections are unavailable right now. Your new commitment can still be saved on this device.</span> : history.data?.length ? history.data.slice(0, 4).map(item => <span className="rounded-full border border-white/8 bg-black/15 px-3 py-1.5 text-xs text-slate-300" key={item.id}>{item.title}</span>) : <span className="text-xs text-slate-500">Your first reflection will be saved here.</span>}</RecordStrip>; }

function GedHistory() { const sessions = trpc.suite.ged.sessions.useQuery(); return <RecordStrip label="Study trail">{sessions.isLoading ? <span className="text-xs text-slate-500">Loading sessions…</span> : sessions.error ? <span className="text-xs text-amber-200">Study history is unavailable right now. Your device-local plan and skill progress remain available.</span> : sessions.data?.length ? sessions.data.slice(0, 4).map(item => <span className="rounded-full border border-white/8 bg-black/15 px-3 py-1.5 text-xs text-slate-300" key={item.id}>{item.subject.toUpperCase()} · {item.title}</span>) : <span className="text-xs text-slate-500">Your completed study sessions will appear here.</span>}</RecordStrip>; }

function GemHistory() { const appraisals = trpc.suite.gems.list.useQuery(); return <RecordStrip label="Recent appraisals">{appraisals.isLoading ? <span className="text-xs text-slate-500">Loading appraisals…</span> : appraisals.error ? <span className="text-xs text-amber-200">Appraisal history is unavailable right now. Keep collection notes on this device until service returns.</span> : appraisals.data?.length ? appraisals.data.slice(0, 4).map(item => <span className="rounded-full border border-white/8 bg-black/15 px-3 py-1.5 text-xs text-slate-300" key={item.id}>Appraisal #{item.id}</span>) : <span className="text-xs text-slate-500">Appraisals you create will be organized here.</span>}</RecordStrip>; }

function SitRepHistory() { const assessments = trpc.suite.sitrep.list.useQuery(); return <RecordStrip label="Saved assessments">{assessments.isLoading ? <span className="text-xs text-slate-500">Loading assessments…</span> : assessments.error ? <span className="text-xs text-amber-200">Saved assessments are unavailable right now. Your comparison workspace is still available on this device.</span> : assessments.data?.length ? assessments.data.slice(0, 4).map(item => <span className="rounded-full border border-white/8 bg-black/15 px-3 py-1.5 text-xs text-slate-300" key={item.id}>{item.mode} · {new Date(item.createdAt).toLocaleDateString()}</span>) : <span className="text-xs text-slate-500">Your finished situation assessments will be saved here.</span>}</RecordStrip>; }

function PdCaseStarter() { const [name, setName] = useState(""); const [client, setClient] = useState(""); const [note, setNote] = useState(""); const [caseId, setCaseId] = useState<number | null>(null); const utils = trpc.useUtils(); const workspace = trpc.suite.pd.workspace.useQuery(); const create = trpc.suite.pd.createCase.useMutation({ onSuccess: async () => { setName(""); setClient(""); await utils.suite.pd.workspace.invalidate(); toast.success("Case workspace created. It is now available above for report export."); } }); const addNote = trpc.suite.pd.addNote.useMutation({ onSuccess: async (result) => { setNote(""); await utils.suite.pd.workspace.invalidate(); toast.success(`Case note saved. ${result.tasks.length} task(s) and ${result.deadlines.length} deadline(s) detected.`); } }); const selectedCase = caseId ?? workspace.data?.cases[0]?.id; return <div className="mt-5 border-t border-white/8 pt-5"><p className="micro-label">New case workspace</p><p className="mt-2 text-xs text-slate-500">Create a case with a client label before recording professional notes and action items.</p><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><Input value={name} onChange={event => setName(event.target.value)} placeholder="Case name" className="border-white/10 bg-black/20" /><Input value={client} onChange={event => setClient(event.target.value)} placeholder="Client label, optional" className="border-white/10 bg-black/20" /><Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate({ name, client: client || undefined })} className="bg-violet-300 text-slate-950">Create case</Button></div>{workspace.data?.cases.length ? <div className="mt-5"><p className="micro-label">Capture a case note</p><div className="mt-2 flex flex-wrap gap-2">{workspace.data.cases.map(item => <button key={item.id} onClick={() => setCaseId(item.id)} className={`mode-chip ${selectedCase === item.id ? "mode-chip-active" : ""}`}>{item.name}</button>)}</div><Input value={note} onChange={event => setNote(event.target.value)} placeholder="Example: Call client. File motion by October 14. Request discovery." className="mt-3 border-white/10 bg-black/20" /><Button size="sm" disabled={!selectedCase || !note.trim() || addNote.isPending} onClick={() => selectedCase && addNote.mutate({ caseId: selectedCase, text: note })} className="mt-2 bg-violet-300 text-slate-950">Save note and detect actions</Button></div> : null}</div>; }
