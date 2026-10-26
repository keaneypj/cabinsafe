"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { ArrowRight, Ban, Check, CircleAlert, ClipboardCheck, Clock, CloudLightning, MessageSquarePlus, OctagonAlert, Send, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { RouteLine } from "@/components/flight";
import { TaskRow, TaskSheet } from "@/components/tasks";
import { Avatar, Badge, Button, Card, Chip, ConfirmDialog, EmptyState, Field, Notice, PageTitle, Ring, SectionHeader, Segmented, Sheet, report } from "@/components/ui";
import { can, ROLE_LABELS } from "@/domain/permissions";
import { canSendInput, computePreboarding, isPreboardOwner, PREBOARD_CAVEAT, type AttentionItem } from "@/domain/preboarding";
import { isOpenTask } from "@/domain/readiness";
import type { CrewInput, CrewInputCategory, Flight, Task } from "@/domain/types";
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
      <PageTitle eyebrow="Cabin Attendant" title="Pre-Boarding" subtitle="Everything to clear before the first passenger steps aboard" />
      <div className="scroll-x -mx-4 px-4 mb-4">
        <div className="flex gap-1.5 w-max">
          {upcoming.map((f) => (
            <Chip key={f.id} active={f.id === flight.id} onClick={() => router.replace(`/preboard?flight=${f.id}`, { scroll: false })}>
              {f.callsign} · {f.departure}–{f.destination}
            </Chip>
          ))}
        </div>
      </div>
      <PreboardBody flight={flight} now={now} />
    </div>
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
  const ringTone = v.signoff ? "ok" : v.progress.pct === 100 ? "ok" : v.readiness.blockers.length ? "bad" : "warn";
  const passengerOpen = v.passengerItems.filter(isOpenTask);
  const passengerDone = v.passengerItems.length - passengerOpen.length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <Card className="p-0 overflow-hidden" data-testid="preboard-summary">
        <div className="p-4 bg-gradient-to-b from-navy-600/30 to-transparent">
          <div className="flex items-center gap-4">
            <Ring value={v.progress.pct} tone={ringTone} size={92} stroke={8} label="Pre-boarding progress">
              <span className="text-xl font-semibold tnum leading-none" data-testid="preboard-pct">
                {v.progress.pct}%
              </span>
              <span className="text-[0.5rem] tracking-[0.14em] uppercase text-slate mt-1">Ready</span>
            </Ring>
            <div className="flex-1 min-w-0">
              <div className="text-gold font-semibold tracking-wider text-sm">{flight.callsign}</div>
              <div className="text-ivory text-[0.9375rem] leading-snug">
                Boarding {fmtAirportTime(v.boardingAt, flight.departure)} <span className="text-slate">· {fmtRelative(v.boardingAt, now)}</span>
              </div>
              <div className="text-xs text-slate mt-1">
                Cabin attendant · <span className="text-ivory">{name(flight.cabinAttendantId)}</span>
              </div>
              <div className="text-xs text-slate">
                {v.progress.done}/{v.progress.total} checks and acknowledgements
              </div>
            </div>
          </div>
          <div className="mt-3">
            <RouteLine flight={flight} />
          </div>
        </div>
        {v.signoff ? (
          <div className="flex items-start gap-2.5 border-t hairline bg-ok-bg/50 px-4 py-3 text-sm" data-testid="preboard-signed">
            <ShieldCheck className="size-5 text-ok shrink-0" />
            <span>
              <span className="text-ivory font-semibold">Pre-boarding confirmed</span>
              <span className="block text-xs text-slate">
                {name(v.signoff.byId)} · {fmtDateTime(v.signoff.at)}
                {v.signoff.openItemsAtSignoff ? ` · ${v.signoff.openItemsAtSignoff} other open item(s) noted` : ""}
              </span>
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-3 border-t hairline text-center">
            <Stat value={v.pendingAcks.length} label="Inputs to acknowledge" bad={v.pendingAcks.length > 0} />
            <Stat value={v.attention.length} label="Need attention" bad={v.attention.length > 0} />
            <Stat value={v.checks.filter(isOpenTask).length} label="Checks open" bad={v.checks.some(isOpenTask)} />
          </div>
        )}
      </Card>

      {!owner && (
        <Notice tone="neutral">
          Viewing as {me.name}. Acknowledgements and sign-off are made by the flight&apos;s cabin attendant ({name(flight.cabinAttendantId)}) or the Lead Cabin Attendant.
          {canSendInput(me.role) && " You can send the cabin attendant a pre-boarding input below."}
        </Notice>
      )}

      {/* 1. Crew inputs */}
      <section data-testid="crew-inputs">
        <SectionHeader
          eyebrow="From Lead CA · Flight crew · Principal's PA"
          title="Crew inputs"
          action={
            canSendInput(me.role) ? (
              <Button size="sm" variant="secondary" onClick={() => setComposing(true)} data-testid="input-compose">
                <MessageSquarePlus className="size-4" /> Send
              </Button>
            ) : undefined
          }
        />
        {v.inputs.length === 0 ? (
          <EmptyState title="No inputs for this flight">Specific instructions from the Lead CA, pilots or the Principal&apos;s PA will appear here.</EmptyState>
        ) : (
          <ul className="space-y-2.5">
            {v.inputs.map((i) => (
              <InputCard key={i.id} input={i} owner={owner} crewName={name} sender={crew.find((c) => c.id === i.fromId)} onAck={() => report(store.acknowledgeCrewInput(i.id), "Input acknowledged")} now={now} />
            ))}
          </ul>
        )}
      </section>

      {/* 2. Outstanding items */}
      <section data-testid="attention">
        <SectionHeader eyebrow="Outstanding items" title="Needs attention before boarding" action={<span className="text-xs tnum text-slate">{v.attention.length}</span>} />
        {v.attention.length === 0 ? (
          <div className="card-quiet p-3.5 text-sm text-slate flex items-center gap-2">
            <Check className="size-4 text-ok" /> No blockers, blocked, overdue or critical items outstanding.
          </div>
        ) : (
          <ul className="card p-0 divide-y divide-slate/10 overflow-hidden">
            {(allAttention ? v.attention : v.attention.slice(0, 6)).map((a, idx) => {
              const M = ATTENTION_META[a.kind];
              const content = (
                <>
                  <M.icon className={cx("size-4.5 shrink-0 mt-0.5", M.tone)} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-ivory leading-snug">{a.label}</span>
                    <span className="block text-[0.6875rem] text-slate-500">
                      {M.label}
                      {a.detail ? ` · ${a.detail}` : ""}
                    </span>
                  </span>
                  <ArrowRight className="size-4 text-slate-500 shrink-0 mt-0.5" />
                </>
              );
              const cls = "w-full flex items-start gap-3 px-3.5 py-3 min-h-12 text-left hover:bg-navy-700/30";
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
            {v.attention.length > 6 && (
              <li>
                <button className="w-full py-3 text-sm text-gold min-h-11" onClick={() => setAllAttention((x) => !x)}>
                  {allAttention ? "Show fewer" : `Show all ${v.attention.length}`}
                </button>
              </li>
            )}
          </ul>
        )}
      </section>

      {/* 3. Pre-boarding checks */}
      <section data-testid="preboard-checks">
        <SectionHeader eyebrow="Cabin attendant" title="Pre-boarding checks" action={<span className="text-xs tnum text-slate">{v.checks.length - v.checks.filter(isOpenTask).length}/{v.checks.length}</span>} />
        <ul className="card p-0 divide-y divide-slate/10 overflow-hidden">
          {v.checks.map((t) => {
            const done = !isOpenTask(t);
            const editable = canToggle(t);
            return (
              <li key={t.id} className="flex items-stretch">
                <button
                  className={cx("grid w-14 shrink-0 place-items-center", !editable && "opacity-40")}
                  disabled={!editable || t.status === "not_applicable"}
                  onClick={() => report(store.setTaskStatus(t.id, done ? "not_started" : "completed"), done ? undefined : "Check complete")}
                  aria-label={done ? `Mark not done: ${t.title}` : `Mark done: ${t.title}`}
                  aria-pressed={done}
                  data-testid={`pb-check-${t.id}`}
                >
                  <span className={cx("grid size-7 place-items-center rounded-lg border-2 transition-colors", done ? "bg-ok border-ok text-midnight" : t.status === "blocked" ? "border-bad" : "border-slate/40")}>{done && <Check className="size-4.5" strokeWidth={3} />}</span>
                </button>
                <button className="flex-1 text-left py-3 pr-3.5 min-h-14" onClick={() => setOpenTask(t.id)}>
                  <span className={cx("block text-sm leading-snug", done ? "text-slate line-through decoration-slate/40" : "text-ivory")}>{t.title}</span>
                  <span className="flex flex-wrap gap-1.5 mt-1 items-center text-[0.6875rem] text-slate-500">
                    {t.priority !== "normal" && <Badge tone={t.priority === "critical" ? "bad" : "warn"}>{t.priority.toUpperCase()}</Badge>}
                    {t.status === "blocked" && <Badge tone="bad">Blocked</Badge>}
                    {t.coordinateWith?.length ? <span>Coordinate: {t.coordinateWith.map((c) => (c === "pilot" ? "flight crew" : c)).join(", ")}</span> : null}
                    {done && t.completedAt && <span>{name(t.completedById)} · {fmtRelative(t.completedAt, now)}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 4. Passenger-specific */}
      <section data-testid="preboard-passengers">
        <SectionHeader eyebrow="From documented accommodations" title="Passenger-specific preparation" action={<span className="text-xs tnum text-slate">{passengerDone}/{v.passengerItems.length}</span>} />
        {v.passengerItems.length === 0 ? (
          <EmptyState title="No passenger-specific preparation" />
        ) : (
          <div className="card p-0 divide-y divide-slate/10 overflow-hidden">
            {(allPax ? [...passengerOpen, ...v.passengerItems.filter((t) => !isOpenTask(t))] : passengerOpen.slice(0, 5)).map((t) => (
              <TaskRow key={t.id} task={t} onOpen={(x) => setOpenTask(x.id)} />
            ))}
            {passengerOpen.length === 0 && !allPax && <div className="p-3.5 text-sm text-ok flex items-center gap-2"><Check className="size-4" /> All passenger-specific preparation complete.</div>}
            {v.passengerItems.length > Math.min(5, passengerOpen.length) && (
              <button className="w-full py-3 text-sm text-gold min-h-11" onClick={() => setAllPax((x) => !x)}>
                {allPax ? "Show open items only" : `Show all ${v.passengerItems.length} (${passengerDone} complete)`}
              </button>
            )}
          </div>
        )}
      </section>

      {/* 5. Sign-off */}
      {!v.signoff && (
        <Card className={cx(v.canSignOff ? "border-ok/30" : "")} data-testid="preboard-signoff">
          <SectionHeader eyebrow="Final step" title="Confirm pre-boarding complete" />
          {v.signoffBlockers.length > 0 ? (
            <ul className="space-y-1.5 mb-3">
              {v.signoffBlockers.map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm text-warn">
                  <CircleAlert className="size-4 shrink-0" /> {b}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate mb-3">
              All pre-boarding checks are complete and every required input is acknowledged.
              {v.openAtSignoff > 0 && ` ${v.openAtSignoff} other open item(s) will be noted in the sign-off record.`}
            </p>
          )}
          {owner ? (
            <Button className="w-full" size="lg" disabled={!v.canSignOff} onClick={() => setConfirm(true)} data-testid="preboard-confirm">
              <ClipboardCheck className="size-5" /> Confirm pre-boarding complete
            </Button>
          ) : (
            <p className="text-xs text-slate-500">Only the cabin attendant or Lead CA can confirm.</p>
          )}
          <p className="text-[0.625rem] text-slate-500 mt-2">{PREBOARD_CAVEAT}</p>
        </Card>
      )}

      <ConfirmDialog
        open={confirm}
        title={`Confirm pre-boarding for ${flight.callsign}?`}
        body={
          <>
            <p>
              You confirm the cabin is prepared for boarding. This is time-stamped in the audit history and reported to the Lead CA. {PREBOARD_CAVEAT}
            </p>
            <label htmlFor="pb-note" className="block text-xs font-semibold text-slate mt-3 mb-1">
              Note for the Lead CA (optional)
            </label>
            <input id="pb-note" className="field" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
          </>
        }
        confirmLabel="Confirm and sign"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          report(store.signOffPreboarding(flight.id, note), "Pre-boarding confirmed · recorded in audit history");
        }}
      />
      <InputComposer flight={flight} open={composing} onClose={() => setComposing(false)} />
      <TaskSheet taskId={openTask} onClose={() => setOpenTask(null)} />
    </div>
  );
}

function Stat({ value, label, bad }: { value: number; label: string; bad?: boolean }) {
  return (
    <div className="py-2.5 px-1 border-r last:border-r-0 hairline">
      <div className={cx("text-lg font-semibold tnum", bad ? "text-warn" : "text-ok")}>{value}</div>
      <div className="text-[0.625rem] text-slate leading-tight">{label}</div>
    </div>
  );
}

function InputCard({ input, owner, crewName, sender, onAck, now }: { input: CrewInput; owner: boolean; crewName: (id?: string) => string; sender?: { initials: string; name: string; role: CrewInput["fromRole"] }; onAck: () => void; now: number }) {
  const acked = input.acks.length > 0;
  return (
    <li className={cx("card p-3.5", input.priority === "critical" && !acked && "border-bad/35", input.priority === "important" && !acked && "border-warn/30")} data-testid={`input-${input.id}`}>
      <div className="flex items-start gap-3">
        <Avatar initials={sender?.initials ?? "?"} size={36} tone={input.fromRole === "lead" ? "gold" : "navy"} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-ivory">{sender?.name ?? crewName(input.fromId)}</span>
            <span className="text-[0.6875rem] text-slate">{ROLE_LABELS[input.fromRole]}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {input.priority !== "normal" && <Badge tone={input.priority === "critical" ? "bad" : "warn"}>{input.priority.toUpperCase()}</Badge>}
            <Badge tone="neutral">{CATEGORY_LABEL[input.category]}</Badge>
            <span className="text-[0.6875rem] text-slate-500">{fmtRelative(input.createdAt, now)}</span>
          </div>
          <p className="text-sm text-slate leading-relaxed mt-2">{input.text}</p>
          {acked ? (
            <div className="mt-2 text-xs text-ok flex items-center gap-1.5">
              <Check className="size-3.5" /> Acknowledged by {crewName(input.acks[0].byId)} · {fmtRelative(input.acks[0].at, now)}
            </div>
          ) : input.requiresAck ? (
            owner ? (
              <Button size="sm" className="mt-2.5" onClick={onAck} data-testid={`ack-input-${input.id}`}>
                <Check className="size-4" /> Acknowledge
              </Button>
            ) : (
              <div className="mt-2 text-xs text-warn">Awaiting cabin attendant acknowledgement</div>
            )
          ) : (
            <div className="mt-2 text-[0.6875rem] text-slate-500">For information · no acknowledgement required</div>
          )}
        </div>
      </div>
    </li>
  );
}

function InputComposer({ flight, open, onClose }: { flight: Flight; open: boolean; onClose: () => void }) {
  const add = useStore((s) => s.addCrewInput);
  const me = useMe();
  const [text, setText] = useState("");
  const [category, setCategory] = useState<CrewInputCategory>("instruction");
  const [priority, setPriority] = useState<CrewInput["priority"]>("important");
  const [requiresAck, setRequiresAck] = useState(true);
  const [err, setErr] = useState<string>();
  const submit = () => {
    const res = add({ flightId: flight.id, text, category, priority, requiresAck });
    if (!res.ok) return setErr(res.error);
    report(res, "Input sent to the cabin attendant");
    setText("");
    setErr(undefined);
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Send pre-boarding input"
      subtitle={`${flight.callsign} · from ${me.name}, ${ROLE_LABELS[me.role]}`}
      footer={
        <Button className="flex-1" onClick={submit} data-testid="input-send">
          <Send className="size-4" /> Send to cabin attendant
        </Button>
      }
    >
      <Field label="Instruction" error={err} hint="Operational detail only. Do not include medical diagnoses or real names." htmlFor="inp-text">
        <textarea id="inp-text" className="field min-h-28" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} aria-invalid={!!err} placeholder="e.g. Principal will board from the car at the airstair; welcome service in Zone 1." data-testid="input-text" />
      </Field>
      <Field label="Category">
        <Segmented ariaLabel="Category" value={category} onChange={setCategory} options={(Object.keys(CATEGORY_LABEL) as CrewInputCategory[]).map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))} />
      </Field>
      <Field label="Priority">
        <Segmented ariaLabel="Priority" value={priority} onChange={setPriority} options={[{ value: "critical", label: "Critical" }, { value: "important", label: "Important" }, { value: "normal", label: "For info" }]} />
      </Field>
      <label className="flex items-center gap-3 rounded-xl border border-slate/12 px-3 py-3 cursor-pointer">
        <input type="checkbox" className="size-5 accent-[#d7bd8c]" checked={requiresAck} onChange={(e) => setRequiresAck(e.target.checked)} />
        <span className="text-sm text-ivory">
          Require acknowledgement
          <span className="block text-xs text-slate">Pre-boarding cannot be confirmed until it is acknowledged.</span>
        </span>
      </label>
    </Sheet>
  );
}
