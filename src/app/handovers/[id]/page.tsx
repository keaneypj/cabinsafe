"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check, CircleCheck, History, Repeat, ShieldCheck, UserCheck } from "lucide-react";
import { STATUS_META, TaskSheet } from "@/components/tasks";
import { Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, Notice, SectionHeader, report, toast } from "@/components/ui";
import { can } from "@/domain/permissions";
import { isOpenTask } from "@/domain/readiness";
import { cx, fmtDateTime, fmtRelative } from "@/lib/format";
import { useCrewName, useNow } from "@/store/hooks";
import { useMe, useStore } from "@/store/store";

export default function HandoverPage() {
  const { id } = useParams<{ id: string }>();
  const h = useStore((s) => s.handovers.find((x) => x.id === id));
  const flight = useStore((s) => s.flights.find((f) => f.id === h?.flightId));
  const tasks = useStore((s) => s.tasks);
  const crew = useStore((s) => s.crew);
  const audit = useStore((s) => s.audit);
  const demoActive = useStore((s) => s.demo.active);
  const store = useStore.getState();
  const me = useMe();
  const name = useCrewName();
  const now = useNow();
  const [assignId, setAssignId] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [openTask, setOpenTask] = useState<string | null>(null);

  if (!h || !flight) return <EmptyState title="Handover not found">It may have been removed by a demo reset.</EmptyState>;

  const outgoing = crew.find((c) => c.id === h.outgoingId)!;
  const incoming = crew.find((c) => c.id === h.incomingId)!;
  const isIncoming = me.id === h.incomingId;
  const items = h.openTaskIds.map((tid) => tasks.find((t) => t.id === tid)).filter((t) => !!t);
  const assignable = tasks.filter((t) => t.flightId === flight.id && isOpenTask(t) && t.assigneeId !== incoming.id && t.phase === "preflight");
  const acked = h.acknowledgements.filter((a) => a.ackedAt).length;
  const events = audit.filter((e) => e.entityId === h.id || (e.flightId === flight.id && (e.action === "task.assign" || e.action.startsWith("handover")))).slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="animate-fade-up">
        <div className="eyebrow">Crew handover · {flight.callsign} {flight.departure}–{flight.destination}</div>
        <div className="flex items-center gap-3 mt-3">
          <div className="flex flex-col items-center gap-1 w-24 text-center">
            <Avatar initials={outgoing.initials} size={46} />
            <span className="text-xs text-ivory leading-tight">{outgoing.name}</span>
            <span className="text-[0.625rem] text-slate-500">Outgoing</span>
          </div>
          <div className="flex-1 flex items-center">
            <span className="h-px flex-1 bg-gold/40" />
            <ArrowRight className="size-5 text-gold" />
          </div>
          <div className="flex flex-col items-center gap-1 w-24 text-center">
            <Avatar initials={incoming.initials} size={46} tone="gold" />
            <span className="text-xs text-ivory leading-tight">{incoming.name}</span>
            <span className="text-[0.625rem] text-slate-500">Incoming</span>
          </div>
        </div>
        <div className="flex justify-center mt-3">
          {h.status === "accepted" ? (
            <Badge tone="ok" icon={<CircleCheck className="size-3" />}>
              Accepted {fmtDateTime(h.acceptedAt)} by {name(h.acceptedById)}
            </Badge>
          ) : (
            <Badge tone="warn">Awaiting acceptance · submitted {fmtRelative(h.createdAt, now)}</Badge>
          )}
        </div>
      </div>

      {/* Lead CA coordination panel */}
      {h.status !== "accepted" && can(me.role, "task.assign") && (
        <Card className="border-gold/25" data-testid="lead-panel">
          <SectionHeader eyebrow="Lead Cabin Attendant" title={`Assign an item to ${incoming.name.split(" ")[0]}`} />
          <div className="flex gap-2">
            <label htmlFor="assign-task" className="sr-only">Open item to assign</label>
            <select id="assign-task" className="field flex-1 min-w-0" value={assignId} onChange={(e) => setAssignId(e.target.value)} data-testid="assign-task-select">
              <option value="">Select an open item…</option>
              {assignable.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.priority === "critical" ? "● " : ""}{t.title}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              disabled={!assignId}
              onClick={() => {
                if (report(store.assignTask(assignId, incoming.id), `Assigned to ${incoming.name} — now in their queue`)) {
                  if (!h.openTaskIds.includes(assignId)) useStore.setState((s) => ({ handovers: s.handovers.map((x) => (x.id === h.id ? { ...x, openTaskIds: [...x.openTaskIds, assignId] } : x)) }));
                  setAssignId("");
                  if (demoActive) store.demoMark("assign");
                }
              }}
              data-testid="assign-task-btn"
            >
              Assign
            </Button>
          </div>
          <Button
            variant="primary"
            className="w-full mt-3"
            onClick={() => {
              store.setCurrentUser(incoming.id);
              if (demoActive) store.demoMark("switch");
              toast.info(`Demo Role Preview: now viewing as ${incoming.name}`);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            data-testid="switch-to-incoming"
          >
            <Repeat className="size-4" /> Switch to {incoming.name}&apos;s demo view
          </Button>
          <p className="text-[0.625rem] text-slate-500 mt-2">Demo Role Preview only — not authentication.</p>
        </Card>
      )}

      {isIncoming && h.status !== "accepted" && (
        <Notice tone="gold">
          You are previewing as <strong>{incoming.name}</strong>. Review each section, acknowledge the required items, then accept the handover.
        </Notice>
      )}

      <Card>
        <SectionHeader eyebrow="Transfers ownership, not resolution" title={`Open safety items (${items.length})`} />
        <ul className="divide-y divide-[var(--separator)] -mx-1">
          {items.map((t) => {
            const M = STATUS_META[t!.status];
            return (
              <li key={t!.id}>
                <button className="w-full flex items-start gap-2.5 px-1 py-2.5 text-left min-h-11" onClick={() => setOpenTask(t!.id)}>
                  <M.icon className={cx("size-4.5 mt-0.5 shrink-0", M.color)} />
                  <span className="flex-1 text-sm text-ivory">
                    {t!.title}
                    <span className="block text-xs text-slate">
                      {M.label} · {name(t!.assigneeId)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <SectionHeader title="Equipment status" />
        <p className="text-sm text-slate leading-relaxed">{h.equipmentSummary}</p>
        <Link href="/cabin" className="text-xs text-gold inline-flex items-center gap-1 mt-2 min-h-8">
          Open cabin map <ArrowRight className="size-3" />
        </Link>
      </Card>

      <Card>
        <SectionHeader title="Passenger accommodations" eyebrow="Operational summary" />
        <p className="text-sm text-slate leading-relaxed whitespace-pre-line">{h.accommodationSummary}</p>
      </Card>

      {h.notes && (
        <Card>
          <SectionHeader title="Handover notes" eyebrow={`From ${outgoing.name}`} />
          <p className="text-sm text-slate leading-relaxed">{h.notes}</p>
        </Card>
      )}

      <Card data-testid="acknowledgements">
        <SectionHeader title="Required acknowledgements" action={<span className="text-xs tnum text-slate">{acked}/{h.acknowledgements.length}</span>} />
        <ul className="space-y-2">
          {h.acknowledgements.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => report(store.acknowledgeHandoverItem(h.id, a.id))}
                disabled={h.status === "accepted"}
                className={cx("w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left min-h-12 transition-colors", a.ackedAt ? "border-ok/30 bg-ok-bg/40" : " bg-navy-700", !isIncoming && "opacity-80")}
                aria-pressed={!!a.ackedAt}
                data-testid={`ack-${a.id}`}
              >
                <span className={cx("grid size-6 place-items-center rounded-md border shrink-0", a.ackedAt ? "bg-ok border-ok text-midnight" : "border-slate/40")}>{a.ackedAt && <Check className="size-4" />}</span>
                <span className="flex-1 text-sm text-ivory">
                  {a.label}
                  {a.ackedAt && <span className="block text-[0.6875rem] text-slate">{fmtDateTime(a.ackedAt)}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {!isIncoming && h.status !== "accepted" && <p className="text-xs text-slate-500 mt-2">Only {incoming.name} can acknowledge — use Demo Role Preview to switch.</p>}
        {h.status !== "accepted" && isIncoming && (
          <Button className="w-full mt-3" size="lg" disabled={acked < h.acknowledgements.length} onClick={() => setConfirm(true)} data-testid="accept-handover">
            <UserCheck className="size-5" /> Accept handover
          </Button>
        )}
        {h.status === "accepted" && (
          <div className="mt-3 rounded-xl bg-ok-bg/50 border border-ok/30 p-3 text-sm text-ivory flex items-center gap-2" data-testid="handover-accepted">
            <ShieldCheck className="size-5 text-ok" /> Accepted {fmtDateTime(h.acceptedAt)} — recorded in audit history.
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader title="Audit trail" eyebrow="This handover" action={<Link href="/audit" className="text-xs text-gold min-h-8 inline-flex items-center gap-1"><History className="size-3.5" /> All</Link>} />
        <ol className="space-y-2 border-l hairline pl-3" data-testid="handover-audit">
          {events.map((e) => (
            <li key={e.id} className="text-xs">
              <span className="text-ivory">{e.summary}</span>
              <span className="block text-slate-500">{name(e.actorId)} · {fmtDateTime(e.at)}</span>
            </li>
          ))}
        </ol>
      </Card>

      <ConfirmDialog
        open={confirm}
        title="Accept handover?"
        body={<>You are accepting responsibility for {items.length} open item(s) on {flight.callsign}. Acceptance is time-stamped in the audit history. Open items remain open until resolved (CSI-HND-005 §3).</>}
        confirmLabel="Accept and sign"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          report(store.acceptHandover(h.id), "Handover accepted · audit event recorded");
        }}
      />
      <TaskSheet taskId={openTask} onClose={() => setOpenTask(null)} />
    </div>
  );
}
