"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpen, ChevronRight, CircleAlert, CloudLightning, Handshake, History, Info, Play, Repeat, RotateCcw, Users, UsersRound } from "lucide-react";
import { DemoIntroSheet } from "@/components/DemoCoach";
import { RoleSheet } from "@/components/RoleSwitcher";
import { ConfirmDialog, PageTitle, toast } from "@/components/ui";
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

  const groups: { title: string; items: { href?: string; onClick?: () => void; icon: typeof Users; label: string; sub: string; badge?: number; testid?: string }[] }[] = [
    {
      title: "Operations",
      items: [
        { href: "/intel", icon: CloudLightning, label: "Risk Intelligence", sub: "Weather, security, disaster and health advisories" },
        { href: "/passengers", icon: Users, label: "Passenger Profiles", sub: "Accommodations and rules-based preparation" },
        { href: "/more/discrepancies", icon: CircleAlert, label: "Discrepancies", sub: "Postflight and inspection findings", badge: openDisc },
      ],
    },
    {
      title: "Crew & accountability",
      items: [
        { href: "/crew", icon: UsersRound, label: "Crew", sub: "Assignments, queues, acknowledgements" },
        { href: "/handovers", icon: Handshake, label: "Handovers", sub: "Structured transfer of responsibility", badge: pendingHandovers },
        { href: "/audit", icon: History, label: "Audit History", sub: "Time-stamped record of actions" },
        { href: "/documents", icon: BookOpen, label: "Reference Library", sub: "Versioned demonstration documents" },
      ],
    },
    {
      title: "Demonstration",
      items: [
        { onClick: () => setIntro(true), icon: Play, label: "Experience CabinSafe", sub: "Guided five-minute demonstration", testid: "more-experience" },
        { onClick: () => setRoles(true), icon: Repeat, label: "Demo Role Preview", sub: `Viewing as ${me.name} · ${me.title}` },
        { onClick: () => setConfirm(true), icon: RotateCcw, label: "Reset Demo", sub: "Restore the original seeded state", testid: "reset-demo" },
        { href: "/about", icon: Info, label: "About & Limitations", sub: "What is functional, simulated, or awaiting integration" },
      ],
    },
  ];

  return (
    <div>
      <PageTitle eyebrow="CabinSafe Intelligence" title="More" />
      <div className="space-y-5">
        {groups.map((g) => (
          <section key={g.title}>
            <div className="eyebrow mb-2 px-1">{g.title}</div>
            <ul className="card p-0 divide-y divide-slate/10 overflow-hidden">
              {g.items.map((it) => {
                const inner = (
                  <>
                    <span className="grid size-9 place-items-center rounded-xl bg-navy-600/60 text-gold shrink-0"><it.icon className="size-4.5" /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[0.9375rem] text-ivory">{it.label}</span>
                      <span className="block text-xs text-slate truncate">{it.sub}</span>
                    </span>
                    {!!it.badge && <span className="rounded-full bg-warn-bg text-warn text-xs px-2 tnum">{it.badge}</span>}
                    <ChevronRight className="size-4 text-slate-500" />
                  </>
                );
                const cls = "w-full flex items-center gap-3 px-3.5 py-3 min-h-16 text-left hover:bg-navy-700/30";
                return <li key={it.label}>{it.href ? <Link href={it.href} className={cls}>{inner}</Link> : <button className={cls} onClick={it.onClick} data-testid={it.testid}>{inner}</button>}</li>;
              })}
            </ul>
          </section>
        ))}
      </div>
      <p className="text-[0.6875rem] text-slate-500 text-center mt-6 leading-relaxed px-4">CabinSafe Intelligence · demonstration prototype<br />Synthetic data only · Not affiliated with or endorsed by Gulfstream Aerospace</p>
      <ConfirmDialog
        open={confirm}
        title="Reset demonstration?"
        body="All flights, tasks, inspections, handovers and audit history on this device return to the original seeded state, with dates refreshed relative to now. This cannot be undone."
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
