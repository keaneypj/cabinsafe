"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CircleCheck, Handshake, ListChecks } from "lucide-react";
import { TaskRow, TaskSheet } from "@/components/tasks";
import { Avatar, Badge, Card, EmptyState, PageTitle, SectionHeader, Segmented } from "@/components/ui";
import { ROLE_LABELS } from "@/domain/permissions";
import { isOpenTask } from "@/domain/readiness";
import { fmtRelative } from "@/lib/format";
import { useNow } from "@/store/hooks";
import { useMe, useStore } from "@/store/store";

export default function CrewPage() {
  return (
    <Suspense>
      <Crew />
    </Suspense>
  );
}

function Crew() {
  const sp = useSearchParams();
  const crew = useStore((s) => s.crew);
  const tasks = useStore((s) => s.tasks);
  const flights = useStore((s) => s.flights);
  const handovers = useStore((s) => s.handovers);
  const me = useMe();
  const now = useNow();
  const [tab, setTab] = useState<"team" | "queue">(sp.get("tab") === "queue" ? "queue" : "team");
  const [openTask, setOpenTask] = useState<string | null>(null);
  const upcomingIds = new Set(flights.filter((f) => f.status !== "completed").map((f) => f.id));
  const callsign = (id: string) => flights.find((f) => f.id === id)?.callsign ?? "";
  const myQueue = tasks.filter((t) => t.assigneeId === me.id && isOpenTask(t)).sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));
  const briefingAcks = tasks.filter((t) => t.title.startsWith("Cabin attendant briefing acknowledgement") && upcomingIds.has(t.flightId));

  return (
    <div>
      <PageTitle eyebrow="Crew Coordination" title="Crew" subtitle="Assignments, queues and acknowledgements" action={<Segmented ariaLabel="View" value={tab} onChange={setTab} options={[{ value: "team", label: "Team" }, { value: "queue", label: "My queue" }]} />} />
      {tab === "queue" ? (
        myQueue.length ? (
          <div className="card p-0 divide-y divide-slate/10 overflow-hidden" data-testid="queue">
            {myQueue.map((t) => <TaskRow key={t.id} task={t} onOpen={(x) => setOpenTask(x.id)} showFlight={callsign(t.flightId)} />)}
          </div>
        ) : (
          <EmptyState icon={<CircleCheck className="size-7" />} title="Your queue is clear" />
        )
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {crew.map((c) => {
              const open = tasks.filter((t) => t.assigneeId === c.id && isOpenTask(t) && upcomingIds.has(t.flightId));
              const overdue = open.filter((t) => t.dueAt && new Date(t.dueAt).getTime() < now);
              const assigned = flights.filter((f) => f.status !== "completed" && (f.cabinAttendantId === c.id || f.leadId === c.id || f.pilotIds.includes(c.id) || f.securityIds.includes(c.id)));
              return (
                <Card key={c.id} className="p-3.5" data-testid={`crew-${c.id}`}>
                  <div className="flex items-center gap-3">
                    <Avatar initials={c.initials} tone={c.role === "lead" ? "gold" : "navy"} size={42} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-ivory">{c.name}</div>
                      <div className="text-xs text-slate">{c.title}</div>
                    </div>
                    {c.employment === "contract" && <Badge tone="neutral">Contract</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3 text-xs">
                    <Badge tone={open.length ? "info" : "ok"} icon={<ListChecks className="size-3" />}>{open.length} open</Badge>
                    {overdue.length > 0 && <Badge tone="bad">{overdue.length} overdue</Badge>}
                    {assigned.map((f) => <Badge key={f.id} tone="neutral">{f.callsign}</Badge>)}
                  </div>
                  <div className="text-[0.6875rem] text-slate-500 mt-2">{ROLE_LABELS[c.role]} · {c.qualifications.slice(0, 2).join(" · ")}</div>
                </Card>
              );
            })}
          </div>
          <section>
            <SectionHeader eyebrow="Tracking" title="Briefing acknowledgements" />
            <div className="card p-0 divide-y divide-slate/10 overflow-hidden">
              {briefingAcks.map((t) => <TaskRow key={t.id} task={t} onOpen={(x) => setOpenTask(x.id)} showFlight={callsign(t.flightId)} />)}
            </div>
          </section>
          <section>
            <SectionHeader eyebrow="Tracking" title="Handovers" action={<Link href="/handovers" className="text-sm text-gold min-h-9 inline-flex items-center">All</Link>} />
            <div className="space-y-2">
              {handovers.slice(0, 3).map((h) => (
                <Link key={h.id} href={`/handovers/${h.id}`} className="card-quiet flex items-center gap-3 p-3 hover:border-gold/30">
                  <Handshake className="size-5 text-gold" />
                  <span className="flex-1 text-sm">{crew.find((c) => c.id === h.outgoingId)?.name} → {crew.find((c) => c.id === h.incomingId)?.name}<span className="block text-xs text-slate">{callsign(h.flightId)} · {fmtRelative(h.createdAt, now)}</span></span>
                  <Badge tone={h.status === "accepted" ? "ok" : "warn"}>{h.status === "accepted" ? "Accepted" : "Pending"}</Badge>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
      <TaskSheet taskId={openTask} onClose={() => setOpenTask(null)} />
    </div>
  );
}
