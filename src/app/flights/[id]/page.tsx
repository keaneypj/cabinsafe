"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CloudLightning, FileText, Handshake, Pencil, Plus, Shield, UserMinus, Users } from "lucide-react";
import { ComponentBreakdown, FlightTimes, ReadinessPanel, ReadinessPill, RouteLine } from "@/components/flight";
import { AddPassengerSheet, PassengerRow } from "@/components/passengers";
import { PreboardCard } from "@/components/PreboardCard";
import { TaskRow, TaskSheet } from "@/components/tasks";
import { Avatar, Badge, Button, Card, Chip, ConfirmDialog, EmptyState, Field, LinkButton, Notice, Segmented, SectionHeader, Sheet, report } from "@/components/ui";
import { CATEGORY_LABELS, POSTFLIGHT_ORDER, PREFLIGHT_ORDER } from "@/domain/checklists";
import { can } from "@/domain/permissions";
import { isOpenTask } from "@/domain/readiness";
import type { ChecklistCategory, Task } from "@/domain/types";
import { cx, fmtRelative } from "@/lib/format";
import { useCrewName, useNow, useReadiness } from "@/store/hooks";
import { useShallow } from "zustand/react/shallow";
import { useMe, useStore } from "@/store/store";

type Tab = "overview" | "checklist" | "manifest" | "crew";
type Filter = "all" | "open" | "critical" | "mine" | "review" | "blocked";

export default function FlightPage() {
  return (
    <Suspense>
      <FlightDetail />
    </Suspense>
  );
}

function FlightDetail() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const now = useNow();
  const flight = useStore((s) => s.flights.find((f) => f.id === id));
  const r = useReadiness(id, now);
  const me = useMe();
  const [tab, setTab] = useState<Tab>((sp.get("tab") as Tab) ?? (sp.get("filter") || sp.get("task") ? "checklist" : "overview"));
  const [openTask, setOpenTask] = useState<string | null>(sp.get("task"));

  useEffect(() => {
    const t = sp.get("tab") as Tab | null;
    if (t) setTab(t);
    else if (sp.get("filter") || sp.get("task")) setTab("checklist");
    if (sp.get("task")) setOpenTask(sp.get("task"));
  }, [sp]);

  if (!flight) return <EmptyState title="Flight not found" action={<LinkButton href="/flights" variant="secondary">All flights</LinkButton>}>It may have been removed by a demo reset.</EmptyState>;

  const switchTab = (t: Tab) => {
    setTab(t);
    router.replace(`/flights/${flight.id}?tab=${t}`, { scroll: false });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-gold font-semibold tracking-wider">{flight.callsign}</span>
          <span className="text-xs text-slate">{flight.status === "completed" ? "Completed" : `Departs ${fmtRelative(flight.departAt, now)}`}</span>
        </div>
        {can(me.role, "flight.edit") && (
          <LinkButton href={`/flights/${flight.id}/edit`} size="sm" variant="quiet">
            <Pencil className="size-4" /> Edit
          </LinkButton>
        )}
      </div>
      <Card className="mb-4">
        <RouteLine flight={flight} large />
        <FlightTimes flight={flight} />
        <div className="flex flex-wrap gap-1.5 mt-3">
          <Badge tone="neutral">DEMO-700 · G700 (conceptual)</Badge>
          {flight.alternates.map((a) => (
            <Badge key={a} tone="neutral">
              ALT {a}
            </Badge>
          ))}
          {r && flight.status !== "completed" && <ReadinessPill r={r} />}
        </div>
      </Card>

      <div className="scroll-x -mx-4 px-4 mb-4">
        <div role="tablist" aria-label="Flight sections" className="flex gap-1 rounded-2xl bg-midnight-900/50 p-1 border hairline w-max min-w-full">
          {(["overview", "checklist", "manifest", "crew"] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => switchTab(t)} className={cx("flex-1 min-h-10 rounded-xl px-4 text-sm capitalize transition-colors", tab === t ? "bg-navy-600 text-ivory font-semibold shadow" : "text-slate hover:text-ivory")} data-testid={`tab-${t}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && r && (
        <div className="space-y-4">
          {flight.status !== "completed" ? (
            <>
              <Card>
                <ReadinessPanel r={r} flightId={flight.id} />
              </Card>
              <Card>
                <SectionHeader eyebrow="How the index is built" title="Readiness components" />
                <ComponentBreakdown r={r} />
                <p className="text-[0.6875rem] text-slate-500 mt-3">Any unresolved critical blocker results in Not Ready regardless of score (CSI-OPS-001 §2).</p>
              </Card>
            </>
          ) : (
            <Notice tone="info">This flight is complete. Review postflight items in the Checklist tab.</Notice>
          )}
          {flight.status !== "completed" && <PreboardCard flight={flight} />}
          <div className="grid grid-cols-2 gap-3">
            <Link href={`/intel?flight=${flight.id}`} className="card p-4 hover:border-gold/30">
              <CloudLightning className="size-5 text-gold" />
              <div className="font-semibold mt-2 text-sm">Risk Intelligence</div>
              <div className="text-xs text-slate">Weather & advisories</div>
            </Link>
            <Link href={`/copilot?flight=${flight.id}`} className="card p-4 hover:border-gold/30">
              <FileText className="size-5 text-gold" />
              <div className="font-semibold mt-2 text-sm">Safety Briefing</div>
              <div className="text-xs text-slate">Generate & export</div>
            </Link>
          </div>
          {flight.notes && <Notice tone="neutral">{flight.notes}</Notice>}
        </div>
      )}

      {tab === "checklist" && <ChecklistTab flightId={flight.id} initialFilter={(sp.get("filter") as Filter) ?? "all"} onOpen={setOpenTask} defaultPhase={flight.status === "completed" ? "postflight" : "preflight"} />}
      {tab === "manifest" && <ManifestTab flightId={flight.id} />}
      {tab === "crew" && <CrewTab flightId={flight.id} />}

      <TaskSheet taskId={openTask} onClose={() => setOpenTask(null)} />
    </div>
  );
}

function ChecklistTab({ flightId, initialFilter, onOpen, defaultPhase }: { flightId: string; initialFilter: Filter; onOpen: (id: string) => void; defaultPhase: "preflight" | "postflight" }) {
  const allTasks = useStore((s) => s.tasks);
  const me = useMe();
  const [phase, setPhase] = useState<"preflight" | "postflight">(defaultPhase);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [adding, setAdding] = useState(false);
  const tasks = useMemo(() => allTasks.filter((t) => t.flightId === flightId && t.phase === phase), [allTasks, flightId, phase]);

  const predicates: Record<Filter, (t: Task) => boolean> = {
    all: () => true,
    open: isOpenTask,
    critical: (t) => t.priority === "critical" && isOpenTask(t),
    mine: (t) => t.assigneeId === me.id,
    review: (t) => t.source === "passenger_rule" && !t.reviewed && isOpenTask(t),
    blocked: (t) => t.status === "blocked",
  };
  const shown = tasks.filter(predicates[filter]);
  const order = phase === "preflight" ? PREFLIGHT_ORDER : POSTFLIGHT_ORDER;
  const groups = order.map((c) => ({ c, items: shown.filter((t) => t.category === c), all: tasks.filter((t) => t.category === c) })).filter((g) => g.items.length);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <Segmented ariaLabel="Checklist phase" value={phase} onChange={setPhase} options={[{ value: "preflight", label: "Preflight" }, { value: "postflight", label: "Postflight" }]} />
        {can(me.role, "task.assign") && (
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Task
          </Button>
        )}
      </div>
      <div className="scroll-x -mx-4 px-4 mb-3">
        <div className="flex gap-1.5 w-max">
          {(["all", "open", "critical", "mine", "review", "blocked"] as Filter[]).map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)} count={tasks.filter(predicates[f]).length}>
              {{ all: "All", open: "Open", critical: "Critical", mine: "Mine", review: "Needs review", blocked: "Blocked" }[f]}
            </Chip>
          ))}
        </div>
      </div>
      {groups.length === 0 ? (
        <EmptyState title={tasks.length ? "No items match this filter" : `No ${phase} items`}>{tasks.length ? "Try another filter." : phase === "postflight" ? "Postflight checklist items are created after the flight is completed." : "Add a task to begin."}</EmptyState>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const done = g.all.filter((t) => !isOpenTask(t)).length;
            return (
              <section key={g.c} className="card p-0 overflow-hidden" aria-label={CATEGORY_LABELS[g.c as ChecklistCategory]}>
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-midnight-900/30 border-b hairline">
                  <h3 className="text-[0.8125rem] font-semibold text-ivory">{CATEGORY_LABELS[g.c as ChecklistCategory]}</h3>
                  <span className={cx("text-xs tnum", done === g.all.length ? "text-ok" : "text-slate")}>
                    {done}/{g.all.length}
                  </span>
                </div>
                <div className="divide-y divide-slate/10">
                  {g.items.map((t) => (
                    <TaskRow key={t.id} task={t} onOpen={(x) => onOpen(x.id)} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
      <AddTaskSheet flightId={flightId} open={adding} onClose={() => setAdding(false)} phase={phase} />
    </div>
  );
}

function AddTaskSheet({ flightId, open, onClose, phase }: { flightId: string; open: boolean; onClose: () => void; phase: "preflight" | "postflight" }) {
  const crew = useStore((s) => s.crew);
  const flight = useStore((s) => s.flights.find((f) => f.id === flightId))!;
  const create = useStore((s) => s.createTask);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ChecklistCategory>(phase === "preflight" ? "coordination" : "restock");
  const [priority, setPriority] = useState<Task["priority"]>("normal");
  const [assignee, setAssignee] = useState(flight.leadId);
  const [err, setErr] = useState<string>();
  const submit = () => {
    const res = create({ flightId, title, category, priority, assigneeId: assignee, phase, dueAt: new Date(new Date(flight.departAt).getTime() - 3 * 3_600_000).toISOString() });
    if (!res.ok) return setErr(res.error);
    report(res, "Task created");
    setTitle("");
    setErr(undefined);
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="New task" subtitle={flight.callsign} footer={<Button className="flex-1" onClick={submit} data-testid="new-task-save">Create task</Button>}>
      <Field label="Title" error={err} htmlFor="nt-title">
        <input id="nt-title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Confirm FBO arrival slot with security" aria-invalid={!!err} data-testid="new-task-title" />
      </Field>
      <Field label="Category" htmlFor="nt-cat">
        <select id="nt-cat" className="field" value={category} onChange={(e) => setCategory(e.target.value as ChecklistCategory)}>
          {(phase === "preflight" ? PREFLIGHT_ORDER : POSTFLIGHT_ORDER).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Priority">
        <Segmented ariaLabel="Priority" value={priority} onChange={setPriority} options={[{ value: "critical", label: "Critical" }, { value: "high", label: "High" }, { value: "normal", label: "Normal" }]} />
      </Field>
      <Field label="Assign to" htmlFor="nt-assignee">
        <select id="nt-assignee" className="field" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          {crew.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.title}
            </option>
          ))}
        </select>
      </Field>
    </Sheet>
  );
}

function ManifestTab({ flightId }: { flightId: string }) {
  const flight = useStore((s) => s.flights.find((f) => f.id === flightId))!;
  const passengers = useStore((s) => s.passengers);
  const remove = useStore((s) => s.removePassengerFromFlight);
  const me = useMe();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const pax = flight.manifest.map((id) => passengers.find((p) => p.id === id)).filter((p) => !!p);
  const editable = can(me.role, "passenger.edit") && flight.status !== "completed";
  const removingP = passengers.find((p) => p.id === removing);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-slate">
          <Users className="inline size-4 mr-1" /> {pax.length} on manifest · aliases only
        </div>
        {editable && (
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)} data-testid="add-passenger">
            <Plus className="size-4" /> Passenger
          </Button>
        )}
      </div>
      {!can(me.role, "medical.view") && (
        <Notice tone="neutral" className="mb-3">
          Medical details are restricted to the Lead Cabin Attendant. You see operational summaries only.
        </Notice>
      )}
      {pax.length === 0 ? (
        <EmptyState icon={<Users className="size-7" />} title="Manifest is empty" />
      ) : (
        <div className="card p-0 divide-y divide-slate/10 overflow-hidden" data-testid="manifest-list">
          {pax.map((p) => (
            <PassengerRow
              key={p!.id}
              p={p!}
              href={`/passengers/${p!.id}?flight=${flight.id}`}
              trailing={
                editable ? (
                  <button className="grid size-10 place-items-center rounded-full text-slate-500 hover:text-bad hover:bg-bad-bg/50" onClick={() => setRemoving(p!.id)} aria-label={`Remove ${p!.alias} from manifest`}>
                    <UserMinus className="size-4.5" />
                  </button>
                ) : undefined
              }
            />
          ))}
        </div>
      )}
      <AddPassengerSheet flight={flight} open={adding} onClose={() => setAdding(false)} />
      <ConfirmDialog
        open={!!removing}
        title={`Remove ${removingP?.alias ?? ""}?`}
        body={<>Open preparation tasks generated for this passenger will be marked Not Applicable with the reason &ldquo;Passenger removed from manifest&rdquo;. Completed tasks are retained for the record.</>}
        confirmLabel="Remove from manifest"
        tone="danger"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) report(remove(flight.id, removing), `${removingP?.alias} removed from ${flight.callsign}`);
          setRemoving(null);
        }}
      />
    </div>
  );
}

function CrewTab({ flightId }: { flightId: string }) {
  const flight = useStore((s) => s.flights.find((f) => f.id === flightId))!;
  const crew = useStore((s) => s.crew);
  const tasks = useStore((s) => s.tasks);
  const handovers = useStore(useShallow((s) => s.handovers.filter((h) => h.flightId === flightId)));
  const assign = useStore((s) => s.assignCabinAttendant);
  const me = useMe();
  const name = useCrewName();
  const contract = crew.filter((c) => c.role === "contract_ca");
  const row = (id: string | undefined, role: string) => {
    const c = crew.find((x) => x.id === id);
    if (!c) return null;
    const open = tasks.filter((t) => t.flightId === flightId && t.assigneeId === c.id && isOpenTask(t)).length;
    return (
      <li key={c.id + role} className="flex items-center gap-3 px-3.5 py-3">
        <Avatar initials={c.initials} tone={c.role === "lead" ? "gold" : "navy"} />
        <span className="flex-1 min-w-0">
          <span className="block text-sm text-ivory">{c.name}</span>
          <span className="block text-xs text-slate">{role}</span>
        </span>
        {open > 0 && <Badge tone="neutral">{open} open</Badge>}
      </li>
    );
  };
  return (
    <div className="space-y-4">
      <section className="card p-0 overflow-hidden">
        <ul className="divide-y divide-slate/10">
          {row(flight.pilotIds[0], "Captain · Pilot in Command")}
          {row(flight.pilotIds[1], "First Officer")}
          {row(flight.leadId, "Lead Cabin Attendant")}
          {row(flight.cabinAttendantId, "Cabin Attendant (contract)")}
          {flight.securityIds.map((s) => row(s, "Security Lead"))}
        </ul>
      </section>
      {can(me.role, "task.assign") && flight.status !== "completed" && (
        <Card>
          <Field label="Assign cabin attendant for this flight" hint="Open items assigned to the previous attendant are reassigned." htmlFor="ca-select">
            <select id="ca-select" className="field" value={flight.cabinAttendantId ?? ""} onChange={(e) => report(assign(flight.id, e.target.value), `${name(e.target.value)} assigned to ${flight.callsign}`)} data-testid="assign-ca">
              {contract.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </Card>
      )}
      <section>
        <SectionHeader
          eyebrow="Accountability"
          title="Handovers"
          action={
            can(me.role, "handover.create") ? (
              <LinkButton href={`/handovers/new?flight=${flight.id}`} size="sm" variant="secondary">
                <Plus className="size-4" /> Handover
              </LinkButton>
            ) : undefined
          }
        />
        {handovers.length === 0 ? (
          <EmptyState icon={<Handshake className="size-7" />} title="No handovers for this flight" />
        ) : (
          <div className="space-y-2">
            {handovers.map((h) => (
              <Link key={h.id} href={`/handovers/${h.id}`} className="card-quiet flex items-center gap-3 p-3.5 hover:border-gold/30">
                <Shield className="size-5 text-gold shrink-0" />
                <span className="flex-1 text-sm">
                  {name(h.outgoingId)} → {name(h.incomingId)}
                  <span className="block text-xs text-slate">{h.acknowledgements.filter((a) => a.ackedAt).length}/{h.acknowledgements.length} acknowledged</span>
                </span>
                <Badge tone={h.status === "accepted" ? "ok" : "warn"}>{h.status === "accepted" ? "Accepted" : "Awaiting acceptance"}</Badge>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
