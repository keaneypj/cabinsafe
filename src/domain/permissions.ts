import type { RoleKey } from "./types";

/**
 * Demo Role Preview permissions.
 *
 * IMPORTANT: these checks run in the browser to demonstrate role-appropriate
 * views. They are NOT a security boundary. Production enforcement must happen
 * server-side (see supabase/schema.sql row-level security policies).
 */

export type Permission =
  | "medical.view"
  | "restricted.view"
  | "passenger.edit"
  | "flight.edit"
  | "task.assign"
  | "task.update.any"
  | "task.update.own"
  | "task.review"
  | "equipment.inspect"
  | "advisory.ack"
  | "handover.create"
  | "handover.accept"
  | "audit.view"
  | "briefing.generate"
  | "demo.reset";

const MATRIX: Record<RoleKey, Permission[]> = {
  lead: [
    "medical.view", "restricted.view", "passenger.edit", "flight.edit", "task.assign", "task.update.any", "task.update.own",
    "task.review", "equipment.inspect", "advisory.ack", "handover.create", "handover.accept", "audit.view", "briefing.generate", "demo.reset",
  ],
  contract_ca: ["task.update.own", "equipment.inspect", "advisory.ack", "handover.create", "handover.accept", "briefing.generate", "demo.reset"],
  pilot: ["advisory.ack", "briefing.generate", "audit.view", "demo.reset"],
  security: ["advisory.ack", "task.update.own", "demo.reset"],
  assistant: ["task.update.own", "demo.reset"],
};

export const ROLE_LABELS: Record<RoleKey, string> = {
  lead: "Lead Cabin Attendant",
  contract_ca: "Contract Cabin Attendant",
  pilot: "Flight Crew",
  security: "Security",
  assistant: "Personal Assistant",
};

export function can(role: RoleKey, p: Permission): boolean {
  return MATRIX[role].includes(p);
}

export function permissionsFor(role: RoleKey): Permission[] {
  return MATRIX[role];
}
