"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Check, CircleAlert, CircleCheck, ClipboardCheck, History, OctagonAlert, Plus, X } from "lucide-react";
import { AIRCRAFT } from "@/data/aircraft";
import { can } from "@/domain/permissions";
import { computeReadiness, effectiveEquipmentStatus } from "@/domain/readiness";
import type { Severity } from "@/domain/types";
import { cx, fmtDateTime, fmtRelative } from "@/lib/format";
import { useCrewName, useFeaturedFlight, useFlightAdvisories, useNow } from "@/store/hooks";
import { useMe, useStore } from "@/store/store";
import { CATEGORY_META, STATUS_STYLE } from "./CabinMap";
import { Badge, Button, Field, Notice, Segmented, Sheet, VerifyNotice, report } from "./ui";

type Mode = "record" | "inspect" | "report" | "done";

export function EquipmentSheet({ equipmentId, onClose }: { equipmentId: string | null; onClose: () => void }) {
  const e = useStore((s) => s.equipment.find((x) => x.id === equipmentId));
  const discrepancies = useStore((s) => s.discrepancies);
  const store = useStore.getState();
  const demoActive = useStore((s) => s.demo.active);
  const me = useMe();
  const now = useNow();
  const name = useCrewName();
  const featured = useFeaturedFlight();
  const advisories = useFlightAdvisories(featured?.id);
  const [mode, setMode] = useState<Mode>("record");
  const [checks, setChecks] = useState<Record<string, boolean | undefined>>({});
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<{ passed: boolean; completed: number; before?: number; after?: number; beforeHeadline?: string; afterHeadline?: string } | null>(null);
  const [dTitle, setDTitle] = useState("");
  const [dDetail, setDDetail] = useState("");
  const [dSev, setDSev] = useState<Severity>("minor");
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const [err, setErr] = useState<string>();

  useEffect(() => {
    setMode("record");
    setChecks({});
    setNotes("");
    setResult(null);
    setErr(undefined);
    setResolveId(null);
  }, [equipmentId]);

  if (!e) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;

  const status = effectiveEquipmentStatus(e, now);
  const st = STATUS_STYLE[status];
  const Icon = CATEGORY_META[e.category].icon;
  const open = discrepancies.filter((d) => d.equipmentId === e.id && d.status !== "resolved");
  const zone = AIRCRAFT.zones.find((z) => z.id === e.zone);
  const allAnswered = e.checklist.every((c) => checks[c] !== undefined);
  const canInspect = can(me.role, "equipment.inspect");

  const readinessIndex = () => {
    if (!featured) return undefined;
    const s = useStore.getState();
    return computeReadiness({ flight: s.flights.find((f) => f.id === featured.id)!, tasks: s.tasks, equipment: s.equipment, discrepancies: s.discrepancies, advisories, acks: s.acks, nowMs: Date.now() });
  };

  const submitInspection = () => {
    if (!allAnswered) {
      setErr("Record a result for every check.");
      return;
    }
    const failed = e.checklist.some((c) => checks[c] === false);
    if (failed && !notes.trim()) {
      setErr("Describe the failed check in the notes.");
      return;
    }
    const before = readinessIndex();
    const res = store.inspectEquipment(e.id, { checks: e.checklist.map((label) => ({ label, ok: !!checks[label] })), notes });
    if (!res.ok) return report(res);
    const after = readinessIndex();
    setResult({ passed: res.value!.passed, completed: res.value!.completedTasks, before: before?.index, after: after?.index, beforeHeadline: before?.headline, afterHeadline: after?.headline });
    setMode("done");
    if (res.value!.passed && e.code === "AED-01" && demoActive) store.demoMark("aed");
  };

  const submitReport = () => {
    const res = store.reportDiscrepancy({ equipmentId: e.id, title: dTitle, detail: dDetail, severity: dSev, phase: "inspection", location: zone?.name });
    if (!res.ok) return setErr(res.error);
    report(res, "Discrepancy recorded and added to audit history");
    setDTitle("");
    setDDetail("");
    setErr(undefined);
    setMode("record");
  };

  return (
    <Sheet
      open={!!equipmentId}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-full border" style={{ background: st.fill, borderColor: st.stroke, color: st.text }}>
            <Icon className="size-4.5" />
          </span>
          <span>
            {e.name}
            <span className="block text-xs text-gold font-semibold tracking-wider">{e.code}</span>
          </span>
        </span>
      }
      footer={
        mode === "record" && canInspect ? (
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setMode("report")} data-testid="eq-report">
              <Plus className="size-4" /> Discrepancy
            </Button>
            <Button className="flex-[1.4]" onClick={() => setMode("inspect")} data-testid="eq-inspect">
              <ClipboardCheck className="size-4" /> Inspect
            </Button>
          </>
        ) : mode === "inspect" ? (
          <>
            <Button variant="secondary" onClick={() => setMode("record")}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={submitInspection} disabled={!allAnswered} data-testid="eq-submit">
              <Check className="size-4" /> Record inspection
            </Button>
          </>
        ) : mode === "report" ? (
          <>
            <Button variant="secondary" onClick={() => setMode("record")}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={submitReport}>
              Record discrepancy
            </Button>
          </>
        ) : undefined
      }
    >
      <VerifyNotice compact className="mb-3" />

      {mode === "done" && result && (
        <div className="animate-fade-up" data-testid="inspection-result">
          <div className={cx("rounded-2xl border p-4 text-center", result.passed ? "border-ok/30 bg-ok-bg/50" : "border-bad/35 bg-bad-bg/50")}>
            {result.passed ? <CircleCheck className="size-10 text-ok mx-auto" /> : <OctagonAlert className="size-10 text-bad mx-auto" />}
            <div className="font-semibold text-lg mt-2">{result.passed ? "Inspection recorded — passed" : "Inspection failed — discrepancy raised"}</div>
            <div className="text-sm text-slate mt-1">
              {e.code} is now <strong style={{ color: STATUS_STYLE[effectiveEquipmentStatus(e, Date.now())].text }}>{STATUS_STYLE[effectiveEquipmentStatus(e, Date.now())].label.toLowerCase()}</strong>. Next inspection due {fmtRelative(e.nextInspectionDue)}.
            </div>
            {result.completed > 0 && <div className="text-sm text-ivory mt-2">{result.completed} linked checklist item{result.completed > 1 ? "s" : ""} completed automatically.</div>}
          </div>
          {featured && result.before !== undefined && (
            <div className="card-quiet mt-3 p-3.5">
              <div className="eyebrow mb-2">{featured.callsign} readiness update</div>
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-semibold tnum text-slate">{result.before}</div>
                  <div className="text-[0.625rem] text-slate-500 max-w-28">{result.beforeHeadline}</div>
                </div>
                <ArrowRight className="size-5 text-gold" />
                <div className="text-center">
                  <div className="text-2xl font-semibold tnum text-gold" data-testid="readiness-after">
                    {result.after}
                  </div>
                  <div className="text-[0.625rem] text-ivory max-w-28">{result.afterHeadline}</div>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setMode("record")}>
              View record
            </Button>
            <Link href={featured ? `/flights/${featured.id}` : "/"} className="flex-1">
              <Button className="w-full">Dashboard</Button>
            </Link>
          </div>
        </div>
      )}

      {mode === "record" && (
        <>
          <div className="flex flex-wrap gap-1.5 mb-3">
            <Badge tone={status === "serviceable" ? "ok" : status === "due_soon" ? "gold" : status === "inspection_due" ? "warn" : "bad"}>{st.label}</Badge>
            {e.critical && <Badge tone="neutral">Critical item</Badge>}
            <Badge tone="neutral">{CATEGORY_META[e.category].label}</Badge>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-xs">
            <Item label="Equipment ID" value={`${e.code} · ${e.serialMasked}`} />
            <Item label="Conceptual zone" value={zone?.name ?? e.zone} />
            <Item label="Last inspection" value={e.lastInspectionAt ? `${fmtDateTime(e.lastInspectionAt)} (${fmtRelative(e.lastInspectionAt, now)})` : "None recorded"} />
            <Item label="Next inspection due" value={`${fmtDateTime(e.nextInspectionDue)} (${fmtRelative(e.nextInspectionDue, now)})`} tone={new Date(e.nextInspectionDue).getTime() < now ? "bad" : undefined} />
            <Item label="Expiration" value={e.expiresAt ? fmtDateTime(e.expiresAt) : "Not applicable"} />
            <Item label="Interval" value={`Every ${e.inspectionIntervalDays} day${e.inspectionIntervalDays > 1 ? "s" : ""} (demo)`} />
          </dl>

          <div className="mt-4">
            <div className="eyebrow mb-2">Discrepancies</div>
            {open.length === 0 ? (
              <p className="text-xs text-slate">No open discrepancies.</p>
            ) : (
              <ul className="space-y-2">
                {open.map((d) => (
                  <li key={d.id} className="rounded-xl border border-bad/25 bg-bad-bg/40 p-3">
                    <div className="flex items-start gap-2">
                      <CircleAlert className="size-4 text-bad shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm text-ivory">{d.title}</div>
                        <div className="text-xs text-slate mt-0.5">{d.detail}</div>
                        <div className="text-[0.6875rem] text-slate-500 mt-1">
                          <span className="capitalize">{d.severity}</span> · {d.status} · {name(d.reportedById)} · {fmtRelative(d.reportedAt, now)}
                        </div>
                        {me.role === "lead" &&
                          (resolveId === d.id ? (
                            <div className="mt-2">
                              <input className="field !min-h-10 text-sm" placeholder="Resolution or deferral note" value={resolution} onChange={(x) => setResolution(x.target.value)} aria-label="Resolution note" />
                              <div className="flex gap-2 mt-2">
                                <Button size="sm" onClick={() => report(store.updateDiscrepancy(d.id, "resolved", resolution), "Discrepancy resolved") && (setResolveId(null), setResolution(""))}>
                                  Resolve
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => report(store.updateDiscrepancy(d.id, "deferred", resolution), "Discrepancy deferred") && (setResolveId(null), setResolution(""))}>
                                  Defer
                                </Button>
                                <Button size="sm" variant="quiet" onClick={() => setResolveId(null)} aria-label="Cancel">
                                  <X className="size-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <button className="text-xs text-gold mt-1.5 min-h-8" onClick={() => setResolveId(d.id)}>
                              Resolve or defer…
                            </button>
                          ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4">
            <div className="eyebrow mb-2 flex items-center gap-1.5">
              <History className="size-3.5" /> Inspection history
            </div>
            {e.history.length === 0 ? (
              <p className="text-xs text-slate">No inspections recorded.</p>
            ) : (
              <ol className="space-y-1.5 border-l hairline pl-3" data-testid="inspection-history">
                {e.history.slice(0, 6).map((h) => (
                  <li key={h.id} className="text-xs">
                    <span className={h.result === "fail" ? "text-bad" : "text-ok"}>{h.result === "fail" ? "Failed" : h.result === "pass_with_note" ? "Passed with note" : "Passed"}</span>
                    <span className="text-slate"> · {name(h.byId)} · {fmtDateTime(h.at)}</span>
                    {h.notes && <span className="block text-slate-500">“{h.notes}”</span>}
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="mt-4">
            <div className="eyebrow mb-2">Linked documentation</div>
            <div className="flex flex-wrap gap-1.5">
              {e.documentIds.map((d) => (
                <Link key={d} href={`/documents/${d}`} className="inline-flex items-center gap-1 rounded-full border border-gold/30 px-2.5 min-h-8 text-xs text-gold hover:bg-gold/10">
                  <BookOpen className="size-3" /> {d}
                </Link>
              ))}
              <Link href="/documents/OEM-G700-CABIN" className="inline-flex items-center gap-1 rounded-full border border-warn/30 px-2.5 min-h-8 text-xs text-warn">
                OEM documentation required
              </Link>
            </div>
          </div>
          {!canInspect && (
            <Notice tone="neutral" className="mt-4">
              Your demo role can view equipment records but not record inspections.
            </Notice>
          )}
        </>
      )}

      {mode === "inspect" && (
        <div data-testid="inspection-form">
          <p className="text-sm text-slate mb-3">Record each check as observed. A failed check raises a discrepancy and the item is treated as {e.critical ? "unserviceable" : "having a discrepancy"} until cleared (CSI-OPS-001 §5).</p>
          <div className="flex justify-end mb-2">
            <button className="text-xs text-gold min-h-9" onClick={() => setChecks(Object.fromEntries(e.checklist.map((c) => [c, true])))} data-testid="eq-all-pass">
              Mark all as pass
            </button>
          </div>
          <ul className="space-y-2">
            {e.checklist.map((c) => (
              <li key={c} className="rounded-xl bg-navy-700 p-3">
                <div className="text-sm text-ivory mb-2">{c}</div>
                <div className="flex gap-2">
                  <button onClick={() => setChecks((x) => ({ ...x, [c]: true }))} aria-pressed={checks[c] === true} className={cx("flex-1 min-h-10 rounded-lg border text-sm inline-flex items-center justify-center gap-1.5", checks[c] === true ? "border-ok bg-ok-bg text-ok font-semibold" : " text-slate")}>
                    <Check className="size-4" /> Pass
                  </button>
                  <button onClick={() => setChecks((x) => ({ ...x, [c]: false }))} aria-pressed={checks[c] === false} className={cx("flex-1 min-h-10 rounded-lg border text-sm inline-flex items-center justify-center gap-1.5", checks[c] === false ? "border-bad bg-bad-bg text-bad font-semibold" : " text-slate")}>
                    <X className="size-4" /> Fail
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <Field label="Inspection notes (optional; required if a check fails)" error={err} htmlFor="eq-notes">
            <textarea id="eq-notes" className="field min-h-18 mt-3" value={notes} onChange={(x) => setNotes(x.target.value)} maxLength={400} />
          </Field>
          <p className="text-[0.6875rem] text-slate-500">Recorded as {me.name} · {fmtDateTime(new Date(now).toISOString())}. Demonstration inspection — manufacturer instructions and the operator&apos;s approved equipment list take precedence.</p>
        </div>
      )}

      {mode === "report" && (
        <div>
          <Field label="Title" error={err} htmlFor="d-title">
            <input id="d-title" className="field" value={dTitle} onChange={(x) => setDTitle(x.target.value)} placeholder={`e.g. ${e.code} seal indicator broken`} aria-invalid={!!err} />
          </Field>
          <Field label="Severity">
            <Segmented ariaLabel="Severity" value={dSev} onChange={setDSev} options={[{ value: "critical", label: "Critical" }, { value: "major", label: "Major" }, { value: "minor", label: "Minor" }]} />
          </Field>
          <Field label="Detail" htmlFor="d-detail">
            <textarea id="d-detail" className="field min-h-20" value={dDetail} onChange={(x) => setDDetail(x.target.value)} maxLength={400} />
          </Field>
          {dSev === "critical" && <Notice tone="bad">Critical discrepancies on emergency or medical equipment must be reported to the PIC immediately (CSI-OPS-001 §4). This will set the flight status to Not Ready.</Notice>}
        </div>
      )}
    </Sheet>
  );
}

function Item({ label, value, tone }: { label: string; value: string; tone?: "bad" }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className={tone === "bad" ? "text-bad" : "text-ivory"}>{value}</dd>
    </div>
  );
}
