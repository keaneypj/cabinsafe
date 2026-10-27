"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button, Card, Field, Notice, PageTitle, report } from "@/components/ui";
import { can } from "@/domain/permissions";
import { effectiveEquipmentStatus, isOpenTask } from "@/domain/readiness";
import { useUpcomingFlights } from "@/store/hooks";
import { useMe, useStore } from "@/store/store";

const DEFAULT_ACKS = ["Reviewed open safety items", "Reviewed equipment status and discrepancies", "Reviewed passenger accommodation summary", "Confirmed confidentiality obligations (CSI-SEC-007)"];

export default function NewHandoverPage() {
  return (
    <Suspense>
      <NewHandover />
    </Suspense>
  );
}

function NewHandover() {
  const sp = useSearchParams();
  const router = useRouter();
  const me = useMe();
  const flights = useUpcomingFlights();
  const crew = useStore((s) => s.crew);
  const tasks = useStore((s) => s.tasks);
  const equipment = useStore((s) => s.equipment);
  const passengers = useStore((s) => s.passengers);
  const create = useStore((s) => s.createHandover);
  const cabin = crew.filter((c) => c.role === "lead" || c.role === "contract_ca");
  const [flightId, setFlightId] = useState(sp.get("flight") ?? flights[0]?.id ?? "");
  const flight = flights.find((f) => f.id === flightId);
  const [outgoingId, setOut] = useState(me.role === "lead" || me.role === "contract_ca" ? me.id : cabin[0].id);
  const [incomingId, setIn] = useState(flight?.cabinAttendantId ?? cabin[1].id);
  const open = useMemo(() => tasks.filter((t) => t.flightId === flightId && isOpenTask(t) && t.priority !== "normal"), [tasks, flightId]);
  const [selected, setSelected] = useState<string[]>([]);
  const [eqSummary, setEq] = useState("");
  const [accSummary, setAcc] = useState("");
  const [acks, setAcks] = useState<string[]>(DEFAULT_ACKS);
  const [newAck, setNewAck] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    setSelected(open.map((t) => t.id));
    const now = Date.now();
    setEq(equipment.filter((e) => effectiveEquipmentStatus(e, now) !== "serviceable").map((e) => `${e.code} ${effectiveEquipmentStatus(e, now).replace("_", " ")}`).join(". ") || "All equipment serviceable.");
    setAcc(flight ? flight.manifest.map((id) => passengers.find((p) => p.id === id)).filter((p) => p && p.accommodations.length).map((p) => `${p!.alias}: ${p!.accommodations.filter((a) => a.type !== "medical_plan").map((a) => a.summary).join(" ")}`).join("\n") + "\nMedical details restricted to Lead CA." : "");
    if (flight?.cabinAttendantId) setIn(flight.cabinAttendantId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flightId]);

  if (!can(me.role, "handover.create")) return <Notice tone="warn">Your demo role cannot create handovers.</Notice>;

  const submit = () => {
    const res = create({ flightId, outgoingId, incomingId, openTaskIds: selected, equipmentSummary: eqSummary, accommodationSummary: accSummary, acknowledgements: acks, notes });
    if (!res.ok) return setError(res.error);
    report(res, "Handover submitted for acceptance");
    router.push(`/handovers/${res.value!.id}`);
  };

  return (
    <div>
      <PageTitle eyebrow="Crew Coordination" title="New handover" subtitle="Prefilled from current records — review before submitting" />
      <Card>
        {error && <Notice tone="bad" className="mb-3">{error}</Notice>}
        <Field label="Flight" htmlFor="h-flight">
          <select id="h-flight" className="field" value={flightId} onChange={(e) => setFlightId(e.target.value)}>
            {flights.map((f) => <option key={f.id} value={f.id}>{f.callsign} · {f.departure}–{f.destination}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Outgoing" htmlFor="h-out">
            <select id="h-out" className="field" value={outgoingId} onChange={(e) => setOut(e.target.value)}>
              {cabin.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Incoming" htmlFor="h-in">
            <select id="h-in" className="field" value={incomingId} onChange={(e) => setIn(e.target.value)}>
              {cabin.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label={`Open safety items (${selected.length}/${open.length})`}>
          <ul className="space-y-1.5 max-h-60 overflow-y-auto">
            {open.map((t) => (
              <li key={t.id}>
                <label className="flex items-start gap-2.5 text-sm text-ivory rounded-lg bg-navy-700 px-3 py-2 cursor-pointer">
                  <input type="checkbox" className="size-4.5 mt-0.5 accent-gold" checked={selected.includes(t.id)} onChange={(e) => setSelected((s) => (e.target.checked ? [...s, t.id] : s.filter((x) => x !== t.id)))} />
                  {t.title}
                </label>
              </li>
            ))}
            {open.length === 0 && <li className="text-sm text-slate">No open critical/high items.</li>}
          </ul>
        </Field>
        <Field label="Equipment status" htmlFor="h-eq">
          <textarea id="h-eq" className="field min-h-20" value={eqSummary} onChange={(e) => setEq(e.target.value)} />
        </Field>
        <Field label="Passenger accommodations (operational summary only)" htmlFor="h-acc">
          <textarea id="h-acc" className="field min-h-24" value={accSummary} onChange={(e) => setAcc(e.target.value)} />
        </Field>
        <Field label="Required acknowledgements">
          <ul className="space-y-1.5">
            {acks.map((a, i) => (
              <li key={i} className="flex items-center gap-2 rounded-lg bg-navy-700 px-3 py-2 text-sm">
                <span className="flex-1">{a}</span>
                <button onClick={() => setAcks((x) => x.filter((_, j) => j !== i))} aria-label={`Remove ${a}`} className="text-slate-500 hover:text-bad grid size-8 place-items-center"><X className="size-4" /></button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 mt-2">
            <input className="field" value={newAck} onChange={(e) => setNewAck(e.target.value)} placeholder="Add acknowledgement" aria-label="New acknowledgement" />
            <Button variant="secondary" onClick={() => { if (newAck.trim()) { setAcks((x) => [...x, newAck.trim()]); setNewAck(""); } }} aria-label="Add acknowledgement"><Plus className="size-4" /></Button>
          </div>
        </Field>
        <Field label="Handover notes" htmlFor="h-notes">
          <textarea id="h-notes" className="field min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={800} />
        </Field>
        <Button className="w-full" onClick={submit} data-testid="handover-submit">Submit handover</Button>
      </Card>
    </div>
  );
}
