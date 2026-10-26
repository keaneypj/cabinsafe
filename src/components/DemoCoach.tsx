"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, ChevronUp, CircleCheck, Clock, History, Play, RotateCcw, X } from "lucide-react";
import { CA_SAM, FEATURED_FLIGHT_ID } from "@/data/seed";
import { cx } from "@/lib/format";
import { useStore, type Store } from "@/store/store";
import { Button, Sheet } from "./ui";

export interface DemoStep {
  key: string;
  title: string;
  body: string;
  route: string;
  cta: string;
  done: (s: Store) => boolean;
  substeps?: { label: string; done: (s: Store) => boolean }[];
}

export const DEMO_STEPS: DemoStep[] = [
  {
    key: "dashboard",
    title: "View the Flight Dashboard",
    body: "CSI101 Miami → Geneva departs tomorrow. Note the readiness index, the separate task-completion measure, and the critical blocker preventing a 'Cabin Prepared' status.",
    route: "/",
    cta: "Open dashboard",
    done: (s) => !!s.demo.done.dashboard,
  },
  {
    key: "advisory",
    title: "Review a Risk Advisory",
    body: "A clearly labelled SIMULATED Bise wind advisory affects the Geneva arrival. Acknowledge it and create a cabin preparation task.",
    route: `/intel?flight=${FEATURED_FLIGHT_ID}&adv=sim-wx-lsgg`,
    cta: "Open Risk Intelligence",
    done: (s) => s.acks.some((a) => a.advisoryId === "sim-wx-lsgg" && a.flightId === FEATURED_FLIGHT_ID),
  },
  {
    key: "passenger",
    title: "Review Passenger Safety",
    body: "SAGE, a senior family member, has a documented mobility accommodation. See the rule-generated preparation tasks — and how medical detail stays restricted.",
    route: `/passengers/pax-sage?flight=${FEATURED_FLIGHT_ID}`,
    cta: "Open SAGE's profile",
    done: (s) => !!s.demo.done.passenger,
  },
  {
    key: "aed",
    title: "Inspect the Aircraft",
    body: "Open the interactive cabin map, select the AED (pulsing amber), and complete the demonstration inspection. Watch the dashboard update.",
    route: "/cabin?eq=eq-aed-01",
    cta: "Open cabin map",
    done: (s) => !!s.demo.done.aed,
  },
  {
    key: "briefing",
    title: "Generate the AI Briefing",
    body: "Generate a flight-specific safety briefing from live application records and the cited demonstration document library.",
    route: `/copilot?flight=${FEATURED_FLIGHT_ID}`,
    cta: "Open Safety Copilot",
    done: (s) => !!s.demo.done.briefing,
  },
  {
    key: "handover",
    title: "Complete a Crew Handover",
    body: "Assign an open item to contract attendant Sam Whitaker, switch to Sam's demo view, acknowledge each item and accept the handover.",
    route: "/handovers/hnd-001",
    cta: "Open handover",
    done: (s) => s.handovers.some((h) => h.id === "hnd-001" && h.status === "accepted"),
    substeps: [
      { label: "Assign an open item to Sam", done: (s) => !!s.demo.done.assign },
      { label: "Switch to Sam's demo view", done: (s) => !!s.demo.done.switch || s.currentUserId === CA_SAM },
      { label: "Acknowledge & accept handover", done: (s) => s.handovers.some((h) => h.id === "hnd-001" && h.status === "accepted") },
    ],
  },
];

export function DemoCoach() {
  const s = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const lastY = useRef(0);
  useEffect(() => {
    if (!s.demo.active) return;
    document.documentElement.dataset.demo = collapsed ? "min" : "1";
    const onScroll = () => {
      const y = window.scrollY;
      if (y - lastY.current > 60) setCollapsed(true);
      if (Math.abs(y - lastY.current) > 60) lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      delete document.documentElement.dataset.demo;
    };
  }, [s.demo.active, collapsed]);
  useEffect(() => {
    setCollapsed(false);
    lastY.current = window.scrollY;
  }, [s.demo.step, pathname]);
  if (!s.demo.active) return null;

  const finished = s.demo.step >= DEMO_STEPS.length;
  const step = DEMO_STEPS[Math.min(s.demo.step, DEMO_STEPS.length - 1)];
  const isDone = !finished && step.done(s);
  const routePath = step.route.split("?")[0];
  const onRoute = pathname === routePath;

  const go = (i: number) => {
    s.demoGo(i);
    if (i < DEMO_STEPS.length) router.push(DEMO_STEPS[i].route);
    setCollapsed(false);
  };

  return (
    <div className="fixed inset-x-0 z-40 px-3 no-print md:left-[15.5rem]" style={{ bottom: "calc(var(--nav-h) + var(--safe-bottom) + 0.5rem)" }} data-testid="demo-coach">
      <div className="mx-auto max-w-xl rounded-2xl border border-gold/35 bg-navy/95 shadow-[var(--shadow-lift)] backdrop-blur-md animate-fade-up">
        <div className="flex items-center gap-2 px-3.5 pt-2.5">
          <span className="eyebrow !text-gold">Experience CabinSafe</span>
          <div className="flex-1 flex gap-1 mx-1" aria-label={`Step ${Math.min(s.demo.step + 1, 6)} of 6`}>
            {DEMO_STEPS.map((d, i) => (
              <span key={d.key} className={cx("h-1 flex-1 rounded-full", i < s.demo.step || d.done(s) ? "bg-gold" : i === s.demo.step ? "bg-gold/45" : "bg-slate/15")} />
            ))}
          </div>
          <button className="grid size-9 place-items-center rounded-full text-slate hover:bg-navy-700" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? "Expand guide" : "Minimise guide"} aria-expanded={!collapsed}>
            {collapsed ? <ChevronUp className="size-4.5" /> : <ChevronDown className="size-4.5" />}
          </button>
          <button className="grid size-9 place-items-center rounded-full text-slate hover:bg-navy-700 -mr-1.5" onClick={s.demoExit} aria-label="Exit guided demonstration" data-testid="demo-exit">
            <X className="size-4.5" />
          </button>
        </div>

        {finished ? (
          <div className={cx("px-4 pb-3.5", collapsed && "hidden")}>
            <div className="flex items-center gap-2 mt-1 text-ok font-semibold">
              <CircleCheck className="size-5" /> Demonstration complete
            </div>
            <p className="text-[0.8125rem] text-slate mt-1 leading-relaxed">Every action you took is time-stamped in the audit history — the record of accountability a safety program depends on.</p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => router.push("/audit")}>
                <History className="size-4" /> Audit history
              </Button>
              <Button size="sm" className="flex-1" onClick={s.demoExit}>
                Finish
              </Button>
            </div>
          </div>
        ) : (
          <div className={cx("px-4 pb-3.5", collapsed && "pb-2.5")}>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-[0.6875rem] font-semibold text-gold tnum">STEP {s.demo.step + 1}/6</span>
              <button className="font-semibold text-ivory text-[0.9375rem] leading-snug flex-1 text-left" onClick={() => setCollapsed((c) => !c)}>{step.title}</button>
              {isDone && <Check className="size-4.5 text-ok shrink-0" aria-label="Step complete" />}
              {collapsed && (
                <Button
                  size="sm"
                  variant={isDone || step.key === "dashboard" ? "primary" : "quiet"}
                  className="!min-h-8 !px-2.5"
                  onClick={() => {
                    if (step.key === "dashboard") s.demoMark("dashboard");
                    go(s.demo.step + 1);
                  }}
                  data-testid="demo-next-mini"
                >
                  {isDone || step.key === "dashboard" ? "Next" : "Skip"} <ArrowRight className="size-3.5" />
                </Button>
              )}
            </div>
            {!collapsed && (
              <>
                <p className="text-[0.8125rem] text-slate mt-1 leading-relaxed">{step.body}</p>
                {step.substeps && (
                  <ul className="mt-2 space-y-1">
                    {step.substeps.map((x) => (
                      <li key={x.label} className={cx("flex items-center gap-2 text-xs", x.done(s) ? "text-ok" : "text-slate")}>
                        {x.done(s) ? <CircleCheck className="size-3.5" /> : <span className="size-3.5 rounded-full border border-slate/40" />}
                        {x.label}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2 mt-3">
                  {!onRoute && (
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => router.push(step.route)}>
                      {step.cta}
                    </Button>
                  )}
                  {s.demo.step > 0 && onRoute && (
                    <Button size="sm" variant="quiet" onClick={() => go(s.demo.step - 1)}>
                      Back
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={isDone || step.key === "dashboard" ? "primary" : "quiet"}
                    className="flex-1"
                    onClick={() => {
                      if (step.key === "dashboard") s.demoMark("dashboard");
                      go(s.demo.step + 1);
                    }}
                    data-testid="demo-next"
                  >
                    {isDone || step.key === "dashboard" ? (s.demo.step === DEMO_STEPS.length - 1 ? "Finish" : "Next step") : "Skip step"}
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function DemoIntroSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore();
  const router = useRouter();
  const [fresh, setFresh] = useState(true);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Experience CabinSafe"
      subtitle="A guided five-minute demonstration"
      footer={
        <Button
          className="flex-1"
          size="lg"
          data-testid="demo-begin"
          onClick={() => {
            if (fresh) s.resetDemo();
            s.demoStart();
            onClose();
            router.push("/");
          }}
        >
          <Play className="size-4" /> Begin demonstration
        </Button>
      }
    >
      <p className="text-sm text-slate leading-relaxed">
        You&apos;ll prepare fictional flight <strong className="text-ivory">CSI101, Miami (KMIA) → Geneva (LSGG)</strong>, carrying the principal, family members and guests — including a senior family member with a documented accommodation.
      </p>
      <ol className="mt-4 space-y-2">
        {DEMO_STEPS.map((d, i) => (
          <li key={d.key} className="flex items-start gap-3 rounded-xl bg-midnight-900/35 border border-slate/10 px-3 py-2.5">
            <span className="grid size-6 place-items-center rounded-full bg-gold/15 text-gold text-xs font-semibold tnum shrink-0">{i + 1}</span>
            <span className="text-sm text-ivory">{d.title}</span>
          </li>
        ))}
      </ol>
      <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate/12 px-3 py-3 cursor-pointer">
        <input type="checkbox" className="size-5 accent-[#d7bd8c]" checked={fresh} onChange={(e) => setFresh(e.target.checked)} />
        <span className="text-sm">
          <span className="text-ivory flex items-center gap-1.5">
            <RotateCcw className="size-3.5" /> Start from the original demo state
          </span>
          <span className="text-xs text-slate">Recommended — restores seeded data first.</span>
        </span>
      </label>
      <p className="text-[0.6875rem] text-slate-500 mt-3 flex items-center gap-1.5">
        <Clock className="size-3.5" /> About five minutes. You can exit at any time; all data is synthetic.
      </p>
    </Sheet>
  );
}
