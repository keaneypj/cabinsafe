"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, type ReactNode } from "react";
import { Ban, Check, ChevronRight, CircleAlert, Clock, CloudLightning, OctagonAlert, Plus, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { TaskRow, TaskSheet } from "@/components/tasks";
import { Badge, Button, Chip, ConfirmDialog, EmptyState, Field, Notice, PageTitle, Ring, Segmented, Sheet, report } from "@/components/ui";
import { can, ROLE_LABELS } from "@/domain/permissions";
import { canSendInput, computePreboarding, isPreboardOwner, PREBOARD_CAVEAT, type AttentionItem } from "@/domain/preboarding";
import { isOpenTask } from "@/domain/readiness";
import type { CrewInput, CrewInputCategory, CrewMember, Flight, Task } from "@/domain/types";
import { cx, fmtAirportTime, fmtDateTime, fmtRelative } from "@/lib/format";
import { useCrewName, useFeaturedFlight, useFlightAdvisories, useNow, useUpcomingFlights } from "@/store/hooks";
import { useMe, useStore } from "@/store/store";

const CATEGORY_LABEL: Record<CrewInputCategory, string> = { instruction: "Instruction", passenger: "Passenger", timing: "Timing", catering: "Catering", safety: "Safety" };

const ATTENTION_META: Record<AttentionItem["kind"], { icon: typeof Ban; tone: string; label: string }> = {
  blocker: { icon: OctagonAlert, tone: "text-bad", label: "Critical blocker" },
  blocked: { icon: Ban, tone: "text-bad", label: "Blocked" },
  overdue: { icon: Clock, tone: "text-bad", label: "Overdue" },
  critical: { icon: CircleAlert, tone: "text-warn", label: "Critical item open" },
  equipment: { icon: Wrench, tone: "text-warn", label: "Equipment" },
  advisory: { icon: CloudLightning, tone: "text-warn", label: "Advisory" },
  review: { icon: Sparkles, tone: "text-warn", label: "Review" },
};

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
      <PageTitle title="Pre-Boarding" subtitle="The cabin attendant's preflight checklist before passengers board" />
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
  const [allAttention, setAllAttention] = useState(false);
  const [allPax, setAllPax] = useState(false);

  const v = useMemo(
    () => computePreboarding({ flight, tasks, equipment, discrepancies, advisories, acks, inputs, signoffs, nowMs: now }),
    [flight, tasks, equipment, discrepancies, advisories, acks, inputs, signoffs, now],
  );
  const owner = isPreboardOwner(me, flight);
  const canToggle = (t: Task) => can(me.role, "task.update.any") || t.assigneeId === me.id;
  const ringTone = v.signoff || v.progress.pct === 100 ? "ok" : v.readiness.blockers.length ? "bad" : "gold";
  const openChecks = v.checks.filter(isOpenTask).length;
  const passengerOpen = v.passengerItems.filter(isOpenTask);
  const passengerDone = v.passengerItems.length - passengerOpen.length;
  const othersDone = v.inputs.filter((i) => i.acks.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <section className="card p-4" data-testid="preboard-summary">
        <div className="flex items-center gap-4">
          <Ring value={v.progress.pct} tone={ringTone} size={76} stroke={7} label="Pre-boarding progress">
            <span className="text-[1.0625rem] font-semibold tnum leading-none" data-testid="preboard-pct">
              {v.progress.pct}%
            </span>
          </Ring>
          <div className="flex-1 min-w-0">
            <div className="text-[1.0625rem] font-semibold text-ivory leading-snug">
              {flight.callsign} · {flight.departure} → {flight.destination}
            </div>
            <div className="text-[0.9375rem] text-slate">
              Boarding {fmtAirportTime(v.boardingAt, flight.departure)} · {fmtRelative(v.boardingAt, now)}
            </div>
            <div className="text-[0.8125rem] text-slate-400 mt-0.5">Cabin attendant · {name(flight.cabinAttendantId)}</div>
          </div>
        </div>
        {v.signoff ? (
          <div className="mt-3.5 flex items-center gap-2.5 rounded-xl bg-ok-bg px-3 py-2.5 text-[0.875rem]" data-testid="preboard-signed">
            <ShieldCheck className="size-5 text-ok shrink-0" />
            <span>
              <span className="text-ivory font-semibold">Pre-boarding confirmed</span>
              <span className="block text-[0.75rem] text-slate">
                {name(v.signoff.byId)} · {fmtDateTime(v.signoff.at)}
                {v.signoff.openItemsAtSignoff ? ` · ${v.signoff.openItemsAtSignoff} other open item(s) noted` : ""}
              </span>
            </span>
          </div>
        ) : (
          <div className="mt-3.5 grid grid-cols-3 divide-x divide-[var(--separator)] rounded-xl bg-navy-700 py-2 text-center">
            <Stat value={openChecks} label="Everyday open" />
            <Stat value={v.pendingAcks.length} label="From others" />
            <Stat value={v.attention.length} label="Attention" warn />
          </div>
        )}
      </section>

      {!owner && (
        <Notice tone="neutral">
          Viewing as {me.name}. Items are completed and signed off by the flight&apos;s cabin attendant ({name(flight.cabinAttendantId)}) or the Lead Cabin Attendant.
          {canSendInput(me.role) && " You can add an item to the checklist below."}
        </Notice>
      )}

      {/* 1. Everyday checks — part of the preflight checklist */}
      <Group title="Everyday checks" count={`${v.checks.length - openChecks}/${v.checks.length}`} footer="Standard pre-boarding checks from the preflight checklist template, due 45 minutes before departure." testId="preboard-checks">
        <ul className="divide-y divide-[var(--separator)]">
          {v.checks.map((t) => {
            const done = !isOpenTask(t);
            const editable = canToggle(t);
            return (
              <li key={t.id} className="flex items-stretch">
                <CheckCircle
                  done={done}
                  pressed={done}
                  disabled={!editable || t.status === "not_applicable"}
                  onClick={() => report(store.setTaskStatus(t.id, done ? "not_started" : "completed"), done ? undefined : "Check complete")}
                  label={done ? `Mark not done: ${t.title}` : `Mark done: ${t.title}`}
                  testId={`pb-check-${t.id}`}
                />
                <button className="flex-1 flex items-center gap-2 text-left py-3 pr-3 min-h-14" onClick={() => setOpenTask(t.id)}>
                  <span className="flex-1 min-w-0">
                    <span className={cx("block text-[0.9375rem] leading-snug", done ? "text-slate-400" : "text-ivory")}>{t.title}</span>
                    {(t.priority === "critical" || t.status === "blocked" || (done && t.completedAt)) && (
                      <span className="flex flex-wrap gap-1.5 mt-1 items-center text-[0.75rem] text-slate-500">
                        {t.priority === "critical" && !done && <Badge tone="bad">Critical</Badge>}
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
      </Group>

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

      {/* 3. Outstanding items */}
      <Group title="Needs attention" count={String(v.attention.length)} testId="attention" footer={v.attention.length ? "Open items elsewhere in the preparation that affect boarding." : undefined}>
        {v.attention.length === 0 ? (
          <p className="p-4 text-[0.9375rem] text-slate-400 flex items-center gap-2">
            <Check className="size-4 text-ok" /> No blockers, blocked, overdue or critical items.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--separator)]">
            {(allAttention ? v.attention : v.attention.slice(0, 5)).map((a, idx) => {
              const M = ATTENTION_META[a.kind];
              const content = (
                <>
                  <M.icon className={cx("size-5 shrink-0", M.tone)} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[0.9375rem] text-ivory leading-snug">{a.label}</span>
                    <span className="block text-[0.75rem] text-slate-400">
                      {M.label}
                      {a.detail ? ` · ${a.detail}` : ""}
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-slate-500/70 shrink-0" />
                </>
              );
              const cls = "w-full flex items-center gap-3 px-4 py-3 min-h-13 text-left active:bg-navy-700";
              return (
                <li key={a.kind + a.label + idx}>
                  {a.taskId ? (
                    <button className={cls} onClick={() => setOpenTask(a.taskId!)}>
                      {content}
                    </button>
                  ) : (
                    <Link href={a.href} className={cls}>
                      {content}
                    </Link>
                  )}
                </li>
              );
            })}
            {v.attention.length > 5 && (
              <li>
                <button className="w-full px-4 py-3 text-left text-[0.9375rem] text-gold min-h-12" onClick={() => setAllAttention((x) => !x)}>
                  {allAttention ? "Show fewer" : `Show all ${v.attention.length}`}
                </button>
              </li>
            )}
          </ul>
        )}
      </Group>

      {/* 4. Passenger-specific */}
      <Group title="Passenger-specific" count={`${passengerDone}/${v.passengerItems.length}`} testId="preboard-passengers" footer="Generated from documented passenger accommodations.">
        {v.passengerItems.length === 0 ? (
          <p className="p-4 text-[0.9375rem] text-slate-400">No passenger-specific preparation.</p>
        ) : (
          <div className="divide-y divide-[var(--separator)]">
            {(allPax ? [...passengerOpen, ...v.passengerItems.filter((t) => !isOpenTask(t))] : passengerOpen.slice(0, 4)).map((t) => (
              <TaskRow key={t.id} task={t} onOpen={(x) => setOpenTask(x.id)} />
            ))}
            {passengerOpen.length === 0 && !allPax && (
              <p className="p-4 text-[0.9375rem] text-ok flex items-center gap-2">
                <Check className="size-4" /> All passenger-specific preparation complete.
              </p>
            )}
            {v.passengerItems.length > Math.min(4, passengerOpen.length) && (
              <button className="w-full px-4 py-3 text-left text-[0.9375rem] text-gold min-h-12" onClick={() => setAllPax((x) => !x)}>
                {allPax ? "Show open items only" : `Show all ${v.passengerItems.length}`}
              </button>
            )}
          </div>
        )}
      </Group>

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

function Stat({ value, label, warn }: { value: number; label: string; warn?: boolean }) {
  return (
    <div className="px-1">
      <div className={cx("text-[1.25rem] font-semibold tnum leading-tight", value === 0 ? "text-ok" : warn ? "text-warn" : "text-ivory")}>{value}</div>
      <div className="text-[0.6875rem] text-slate-400">{label}</div>
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
