import { can } from "./permissions";
import { advisoriesForFlight, computeReadiness, effectiveEquipmentStatus, isAcked, isOpenTask, type ReadinessInput, type ReadinessResult } from "./readiness";
import type { CrewInput, CrewMember, Flight, PreboardSignoff, RoleKey, Task } from "./types";

/**
 * Pre-boarding checklist for the cabin attendant.
 *
 * Brings together, for one flight:
 *  1. Crew inputs from the Lead CA, flight crew and the Principal's PA (some requiring acknowledgement)
 *  2. Outstanding items needing attention (blockers, blocked/overdue/critical tasks, equipment, advisories)
 *  3. The cabin attendant's own pre-boarding checks
 *  4. Passenger-specific preparation generated from documented accommodations
 *
 * The cabin attendant's sign-off confirms cabin preparation only. Boarding and
 * departure remain at the discretion of the Pilot in Command.
 */

export const BOARDING_LEAD_MINUTES = 30;
export const PREBOARD_CAVEAT = "Confirms cabin preparation only. Boarding and departure remain at the discretion of the Pilot in Command.";

/** Roles that may send pre-boarding inputs to the cabin attendant. */
export const INPUT_ROLES: RoleKey[] = ["lead", "pilot", "assistant"];

export interface AttentionItem {
  kind: "blocker" | "blocked" | "overdue" | "critical" | "equipment" | "advisory" | "review";
  label: string;
  detail?: string;
  href: string;
  taskId?: string;
}

export interface PreboardView {
  boardingAt: string;
  checks: Task[];
  passengerItems: Task[];
  inputs: CrewInput[];
  pendingAcks: CrewInput[];
  attention: AttentionItem[];
  readiness: ReadinessResult;
  progress: { done: number; total: number; pct: number };
  signoff?: PreboardSignoff;
  canSignOff: boolean;
  signoffBlockers: string[];
  openAtSignoff: number;
}

export interface PreboardInput extends ReadinessInput {
  inputs: CrewInput[];
  signoffs: PreboardSignoff[];
}

export function boardingTime(f: Flight): string {
  return new Date(new Date(f.departAt).getTime() - BOARDING_LEAD_MINUTES * 60_000).toISOString();
}

export function canSendInput(role: RoleKey): boolean {
  return INPUT_ROLES.includes(role);
}

/** The flight's cabin attendant, or the Lead CA, acknowledges inputs and signs off pre-boarding. */
export function isPreboardOwner(me: CrewMember, f: Flight): boolean {
  return me.id === f.cabinAttendantId || (me.role === "lead" && can(me.role, "task.update.any"));
}

export function computePreboarding(input: PreboardInput): PreboardView {
  const { flight, nowMs } = input;
  const readiness = computeReadiness(input);
  const flightTasks = input.tasks.filter((t) => t.flightId === flight.id && t.phase === "preflight");
  const checks = flightTasks.filter((t) => t.category === "preboarding");
  const passengerItems = flightTasks.filter((t) => t.source === "passenger_rule" && t.status !== "not_applicable");
  const inputs = input.inputs.filter((i) => i.flightId === flight.id).sort((a, b) => PRIORITY[a.priority] - PRIORITY[b.priority] || b.createdAt.localeCompare(a.createdAt));
  const pendingAcks = inputs.filter((i) => i.requiresAck && i.acks.length === 0);

  // Outstanding items needing attention (excluding the pre-boarding checks themselves).
  const attention: AttentionItem[] = [];
  const href = (t: Task) => `/flights/${flight.id}?task=${t.id}`;
  for (const b of readiness.blockers) attention.push({ kind: "blocker", label: b.label, href: b.href ?? `/flights/${flight.id}` });
  const others = flightTasks.filter((t) => t.category !== "preboarding" && isOpenTask(t));
  // Passenger-specific items have their own section; only surface them here when blocked.
  const general = others.filter((t) => t.source !== "passenger_rule" || t.status === "blocked");
  const seen = new Set<string>();
  const push = (t: Task, kind: AttentionItem["kind"], detail?: string) => {
    if (seen.has(t.id)) return;
    seen.add(t.id);
    attention.push({ kind, label: t.title, detail, href: href(t), taskId: t.id });
  };
  for (const t of general.filter((x) => x.status === "blocked")) push(t, "blocked", t.blockedReason);
  for (const t of general.filter((x) => x.dueAt && new Date(x.dueAt).getTime() < nowMs)) push(t, "overdue");
  for (const t of general.filter((x) => x.priority === "critical")) push(t, "critical");
  const departMs = new Date(flight.departAt).getTime();
  for (const e of input.equipment) {
    const s = effectiveEquipmentStatus(e, nowMs);
    if (readiness.blockers.some((b) => b.ref === e.id)) continue;
    if (s === "discrepancy" || (s === "due_soon" && new Date(e.nextInspectionDue).getTime() <= departMs)) {
      attention.push({ kind: "equipment", label: `${e.code} ${e.name}`, detail: s === "discrepancy" ? "Open discrepancy" : "Inspection due before departure", href: `/cabin?eq=${e.id}` });
    }
  }
  for (const a of advisoriesForFlight(flight, input.advisories).filter((x) => (x.severity === "warning" || x.severity === "critical") && !isAcked(input.acks, x.id, flight.id))) {
    attention.push({ kind: "advisory", label: `${a.origin === "simulated" ? "[SIMULATED] " : ""}${a.title}`, detail: "Advisory not yet acknowledged", href: `/intel?flight=${flight.id}&adv=${encodeURIComponent(a.id)}` });
  }

  const doneChecks = checks.filter((t) => !isOpenTask(t)).length;
  const doneAcks = inputs.filter((i) => i.requiresAck).length - pendingAcks.length;
  const total = checks.length + inputs.filter((i) => i.requiresAck).length;
  const done = doneChecks + doneAcks;

  const signoffBlockers: string[] = [];
  const openChecks = checks.length - doneChecks;
  if (openChecks) signoffBlockers.push(`${openChecks} pre-boarding check${openChecks > 1 ? "s" : ""} not complete`);
  if (pendingAcks.length) signoffBlockers.push(`${pendingAcks.length} crew input${pendingAcks.length > 1 ? "s" : ""} awaiting acknowledgement`);
  if (readiness.blockers.length) signoffBlockers.push(`${readiness.blockers.length} critical blocker${readiness.blockers.length > 1 ? "s" : ""} unresolved`);
  const signoff = input.signoffs.filter((s) => s.flightId === flight.id).sort((a, b) => b.at.localeCompare(a.at))[0];

  return {
    boardingAt: boardingTime(flight),
    checks,
    passengerItems,
    inputs,
    pendingAcks,
    attention,
    readiness,
    progress: { done, total, pct: total ? Math.round((done / total) * 100) : 100 },
    signoff,
    canSignOff: signoffBlockers.length === 0 && flight.status !== "completed",
    signoffBlockers,
    openAtSignoff: others.length,
  };
}

const PRIORITY: Record<CrewInput["priority"], number> = { critical: 0, important: 1, normal: 2 };

