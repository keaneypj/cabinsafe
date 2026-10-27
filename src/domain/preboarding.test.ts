import { describe, expect, it } from "vitest";
import { CA_SAM, createSeed, FEATURED_FLIGHT_ID, LEAD_ID } from "@/data/seed";
import { answer } from "./copilot";
import { boardingTime, computePreboarding, isPreboardOwner, type PreboardInput } from "./preboarding";

const NOW = Date.UTC(2026, 9, 26, 14, 0);

function input(patch: Partial<PreboardInput> = {}): PreboardInput {
  const s = createSeed(NOW);
  return {
    flight: s.flights.find((f) => f.id === FEATURED_FLIGHT_ID)!,
    tasks: s.tasks,
    equipment: s.equipment,
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
    expect(v.checks).toHaveLength(8);
    expect(v.checks.every((t) => t.assigneeId === CA_SAM)).toBe(true);
    expect(v.inputs.map((i) => i.fromRole).sort()).toEqual(["assistant", "lead", "pilot"]);
    expect(v.pendingAcks).toHaveLength(3);
    expect(v.passengerItems.length).toBeGreaterThan(0);
    expect(v.attention.some((a) => a.kind === "blocker" && a.label.includes("AED-01"))).toBe(true);
    expect(v.attention.some((a) => a.kind === "blocked")).toBe(true);
    expect(v.attention.some((a) => a.kind === "advisory")).toBe(true);
    expect(v.canSignOff).toBe(false);
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
