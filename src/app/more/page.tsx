"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, Film, CircleAlert, CloudLightning, Handshake, History, Info, PlaneTakeoff, Play, Repeat, RotateCcw, Sparkles, Users, UsersRound } from "lucide-react";
import { AppearanceControl } from "@/components/Appearance";
import { DemoIntroSheet } from "@/components/DemoCoach";
import { RoleSheet } from "@/components/RoleSwitcher";
import { ConfirmDialog, PageTitle, toast } from "@/components/ui";
import { cx } from "@/lib/format";
import { useMe, useStore } from "@/store/store";

export default function MorePage() {
  const router = useRouter();
  const me = useMe();
  const reset = useStore((s) => s.resetDemo);
  const pendingHandovers = useStore((s) => s.handovers.filter((h) => h.status !== "accepted").length);
  const openDisc = useStore((s) => s.discrepancies.filter((d) => d.status === "open").length);
  const [confirm, setConfirm] = useState(false);
  const [roles, setRoles] = useState(false);
  const [intro, setIntro] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  type Item = { href?: string; onClick?: () => void; icon: typeof Users; label: string; sub: string; badge?: number; testid?: string };
  // Kept short for the demo. Everything else is still in the app, folded under Advanced.
  const main: Item[] = [
    { href: "/flights", icon: PlaneTakeoff, label: "Flights", sub: "Upcoming and past flights" },
    { href: "/documents", icon: BookOpen, label: "Documents", sub: "Training, safety and handover documents" },
    { href: "/passengers", icon: Users, label: "Passenger Profiles", sub: "Who is flying and what they need" },
    { href: "/copilot", icon: Sparkles, label: "Safety Copilot", sub: "Ask questions and build a briefing" },
    { onClick: () => setConfirm(true), icon: RotateCcw, label: "Reset Demo", sub: "Start the demo again from the beginning", testid: "reset-demo" },
    { href: "/about", icon: Info, label: "About", sub: "What this demo does and doesn't do" },
  ];
  const advanced: Item[] = [
    { href: "/intel", icon: CloudLightning, label: "Risk Intelligence", sub: "Weather, security, disaster and health advisories" },
    { href: "/more/discrepancies", icon: CircleAlert, label: "Discrepancies", sub: "Postflight and inspection findings", badge: openDisc },
    { href: "/crew", icon: UsersRound, label: "Crew", sub: "Assignments, queues, acknowledgements" },
    { href: "/handovers", icon: Handshake, label: "Handovers", sub: "Structured transfer of responsibility", badge: pendingHandovers },
    { href: "/audit", icon: History, label: "Audit History", sub: "Time-stamped record of actions" },
    { onClick: () => setIntro(true), icon: Play, label: "Experience CabinSafe", sub: "Guided five-minute demonstration", testid: "more-experience" },
    { onClick: () => setRoles(true), icon: Repeat, label: "Demo Role Preview", sub: `Viewing as ${me.name} · ${me.title}` },
    { onClick: () => router.push("/?intro=1"), icon: Film, label: "Replay Intro", sub: "The opening sequence" },
  ];
  const list = (items: Item[]) => (
    <ul className="card p-0 divide-y divide-[var(--separator)] overflow-hidden">
      {items.map((it) => {
        const inner = (
          <>
            <span className="grid size-[1.875rem] place-items-center rounded-[0.5rem] bg-gold text-midnight shrink-0"><it.icon className="size-[1.1rem]" strokeWidth={2.2} /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-[1rem] text-ivory leading-snug">{it.label}</span>
              <span className="block text-[0.75rem] text-slate-400 truncate">{it.sub}</span>
            </span>
            {!!it.badge && <span className="rounded-full bg-bad text-navy text-[0.75rem] font-semibold min-w-5 h-5 px-1.5 grid place-items-center tnum">{it.badge}</span>}
            <ChevronRight className="size-4 text-slate-500/70" />
          </>
        );
        const cls = "w-full flex items-center gap-3 px-4 py-2.5 min-h-14 text-left active:bg-navy-700";
        return <li key={it.label}>{it.href ? <Link href={it.href} className={cls}>{inner}</Link> : <button className={cls} onClick={it.onClick} data-testid={it.testid}>{inner}</button>}</li>;
      })}
    </ul>
  );

  return (
    <div>
      <PageTitle eyebrow="CabinSafe Intelligence" title="More" />
      <div className="space-y-6">
        {list(main)}
        <section>
          <button className="flex w-full min-h-12 items-center gap-2 px-4 text-left" onClick={() => setShowAdvanced(!showAdvanced)} aria-expanded={showAdvanced} data-testid="more-advanced">
            <span className="flex-1">
              <span className="block text-[1rem] font-semibold text-ivory">Advanced</span>
              <span className="block text-[0.75rem] text-slate-400">Advisories, crew, handovers, audit, guided tour and appearance</span>
            </span>
            <ChevronDown className={cx("size-5 text-slate-500 transition-transform", showAdvanced && "rotate-180")} aria-hidden />
          </button>
          {showAdvanced && (
            <div className="mt-2 space-y-4">
              {list(advanced)}
              <div>
                <div className="eyebrow mb-1.5 px-4">Appearance</div>
                <div className="card p-3">
                  <AppearanceControl />
                </div>
                <p className="px-4 mt-1.5 text-[0.75rem] text-slate-500">System follows your phone&apos;s Light or Dark setting.</p>
              </div>
            </div>
          )}
        </section>
      </div>
      <p className="text-[0.6875rem] text-slate-500 text-center mt-6 leading-relaxed px-4">CabinSafe Intelligence · demonstration prototype<br />Synthetic data only · Not affiliated with or endorsed by Gulfstream Aerospace</p>
      <ConfirmDialog
        open={confirm}
        title="Reset demonstration?"
        body="All flights, checklists, inspections, handovers and audit history on this device return to the original demo state. Stock and preferences you added are reset too. This cannot be undone."
        confirmLabel="Reset demo"
        tone="danger"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          reset();
          setConfirm(false);
          toast.ok("Demonstration data restored");
          router.push("/");
        }}
      />
      <RoleSheet open={roles} onClose={() => setRoles(false)} />
      <DemoIntroSheet open={intro} onClose={() => setIntro(false)} />
    </div>
  );
}
