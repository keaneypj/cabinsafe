import { can } from "./permissions";
import { advisoriesForFlight, computeReadiness, effectiveEquipmentStatus, isAcked, isOpenTask, type ReadinessResult } from "./readiness";
import type { Advisory, AdvisoryAck, CrewMember, Discrepancy, Equipment, Flight, Handover, Passenger, RoleKey, Task } from "./types";

/** Everything the briefing generator and Copilot are allowed to see. */
export interface FlightContext {
  flight: Flight;
  tasks: Task[];
  equipment: Equipment[];
  discrepancies: Discrepancy[];
  advisories: Advisory[];
  acks: AdvisoryAck[];
  passengers: Passenger[];
  crew: CrewMember[];
  handovers: Handover[];
  role: RoleKey;
  nowMs: number;
  liveWeather?: { station: string; raw: string; observedAt?: string }[];
  liveTafs?: { station: string; raw: string; validFrom?: string; validTo?: string }[];
}

export const STATUS_LABEL: Record<Task["status"], string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  blocked: "Blocked",
  not_applicable: "N/A",
};

export function crewName(ctx: Pick<FlightContext, "crew">, id?: string): string {
  if (!id) return "Unassigned";
  if (id === "system") return "CabinSafe rules engine";
  return ctx.crew.find((c) => c.id === id)?.name ?? id;
}

export function manifestOf(ctx: FlightContext): Passenger[] {
  return ctx.flight.manifest.map((id) => ctx.passengers.find((p) => p.id === id)).filter((p): p is Passenger => !!p);
}

export function readinessOf(ctx: FlightContext): ReadinessResult {
  return computeReadiness({ ...ctx });
}

export function flightTasks(ctx: FlightContext): Task[] {
  return ctx.tasks.filter((t) => t.flightId === ctx.flight.id);
}

export function openTasks(ctx: FlightContext): Task[] {
  return flightTasks(ctx).filter((t) => t.phase === "preflight" && isOpenTask(t));
}

export function relevantAdvisories(ctx: FlightContext): (Advisory & { acknowledged: boolean })[] {
  return advisoriesForFlight(ctx.flight, ctx.advisories).map((a) => ({ ...a, acknowledged: isAcked(ctx.acks, a.id, ctx.flight.id) }));
}

export function equipmentConcerns(ctx: FlightContext) {
  return ctx.equipment
    .map((e) => ({ e, status: effectiveEquipmentStatus(e, ctx.nowMs), open: ctx.discrepancies.filter((d) => d.equipmentId === e.id && d.status !== "resolved") }))
    .filter((x) => x.status !== "serviceable" || x.open.length > 0);
}

export function canSeeMedical(ctx: FlightContext): boolean {
  return can(ctx.role, "medical.view");
}
