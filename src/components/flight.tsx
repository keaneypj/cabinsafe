"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight, CircleAlert, OctagonAlert, PawPrint, ShieldCheck, TriangleAlert, Users } from "lucide-react";
import { airport } from "@/data/airports";
import type { ReadinessLevel, ReadinessResult } from "@/domain/readiness";
import type { Flight } from "@/domain/types";
import { cx, fmtAirportTime, fmtDate, fmtDuration, fmtRelative } from "@/lib/format";
import { useCrewName, useNow, useReadiness } from "@/store/hooks";
import { useStore } from "@/store/store";
import { Badge, ProgressBar, Ring, type Tone } from "./ui";

export const LEVEL_TONE: Record<ReadinessLevel, Tone> = { not_ready: "bad", attention: "warn", prepared: "ok" };
export const LEVEL_RING: Record<ReadinessLevel, "bad" | "warn" | "ok"> = { not_ready: "bad", attention: "warn", prepared: "ok" };

export function ReadinessPill({ r }: { r: ReadinessResult }) {
  const Icon = r.level === "not_ready" ? OctagonAlert : r.level === "attention" ? TriangleAlert : ShieldCheck;
  return (
    <Badge tone={LEVEL_TONE[r.level]} icon={<Icon className="size-3" aria-hidden />}>
      {r.level === "not_ready" ? "Not Ready" : r.level === "attention" ? "Attention" : "Cabin Prepared"}
    </Badge>
  );
}

export function RouteLine({ flight, large }: { flight: Flight; large?: boolean }) {
  const dep = airport(flight.departure);
  const dst = airport(flight.destination);
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0">
        <div className={cx("font-semibold tnum tracking-wide text-ivory", large ? "text-[1.75rem] leading-none" : "text-lg leading-tight")}>{flight.departure}</div>
        <div className="text-[0.6875rem] text-slate truncate">{dep?.city ?? ""}</div>
      </div>
      <div className="flex-1 flex items-center gap-1.5 text-gold/70 min-w-8" aria-hidden>
        <span className="h-px flex-1 bg-slate-500/35" />
        <svg viewBox="0 0 24 24" className="size-4 rotate-90 fill-gold" aria-hidden>
          <path d="M12 2c.6 0 1 .8 1 1.6V9l7 4.2v1.6L13 12.6V18l2 1.5V21l-3-.8-3 .8v-1.5L11 18v-5.4l-7 2.2v-1.6L11 9V3.6C11 2.8 11.4 2 12 2Z" />
        </svg>
        <span className="h-px flex-1 bg-slate-500/35" />
      </div>
      <div className="min-w-0 text-right">
        <div className={cx("font-semibold tnum tracking-wide text-ivory", large ? "text-[1.75rem] leading-none" : "text-lg leading-tight")}>{flight.destination}</div>
        <div className="text-[0.6875rem] text-slate truncate">{dst?.city ?? ""}</div>
      </div>
    </div>
  );
}

export function FlightTimes({ flight }: { flight: Flight }) {
  const dep = airport(flight.departure);
  const dst = airport(flight.destination);
  return (
    <div className="grid grid-cols-3 gap-2 text-[0.75rem] mt-3">
      <div>
        <div className="eyebrow !text-[0.5625rem]">Departs</div>
        <div className="text-ivory tnum">{fmtAirportTime(flight.departAt, flight.departure)}</div>
        <div className="text-slate-400">{fmtDate(flight.departAt, dep?.tz)}</div>
      </div>
      <div className="text-center">
        <div className="eyebrow !text-[0.5625rem]">Block</div>
        <div className="text-ivory tnum">{fmtDuration(flight.departAt, flight.arriveAt)}</div>
      </div>
      <div className="text-right">
        <div className="eyebrow !text-[0.5625rem]">Arrives</div>
        <div className="text-ivory tnum">{fmtAirportTime(flight.arriveAt, flight.destination)}</div>
        <div className="text-slate-400">{fmtDate(flight.arriveAt, dst?.tz)}</div>
      </div>
    </div>
  );
}

export function FlightCard({ flight }: { flight: Flight }) {
  const now = useNow();
  const r = useReadiness(flight.id, now);
  const name = useCrewName();
  const pets = useStore((s) => s.passengers.filter((p) => flight.manifest.includes(p.id) && p.category === "pet").length);
  return (
    <Link href={`/flights/${flight.id}`} className="card block p-4 hover:border-gold/30 transition-colors animate-fade-up" data-testid={`flight-card-${flight.callsign}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gold tracking-wider text-sm">{flight.callsign}</span>
          <span className="text-xs text-slate">{flight.status === "completed" ? "Completed" : fmtRelative(flight.departAt, now)}</span>
        </div>
        {flight.status !== "completed" && r && <ReadinessPill r={r} />}
      </div>
      <RouteLine flight={flight} />
      <FlightTimes flight={flight} />
      {flight.status !== "completed" && r && (
        <div className="mt-3 pt-3 border-t hairline flex items-center gap-3 text-xs text-slate">
          <span className="flex items-center gap-1">
            <Users className="size-3.5" aria-hidden /> {flight.manifest.length - pets}
            {pets > 0 && (
              <>
                {" "}
                <PawPrint className="size-3.5 ml-1" aria-hidden /> {pets}
              </>
            )}
          </span>
          <span className="truncate flex-1">CA · {name(flight.cabinAttendantId)}</span>
          <span className="tnum text-ivory">{r.taskCompletion.pct}%</span>
          <ChevronRight className="size-4 text-slate-500" aria-hidden />
        </div>
      )}
    </Link>
  );
}

export function ReadinessPanel({ r, flightId, compact }: { r: ReadinessResult; flightId: string; compact?: boolean }) {
  const issues = [...r.blockers.map((b) => ({ ...b, sev: "bad" as const })), ...r.attention.map((a) => ({ ...a, sev: "warn" as const }))];
  return (
    <div>
      <div className="flex items-center gap-4">
        <Ring value={r.index} tone={LEVEL_RING[r.level]} label="Readiness index" size={compact ? 96 : 112}>
          <span className="text-[1.75rem] font-semibold tnum text-ivory leading-none" data-testid="readiness-index">
            {r.index}
          </span>
          <span className="text-[0.5625rem] tracking-[0.14em] uppercase text-slate mt-1">Readiness</span>
        </Ring>
        <div className="flex-1 min-w-0">
          <div className={cx("font-semibold leading-snug", r.level === "not_ready" ? "text-bad" : r.level === "attention" ? "text-warn" : "text-ok")} data-testid="readiness-headline">
            {r.headline}
          </div>
          <div className="mt-2.5">
            <div className="flex justify-between text-[0.6875rem] text-slate mb-1">
              <span>Task completion</span>
              <span className="tnum text-ivory" data-testid="task-completion">
                {r.taskCompletion.pct}% · {r.taskCompletion.done}/{r.taskCompletion.total}
              </span>
            </div>
            <ProgressBar value={r.taskCompletion.pct} label="Task completion" />
          </div>
          <p className="text-[0.625rem] text-slate-500 mt-2 leading-snug">{r.caveat}</p>
        </div>
      </div>
      {issues.length > 0 && (
        <ul className="mt-3.5 space-y-1.5" aria-label="Readiness issues">
          {issues.slice(0, compact ? 3 : 8).map((i) => (
            <li key={i.kind + i.ref}>
              <Link href={i.href ?? `/flights/${flightId}`} className={cx("flex items-center gap-2.5 rounded-xl px-3 py-2 text-[0.8125rem] border min-h-11", i.sev === "bad" ? "bg-bad-bg/60 border-bad/25 text-ivory" : "bg-warn-bg/45 border-warn/20 text-ivory")}>
                {i.sev === "bad" ? <OctagonAlert className="size-4 text-bad shrink-0" aria-hidden /> : <CircleAlert className="size-4 text-warn shrink-0" aria-hidden />}
                <span className="flex-1 leading-snug">{i.label}</span>
                <ArrowRight className="size-3.5 text-slate shrink-0" aria-hidden />
              </Link>
            </li>
          ))}
          {issues.length > (compact ? 3 : 8) && <li className="text-xs text-slate pl-1">+{issues.length - (compact ? 3 : 8)} more items</li>}
        </ul>
      )}
    </div>
  );
}

export function ComponentBreakdown({ r }: { r: ReadinessResult }) {
  return (
    <ul className="space-y-2.5">
      {r.components.map((c) => (
        <li key={c.key}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate">
              {c.label} <span className="text-slate-500">· weight {c.weight}</span>
            </span>
            <span className="text-ivory tnum">{c.detail}</span>
          </div>
          <ProgressBar value={c.score * 100} tone={c.score >= 0.999 ? "ok" : c.score >= 0.6 ? "gold" : "warn"} label={c.label} />
        </li>
      ))}
    </ul>
  );
}
