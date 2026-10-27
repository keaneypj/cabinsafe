"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Ban, BookOpen, Check, ChevronRight, Circle, CircleCheck, CircleDashed, CircleSlash, Clock, Cpu, FileSignature, Pencil, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { CATEGORY_LABELS } from "@/domain/checklists";
import { can } from "@/domain/permissions";
import type { Task, TaskStatus } from "@/domain/types";
import { cx, fmtDateTime, fmtRelative } from "@/lib/format";
import { useCrewName, useNow } from "@/store/hooks";
import { useMe, useStore } from "@/store/store";
import { Badge, Button, Field, Notice, Segmented, Sheet, report } from "./ui";

export const STATUS_META: Record<TaskStatus, { label: string; tone: "neutral" | "info" | "ok" | "bad" | "gold"; icon: typeof Circle; color: string }> = {
  not_started: { label: "Not Started", tone: "neutral", icon: Circle, color: "text-slate-400" },
  in_progress: { label: "In Progress", tone: "info", icon: CircleDashed, color: "text-info" },
  completed: { label: "Completed", tone: "ok", icon: CircleCheck, color: "text-ok" },
  blocked: { label: "Blocked", tone: "bad", icon: Ban, color: "text-bad" },
  not_applicable: { label: "Not Applicable", tone: "neutral", icon: CircleSlash, color: "text-slate-500" },
};

const SOURCE_LABEL: Record<Task["source"], string> = {
  checklist: "Checklist",
  passenger_rule: "Rule-generated",
  advisory: "From advisory",
  equipment: "Equipment",
  manual: "Manual",
  handover: "Handover",
};

export function PriorityBadge({ p }: { p: Task["priority"] }) {
  if (p === "normal") return null;
  return <Badge tone={p === "critical" ? "bad" : "warn"}>{p === "critical" ? "Critical" : "High"}</Badge>;
}

export function TaskRow({ task, onOpen, showFlight }: { task: Task; onOpen: (t: Task) => void; showFlight?: string }) {
  const now = useNow();
  const name = useCrewName();
  const meta = STATUS_META[task.status];
  const overdue = task.dueAt && (task.status === "not_started" || task.status === "in_progress" || task.status === "blocked") && new Date(task.dueAt).getTime() < now;
  return (
    <button onClick={() => onOpen(task)} className="w-full text-left flex items-start gap-3 px-3.5 py-3 min-h-14 hover:bg-navy-700/30 transition-colors" data-testid={`task-${task.id}`}>
      <meta.icon className={cx("size-5 shrink-0 mt-0.5", meta.color)} aria-label={meta.label} />
      <span className="flex-1 min-w-0">
        <span className={cx("block text-[0.875rem] leading-snug", task.status === "completed" || task.status === "not_applicable" ? "text-slate-400" : "text-ivory")}>{task.title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.6875rem] text-slate-400">
          <PriorityBadge p={task.priority} />
          {task.source === "passenger_rule" && (
            <Badge tone={task.reviewed ? "gold" : "warn"} icon={<Cpu className="size-3" />}>
              {task.reviewed ? "Rule · reviewed" : "Rule · review"}
            </Badge>
          )}
          {task.source === "advisory" && <Badge tone="info">Advisory</Badge>}
          {task.requiresSignOff && task.status === "completed" && (task.signOff ? <Badge tone="ok" icon={<FileSignature className="size-3" />}>Signed</Badge> : <Badge tone="warn">Sign-off</Badge>)}
          {showFlight && <span className="text-gold/80">{showFlight}</span>}
          <span className="flex items-center gap-1">
            <UserRound className="size-3" aria-hidden />
            {name(task.assigneeId)}
          </span>
          {task.dueAt && task.status !== "completed" && task.status !== "not_applicable" && (
            <span className={cx("flex items-center gap-1", overdue && "text-bad font-semibold")}>
              <Clock className="size-3" aria-hidden />
              {overdue ? `Overdue ${fmtRelative(task.dueAt, now).replace(" ago", "")}` : `Due ${fmtRelative(task.dueAt, now)}`}
            </span>
          )}
          {task.status === "blocked" && task.blockedReason && <span className="text-bad/90 basis-full">Blocked: {task.blockedReason}</span>}
          {task.status === "not_applicable" && task.naReason && <span className="basis-full">N/A: {task.naReason}</span>}
        </span>
      </span>
      <ChevronRight className="size-4 text-slate-500 shrink-0 mt-1" aria-hidden />
    </button>
  );
}

export function TaskSheet({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const task = useStore((s) => s.tasks.find((t) => t.id === taskId));
  const crew = useStore((s) => s.crew);
  const passengers = useStore((s) => s.passengers);
  const flight = useStore((s) => s.flights.find((f) => f.id === task?.flightId));
  const actions = useStore.getState();
  const me = useMe();
  const name = useCrewName();
  const [status, setStatus] = useState<TaskStatus>("not_started");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("normal");
  const [err, setErr] = useState<string | undefined>();

  useEffect(() => {
    if (!task) return;
    setStatus(task.status);
    setReason(task.status === "not_applicable" ? task.naReason ?? "" : task.status === "blocked" ? task.blockedReason ?? "" : "");
    setNote(task.notes ?? "");
    setTitle(task.title);
    setPriority(task.priority);
    setEditing(false);
    setErr(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  const canEdit = useMemo(() => !!task && (can(me.role, "task.update.any") || (can(me.role, "task.update.own") && task.assigneeId === me.id)), [task, me]);
  const passenger = passengers.find((p) => p.id === task?.passengerId);
  if (!task) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>;

  const needsReason = status === "not_applicable" || status === "blocked";
  const dirty = status !== task.status || (note.trim() || "") !== (task.notes ?? "") || (needsReason && reason !== (task.naReason ?? task.blockedReason ?? ""));

  const save = () => {
    if (needsReason && !reason.trim()) {
      setErr(status === "blocked" ? "Describe what is blocking this item." : "A reason is required for Not Applicable.");
      return;
    }
    setErr(undefined);
    const res = status !== task.status || needsReason ? actions.setTaskStatus(task.id, status, { reason: needsReason ? reason : undefined, note }) : actions.updateTask(task.id, { notes: note.trim() || undefined });
    if (report(res, status !== task.status ? `${STATUS_META[status].label}: ${task.title}` : "Notes saved")) {
      if (status === "completed" && task.requiresSignOff) return; // keep open for sign-off
      onClose();
    }
  };

  return (
    <Sheet
      open={!!taskId}
      onClose={onClose}
      title={task.title}
      subtitle={
        <span className="flex flex-wrap items-center gap-1.5 mt-1">
          <span className="text-gold">{flight?.callsign}</span>· {CATEGORY_LABELS[task.category]} · {task.phase === "postflight" ? "Postflight" : "Preflight"} · {SOURCE_LABEL[task.source]}
        </span>
      }
      footer={
        canEdit ? (
          <Button className="flex-1" onClick={save} disabled={!dirty} data-testid="task-save">
            <Check className="size-4" /> Save
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-wrap gap-1.5 mb-3">
        <PriorityBadge p={task.priority} />
        <Badge tone={STATUS_META[task.status].tone}>{STATUS_META[task.status].label}</Badge>
        {task.requiresSignOff && <Badge tone="gold">Sign-off required</Badge>}
        {task.coordinateWith?.map((c) => (
          <Badge key={c} tone="info">
            Coordinate: {c === "pilot" ? "Flight crew" : c === "security" ? "Security" : "Personal assistant"}
          </Badge>
        ))}
      </div>

      {task.detail && <p className="text-sm text-slate leading-relaxed whitespace-pre-line">{task.detail}</p>}

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3 text-xs">
        <div>
          <dt className="text-slate-500">Assignee</dt>
          <dd className="text-ivory">{name(task.assigneeId)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Due</dt>
          <dd className="text-ivory">{task.dueAt ? fmtDateTime(task.dueAt) : "—"}</dd>
        </div>
        {task.completedAt && (
          <div>
            <dt className="text-slate-500">Completed</dt>
            <dd className="text-ivory">
              {fmtDateTime(task.completedAt)} · {name(task.completedById)}
            </dd>
          </div>
        )}
        {task.signOff && (
          <div>
            <dt className="text-slate-500">Signed off</dt>
            <dd className="text-ok">
              {fmtDateTime(task.signOff.at)} · {name(task.signOff.byId)}
            </dd>
          </div>
        )}
        {passenger && (
          <div>
            <dt className="text-slate-500">Passenger</dt>
            <dd>
              <Link className="text-gold underline-offset-2 hover:underline" href={`/passengers/${passenger.id}?flight=${task.flightId}`}>
                {passenger.alias}
              </Link>
            </dd>
          </div>
        )}
        {task.documentRef && (
          <div>
            <dt className="text-slate-500">Reference</dt>
            <dd>
              <Link className="text-gold inline-flex items-center gap-1 underline-offset-2 hover:underline" href={`/documents/${task.documentRef}`}>
                <BookOpen className="size-3" /> {task.documentRef}
              </Link>
            </dd>
          </div>
        )}
        {task.source === "passenger_rule" && task.sourceRef && (
          <div className="col-span-2">
            <dt className="text-slate-500">Generated by rule</dt>
            <dd className="text-ivory">{task.sourceRef}</dd>
          </div>
        )}
      </dl>

      {/* Lead review of rule-generated tasks */}
      {task.source === "passenger_rule" && !task.reviewed && (
        <div className="mt-4 rounded-xl border border-warn/25 bg-warn-bg/40 p-3">
          <div className="text-xs text-warn flex items-center gap-1.5 font-semibold">
            <Sparkles className="size-3.5" /> Rule-generated — awaiting Lead CA review
          </div>
          {can(me.role, "task.review") ? (
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="secondary" onClick={() => report(actions.reviewTask(task.id), "Marked reviewed")} data-testid="task-review">
                <ShieldCheck className="size-4" /> Mark reviewed
              </Button>
              <Button size="sm" variant="quiet" onClick={() => setEditing(true)}>
                <Pencil className="size-4" /> Modify
              </Button>
            </div>
          ) : (
            <p className="text-xs text-slate mt-1">Only the Lead Cabin Attendant can review generated tasks.</p>
          )}
        </div>
      )}

      {!canEdit && (
        <Notice tone="neutral" className="mt-4">
          View only in your demo role. This item is assigned to {name(task.assigneeId)}.
        </Notice>
      )}

      {canEdit && (
        <div className="mt-5">
          <Field label="Status">
            <Segmented
              ariaLabel="Task status"
              value={status}
              onChange={(v) => {
                setStatus(v);
                setErr(undefined);
              }}
              options={(Object.keys(STATUS_META) as TaskStatus[]).map((s) => ({ value: s, label: STATUS_META[s].label }))}
            />
          </Field>
          {needsReason && (
            <Field label={status === "blocked" ? "What is blocking this item?" : "Reason not applicable"} error={err} htmlFor="task-reason">
              <input id="task-reason" className="field" value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={!!err} placeholder={status === "blocked" ? "e.g. awaiting caterer confirmation" : "e.g. no animal on this sector"} data-testid="task-reason" />
            </Field>
          )}
          <Field label="Notes (optional)" htmlFor="task-note">
            <textarea id="task-note" className="field min-h-20" value={note} onChange={(e) => setNote(e.target.value)} maxLength={600} placeholder="Add a note for the crew record" />
          </Field>
        </div>
      )}

      {task.status === "completed" && task.requiresSignOff && !task.signOff && (me.role === "lead" || (me.role === "contract_ca" && task.assigneeId === me.id)) && (
        <Button variant="secondary" className="w-full mb-3" onClick={() => report(actions.signOffTask(task.id), "Signed off")} data-testid="task-signoff">
          <FileSignature className="size-4" /> Sign off as {me.name}
        </Button>
      )}

      {can(me.role, "task.assign") && (
        <Field label="Assign to" htmlFor="task-assignee">
          <select id="task-assignee" className="field" value={task.assigneeId ?? ""} onChange={(e) => report(actions.assignTask(task.id, e.target.value), `Assigned to ${name(e.target.value)}`)} data-testid="task-assignee">
            {crew.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.title}
              </option>
            ))}
          </select>
        </Field>
      )}

      {editing && can(me.role, "task.update.any") && (
        <div className="rounded-xl p-3 mb-3">
          <Field label="Title" htmlFor="task-title">
            <input id="task-title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Priority">
            <Segmented ariaLabel="Priority" value={priority} onChange={setPriority} options={[{ value: "critical", label: "Critical" }, { value: "high", label: "High" }, { value: "normal", label: "Normal" }]} />
          </Field>
          <Button size="sm" variant="secondary" onClick={() => report(actions.updateTask(task.id, { title, priority }), "Task updated") && setEditing(false)}>
            Save changes
          </Button>
        </div>
      )}
      {!editing && can(me.role, "task.update.any") && task.source !== "passenger_rule" && (
        <button className="text-xs text-gold mb-3 inline-flex items-center gap-1 min-h-9" onClick={() => setEditing(true)}>
          <Pencil className="size-3.5" /> Edit title or priority
        </button>
      )}

      {task.history.length > 0 && (
        <div className="mt-2">
          <div className="eyebrow mb-2">History</div>
          <ol className="space-y-1.5 border-l hairline pl-3">
            {[...task.history].reverse().map((h, i) => (
              <li key={i} className="text-xs">
                <span className="text-ivory">{h.text}</span>
                <span className="text-slate-500"> · {name(h.byId)} · {fmtDateTime(h.at)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Sheet>
  );
}
