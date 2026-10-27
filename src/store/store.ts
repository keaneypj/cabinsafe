"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createSeed, LEAD_ID, type SeedState } from "@/data/seed";
import { buildChecklist } from "@/domain/checklists";
import { can, type Permission } from "@/domain/permissions";
import { computePreboarding } from "@/domain/preboarding";
import { generateTasksForPassenger } from "@/domain/rules";
import type {
  Advisory,
  AdvisoryAck,
  AuditAction,
  AuditEvent,
  BriefingDoc,
  CrewInput,
  CrewMember,
  Discrepancy,
  Flight,
  Handover,
  IntelSnapshot,
  PreboardSignoff,
  Severity,
  Task,
  TaskStatus,
} from "@/domain/types";
import { uid } from "@/lib/format";

export const STORAGE_KEY = "cabinsafe-demo";
const SCHEMA_VERSION = 6;

export type Result<T = undefined> = { ok: true; value?: T } | { ok: false; error: string };

export interface DemoState {
  active: boolean;
  step: number;
  done: Record<string, boolean>;
}

export interface AppState extends SeedState {
  schema: number;
  currentUserId: string;
  acks: AdvisoryAck[];
  briefings: BriefingDoc[];
  preboardSignoffs: PreboardSignoff[];
  intel: Record<string, IntelSnapshot>;
  demo: DemoState;
  hydrated: boolean;
}

export interface FlightInput {
  id?: string;
  callsign: string;
  departure: string;
  destination: string;
  alternates: string[];
  departAt: string;
  arriveAt: string;
  cabinAttendantId?: string;
  notes?: string;
  status: Flight["status"];
}

export interface Actions {
  setCurrentUser(id: string): void;
  setTaskStatus(taskId: string, status: TaskStatus, opts?: { reason?: string; note?: string }): Result;
  updateTask(taskId: string, patch: Partial<Pick<Task, "title" | "detail" | "priority" | "dueAt" | "notes">>): Result;
  assignTask(taskId: string, assigneeId: string): Result;
  signOffTask(taskId: string): Result;
  reviewTask(taskId: string): Result;
  createTask(input: Pick<Task, "flightId" | "title" | "category" | "priority"> & Partial<Task>): Result<Task>;
  inspectEquipment(equipmentId: string, input: { checks: { label: string; ok: boolean }[]; notes?: string }): Result<{ passed: boolean; completedTasks: number }>;
  reportDiscrepancy(input: { equipmentId?: string; flightId?: string; title: string; detail: string; severity: Severity; phase: Discrepancy["phase"]; location?: string }): Result<Discrepancy>;
  updateDiscrepancy(id: string, status: Discrepancy["status"], resolution?: string): Result;
  acknowledgeAdvisory(advisory: Advisory, flightId: string, createTask: boolean): Result<{ taskId?: string }>;
  addPassengerToFlight(flightId: string, passengerId: string): Result<{ generated: Task[] }>;
  removePassengerFromFlight(flightId: string, passengerId: string): Result;
  upsertFlight(input: FlightInput): Result<Flight>;
  assignCabinAttendant(flightId: string, crewId: string): Result;
  createHandover(input: Omit<Handover, "id" | "createdAt" | "createdById" | "status" | "acknowledgements"> & { acknowledgements: string[] }): Result<Handover>;
  acknowledgeHandoverItem(handoverId: string, ackId: string): Result;
  acceptHandover(handoverId: string): Result;
  saveBriefing(b: Omit<BriefingDoc, "id">): Result<BriefingDoc>;
  saveIntel(key: string, snap: IntelSnapshot): void;
  addCrewInput(input: Pick<CrewInput, "flightId" | "category" | "priority" | "text" | "requiresAck">): Result<CrewInput>;
  acknowledgeCrewInput(inputId: string): Result;
  signOffPreboarding(flightId: string, note?: string): Result<PreboardSignoff>;
  resetDemo(): void;
  demoStart(): void;
  demoGo(step: number): void;
  demoMark(key: string): void;
  demoExit(): void;
}

export type Store = AppState & Actions;

function initialState(): AppState {
  return {
    ...createSeed(),
    schema: SCHEMA_VERSION,
    currentUserId: LEAD_ID,
    acks: [],
    briefings: [],
    preboardSignoffs: [],
    intel: {},
    demo: { active: false, step: 0, done: {} },
    hydrated: false,
  };
}

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const me = (): CrewMember => get().crew.find((c) => c.id === get().currentUserId) ?? get().crew[0];
      const deny = (p: Permission): Result | null =>
        can(me().role, p) ? null : { ok: false, error: `Your demo role (${me().title}) does not have permission for this action.` };
      const audit = (action: AuditAction, entity: string, entityId: string, summary: string, flightId?: string): AuditEvent => {
        const u = me();
        return { id: uid("aud"), at: new Date().toISOString(), actorId: u.id, actorRole: u.role, action, entity, entityId, flightId, summary };
      };
      const pushAudit = (...events: AuditEvent[]) => set((s) => ({ audit: [...events.reverse(), ...s.audit].slice(0, 500) }));
      const canEditTask = (t: Task): boolean => can(me().role, "task.update.any") || (can(me().role, "task.update.own") && t.assigneeId === me().id);
      const patchTask = (id: string, fn: (t: Task) => Task) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? fn(t) : t)) }));
      const ev = (text: string) => ({ at: new Date().toISOString(), byId: me().id, text });

      const STATUS_TEXT: Record<TaskStatus, string> = {
        not_started: "Not Started",
        in_progress: "In Progress",
        completed: "Completed",
        blocked: "Blocked",
        not_applicable: "Not Applicable",
      };

      return {
        ...initialState(),

        setCurrentUser(id) {
          set({ currentUserId: id });
        },

        setTaskStatus(taskId, status, opts = {}) {
          const t = get().tasks.find((x) => x.id === taskId);
          if (!t) return { ok: false, error: "Task not found." };
          if (!canEditTask(t)) return { ok: false, error: "This item is assigned to another crew member. Ask the Lead Cabin Attendant to reassign it." };
          if (status === "not_applicable" && !opts.reason?.trim()) return { ok: false, error: "A reason is required to mark an item Not Applicable." };
          if (status === "blocked" && !opts.reason?.trim()) return { ok: false, error: "Describe what is blocking this item." };
          const now = new Date().toISOString();
          patchTask(taskId, (x) => ({
            ...x,
            status,
            naReason: status === "not_applicable" ? opts.reason : undefined,
            blockedReason: status === "blocked" ? opts.reason : undefined,
            completedAt: status === "completed" ? now : undefined,
            completedById: status === "completed" ? me().id : undefined,
            signOff: status === "completed" ? x.signOff : undefined,
            notes: opts.note?.trim() ? opts.note.trim() : x.notes,
            history: [...x.history, ev(`Status → ${STATUS_TEXT[status]}${opts.reason ? ` (${opts.reason})` : ""}`)],
          }));
          pushAudit(audit(status === "completed" ? "task.complete" : "checklist.update", "task", taskId, `${STATUS_TEXT[status]}: ${t.title}${opts.reason ? ` — ${opts.reason}` : ""}`, t.flightId));
          return { ok: true };
        },

        updateTask(taskId, patch) {
          const t = get().tasks.find((x) => x.id === taskId);
          if (!t) return { ok: false, error: "Task not found." };
          if (!canEditTask(t)) return { ok: false, error: "You can only edit items assigned to you." };
          if (patch.title !== undefined && patch.title.trim().length < 3) return { ok: false, error: "Title must be at least 3 characters." };
          patchTask(taskId, (x) => ({ ...x, ...patch, history: [...x.history, ev("Details edited")] }));
          pushAudit(audit("task.update", "task", taskId, `Edited: ${patch.title ?? t.title}`, t.flightId));
          return { ok: true };
        },

        assignTask(taskId, assigneeId) {
          const d = deny("task.assign");
          if (d) return d;
          const t = get().tasks.find((x) => x.id === taskId);
          const who = get().crew.find((c) => c.id === assigneeId);
          if (!t || !who) return { ok: false, error: "Task or crew member not found." };
          patchTask(taskId, (x) => ({ ...x, assigneeId, history: [...x.history, ev(`Assigned to ${who.name}`)] }));
          pushAudit(audit("task.assign", "task", taskId, `Assigned "${t.title}" to ${who.name}`, t.flightId));
          return { ok: true };
        },

        signOffTask(taskId) {
          const t = get().tasks.find((x) => x.id === taskId);
          if (!t) return { ok: false, error: "Task not found." };
          if (t.status !== "completed") return { ok: false, error: "Complete the item before signing off." };
          if (!(me().role === "lead" || (me().role === "contract_ca" && t.assigneeId === me().id))) return { ok: false, error: "Sign-off requires the Lead Cabin Attendant or the assigned cabin attendant." };
          const at = new Date().toISOString();
          patchTask(taskId, (x) => ({ ...x, signOff: { byId: me().id, at }, history: [...x.history, ev("Signed off")] }));
          pushAudit(audit("checklist.update", "task", taskId, `Signed off: ${t.title}`, t.flightId));
          return { ok: true };
        },

        reviewTask(taskId) {
          const d = deny("task.review");
          if (d) return d;
          const t = get().tasks.find((x) => x.id === taskId);
          if (!t) return { ok: false, error: "Task not found." };
          patchTask(taskId, (x) => ({ ...x, reviewed: true, history: [...x.history, ev("Reviewed by Lead CA")] }));
          pushAudit(audit("task.update", "task", taskId, `Reviewed generated task: ${t.title}`, t.flightId));
          return { ok: true };
        },

        createTask(input) {
          if (!can(me().role, "task.assign") && !can(me().role, "advisory.ack")) return { ok: false, error: "Your demo role cannot create tasks." };
          if (input.title.trim().length < 3) return { ok: false, error: "Title must be at least 3 characters." };
          const flight = get().flights.find((f) => f.id === input.flightId);
          if (!flight) return { ok: false, error: "Flight not found." };
          const now = new Date().toISOString();
          const task: Task = {
            id: uid("tsk"),
            phase: "preflight",
            source: "manual",
            status: "not_started",
            requiresSignOff: false,
            assigneeId: flight.leadId,
            createdAt: now,
            history: [ev("Created")],
            ...input,
            title: input.title.trim(),
          };
          set((s) => ({ tasks: [...s.tasks, task] }));
          pushAudit(audit("task.create", "task", task.id, `Created task: ${task.title}`, task.flightId));
          return { ok: true, value: task };
        },

        inspectEquipment(equipmentId, input) {
          const d = deny("equipment.inspect");
          if (d) return d;
          const e = get().equipment.find((x) => x.id === equipmentId);
          if (!e) return { ok: false, error: "Equipment not found." };
          if (input.checks.length === 0) return { ok: false, error: "No inspection checks recorded." };
          const nowMs = Date.now();
          const now = new Date(nowMs).toISOString();
          const passed = input.checks.every((c) => c.ok);
          const openForEq = get().discrepancies.some((x) => x.equipmentId === e.id && x.status === "open");
          const record = { id: uid("insp"), at: now, byId: me().id, result: passed ? (input.notes ? "pass_with_note" : "pass") : "fail", checks: input.checks, notes: input.notes?.trim() || undefined } as const;
          const nextDue = new Date(nowMs + e.inspectionIntervalDays * 86_400_000).toISOString();
          const status = passed ? (openForEq ? "discrepancy" : "serviceable") : e.critical ? "unserviceable" : "discrepancy";
          set((s) => ({
            equipment: s.equipment.map((x) => (x.id === e.id ? { ...x, status, lastInspectionAt: now, nextInspectionDue: nextDue, history: [record, ...x.history] } : x)),
          }));
          const events: AuditEvent[] = [audit("equipment.inspect", "equipment", e.id, `${e.code} inspection ${passed ? "passed" : "FAILED"}${input.notes ? ` — ${input.notes}` : ""}`)];

          if (!passed) {
            const failed = input.checks.filter((c) => !c.ok).map((c) => c.label).join("; ");
            const dsc: Discrepancy = { id: uid("dsc"), equipmentId: e.id, title: `${e.code} failed inspection`, detail: `Failed checks: ${failed}.${input.notes ? ` ${input.notes}` : ""}`, severity: e.critical ? "critical" : "major", reportedAt: now, reportedById: me().id, status: "open", phase: "inspection" };
            set((s) => ({ discrepancies: [dsc, ...s.discrepancies] }));
            events.push(audit("discrepancy.create", "discrepancy", dsc.id, `${dsc.severity === "critical" ? "Critical" : "Major"} discrepancy: ${dsc.title}`));
          }

          // Linked checklist items for flights departing before the next inspection is due.
          let completedTasks = 0;
          if (passed) {
            const flightIds = new Set(get().flights.filter((f) => f.status !== "completed" && new Date(f.departAt).getTime() <= new Date(nextDue).getTime()).map((f) => f.id));
            const linked = get().tasks.filter((t) => t.sourceRef === `equipment:${e.code}` && flightIds.has(t.flightId) && t.status !== "completed");
            completedTasks = linked.length;
            set((s) => ({
              tasks: s.tasks.map((t) =>
                linked.some((l) => l.id === t.id)
                  ? { ...t, status: "completed", completedAt: now, completedById: me().id, signOff: t.requiresSignOff ? { byId: me().id, at: now } : t.signOff, history: [...t.history, ev(`Completed via ${e.code} inspection record`)] }
                  : t,
              ),
            }));
            for (const l of linked) events.push(audit("task.complete", "task", l.id, `Completed via ${e.code} inspection: ${l.title}`, l.flightId));
          }
          pushAudit(...events);
          return { ok: true, value: { passed, completedTasks } };
        },

        reportDiscrepancy(input) {
          const d = deny("equipment.inspect");
          if (d) return d;
          if (input.title.trim().length < 4) return { ok: false, error: "Give the discrepancy a short descriptive title." };
          const now = new Date().toISOString();
          const dsc: Discrepancy = { id: uid("dsc"), reportedAt: now, reportedById: me().id, status: "open", ...input, title: input.title.trim() };
          set((s) => ({
            discrepancies: [dsc, ...s.discrepancies],
            equipment: input.equipmentId ? s.equipment.map((e) => (e.id === input.equipmentId ? { ...e, status: input.severity === "critical" && e.critical ? "unserviceable" : "discrepancy" } : e)) : s.equipment,
          }));
          pushAudit(audit("discrepancy.create", "discrepancy", dsc.id, `${input.severity} discrepancy reported: ${dsc.title}`, input.flightId));
          return { ok: true, value: dsc };
        },

        updateDiscrepancy(id, status, resolution) {
          if (me().role !== "lead") return { ok: false, error: "Only the Lead Cabin Attendant can resolve or defer discrepancies in this demo." };
          const dsc = get().discrepancies.find((x) => x.id === id);
          if (!dsc) return { ok: false, error: "Discrepancy not found." };
          if ((status === "resolved" || status === "deferred") && !resolution?.trim()) return { ok: false, error: status === "resolved" ? "Record how the discrepancy was resolved." : "Record the deferral owner and follow-up." };
          const now = new Date().toISOString();
          set((s) => {
            const discrepancies = s.discrepancies.map((x) => (x.id === id ? { ...x, status, resolution: resolution?.trim(), resolvedAt: status === "resolved" ? now : undefined } : x));
            const stillOpen = discrepancies.some((x) => x.equipmentId === dsc.equipmentId && x.status === "open");
            const equipment = dsc.equipmentId && !stillOpen ? s.equipment.map((e) => (e.id === dsc.equipmentId && (e.status === "discrepancy" || e.status === "unserviceable") ? { ...e, status: "serviceable" as const } : e)) : s.equipment;
            return { discrepancies, equipment };
          });
          pushAudit(audit("discrepancy.update", "discrepancy", id, `${status === "resolved" ? "Resolved" : status === "deferred" ? "Deferred" : "Reopened"}: ${dsc.title}${resolution ? ` — ${resolution}` : ""}`, dsc.flightId));
          return { ok: true };
        },

        acknowledgeAdvisory(advisory, flightId, createTask) {
          const d = deny("advisory.ack");
          if (d) return d;
          if (get().acks.some((a) => a.advisoryId === advisory.id && a.flightId === flightId)) return { ok: false, error: "Already acknowledged for this flight." };
          const flight = get().flights.find((f) => f.id === flightId);
          if (!flight) return { ok: false, error: "Flight not found." };
          const at = new Date().toISOString();
          let taskId: string | undefined;
          const events = [audit("advisory.acknowledge", "advisory", advisory.id, `Acknowledged ${advisory.origin === "simulated" ? "SIMULATED " : ""}advisory: ${advisory.title}`, flightId)];
          if (createTask) {
            const task: Task = {
              id: uid("tsk"),
              flightId,
              title: `Advisory preparation: ${advisory.title}`,
              detail: `${advisory.cabinRelevance}\n\nSource: ${advisory.source}${advisory.origin === "simulated" ? " (SIMULATED)" : ""}.`,
              category: advisory.category === "weather" ? "briefing" : advisory.category === "public_health" ? "medical_kit" : "security",
              phase: "preflight",
              source: "advisory",
              sourceRef: advisory.id,
              priority: advisory.severity === "warning" || advisory.severity === "critical" ? "high" : "normal",
              status: "not_started",
              assigneeId: flight.leadId,
              dueAt: new Date(new Date(flight.departAt).getTime() - 2 * 3_600_000).toISOString(),
              requiresSignOff: false,
              coordinateWith: advisory.category === "weather" ? ["pilot"] : advisory.category === "public_health" ? undefined : ["security"],
              documentRef: "CSI-ADV-006",
              createdAt: at,
              reviewed: true,
              history: [ev("Created from advisory acknowledgement")],
            };
            taskId = task.id;
            set((s) => ({ tasks: [...s.tasks, task] }));
            events.push(audit("task.create", "task", task.id, `Created task from advisory: ${advisory.title}`, flightId));
          }
          set((s) => ({ acks: [...s.acks, { advisoryId: advisory.id, flightId, byId: me().id, at, taskId }] }));
          pushAudit(...events);
          return { ok: true, value: { taskId } };
        },

        addPassengerToFlight(flightId, passengerId) {
          const d = deny("passenger.edit");
          if (d) return d;
          const f = get().flights.find((x) => x.id === flightId);
          const p = get().passengers.find((x) => x.id === passengerId);
          if (!f || !p) return { ok: false, error: "Flight or passenger not found." };
          if (f.manifest.includes(passengerId)) return { ok: false, error: `${p.alias} is already on this manifest.` };
          if (f.status === "completed") return { ok: false, error: "Cannot change the manifest of a completed flight." };
          const now = new Date().toISOString();
          const existing = new Set(get().tasks.map((t) => t.id));
          // Reopen previously N/A'd generated tasks if the passenger is re-added.
          const reopened = get().tasks.filter((t) => t.flightId === flightId && t.passengerId === passengerId && t.status === "not_applicable" && t.naReason === "Passenger removed from manifest");
          const generated = generateTasksForPassenger(p, f, existing, now);
          set((s) => ({
            flights: s.flights.map((x) => (x.id === flightId ? { ...x, manifest: [...x.manifest, passengerId] } : x)),
            tasks: [
              ...s.tasks.map((t) => (reopened.some((r) => r.id === t.id) ? { ...t, status: "not_started" as const, naReason: undefined, reviewed: false, history: [...t.history, ev("Reopened — passenger re-added")] } : t)),
              ...generated,
            ],
          }));
          pushAudit(
            audit("passenger.manifest", "flight", flightId, `Added ${p.alias} to ${f.callsign} manifest`, flightId),
            ...generated.map((t) => audit("task.create", "task", t.id, `Rule-generated: ${t.title}`, flightId)),
          );
          return { ok: true, value: { generated: [...generated, ...reopened] } };
        },

        removePassengerFromFlight(flightId, passengerId) {
          const d = deny("passenger.edit");
          if (d) return d;
          const f = get().flights.find((x) => x.id === flightId);
          const p = get().passengers.find((x) => x.id === passengerId);
          if (!f || !p) return { ok: false, error: "Flight or passenger not found." };
          set((s) => ({
            flights: s.flights.map((x) => (x.id === flightId ? { ...x, manifest: x.manifest.filter((m) => m !== passengerId) } : x)),
            tasks: s.tasks.map((t) =>
              t.flightId === flightId && t.passengerId === passengerId && t.status !== "completed"
                ? { ...t, status: "not_applicable" as const, naReason: "Passenger removed from manifest", history: [...t.history, ev("N/A — passenger removed from manifest")] }
                : t,
            ),
          }));
          pushAudit(audit("passenger.manifest", "flight", flightId, `Removed ${p.alias} from ${f.callsign} manifest`, flightId));
          return { ok: true };
        },

        upsertFlight(input) {
          const d = deny("flight.edit");
          if (d) return d;
          const callsign = input.callsign.trim().toUpperCase();
          if (!/^[A-Z0-9]{3,8}$/.test(callsign)) return { ok: false, error: "Flight ID must be 3–8 letters or digits." };
          if (input.departure === input.destination) return { ok: false, error: "Departure and destination must differ." };
          const dep = new Date(input.departAt).getTime();
          const arr = new Date(input.arriveAt).getTime();
          if (!Number.isFinite(dep) || !Number.isFinite(arr)) return { ok: false, error: "Enter valid departure and arrival times." };
          if (arr <= dep) return { ok: false, error: "Arrival must be after departure." };
          if (get().flights.some((f) => f.callsign === callsign && f.id !== input.id)) return { ok: false, error: `Flight ${callsign} already exists.` };
          const now = new Date().toISOString();
          if (input.id) {
            const prev = get().flights.find((f) => f.id === input.id);
            if (!prev) return { ok: false, error: "Flight not found." };
            const next: Flight = { ...prev, ...input, callsign, alternates: input.alternates.filter((a) => a && a !== input.destination) };
            const shift = new Date(next.departAt).getTime() - new Date(prev.departAt).getTime();
            set((s) => ({
              flights: s.flights.map((f) => (f.id === prev.id ? next : f)),
              // Keep due times aligned with the new schedule.
              tasks: shift ? s.tasks.map((t) => (t.flightId === prev.id && t.dueAt && t.status !== "completed" ? { ...t, dueAt: new Date(new Date(t.dueAt).getTime() + shift).toISOString() } : t)) : s.tasks,
            }));
            pushAudit(audit("flight.update", "flight", prev.id, `Updated flight ${callsign}`, prev.id));
            return { ok: true, value: next };
          }
          const flight: Flight = {
            id: uid("flt"),
            aircraftId: "ac-demo-700",
            leadId: LEAD_ID,
            pilotIds: get().crew.filter((c) => c.role === "pilot").map((c) => c.id),
            securityIds: get().crew.filter((c) => c.role === "security").map((c) => c.id),
            manifest: [],
            ...input,
            callsign,
            alternates: input.alternates.filter((a) => a && a !== input.destination),
          };
          set((s) => ({ flights: [...s.flights, flight], tasks: [...s.tasks, ...buildChecklist(flight, now, "preflight")] }));
          pushAudit(audit("flight.create", "flight", flight.id, `Created flight ${callsign} ${flight.departure}–${flight.destination}`, flight.id));
          return { ok: true, value: flight };
        },

        assignCabinAttendant(flightId, crewId) {
          const d = deny("task.assign");
          if (d) return d;
          const f = get().flights.find((x) => x.id === flightId);
          const who = get().crew.find((c) => c.id === crewId && c.role === "contract_ca");
          if (!f || !who) return { ok: false, error: "Flight or cabin attendant not found." };
          const prev = f.cabinAttendantId;
          set((s) => ({
            flights: s.flights.map((x) => (x.id === flightId ? { ...x, cabinAttendantId: crewId } : x)),
            tasks: s.tasks.map((t) => (t.flightId === flightId && prev && t.assigneeId === prev && t.status !== "completed" ? { ...t, assigneeId: crewId, history: [...t.history, ev(`Reassigned to ${who.name}`)] } : t)),
          }));
          pushAudit(audit("task.assign", "flight", flightId, `Assigned ${who.name} as cabin attendant for ${f.callsign}`, flightId));
          return { ok: true };
        },

        createHandover(input) {
          const d = deny("handover.create");
          if (d) return d;
          if (input.outgoingId === input.incomingId) return { ok: false, error: "Outgoing and incoming attendants must differ." };
          if (input.acknowledgements.length === 0) return { ok: false, error: "Add at least one required acknowledgement." };
          const h: Handover = {
            ...input,
            id: uid("hnd"),
            createdAt: new Date().toISOString(),
            createdById: me().id,
            status: "submitted",
            acknowledgements: input.acknowledgements.map((label, i) => ({ id: `ack-${i + 1}`, label })),
          };
          const out = get().crew.find((c) => c.id === h.outgoingId)?.name;
          const inc = get().crew.find((c) => c.id === h.incomingId)?.name;
          set((s) => ({ handovers: [h, ...s.handovers] }));
          pushAudit(audit("handover.create", "handover", h.id, `Handover submitted: ${out} → ${inc}`, h.flightId));
          return { ok: true, value: h };
        },

        acknowledgeHandoverItem(handoverId, ackId) {
          const h = get().handovers.find((x) => x.id === handoverId);
          if (!h) return { ok: false, error: "Handover not found." };
          if (h.incomingId !== me().id) return { ok: false, error: "Only the incoming attendant can acknowledge handover items. Use Demo Role Preview to switch." };
          if (h.status === "accepted") return { ok: false, error: "Handover already accepted." };
          const at = new Date().toISOString();
          const item = h.acknowledgements.find((a) => a.id === ackId);
          set((s) => ({
            handovers: s.handovers.map((x) => (x.id === handoverId ? { ...x, acknowledgements: x.acknowledgements.map((a) => (a.id === ackId ? { ...a, ackedAt: a.ackedAt ? undefined : at } : a)) } : x)),
          }));
          if (item && !item.ackedAt) pushAudit(audit("handover.acknowledge", "handover", handoverId, `Acknowledged: ${item.label}`, h.flightId));
          return { ok: true };
        },

        acceptHandover(handoverId) {
          const d = deny("handover.accept");
          if (d) return d;
          const h = get().handovers.find((x) => x.id === handoverId);
          if (!h) return { ok: false, error: "Handover not found." };
          if (h.incomingId !== me().id) return { ok: false, error: "Only the incoming attendant can accept this handover." };
          if (h.acknowledgements.some((a) => !a.ackedAt)) return { ok: false, error: "Acknowledge every required item before accepting." };
          const at = new Date().toISOString();
          set((s) => ({ handovers: s.handovers.map((x) => (x.id === handoverId ? { ...x, status: "accepted", acceptedAt: at, acceptedById: me().id } : x)) }));
          const out = get().crew.find((c) => c.id === h.outgoingId)?.name;
          pushAudit(audit("handover.accept", "handover", handoverId, `Handover accepted from ${out} — ${h.openTaskIds.length} open item(s) transferred`, h.flightId));
          return { ok: true };
        },

        saveBriefing(b) {
          const d = deny("briefing.generate");
          if (d) return d;
          const doc: BriefingDoc = { ...b, id: uid("brf") };
          set((s) => ({ briefings: [doc, ...s.briefings].slice(0, 20) }));
          const f = get().flights.find((x) => x.id === b.flightId);
          pushAudit(audit("briefing.generate", "briefing", doc.id, `Generated cabin safety briefing for ${f?.callsign ?? b.flightId}`, b.flightId));
          return { ok: true, value: doc };
        },

        addCrewInput(input) {
          const d = deny("input.create");
          if (d) return d;
          const text = input.text.trim();
          if (text.length < 5) return { ok: false, error: "Write an instruction of at least 5 characters." };
          if (text.length > 500) return { ok: false, error: "Keep the input under 500 characters." };
          const flight = get().flights.find((f) => f.id === input.flightId);
          if (!flight) return { ok: false, error: "Flight not found." };
          if (flight.status === "completed") return { ok: false, error: "This flight is already completed." };
          const u = me();
          // Every item added by others is a checklist item the cabin attendant must complete.
          const item: CrewInput = { ...input, requiresAck: true, text, id: uid("inp"), fromId: u.id, fromRole: u.role, createdAt: new Date().toISOString(), acks: [] };
          set((s) => ({ crewInputs: [item, ...s.crewInputs] }));
          pushAudit(audit("input.create", "crew_input", item.id, `Added to pre-boarding checklist (${input.priority}): ${text.slice(0, 80)}${text.length > 80 ? "…" : ""}`, flight.id));
          return { ok: true, value: item };
        },

        acknowledgeCrewInput(inputId) {
          const item = get().crewInputs.find((i) => i.id === inputId);
          if (!item) return { ok: false, error: "Input not found." };
          const flight = get().flights.find((f) => f.id === item.flightId);
          const u = me();
          if (!flight || !(u.id === flight.cabinAttendantId || u.role === "lead")) return { ok: false, error: "Only the flight's cabin attendant or the Lead Cabin Attendant can complete this item." };
          if (item.acks.length) return { ok: false, error: "Already completed." };
          const at = new Date().toISOString();
          set((s) => ({ crewInputs: s.crewInputs.map((i) => (i.id === inputId ? { ...i, acks: [...i.acks, { byId: u.id, at }] } : i)) }));
          const from = get().crew.find((c) => c.id === item.fromId)?.name ?? "crew";
          pushAudit(audit("input.acknowledge", "crew_input", inputId, `Completed checklist item added by ${from}`, item.flightId));
          return { ok: true };
        },

        signOffPreboarding(flightId, note) {
          const d = deny("preboard.signoff");
          if (d) return d;
          const s = get();
          const flight = s.flights.find((f) => f.id === flightId);
          if (!flight) return { ok: false, error: "Flight not found." };
          const u = me();
          if (!(u.id === flight.cabinAttendantId || u.role === "lead")) return { ok: false, error: "Pre-boarding sign-off is made by the flight's cabin attendant or the Lead Cabin Attendant." };
          const sim = s.advisories;
          const live = s.intel[flightId]?.advisories ?? [];
          const view = computePreboarding({ flight, tasks: s.tasks, equipment: s.equipment, discrepancies: s.discrepancies, advisories: [...sim, ...live], acks: s.acks, inputs: s.crewInputs, signoffs: s.preboardSignoffs, nowMs: Date.now() });
          if (!view.canSignOff) return { ok: false, error: `Cannot sign off yet: ${view.signoffBlockers.join("; ")}.` };
          const rec: PreboardSignoff = { id: uid("pbs"), flightId, byId: u.id, at: new Date().toISOString(), openItemsAtSignoff: view.openAtSignoff, note: note?.trim() || undefined };
          set((st) => ({ preboardSignoffs: [rec, ...st.preboardSignoffs] }));
          pushAudit(audit("preboard.signoff", "flight", flightId, `Pre-boarding preparation confirmed for ${flight.callsign} by ${u.name}${view.openAtSignoff ? ` — ${view.openAtSignoff} other open item(s) noted` : ""}`, flightId));
          return { ok: true, value: rec };
        },

        saveIntel(key, snap) {
          set((s) => ({ intel: { ...s.intel, [key]: snap } }));
        },

        resetDemo() {
          const fresh = initialState();
          const resetEvent: AuditEvent = { id: uid("aud"), at: new Date().toISOString(), actorId: LEAD_ID, actorRole: "lead", action: "demo.reset", entity: "demo", entityId: "seed", summary: "Demonstration data restored to original seeded state" };
          set({ ...fresh, audit: [resetEvent, ...fresh.audit], hydrated: true });
        },

        demoStart() {
          set({ demo: { active: true, step: 0, done: {} }, currentUserId: LEAD_ID });
        },
        demoGo(step) {
          set((s) => ({ demo: { ...s.demo, active: true, step } }));
        },
        demoMark(key) {
          set((s) => (s.demo.done[key] ? s : { demo: { ...s.demo, done: { ...s.demo.done, [key]: true } } }));
        },
        demoExit() {
          set((s) => ({ demo: { ...s.demo, active: false } }));
        },
      };
    },
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { hydrated, ...rest } = s;
        return Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== "function")) as Partial<Store>;
      },
      migrate: () => initialState() as unknown as Store,
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.warn("CabinSafe: stored demo data could not be read; using seeded data.", error);
      },
    },
  ),
);

export function useMe(): CrewMember {
  return useStore((s) => s.crew.find((c) => c.id === s.currentUserId) ?? s.crew[0]);
}
