import { describe, expect, it } from "vitest";
import { CA_SAM, createSeed, FEATURED_FLIGHT_ID, LEAD_ID } from "@/data/seed";
import { PREBOARD_SECTIONS, preboardSectionOf } from "./checklists";
import { answer } from "./copilot";
import { effectiveEquipmentStatus } from "./readiness";
import { boardingTime, computePreboarding, isPreboardOwner, type PreboardInput } from "./preboarding";

const NOW = Date.UTC(2026, 10, 4, 14, 0); // demo day

/** The demo data has nothing overdue, so readiness tests make the AED overdue themselves. */
const aedOverdue = (equipment: ReturnType<typeof createSeed>["equipment"]) =>
  equipment.map((e) => (e.code === "AED-01" ? { ...e, status: "inspection_due" as const, nextInspectionDue: new Date(NOW - 2 * 3_600_000).toISOString() } : e));

function input(patch: Partial<PreboardInput> = {}): PreboardInput {
  const s = createSeed(NOW);
  return {
    flight: s.flights.find((f) => f.id === FEATURED_FLIGHT_ID)!,
    tasks: s.tasks,
    equipment: aedOverdue(s.equipment),
    discrepancies: s.discrepancies,
    advisories: s.advisories,
    acks: [],
    inputs: s.crewInputs,
    signoffs: [],
    nowMs: NOW,
    ...patch,
  };
}

describe("pre-boarding", () => {
  it("collects checks, crew inputs, passenger items and attention items for the flight", () => {
    const v = computePreboarding(input());
    expect(v.checks).toHaveLength(PREBOARD_SECTIONS.reduce((n, s) => n + s.items.length, 0));
    expect(v.offboard).toHaveLength(14);
    expect(v.checks.every((t) => preboardSectionOf(t.sourceRef))).toBe(true);
    expect(v.checks.every((t) => t.assigneeId === CA_SAM)).toBe(true);
    expect(v.inputs.map((i) => i.fromRole).sort()).toEqual(["assistant", "lead", "pilot"]);
    expect(v.pendingAcks).toHaveLength(3);
    expect(v.passengerItems.length).toBeGreaterThan(0);
    expect(v.attention.some((a) => a.kind === "blocker" && a.label.includes("AED-01"))).toBe(true);
    expect(v.attention.some((a) => a.kind === "blocked")).toBe(true);
    expect(v.attention.some((a) => a.kind === "advisory")).toBe(true);
    expect(v.canSignOff).toBe(false);
  });

  it("keeps 'Needs attention' to items that affect boarding", () => {
    const v = computePreboarding(input());
    expect(v.attention.map((a) => a.kind).sort()).toEqual(["advisory", "blocked", "blocker", "equipment"]);
    expect(v.attention.some((a) => a.label.startsWith("FL-03"))).toBe(false); // minor item on non-critical equipment
  });

  it("boards 30 minutes before departure", () => {
    const f = input().flight;
    expect(new Date(f.departAt).getTime() - new Date(boardingTime(f)).getTime()).toBe(30 * 60_000);
  });

  it("requires checks, acknowledgements and no critical blockers before sign-off", () => {
    const base = input();
    const tasks = base.tasks.map((t) => (t.category === "preboarding" ? { ...t, status: "completed" as const } : t));
    const inputs = base.inputs.map((i) => ({ ...i, acks: [{ byId: CA_SAM, at: new Date(NOW).toISOString() }] }));
    const stillBlocked = computePreboarding({ ...base, tasks, inputs });
    expect(stillBlocked.signoffBlockers).toEqual(["1 critical blocker unresolved"]);
    const equipment = base.equipment.map((e) => ({ ...e, nextInspectionDue: new Date(NOW + 10 * 86_400_000).toISOString() }));
    const ready = computePreboarding({ ...base, tasks, inputs, equipment });
    expect(ready.canSignOff).toBe(true);
    expect(ready.progress.pct).toBe(100);
  });

  it("lets only the flight's cabin attendant or the Lead CA own pre-boarding", () => {
    const s = createSeed(NOW);
    const f = s.flights.find((x) => x.id === FEATURED_FLIGHT_ID)!;
    const by = (id: string) => s.crew.find((c) => c.id === id)!;
    expect(isPreboardOwner(by(CA_SAM), f)).toBe(true);
    expect(isPreboardOwner(by(LEAD_ID), f)).toBe(true);
    expect(isPreboardOwner(by("crew-ca-claire"), f)).toBe(false);
    expect(isPreboardOwner(by("crew-pic"), f)).toBe(false);
  });

  it("Copilot summarizes pre-boarding status from records", () => {
    const s = createSeed(NOW);
    const a = answer("What's left before boarding?", {
      flight: s.flights.find((f) => f.id === FEATURED_FLIGHT_ID)!, tasks: s.tasks, equipment: s.equipment, discrepancies: s.discrepancies,
      advisories: s.advisories, acks: [], passengers: s.passengers, crew: s.crew, handovers: s.handovers, role: "contract_ca", nowMs: NOW, crewInputs: s.crewInputs, preboardSignoffs: [],
    });
    expect(a.kind).toBe("preboarding");
    expect(a.markdown).toMatch(/Capt\. Daniel Hart/);
    expect(a.markdown).toMatch(/Pilot in Command/);
  });
});

describe("demo-day equipment dates", () => {
  it("shows every item current from the demo through the first flight", () => {
    const s = createSeed(NOW);
    const flightDay = Date.parse("2026-11-06T23:00:00Z");
    for (const at of [NOW, flightDay]) {
      const flagged = s.equipment.filter((e) => ["inspection_due", "due_soon", "unserviceable"].includes(effectiveEquipmentStatus(e, at))).map((e) => e.code);
      expect(flagged).toEqual([]);
    }
    for (const e of s.equipment) {
      expect(e.lastInspectionAt! <= "2026-11-02T23:59:59.999Z").toBe(true);
      expect(e.nextInspectionDue >= "2026-11-08").toBe(true);
    }
  });
});
