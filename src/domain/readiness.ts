import type { Advisory, AdvisoryAck, Discrepancy, Equipment, EquipmentStatus, Flight, Task } from "./types";

/**
 * Readiness model.
 *
 * Two deliberately separate measures:
 *  - Task completion: share of checklist/preparation items completed or N/A.
 *  - Operational readiness: considers critical equipment, discrepancies,
 *    critical items and unreviewed advisories.
 *
 * Neither is an authorization to depart. Departure authority rests with the
 * Pilot in Command (CSI-OPS-001 §1).
 */

export type ReadinessLevel = "not_ready" | "attention" | "prepared";

export interface ReadinessIssue {
  kind: "equipment" | "discrepancy" | "task" | "advisory" | "review";
  label: string;
  ref: string;
  href?: string;
}

export interface ReadinessComponent {
  key: string;
  label: string;
  weight: number;
  score: number; // 0..1
  detail: string;
}

export interface ReadinessResult {
  level: ReadinessLevel;
  headline: string;
  caveat: string;
  index: number;
  taskCompletion: { done: number; total: number; pct: number };
  blockers: ReadinessIssue[];
  attention: ReadinessIssue[];
  components: ReadinessComponent[];
  outstanding: Task[];
  overdue: Task[];
}

export const PIC_CAVEAT = "Readiness is a cabin preparation measure only. Departure authority rests with the Pilot in Command.";

const DUE_SOON_MS = 48 * 3_600_000;

export function effectiveEquipmentStatus(e: Equipment, nowMs: number): EquipmentStatus {
  if (e.status === "discrepancy" || e.status === "unserviceable") return e.status;
  const due = new Date(e.nextInspectionDue).getTime();
  if (due <= nowMs) return "inspection_due";
  if (e.expiresAt && new Date(e.expiresAt).getTime() <= nowMs) return "unserviceable";
  // "Due soon" scales with the interval: a daily check is due soon in its last ~5 h, a monthly one in its last 48 h.
  const window = Math.min(DUE_SOON_MS, e.inspectionIntervalDays * 86_400_000 * 0.2);
  if (due - nowMs <= window || (e.expiresAt && new Date(e.expiresAt).getTime() - nowMs <= 30 * 86_400_000)) return "due_soon";
  return "serviceable";
}

export function isOpenTask(t: Task): boolean {
  return t.status !== "completed" && t.status !== "not_applicable";
}

export function flightAirports(f: Flight): string[] {
  return [f.departure, f.destination, ...f.alternates];
}

export function advisoriesForFlight(f: Flight, advisories: Advisory[]): Advisory[] {
  const set = new Set(flightAirports(f));
  return advisories.filter((a) => a.airports.some((x) => set.has(x)));
}

export function isAcked(acks: AdvisoryAck[], advisoryId: string, flightId: string): boolean {
  return acks.some((a) => a.advisoryId === advisoryId && a.flightId === flightId);
}

export interface ReadinessInput {
  flight: Flight;
  tasks: Task[];
  equipment: Equipment[];
  discrepancies: Discrepancy[];
  advisories: Advisory[];
  acks: AdvisoryAck[];
  nowMs: number;
}

export function computeReadiness(input: ReadinessInput): ReadinessResult {
  const { flight, equipment, discrepancies, acks, nowMs } = input;
  const tasks = input.tasks.filter((t) => t.flightId === flight.id && t.phase === "preflight");
  const blockers: ReadinessIssue[] = [];
  const attention: ReadinessIssue[] = [];

  // Task completion
  const doneTasks = tasks.filter((t) => !isOpenTask(t));
  const pct = tasks.length ? Math.round((doneTasks.length / tasks.length) * 100) : 100;
  const outstanding = tasks.filter(isOpenTask);
  const overdue = outstanding.filter((t) => t.dueAt && new Date(t.dueAt).getTime() < nowMs);

  // Equipment
  const departMs = new Date(flight.departAt).getTime();
  const critical = equipment.filter((e) => e.critical);
  let eqScore = 0;
  for (const e of equipment) {
    const s = effectiveEquipmentStatus(e, nowMs);
    const href = `/cabin?eq=${e.id}`;
    if (e.critical && (s === "inspection_due" || s === "unserviceable")) {
      blockers.push({ kind: "equipment", label: `${e.code} ${e.name} — ${s === "unserviceable" ? "unserviceable" : "inspection due"}`, ref: e.id, href });
    } else if (s === "due_soon" && new Date(e.nextInspectionDue).getTime() <= departMs) {
      attention.push({ kind: "equipment", label: `${e.code} inspection due before departure`, ref: e.id, href });
    }
    if (e.critical) {
      eqScore += s === "serviceable" || s === "due_soon" ? 1 : s === "discrepancy" ? 0.5 : 0;
    }
  }

  // Discrepancies
  for (const d of discrepancies.filter((x) => x.status === "open")) {
    const href = d.equipmentId ? `/cabin?eq=${d.equipmentId}` : `/more/discrepancies`;
    if (d.severity === "critical") blockers.push({ kind: "discrepancy", label: `Critical discrepancy: ${d.title}`, ref: d.id, href });
    else if (d.severity === "major") attention.push({ kind: "discrepancy", label: `Major discrepancy: ${d.title}`, ref: d.id, href });
  }

  // Tasks
  for (const t of outstanding) {
    const href = `/flights/${flight.id}?task=${t.id}`;
    if (t.status === "blocked" && (t.priority === "critical" || t.priority === "high")) {
      (t.priority === "critical" ? blockers : attention).push({ kind: "task", label: `Blocked: ${t.title}`, ref: t.id, href });
    }
  }
  const critOpen = outstanding.filter((t) => t.priority === "critical" && t.status !== "blocked");
  if (critOpen.length) {
    attention.push({ kind: "task", label: `${critOpen.length} critical item${critOpen.length > 1 ? "s" : ""} outstanding`, ref: "critical", href: `/flights/${flight.id}?filter=critical` });
  }
  const unreviewed = tasks.filter((t) => t.source === "passenger_rule" && !t.reviewed && isOpenTask(t));
  if (unreviewed.length) {
    attention.push({ kind: "review", label: `${unreviewed.length} generated passenger task${unreviewed.length > 1 ? "s" : ""} awaiting Lead CA review`, ref: "review", href: `/flights/${flight.id}?filter=review` });
  }

  // Advisories
  const relevant = advisoriesForFlight(flight, input.advisories);
  const unacked = relevant.filter((a) => !isAcked(acks, a.id, flight.id));
  for (const a of unacked.filter((x) => x.severity === "warning" || x.severity === "critical")) {
    attention.push({ kind: "advisory", label: `Unreviewed advisory: ${a.title}`, ref: a.id, href: `/intel?flight=${flight.id}&adv=${encodeURIComponent(a.id)}` });
  }

  // Index components
  const ch = tasks.filter((t) => t.priority !== "normal");
  const chDone = ch.filter((t) => !isOpenTask(t)).length;
  const acc = tasks.filter((t) => t.source === "passenger_rule");
  const accScore = acc.length ? acc.reduce((s, t) => s + (!isOpenTask(t) ? 1 : t.reviewed ? 0.35 : 0), 0) / acc.length : 1;
  const components: ReadinessComponent[] = [
    { key: "equipment", label: "Critical equipment", weight: 30, score: critical.length ? eqScore / critical.length : 1, detail: `${critical.filter((e) => ["serviceable", "due_soon"].includes(effectiveEquipmentStatus(e, nowMs))).length}/${critical.length} serviceable` },
    { key: "critical", label: "Critical & high-priority items", weight: 35, score: ch.length ? chDone / ch.length : 1, detail: `${chDone}/${ch.length} complete` },
    { key: "accommodations", label: "Passenger accommodations", weight: 20, score: accScore, detail: `${acc.filter((t) => !isOpenTask(t)).length}/${acc.length} prepared` },
    { key: "advisories", label: "Advisories reviewed", weight: 15, score: relevant.length ? (relevant.length - unacked.length) / relevant.length : 1, detail: `${relevant.length - unacked.length}/${relevant.length} acknowledged` },
  ];
  const index = Math.round(components.reduce((s, c) => s + c.score * c.weight, 0));

  let level: ReadinessLevel;
  let headline: string;
  if (blockers.length) {
    level = "not_ready";
    headline = `Not Ready · ${blockers.length} critical blocker${blockers.length > 1 ? "s" : ""}`;
  } else if (attention.length || outstanding.length) {
    level = "attention";
    headline = "Attention Required";
  } else {
    level = "prepared";
    headline = "Cabin Prepared · report to PIC";
  }

  return {
    level,
    headline,
    caveat: PIC_CAVEAT,
    index,
    taskCompletion: { done: doneTasks.length, total: tasks.length, pct },
    blockers,
    attention,
    components,
    outstanding,
    overdue,
  };
}
