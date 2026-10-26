"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BookOpen, Lock, PawPrint, Plus } from "lucide-react";
import { ACC_META } from "@/components/passengers";
import { TaskRow, TaskSheet } from "@/components/tasks";
import { Avatar, Badge, Card, Chip, EmptyState, Notice, SectionHeader, report } from "@/components/ui";
import { can } from "@/domain/permissions";
import { isOpenTask } from "@/domain/readiness";
import { useMe, useStore } from "@/store/store";

export default function PassengerPage() {
  return (
    <Suspense>
      <Passenger />
    </Suspense>
  );
}

function Passenger() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const p = useStore((s) => s.passengers.find((x) => x.id === id));
  const flights = useStore((s) => s.flights);
  const tasks = useStore((s) => s.tasks);
  const demo = useStore((s) => s.demo);
  const add = useStore((s) => s.addPassengerToFlight);
  const me = useMe();
  const [openTask, setOpenTask] = useState<string | null>(null);
  const onFlights = flights.filter((f) => p && f.manifest.includes(p.id) && f.status !== "completed").sort((a, b) => a.departAt.localeCompare(b.departAt));
  const [flightId, setFlightId] = useState<string | undefined>(sp.get("flight") ?? onFlights[0]?.id);

  useEffect(() => {
    if (demo.active && DEMO_STEP_PASSENGER === demo.step && id === "pax-sage") useStore.getState().demoMark("passenger");
  }, [demo.active, demo.step, id]);

  if (!p) return <EmptyState title="Passenger not found" />;
  const medical = can(me.role, "medical.view");
  const restricted = can(me.role, "restricted.view");
  const generated = tasks.filter((t) => t.passengerId === p.id && t.flightId === flightId);
  const notOn = flights.filter((f) => f.status !== "completed" && !f.manifest.includes(p.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 animate-fade-up">
        <Avatar initials={p.initials} size={60} tone={p.category === "principal" ? "gold" : "navy"} />
        <div>
          <div className="eyebrow">Passenger alias</div>
          <h1 className="display text-[2rem] leading-none tracking-wide">{p.alias}</h1>
          <div className="text-sm text-slate mt-1">{p.relationship}</div>
        </div>
      </div>

      <Card>
        <SectionHeader eyebrow="Flight assignment" title="Manifests" />
        <div className="flex flex-wrap gap-1.5">
          {onFlights.length === 0 && <span className="text-sm text-slate">Not on an upcoming manifest.</span>}
          {onFlights.map((f) => (
            <Chip key={f.id} active={f.id === flightId} onClick={() => setFlightId(f.id)}>
              {f.callsign} · {f.departure}–{f.destination}
            </Chip>
          ))}
        </div>
        {can(me.role, "passenger.edit") && notOn.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {notOn.map((f) => (
              <button key={f.id} className="inline-flex items-center gap-1 rounded-full border border-dashed border-gold/40 text-gold text-xs px-3 min-h-9" onClick={() => {
                const res = add(f.id, p.id);
                if (report(res, `${p.alias} added to ${f.callsign} · ${res.ok ? res.value?.generated.length ?? 0 : 0} task(s) generated`)) setFlightId(f.id);
              }}>
                <Plus className="size-3.5" /> Add to {f.callsign}
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card data-testid="accommodations">
        <SectionHeader eyebrow="Documented records" title="Safety & accommodations" />
        {p.accommodations.length === 0 && p.dietary.length === 0 ? (
          <p className="text-sm text-slate">No documented accommodations.</p>
        ) : (
          <ul className="space-y-2">
            {p.accommodations.map((a) => {
              const M = ACC_META[a.type];
              const hide = (a.type === "medical_plan" || a.type === "medical_equipment") && !medical;
              return (
                <li key={a.id} className="rounded-xl border border-slate/12 bg-midnight-900/30 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    {hide ? <Lock className="size-4 text-slate" /> : <M.icon className="size-4 text-gold" />}
                    <span className="text-sm font-semibold text-ivory">{hide ? "Restricted accommodation" : M.label}</span>
                    <Badge tone={a.documentation === "documented" ? "ok" : "warn"} className="ml-auto">
                      {a.documentation === "documented" ? "Documented" : "Pending confirmation"}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate leading-relaxed">{hide ? "Operational preparation tasks are visible below; detail is restricted to the Lead Cabin Attendant." : a.summary}</p>
                  {a.planRef && !hide && <div className="text-[0.6875rem] text-gold mt-1">Plan reference: {a.planRef}</div>}
                </li>
              );
            })}
            {p.dietary.length > 0 && (
              <li className="rounded-xl border border-slate/12 bg-midnight-900/30 p-3">
                <div className="text-sm font-semibold text-ivory mb-1">Dietary</div>
                <p className="text-sm text-slate">{p.dietary.join(" · ")}</p>
              </li>
            )}
          </ul>
        )}
        {p.pet && (
          <div className="mt-3 rounded-xl border border-gold/20 bg-gold/5 p-3 text-sm">
            <div className="flex items-center gap-2 text-gold font-semibold mb-1">
              <PawPrint className="size-4" /> Pet travel considerations
            </div>
            <div className="text-slate">{p.pet.breed} · {p.pet.weightKg} kg · {p.pet.documentation}</div>
          </div>
        )}
        <dl className="grid grid-cols-2 gap-3 mt-3 text-xs">
          <div>
            <dt className="text-slate-500">Emergency plan reference</dt>
            <dd className="text-ivory">{p.emergencyPlanRef ?? "None on file"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Procedure</dt>
            <dd>
              <Link href="/documents/CSI-MED-002" className="text-gold inline-flex items-center gap-1">
                <BookOpen className="size-3" /> CSI-MED-002
              </Link>
            </dd>
          </div>
        </dl>
        {p.preferences.length > 0 && (
          <div className="mt-3">
            <div className="eyebrow mb-1">Service preferences</div>
            <ul className="text-sm text-slate list-disc pl-5 space-y-0.5">
              {p.preferences.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card className={medical ? "border-gold/25" : ""} data-testid="restricted">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="size-4 text-gold" />
          <h2 className="font-semibold">Restricted information</h2>
          <Badge tone="gold" className="ml-auto">Lead CA only</Badge>
        </div>
        {medical || restricted ? (
          <div className="space-y-2 text-sm">
            {p.restrictedMedical && (
              <p className="text-ivory leading-relaxed" data-testid="restricted-medical">
                <span className="text-slate-500 text-xs block">Medical context (synthetic)</span>
                {p.restrictedMedical}
              </p>
            )}
            {p.restrictedNotes && (
              <p className="text-ivory leading-relaxed">
                <span className="text-slate-500 text-xs block">Restricted notes</span>
                {p.restrictedNotes}
              </p>
            )}
            {!p.restrictedMedical && !p.restrictedNotes && <p className="text-slate">No restricted notes.</p>}
            <p className="text-[0.6875rem] text-slate-500">Crew do not diagnose or recommend treatment. Escalate in-flight events to the PIC and telemedical provider (CSI-MED-002 §2).</p>
          </div>
        ) : (
          <p className="text-sm text-slate" data-testid="restricted-locked">Hidden in your demo role. In production this field is never sent to devices of unauthorized roles (server-side row-level security).</p>
        )}
      </Card>

      <section>
        <SectionHeader eyebrow="Rules engine" title="Generated preparation tasks" action={<span className="text-xs text-slate tnum">{generated.filter((t) => !isOpenTask(t)).length}/{generated.length} done</span>} />
        {!flightId ? (
          <EmptyState title="Select a flight">Generated tasks are created per flight manifest.</EmptyState>
        ) : generated.length === 0 ? (
          <EmptyState title="No generated tasks">No documented accommodation requires preparation on this flight.</EmptyState>
        ) : (
          <div className="card p-0 divide-y divide-slate/10 overflow-hidden" data-testid="generated-tasks">
            {generated.map((t) => (
              <TaskRow key={t.id} task={t} onOpen={(x) => setOpenTask(x.id)} />
            ))}
          </div>
        )}
        {!medical && <Notice tone="neutral" className="mt-3">Task titles describe preparation only. Lead CA reviews and may modify every generated task.</Notice>}
      </section>
      <TaskSheet taskId={openTask} onClose={() => setOpenTask(null)} />
    </div>
  );
}

const DEMO_STEP_PASSENGER = 2;
