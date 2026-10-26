"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";
import { AIRPORT_OPTIONS } from "@/data/airports";
import type { Flight } from "@/domain/types";
import { useShallow } from "zustand/react/shallow";
import { useStore, type FlightInput } from "@/store/store";
import { Button, Chip, Field, Notice, report } from "./ui";

/** datetime-local value (UTC) ⇄ ISO */
function toInput(iso: string): string {
  return iso.slice(0, 16);
}
function fromInput(v: string): string {
  const d = new Date(`${v}:00Z`);
  return Number.isFinite(d.getTime()) ? d.toISOString() : "";
}

export function FlightForm({ flight }: { flight?: Flight }) {
  const router = useRouter();
  const crew = useStore(useShallow((s) => s.crew.filter((c) => c.role === "contract_ca")));
  const upsert = useStore((s) => s.upsertFlight);
  const defaultDep = new Date(Date.now() + 2 * 86_400_000);
  defaultDep.setUTCMinutes(0, 0, 0);
  const [v, setV] = useState<FlightInput>(() =>
    flight
      ? { id: flight.id, callsign: flight.callsign, departure: flight.departure, destination: flight.destination, alternates: flight.alternates, departAt: flight.departAt, arriveAt: flight.arriveAt, cabinAttendantId: flight.cabinAttendantId, notes: flight.notes, status: flight.status }
      : { callsign: "", departure: "KMIA", destination: "EGLF", alternates: ["EGKK"], departAt: defaultDep.toISOString(), arriveAt: new Date(defaultDep.getTime() + 8.5 * 3_600_000).toISOString(), cabinAttendantId: crew[0]?.id, notes: "", status: "scheduled" },
  );
  const [error, setError] = useState<string>();
  const set = <K extends keyof FlightInput>(k: K, val: FlightInput[K]) => setV((x) => ({ ...x, [k]: val }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = upsert(v);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    report(res, flight ? `Flight ${v.callsign.toUpperCase()} updated` : `Flight ${v.callsign.toUpperCase()} created with preflight checklist`);
    router.push(`/flights/${res.value!.id}`);
  };

  return (
    <form onSubmit={submit} noValidate className="card p-4" data-testid="flight-form">
      {error && (
        <Notice tone="bad" className="mb-4">
          {error}
        </Notice>
      )}
      <Field label="Flight ID" hint="3–8 letters or digits, e.g. CSI104" htmlFor="ff-callsign">
        <input id="ff-callsign" className="field uppercase" value={v.callsign} onChange={(e) => set("callsign", e.target.value)} placeholder="CSI104" autoCapitalize="characters" maxLength={8} required aria-invalid={!!error && !/^[A-Za-z0-9]{3,8}$/.test(v.callsign)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Departure" htmlFor="ff-dep">
          <select id="ff-dep" className="field" value={v.departure} onChange={(e) => set("departure", e.target.value)}>
            {AIRPORT_OPTIONS.map((a) => (
              <option key={a.icao} value={a.icao}>
                {a.icao} · {a.city}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Destination" htmlFor="ff-dst">
          <select id="ff-dst" className="field" value={v.destination} onChange={(e) => set("destination", e.target.value)}>
            {AIRPORT_OPTIONS.map((a) => (
              <option key={a.icao} value={a.icao}>
                {a.icao} · {a.city}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Alternates">
        <div className="flex flex-wrap gap-1.5">
          {AIRPORT_OPTIONS.filter((a) => a.icao !== v.destination && a.icao !== v.departure).map((a) => (
            <Chip key={a.icao} active={v.alternates.includes(a.icao)} onClick={() => set("alternates", v.alternates.includes(a.icao) ? v.alternates.filter((x) => x !== a.icao) : [...v.alternates, a.icao])}>
              {a.icao}
            </Chip>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-x-3">
        <Field label="Departure time (UTC)" htmlFor="ff-dt">
          <input id="ff-dt" type="datetime-local" className="field" value={toInput(v.departAt)} onChange={(e) => set("departAt", fromInput(e.target.value))} required />
        </Field>
        <Field label="Arrival time (UTC)" htmlFor="ff-at">
          <input id="ff-at" type="datetime-local" className="field" value={toInput(v.arriveAt)} onChange={(e) => set("arriveAt", fromInput(e.target.value))} required />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cabin attendant" htmlFor="ff-ca">
          <select id="ff-ca" className="field" value={v.cabinAttendantId ?? ""} onChange={(e) => set("cabinAttendantId", e.target.value || undefined)}>
            {crew.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status" htmlFor="ff-status">
          <select id="ff-status" className="field" value={v.status} onChange={(e) => set("status", e.target.value as Flight["status"])}>
            <option value="planning">Planning</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
          </select>
        </Field>
      </div>
      <Field label="Notes (optional)" htmlFor="ff-notes">
        <textarea id="ff-notes" className="field min-h-20" value={v.notes ?? ""} onChange={(e) => set("notes", e.target.value)} maxLength={400} />
      </Field>
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" className="flex-1" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" data-testid="flight-save">
          <Check className="size-4" /> {flight ? "Save changes" : "Create flight"}
        </Button>
      </div>
      {!flight && <p className="text-[0.6875rem] text-slate-500 mt-3">A preflight checklist is generated from the standard template. Passengers added to the manifest generate their own preparation tasks.</p>}
    </form>
  );
}
