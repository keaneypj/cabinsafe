"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight, ClipboardCheck, ShieldCheck } from "lucide-react";
import { computePreboarding } from "@/domain/preboarding";
import { isOpenTask } from "@/domain/readiness";
import type { Flight } from "@/domain/types";
import { cx, fmtAirportTime, fmtRelative } from "@/lib/format";
import { useCrewName, useFlightAdvisories, useNow } from "@/store/hooks";
import { useStore } from "@/store/store";
import { ProgressBar } from "./ui";

/** Compact pre-boarding status that links to the cabin attendant's full checklist. */
export function PreboardCard({ flight }: { flight: Flight }) {
  const now = useNow();
  const name = useCrewName();
  const tasks = useStore((s) => s.tasks);
  const equipment = useStore((s) => s.equipment);
  const discrepancies = useStore((s) => s.discrepancies);
  const acks = useStore((s) => s.acks);
  const inputs = useStore((s) => s.crewInputs);
  const signoffs = useStore((s) => s.preboardSignoffs);
  const advisories = useFlightAdvisories(flight.id);
  const v = useMemo(
    () => computePreboarding({ flight, tasks, equipment, discrepancies, advisories, acks, inputs, signoffs, nowMs: now }),
    [flight, tasks, equipment, discrepancies, advisories, acks, inputs, signoffs, now],
  );
  const openChecks = v.checks.filter(isOpenTask).length;
  return (
    <Link
      href={`/preboard?flight=${flight.id}`}
      className="card block p-4 transition-colors active:bg-navy-700 animate-fade-up"
      data-testid="preboard-card"
    >
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
