"use client";

import { useMemo, useState } from "react";
import { History, Search } from "lucide-react";
import { Badge, Chip, EmptyState, PageTitle } from "@/components/ui";
import { ROLE_LABELS } from "@/domain/permissions";
import type { AuditEvent } from "@/domain/types";
import { fmtDateTime, fmtRelative, fmtUtc } from "@/lib/format";
import { useCrewName, useNow } from "@/store/hooks";
import { useStore } from "@/store/store";

const GROUPS: { key: string; label: string; match: (e: AuditEvent) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "checklist", label: "Checklists & tasks", match: (e) => e.action.startsWith("checklist") || e.action.startsWith("task") },
  { key: "equipment", label: "Equipment", match: (e) => e.action.startsWith("equipment") || e.action.startsWith("discrepancy") },
  { key: "handover", label: "Handovers", match: (e) => e.action.startsWith("handover") },
  { key: "records", label: "Records", match: (e) => /^(passenger|flight|advisory|briefing|demo)/.test(e.action) },
];

export default function AuditPage() {
  const audit = useStore((s) => s.audit);
  const flights = useStore((s) => s.flights);
  const name = useCrewName();
  const now = useNow();
  const [group, setGroup] = useState("all");
  const [q, setQ] = useState("");
  const shown = useMemo(() => audit.filter(GROUPS.find((g) => g.key === group)!.match).filter((e) => !q.trim() || `${e.summary} ${name(e.actorId)}`.toLowerCase().includes(q.toLowerCase())), [audit, group, q, name]);
  return (
    <div>
      <PageTitle eyebrow="Accountability" title="Audit History" subtitle="Time-stamped record of safety-relevant actions" />
      <div className="relative mb-3">
        <Search className="size-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input className="field !pl-9" placeholder="Search events or crew" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search audit history" />
      </div>
      <div className="scroll-x -mx-4 px-4 mb-3">
        <div className="flex gap-1.5 w-max">
          {GROUPS.map((g) => <Chip key={g.key} active={group === g.key} onClick={() => setGroup(g.key)} count={audit.filter(g.match).length}>{g.label}</Chip>)}
        </div>
      </div>
      {shown.length === 0 ? (
        <EmptyState icon={<History className="size-7" />} title="No matching events" />
      ) : (
        <ol className="card p-0 divide-y divide-slate/10 overflow-hidden" data-testid="audit-list">
          {shown.map((e) => (
            <li key={e.id} className="px-3.5 py-3">
              <div className="flex items-start gap-2">
                <span className="text-[0.8125rem] text-ivory flex-1 leading-snug">{e.summary}</span>
                {e.flightId && <Badge tone="neutral">{flights.find((f) => f.id === e.flightId)?.callsign ?? "—"}</Badge>}
              </div>
              <div className="text-[0.6875rem] text-slate-500 mt-1">
                {name(e.actorId)} · {ROLE_LABELS[e.actorRole]} · <time dateTime={e.at} title={fmtUtc(e.at)}>{fmtDateTime(e.at)}</time> ({fmtRelative(e.at, now)}) · <span className="font-mono">{e.action}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="text-[0.6875rem] text-slate-500 mt-3">Demonstration audit log stored on this device. Production: append-only server table written by the API with authenticated actor identity (see supabase/schema.sql).</p>
    </div>
  );
}
