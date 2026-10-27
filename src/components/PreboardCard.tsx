"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight, ClipboardCheck, ShieldCheck } from "lucide-react";
import { computePreboarding, type PreboardView } from "@/domain/preboarding";
import { isOpenTask } from "@/domain/readiness";
import type { Flight } from "@/domain/types";
import { cx, fmtAirportTime, fmtRelative } from "@/lib/format";
import { useCrewName, useFeaturedFlight, useFlightAdvisories, useNow, useUpcomingFlights } from "@/store/hooks";
import { useMe, useStore } from "@/store/store";
import { ProgressBar } from "./ui";

/** Pre-boarding view model for a flight, recomputed from live store state. */
export function usePreboardView(flight: Flight | undefined): PreboardView | undefined {
  const now = useNow();
  const tasks = useStore((s) => s.tasks);
  const equipment = useStore((s) => s.equipment);
  const discrepancies = useStore((s) => s.discrepancies);
  const acks = useStore((s) => s.acks);
  const inputs = useStore((s) => s.crewInputs);
  const signoffs = useStore((s) => s.preboardSignoffs);
  const advisories = useFlightAdvisories(flight?.id);
  return useMemo(
    () => (flight ? computePreboarding({ flight, tasks, equipment, discrepancies, advisories, acks, inputs, signoffs, nowMs: now }) : undefined),
    [flight, tasks, equipment, discrepancies, advisories, acks, inputs, signoffs, now],
  );
}

/** The flight whose pre-boarding comes first: a cabin attendant's own next flight, otherwise the next departure. */
export function usePreboardFlight(): Flight | undefined {
  const me = useMe();
  const upcoming = useUpcomingFlights();
  const featured = useFeaturedFlight();
  return (me.role === "contract_ca" ? upcoming.find((f) => f.cabinAttendantId === me.id) : undefined) ?? featured;
}

/** Items the cabin attendant still has to tick: everyday checks plus items added by others. */
export function remainingItems(v: PreboardView): number {
  return v.signoff ? 0 : v.checks.filter(isOpenTask).length + v.pendingAcks.length;
}

/** Prominent "Start here" card for Home — the first thing to do before a flight. */
export function PreboardHero({ flight }: { flight: Flight }) {
  const now = useNow();
  const name = useCrewName();
  const v = usePreboardView(flight);
  if (!v) return null;

  if (v.signoff) {
    return (
      <Link href={`/preboard?flight=${flight.id}`} className="card flex items-center gap-3 p-4 active:bg-navy-700 animate-fade-up" data-testid="preboard-card">
        <span className="grid size-11 place-items-center rounded-xl bg-ok-bg text-ok shrink-0">
          <ShieldCheck className="size-6" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-ivory">Pre-boarding confirmed</span>
          <span className="block text-[0.8125rem] text-slate-400">
            {flight.callsign} · {name(v.signoff.byId)} · {fmtRelative(v.signoff.at, now)}
          </span>
        </span>
        <ChevronRight className="size-5 text-slate-500/70 shrink-0" />
      </Link>
    );
  }

  const everydayDone = v.checks.length - v.checks.filter(isOpenTask).length;
  const othersTotal = v.inputs.filter((i) => i.requiresAck).length;
  const othersDone = othersTotal - v.pendingAcks.length;
  const started = v.progress.done > 0;
  const r = 26;
  const c = 2 * Math.PI * r;

  return (
    <Link
      href={`/preboard?flight=${flight.id}`}
      className="block rounded-[1.25rem] bg-gold text-midnight p-5 shadow-[0_12px_32px_-16px_color-mix(in_oklab,var(--color-gold)_80%,transparent)] active:opacity-90 transition-opacity animate-fade-up"
      data-testid="preboard-card"
      aria-label={`Start here: Pre-Boarding Checklist for ${flight.callsign}, ${v.progress.pct}% complete`}
    >
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-midnight/20 px-2.5 py-1 text-[0.75rem] font-semibold">
            <ClipboardCheck className="size-3.5" strokeWidth={2.4} /> Start here
          </div>
          <h2 className="mt-2.5 text-[1.5rem] font-bold leading-tight tracking-[-0.02em]">Pre-Boarding Checklist</h2>
          <p className="mt-0.5 text-[0.9375rem] opacity-85">
            {flight.callsign} · boarding {fmtAirportTime(v.boardingAt, flight.departure)} · {fmtRelative(v.boardingAt, now)}
          </p>
        </div>
        <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0" role="img" aria-label={`${v.progress.pct}% complete`}>
          <g transform="rotate(-90 32 32)">
            <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" style={{ stroke: "currentColor", opacity: 0.22 }} />
            <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v.progress.pct / 100)} style={{ stroke: "currentColor", transition: "stroke-dashoffset 0.8s ease" }} />
          </g>
          <text x="32" y="33" textAnchor="middle" dominantBaseline="middle" fontSize="15" fontWeight="700" style={{ fill: "currentColor" }}>
            {v.progress.pct}%
          </text>
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <HeroStat value={`${everydayDone}/${v.checks.length}`} label="Everyday" />
        <HeroStat value={`${othersDone}/${othersTotal}`} label="From others" />
        <HeroStat value={String(v.attention.length)} label="Attention" />
      </div>

      <div className="mt-4 flex min-h-12 items-center justify-center gap-1.5 rounded-[0.875rem] bg-navy text-ivory text-[1.0625rem] font-semibold">
        {started ? "Continue Pre-Boarding" : "Begin Pre-Boarding"}
        <ChevronRight className="size-5" />
      </div>
    </Link>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-midnight/15 py-2">
      <div className="text-[1.0625rem] font-bold tnum leading-tight">{value}</div>
      <div className="text-[0.6875rem] font-medium opacity-80">{label}</div>
    </div>
  );
}

/** Compact pre-boarding status that links to the cabin attendant's full checklist. */
export function PreboardCard({ flight }: { flight: Flight }) {
  const now = useNow();
  const name = useCrewName();
  const v = usePreboardView(flight);
  if (!v) return null;
  const openChecks = v.checks.filter(isOpenTask).length;
  return (
    <Link href={`/preboard?flight=${flight.id}`} className="card block p-4 transition-colors active:bg-navy-700 animate-fade-up" data-testid="preboard-card-compact">
      <div className="flex items-center gap-3">
        <span className={cx("grid size-11 place-items-center rounded-xl shrink-0", v.signoff ? "bg-ok-bg text-ok" : "bg-gold/12 text-gold")}>
          {v.signoff ? <ShieldCheck className="size-5.5" /> : <ClipboardCheck className="size-5.5" />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[0.8125rem] font-semibold text-gold">Pre-Boarding</span>
          <span className="block font-semibold text-ivory leading-snug">
            {flight.callsign} · boarding {fmtAirportTime(v.boardingAt, flight.departure)}
          </span>
          <span className="block text-xs text-slate">
            {fmtRelative(v.boardingAt, now)} · {name(flight.cabinAttendantId)}
          </span>
        </span>
        <ChevronRight className="size-5 text-slate-500/70 shrink-0" />
      </div>
      {v.signoff ? (
        <div className="mt-3 text-sm text-ok">Pre-boarding confirmed by {name(v.signoff.byId)} · {fmtRelative(v.signoff.at, now)}</div>
      ) : (
        <>
          <div className="mt-3 flex justify-between text-[0.6875rem] text-slate mb-1">
            <span>
              {v.pendingAcks.length > 0 && <span className="text-warn">{v.pendingAcks.length} from others · </span>}
              {v.attention.length > 0 && <span className="text-warn">{v.attention.length} need attention · </span>}
              {openChecks} check{openChecks === 1 ? "" : "s"} open
            </span>
            <span className="tnum text-ivory">{v.progress.pct}%</span>
          </div>
          <ProgressBar value={v.progress.pct} tone={v.progress.pct === 100 ? "ok" : "gold"} label="Pre-boarding progress" />
        </>
      )}
    </Link>
  );
}
