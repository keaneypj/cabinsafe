"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, type ReactNode } from "react";
import { Check, ChevronRight, CircleAlert, Plus, ShieldCheck } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { TaskSheet } from "@/components/tasks";
import { Badge, Button, Chip, ConfirmDialog, EmptyState, Field, Notice, PageTitle, Segmented, Sheet, report } from "@/components/ui";
import { PREBOARD_SECTIONS, preboardSectionOf } from "@/domain/checklists";
import { can, ROLE_LABELS } from "@/domain/permissions";
import { canSendInput, computePreboarding, isPreboardOwner, PREBOARD_CAVEAT } from "@/domain/preboarding";
import { isOpenTask } from "@/domain/readiness";
import type { CrewInput, CrewInputCategory, CrewMember, Flight, Task } from "@/domain/types";
import { airport } from "@/data/airports";
import { cx, fmtAirportTime, fmtDate, fmtDateTime, fmtRelative } from "@/lib/format";
import { useCrewName, useFeaturedFlight, useFlightAdvisories, useNow, useUpcomingFlights } from "@/store/hooks";
import { useMe, useStore } from "@/store/store";

const CATEGORY_LABEL: Record<CrewInputCategory, string> = { instruction: "Instruction", passenger: "Passenger", timing: "Timing", catering: "Catering", safety: "Safety" };

export default function PreboardPage() {
  return (
    <Suspense>
      <Preboard />
    </Suspense>
  );
}

function Preboard() {
  const sp = useSearchParams();
  const router = useRouter();
  const now = useNow();
  const me = useMe();
  const upcoming = useUpcomingFlights();
  const featured = useFeaturedFlight();
  // A cabin attendant lands on their own next flight by default.
  const mine = upcoming.find((f) => f.cabinAttendantId === me.id);
  const flight = upcoming.find((f) => f.id === sp.get("flight")) ?? (me.role === "contract_ca" ? mine : undefined) ?? featured;

  if (!flight) return <EmptyState title="No upcoming flights">The pre-boarding checklist appears for upcoming flights.</EmptyState>;
  return (
    <div>
      <PageTitle title="Pre-Boarding" subtitle="Everything to do before the passengers arrive" />
      {upcoming.length > 1 && (
        <div className="scroll-x -mx-4 px-4 mb-4">
          <div className="flex gap-2 w-max">
            {upcoming.map((f) => (
              <Chip key={f.id} active={f.id === flight.id} onClick={() => router.replace(`/preboard?flight=${f.id}`, { scroll: false })}>
                {f.callsign} · {f.departure}–{f.destination}
              </Chip>
            ))}
          </div>
        </div>
      )}
      <PreboardBody flight={flight} now={now} />
    </div>
  );
}

/** iOS inset-grouped section: small header, rounded list, optional footer. */
function Group({ title, count, action, footer, children, testId }: { title: string; count?: string; action?: ReactNode; footer?: ReactNode; children: ReactNode; testId?: string }) {
  return (
    <section data-testid={testId}>
      <div className="flex items-end justify-between px-4 mb-1.5">
        <h2 className="eyebrow">
          {title}
          {count && <span className="ml-1.5 tnum normal-case text-slate-500">{count}</span>}
        </h2>
        {action}
      </div>
      <div className="card overflow-hidden">{children}</div>
      {footer && <p className="px-4 mt-1.5 text-[0.75rem] leading-snug text-slate-500">{footer}</p>}
    </section>
  );
}

function CheckCircle({ done, disabled, onClick, label, testId, pressed }: { done: boolean; disabled?: boolean; onClick: () => void; label: string; testId?: string; pressed: boolean }) {
  return (
    <button className={cx("grid w-14 shrink-0 place-items-center self-stretch", disabled && "opacity-40")} disabled={disabled} onClick={onClick} aria-label={label} aria-pressed={pressed} data-testid={testId}>
      <span className={cx("grid size-[1.625rem] place-items-center rounded-full border-[1.5px] transition-colors", done ? "bg-ok border-ok text-navy" : "border-slate-500/60")}>{done && <Check className="size-4" strokeWidth={3} />}</span>
    </button>
  );
}

/** Tappable checklist rows: circle to tick, row to open details. */
function CheckList({ tasks, canToggle, onOpen, now }: { tasks: Task[]; canToggle: (t: Task) => boolean; onOpen: (id: string) => void; now: number }) {
  const name = useCrewName();
  const store = useStore.getState();
  return (
    <ul className="divide-y divide-[var(--separator)]">
      {tasks.map((t) => {
        const done = !isOpenTask(t);
        return (
          <li key={t.id} className="flex items-stretch">
            <CheckCircle
              done={done}
              pressed={done}
              disabled={!canToggle(t) || t.status === "not_applicable"}
              onClick={() => report(store.setTaskStatus(t.id, done ? "not_started" : "completed"), done ? undefined : "Check complete")}
              label={done ? `Mark not done: ${t.title}` : `Mark done: ${t.title}`}
              testId={`pb-check-${t.id}`}
            />
            <button className="flex-1 flex items-center gap-2 text-left py-3 pr-3 min-h-14" onClick={() => onOpen(t.id)}>
              <span className="flex-1 min-w-0">
                <span className={cx("block text-[0.9375rem] leading-snug", done ? "text-slate-400" : "text-ivory")}>{t.title}</span>
                {(t.status === "blocked" || (done && t.completedAt)) && (
                  <span className="flex flex-wrap gap-1.5 mt-1 items-center text-[0.75rem] text-slate-500">
                    {t.status === "blocked" && <Badge tone="bad">Blocked</Badge>}
                    {done && t.completedAt && (
                      <span>
                        {name(t.completedById)} · {fmtRelative(t.completedAt, now)}
                      </span>
                    )}
                  </span>
                )}
              </span>
              <ChevronRight className="size-4 text-slate-500/70 shrink-0" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function PreboardBody({ flight, now }: { flight: Flight; now: number }) {
  const me = useMe();
  const name = useCrewName();
  const store = useStore.getState();
  const tasks = useStore((s) => s.tasks);
  const equipment = useStore((s) => s.equipment);
  const discrepancies = useStore((s) => s.discrepancies);
  const acks = useStore((s) => s.acks);
  const inputs = useStore((s) => s.crewInputs);
  const signoffs = useStore((s) => s.preboardSignoffs);
  const crew = useStore(useShallow((s) => s.crew));
  const advisories = useFlightAdvisories(flight.id);
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [note, setNote] = useState("");

  const v = useMemo(
    () => computePreboarding({ flight, tasks, equipment, discrepancies, advisories, acks, inputs, signoffs, nowMs: now }),
    [flight, tasks, equipment, discrepancies, advisories, acks, inputs, signoffs, now],
  );
  const owner = isPreboardOwner(me, flight);
  const canToggle = (t: Task) => can(me.role, "task.update.any") || t.assigneeId === me.id;
  const openChecks = v.checks.filter(isOpenTask).length;
  const othersDone = v.inputs.filter((i) => i.acks.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Summary — the same count as the Home card */}
      <section className="card p-4" data-testid="preboard-summary">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[1.0625rem] font-semibold text-ivory leading-snug">
              {flight.departure} → {flight.destination}
            </div>
            <div className="text-[0.875rem] text-slate">
              Takeoff {fmtDate(flight.departAt, airport(flight.departure)?.tz)} · {fmtAirportTime(flight.departAt, flight.departure)}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={cx("text-[2rem] font-bold leading-none tnum", v.signoff || openChecks === 0 ? "text-ok" : "text-ivory")} data-testid="preboard-count">
              {v.checks.length - openChecks}/{v.checks.length}
            </div>
            <div className="text-[0.75rem] text-slate-400">done</div>
          </div>
        </div>
        {/* Overall progress, including items added by others, for the sign-off check */}
        <span className="sr-only" data-testid="preboard-pct">{v.progress.pct}%</span>
        {v.signoff && (
          <div className="mt-3.5 flex items-center gap-2.5 rounded-xl bg-ok-bg px-3 py-2.5 text-[0.875rem]" data-testid="preboard-signed">
            <ShieldCheck className="size-5 text-ok shrink-0" />
            <span>
              <span className="text-ivory font-semibold">Pre-boarding confirmed</span>
              <span className="block text-[0.75rem] text-slate">
                {name(v.signoff.byId)} · {fmtDateTime(v.signoff.at)}
              </span>
            </span>
          </div>
        )}
      </section>

      {!owner && (
        <Notice tone="neutral">
          Viewing as {me.name}. Items are completed and signed off by the flight&apos;s cabin attendant ({name(flight.cabinAttendantId)}) or the Lead Cabin Attendant.
          {canSendInput(me.role) && " You can add an item to the checklist below."}
        </Notice>
      )}

      {/* 1. Pre-boarding checklist, one group per section */}
      <div className="space-y-5" data-testid="preboard-checks">
        {PREBOARD_SECTIONS.map((sec) => {
          const items = v.checks.filter((t) => preboardSectionOf(t.sourceRef) === sec.id);
          if (!items.length) return null;
          return (
            <Group key={sec.id} title={sec.title} count={`${items.filter((t) => !isOpenTask(t)).length}/${items.length}`} testId={`preboard-section-${sec.id}`}>
              <CheckList tasks={items} canToggle={canToggle} onOpen={setOpenTask} now={now} />
            </Group>
          );
        })}
        {/* Pre-boarding items from older saved data or added outside the sections */}
        {(() => {
          const loose = v.checks.filter((t) => !preboardSectionOf(t.sourceRef));
          return loose.length ? (
            <Group title="Other checks" count={`${loose.filter((t) => !isOpenTask(t)).length}/${loose.length}`}>
              <CheckList tasks={loose} canToggle={canToggle} onOpen={setOpenTask} now={now} />
            </Group>
          ) : null;
        })()}
      </div>

      {/* 2. Added by others */}
      <Group
        title="Added by others"
        count={v.inputs.length ? `${othersDone}/${v.inputs.length}` : undefined}
        testId="crew-inputs"
        action={
          canSendInput(me.role) ? (
            <button onClick={() => setComposing(true)} className="inline-flex items-center gap-1 text-[0.9375rem] font-medium text-gold min-h-8" data-testid="input-compose">
              <Plus className="size-4" /> Add item
            </button>
          ) : undefined
        }
        footer="Specific items from the Lead Cabin Attendant, the flight crew or the Principal's PA."
      >
        {v.inputs.length === 0 ? (
          <p className="p-4 text-[0.9375rem] text-slate-400">Nothing added for this flight.</p>
        ) : (
          <ul className="divide-y divide-[var(--separator)]">
            {v.inputs.map((i) => (
              <OtherItem key={i.id} input={i} owner={owner} name={name} sender={crew.find((c) => c.id === i.fromId)} onDone={() => report(store.acknowledgeCrewInput(i.id), "Item complete")} now={now} />
            ))}
          </ul>
        )}
      </Group>

      {/* Off-boarding — after the passengers leave; separate from pre-boarding sign-off */}
      {v.offboard.length > 0 && (
        <Group title="Off-Boarding Checklist" count={`${v.offboard.filter((t) => !isOpenTask(t)).length}/${v.offboard.length}`} testId="offboard-checks" footer="After the passengers leave.">
          <CheckList tasks={v.offboard} canToggle={canToggle} onOpen={setOpenTask} now={now} />
        </Group>
      )}

      {/* 5. Sign-off */}
      {!v.signoff && (
        <section data-testid="preboard-signoff">
          {v.signoffBlockers.length > 0 && (
            <ul className="mb-3 px-1 space-y-1">
              {v.signoffBlockers.map((b) => (
                <li key={b} className="flex items-center gap-2 text-[0.875rem] text-slate">
                  <CircleAlert className="size-4 shrink-0 text-warn" /> {b}
                </li>
              ))}
            </ul>
          )}
          {owner ? (
            <Button className="w-full" size="lg" disabled={!v.canSignOff} onClick={() => setConfirm(true)} data-testid="preboard-confirm">
              Confirm Pre-Boarding Complete
            </Button>
          ) : (
            <p className="text-[0.8125rem] text-slate-500 px-1">Only the cabin attendant or Lead CA can confirm.</p>
          )}
          <p className="text-[0.75rem] text-slate-500 mt-2 px-1 text-center">{PREBOARD_CAVEAT}</p>
        </section>
      )}

      <ConfirmDialog
        open={confirm}
        title={`Confirm pre-boarding for ${flight.callsign}?`}
        body={
          <>
            <p>
              This is time-stamped in the audit history and reported to the Lead CA. {PREBOARD_CAVEAT}
            </p>
            <label htmlFor="pb-note" className="block text-[0.8125rem] font-medium text-slate-400 mt-3 mb-1">
              Note for the Lead CA (optional)
            </label>
            <input id="pb-note" className="field" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
          </>
        }
        confirmLabel="Confirm and sign"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          report(store.signOffPreboarding(flight.id, note), "Pre-boarding confirmed");
        }}
      />
      <AddItemSheet flight={flight} open={composing} onClose={() => setComposing(false)} />
      <TaskSheet taskId={openTask} onClose={() => setOpenTask(null)} />
    </div>
  );
}

function OtherItem({ input, owner, name, sender, onDone, now }: { input: CrewInput; owner: boolean; name: (id?: string) => string; sender?: CrewMember; onDone: () => void; now: number }) {
  const done = input.acks.length > 0;
  return (
    <li className="flex items-stretch" data-testid={`input-${input.id}`}>
      <CheckCircle done={done} pressed={done} disabled={!owner || done} onClick={onDone} label={done ? "Completed" : `Mark done: ${input.text}`} testId={done ? undefined : `ack-input-${input.id}`} />
      <div className="flex-1 min-w-0 py-3 pr-4">
        <p className={cx("text-[0.9375rem] leading-snug", done ? "text-slate-400" : "text-ivory")}>{input.text}</p>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-1.5 text-[0.75rem] text-slate-400">
          {input.priority !== "normal" && !done && <Badge tone={input.priority === "critical" ? "bad" : "warn"}>{input.priority === "critical" ? "Critical" : "Important"}</Badge>}
          <span>
            {sender?.name ?? name(input.fromId)} · {ROLE_LABELS[input.fromRole]} · {CATEGORY_LABEL[input.category]} · {fmtRelative(input.createdAt, now)}
          </span>
          {done && (
            <span className="text-ok basis-full">
              Done by {name(input.acks[0].byId)} · {fmtRelative(input.acks[0].at, now)}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function AddItemSheet({ flight, open, onClose }: { flight: Flight; open: boolean; onClose: () => void }) {
  const add = useStore((s) => s.addCrewInput);
  const me = useMe();
  const [text, setText] = useState("");
  const [category, setCategory] = useState<CrewInputCategory>("instruction");
  const [priority, setPriority] = useState<CrewInput["priority"]>("important");
  const [err, setErr] = useState<string>();
  const submit = () => {
    const res = add({ flightId: flight.id, text, category, priority, requiresAck: true });
    if (!res.ok) return setErr(res.error);
    report(res, "Added to the pre-boarding checklist");
    setText("");
    setErr(undefined);
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add Checklist Item"
      subtitle={`${flight.callsign} · from ${me.name}, ${ROLE_LABELS[me.role]}`}
      footer={
        <Button className="flex-1" size="lg" onClick={submit} data-testid="input-send">
          Add to Checklist
        </Button>
      }
    >
      <Field label="Item" error={err} hint="Operational detail only — no medical diagnoses or real names." htmlFor="inp-text">
        <textarea id="inp-text" className="field min-h-28" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} aria-invalid={!!err} placeholder="e.g. Principal will board from the car at the airstair; welcome service in Zone 1." data-testid="input-text" />
      </Field>
      <Field label="Category">
        <Segmented ariaLabel="Category" value={category} onChange={setCategory} options={(Object.keys(CATEGORY_LABEL) as CrewInputCategory[]).map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))} />
      </Field>
      <Field label="Priority">
        <Segmented ariaLabel="Priority" value={priority} onChange={setPriority} options={[{ value: "critical", label: "Critical" }, { value: "important", label: "Important" }, { value: "normal", label: "Normal" }]} />
      </Field>
      <p className="text-[0.75rem] text-slate-500">The cabin attendant must complete this item before confirming pre-boarding.</p>
    </Sheet>
  );
}
