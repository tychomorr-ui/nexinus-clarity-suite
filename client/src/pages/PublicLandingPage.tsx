import { ArrowRight, BrainCircuit, Gem, GraduationCap, Radio, Scale, ShieldAlert, Sparkles, Waves } from "lucide-react";

const capabilities = [
  { icon: BrainCircuit, name: "Clarity", description: "Frame an unresolved decision and identify a practical next action." },
  { icon: GraduationCap, name: "GED Tutor", description: "Build confidence across math, language arts, science, and social studies." },
  { icon: Gem, name: "Hidden Gems", description: "Capture an object with your camera or photo library and receive a cautious appraisal starting point." },
  { icon: Scale, name: "PD Pro", description: "Organize private defense work, case priorities, and exportable reports." },
  { icon: ShieldAlert, name: "Recovery and Task Force Pro", description: "Keep person-centered recovery and operational supervision workflows separately scoped." },
  { icon: Radio, name: "SitRep and PAM", description: "Compare a situation, clarify context, and choose the next move with a single focused companion." },
];

export default function PublicLandingPage() {
  return <main className="min-h-screen overflow-hidden bg-[#090a0f] text-stone-100">
    <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_8%_8%,rgba(124,58,237,.16),transparent_28%),radial-gradient(circle_at_92%_20%,rgba(251,191,36,.09),transparent_22%),linear-gradient(180deg,#090a0f_0%,#0d0e17_100%)]" />
    <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 sm:px-10">
      <a href="/" className="font-display text-2xl font-semibold tracking-tight text-stone-50">XinUS</a>
      <nav aria-label="Primary navigation" className="flex items-center gap-4 text-sm">
        <a href="#apps" className="hidden text-slate-300 transition hover:text-white sm:inline">Apps</a>
        <a href="#privacy" className="hidden text-slate-300 transition hover:text-white sm:inline">Privacy</a>
        <a href="/private-sign-in" className="rounded-xl border border-white/15 px-4 py-2 font-medium text-stone-100 transition hover:border-violet-300/60 hover:bg-white/[.05]">Private sign in</a>
      </nav>
    </header>
    <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-20 pt-12 sm:px-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:pb-28 lg:pt-20">
      <div>
        <p className="micro-label text-violet-200">Reflective intelligence, kept in your control</p>
        <h1 className="mt-5 max-w-3xl font-display text-5xl font-semibold leading-[.98] tracking-tight text-stone-50 sm:text-6xl lg:text-7xl">One private workspace. Focused tools for the work in front of you.</h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">XinUS brings decision support, adaptive learning, image-led appraisal, professional casework, recovery, operations, and situational assessment into distinct apps that can share only the context you explicitly choose.</p>
        <div className="mt-8 flex flex-wrap gap-3"><a href="/private-sign-in" className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-amber-200">Create a private account <ArrowRight size={17} /></a><a href="#apps" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 font-semibold text-stone-100 transition hover:border-violet-300/60 hover:bg-white/[.05]">Explore the apps</a></div>
        <p className="mt-5 text-xs leading-5 text-slate-500">XinUS does not present appraisals, learning guidance, or situational analysis as professional authentication, legal advice, medical advice, or emergency direction.</p>
      </div>
      <aside className="rounded-[2rem] border border-white/10 bg-white/[.035] p-6 shadow-2xl shadow-black/30 sm:p-8">
        <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-200"><Sparkles size={21} /></span><div><p className="micro-label">Designed for deliberate progress</p><p className="mt-1 font-display text-2xl text-stone-100">A clear next move, not another noisy dashboard.</p></div></div>
        <div className="mt-7 space-y-4">{["Choose the standalone app that fits your work.", "Keep each workflow scoped to your private account.", "Control whether selected context is shared across active apps."].map((item, index) => <div key={item} className="flex gap-4 rounded-2xl border border-white/8 bg-black/15 p-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-300/10 text-xs font-semibold text-amber-200">0{index + 1}</span><p className="pt-0.5 text-sm leading-6 text-slate-300">{item}</p></div>)}</div>
      </aside>
    </section>
    <section id="apps" className="border-y border-white/8 bg-black/15 py-20"><div className="mx-auto max-w-7xl px-6 sm:px-10"><p className="micro-label text-violet-200">Focused applications</p><h2 className="mt-3 max-w-2xl font-display text-4xl text-stone-100 sm:text-5xl">Use one app or build a private suite around your work.</h2><div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{capabilities.map(({ icon: Icon, name, description }) => <article key={name} className="rounded-2xl border border-white/10 bg-[#10111b] p-6 transition hover:-translate-y-1 hover:border-violet-300/35"><Icon className="text-amber-200" size={21} /><h3 className="mt-5 font-display text-2xl text-stone-100">{name}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{description}</p></article>)}</div></div></section>
    <section id="privacy" className="mx-auto grid max-w-7xl gap-8 px-6 py-20 sm:px-10 lg:grid-cols-2"><div><p className="micro-label text-violet-200">Private by design</p><h2 className="mt-3 font-display text-4xl text-stone-100 sm:text-5xl">Context sharing is a choice, not a default.</h2></div><div className="rounded-2xl border border-white/10 bg-white/[.035] p-6"><p className="text-base leading-8 text-slate-300">Each product has its own workflow and access path. Within My XinUS Apps, you can choose what, if anything, is shared with another active product. Protected case and subject records remain in their dedicated workspaces.</p><a href="/private-sign-in" className="mt-6 inline-flex items-center gap-2 font-semibold text-amber-200 transition hover:text-amber-100">Open your private workspace <ArrowRight size={16} /></a></div></section>
    <footer className="border-t border-white/8 px-6 py-8 text-center text-sm text-slate-500 sm:px-10">© {new Date().getFullYear()} XinUS Clarity Suite. Private reflective intelligence for deliberate work.</footer>
  </main>;
}
