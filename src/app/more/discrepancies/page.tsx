"use client";

import Link from "next/link";
import { useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { Badge, Button, Chip, EmptyState, PageTitle, report } from "@/components/ui";
import type { Discrepancy } from "@/domain/types";
import { fmtDateTime } from "@/lib/format";
import { useCrewName } from "@/store/hooks";
import { useMe, useStore } from "@/store/store";

export default function DiscrepanciesPage() {
  const discrepancies = useStore((s) => s.discrepancies);
  const equipment = useStore((s) => s.equipment);
  const flights = useStore((s) => s.flights);
  const update = useStore((s) => s.updateDiscrepancy);
  const me = useMe();
  const name = useCrewName();
  const [filter, setFilter] = useState<"open" | "postflight" | "all">("open");
  const [editing, setEditing] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const pred: Record<typeof filter, (d: Discrepancy) => boolean> = { open: (d) => d.status !== "resolved", postflight: (d) => d.phase === "postflight", all: () => true };
  const shown = discrepancies.filter(pred[filter]);
  return (
    <div>
      <PageTitle eyebrow="Cabin & Equipment" title="Discrepancies" subtitle="Postflight and inspection findings with follow-up" />
      <div className="flex gap-1.5 mb-3">
        {(["open", "postflight", "all"] as const).map((f) => <Chip key={f} active={filter === f} onClick={() => setFilter(f)} count={discrepancies.filter(pred[f]).length}>{f === "open" ? "Open & deferred" : f === "postflight" ? "Postflight" : "All"}</Chip>)}
      </div>
      {shown.length === 0 ? <EmptyState icon={<CircleCheck className="size-7" />} title="No discrepancies" /> : (
        <ul className="space-y-2.5">
          {shown.map((d) => {
            const eq = equipment.find((e) => e.id === d.equipmentId);
            return (
              <li key={d.id} className="card p-3.5">
                <div className="flex items-start gap-2.5">
                  <CircleAlert className={d.severity === "critical" ? "size-5 text-bad" : d.severity === "major" ? "size-5 text-warn" : "size-5 text-slate"} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      <Badge tone={d.severity === "critical" ? "bad" : d.severity === "major" ? "warn" : "neutral"}>{d.severity.toUpperCase()}</Badge>
                      <Badge tone={d.status === "resolved" ? "ok" : d.status === "deferred" ? "info" : "warn"}>{d.status}</Badge>
                      <Badge tone="neutral">{d.phase}</Badge>
                    </div>
                    <div className="text-sm text-ivory">{d.title}</div>
                    <div className="text-xs text-slate mt-0.5">{d.detail}</div>
                    {d.resolution && <div className="text-xs text-ok mt-1">↳ {d.resolution}</div>}
                    <div className="text-[0.6875rem] text-slate-500 mt-1">{name(d.reportedById)} · {fmtDateTime(d.reportedAt)}{d.flightId ? ` · ${flights.find((f) => f.id === d.flightId)?.callsign}` : ""}{d.location ? ` · ${d.location}` : ""}</div>
                    {eq && <Link href={`/cabin?eq=${eq.id}`} className="text-xs text-gold inline-block mt-1 min-h-8">Open {eq.code} record →</Link>}
                    {me.role === "lead" && d.status !== "resolved" && (editing === d.id ? (
                      <div className="mt-2">
                        <input className="field !min-h-10 text-sm" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Resolution, or deferral owner and follow-up date" aria-label="Resolution note" />
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" onClick={() => report(update(d.id, "resolved", note), "Resolved") && setEditing(null)}>Resolve</Button>
                          {d.status !== "deferred" && <Button size="sm" variant="secondary" onClick={() => report(update(d.id, "deferred", note), "Deferred") && setEditing(null)}>Defer</Button>}
                          <Button size="sm" variant="quiet" onClick={() => setEditing(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : <button className="text-xs text-gold min-h-8" onClick={() => { setEditing(d.id); setNote(""); }}>Resolve or defer…</button>)}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
