import { describe, expect, it } from "vitest";
import { createSeed, FEATURED_FLIGHT_ID, LEAD_ID, CA_SAM } from "@/data/seed";
import { generateBriefing } from "./briefing";
import type { FlightContext } from "./context";
import { answer, NO_SOURCE_MESSAGE } from "./copilot";
import { computeReadiness, effectiveEquipmentStatus } from "./readiness";
import { retrieve } from "./retrieval";
import { generateTasksForPassenger } from "./rules";

const NOW = Date.UTC(2026, 9, 26, 14, 0);

function ctx(overrides: Partial<FlightContext> = {}): FlightContext {
  const s = createSeed(NOW);
  const flight = s.flights.find((f) => f.id === FEATURED_FLIGHT_ID)!;
  return {
    flight,
    tasks: s.tasks,
    equipment: s.equipment,
    discrepancies: s.discrepancies,
    advisories: s.advisories,
    acks: [],
    passengers: s.passengers,
    crew: s.crew,
    handovers: s.handovers,
    role: "lead",
    nowMs: NOW,
    ...overrides,
  };
}

describe("seed", () => {
  it("contains the required demonstration records", () => {
    const s = createSeed(NOW);
    expect(s.flights.filter((f) => f.status !== "completed")).toHaveLength(3);
    expect(s.passengers).toHaveLength(8);
    expect(s.crew.filter((c) => c.role === "contract_ca" || c.role === "lead")).toHaveLength(3);
    expect(s.handovers.filter((h) => h.status !== "accepted")).toHaveLength(1);
    expect(s.advisories.every((a) => a.origin === "simulated")).toBe(true);
  });

  it("generates dates relative to the seeding time", () => {
    const s = createSeed(NOW);
    const f = s.flights.find((x) => x.id === FEATURED_FLIGHT_ID)!;
    const h = (new Date(f.departAt).getTime() - NOW) / 3_600_000;
    expect(h).toBeGreaterThan(19);
    expect(h).toBeLessThan(21);
  });
});

describe("readiness", () => {
  it("never reports prepared while a critical equipment blocker exists", () => {
    const c = ctx();
    const r = computeReadiness(c);
    expect(r.level).toBe("not_ready");
    expect(r.blockers.some((b) => b.label.includes("AED-01"))).toBe(true);
  });

  it("keeps task completion separate from readiness", () => {
    const c = ctx();
    const allDone = c.tasks.map((t) => (t.flightId === FEATURED_FLIGHT_ID ? { ...t, status: "completed" as const, reviewed: true } : t));
    const r = computeReadiness({ ...c, tasks: allDone });
    expect(r.taskCompletion.pct).toBe(100);
    expect(r.level).toBe("not_ready"); // AED still due
  });

  it("an unresolved critical discrepancy blocks prepared status", () => {
    const c = ctx();
    const allDone = c.tasks.map((t) => ({ ...t, status: "completed" as const, reviewed: true }));
    const equipment = c.equipment.map((e) => ({ ...e, status: "serviceable" as const, nextInspectionDue: new Date(NOW + 30 * 86_400_000).toISOString() }));
    const acks = c.advisories.map((a) => ({ advisoryId: a.id, flightId: FEATURED_FLIGHT_ID, byId: LEAD_ID, at: new Date(NOW).toISOString() }));
    const clean = computeReadiness({ ...c, tasks: allDone, equipment, discrepancies: [], acks });
    expect(clean.level).toBe("prepared");
    expect(clean.headline).not.toMatch(/^Cabin Ready$/);
    const withCritical = computeReadiness({
      ...c, tasks: allDone, equipment, acks,
      discrepancies: [{ id: "x", title: "Cabin door seal", detail: "", severity: "critical", reportedAt: "", reportedById: LEAD_ID, status: "open", phase: "preflight" }],
    });
    expect(withCritical.level).toBe("not_ready");
  });

  it("derives inspection-due status from dates", () => {
    const c = ctx();
    const aed = c.equipment.find((e) => e.code === "AED-01")!;
    expect(effectiveEquipmentStatus(aed, NOW)).toBe("inspection_due");
  });
});

describe("rules engine", () => {
  it("creates boarding preparation for a documented mobility requirement", () => {
    const c = ctx();
    const sage = c.passengers.find((p) => p.alias === "SAGE")!;
    const tasks = generateTasksForPassenger(sage, c.flight, new Set(), new Date(NOW).toISOString());
    expect(tasks.some((t) => t.title.startsWith("Boarding assistance preparation"))).toBe(true);
    const equip = tasks.find((t) => t.title.startsWith("Confirm medical equipment"))!;
    expect(equip.detail).toMatch(/Do not assume/);
  });

  it("creates ingredient verification and cross-contact tasks for allergy precautions", () => {
    const c = ctx();
    const orion = c.passengers.find((p) => p.alias === "ORION")!;
    const titles = generateTasksForPassenger(orion, c.flight, new Set(), "").map((t) => t.title);
    expect(titles).toContain("Catering ingredient verification — peanut");
    expect(titles).toContain("Galley cross-contact prevention — peanut");
  });

  it("does not duplicate existing tasks", () => {
    const c = ctx();
    const sage = c.passengers.find((p) => p.alias === "SAGE")!;
    const first = generateTasksForPassenger(sage, c.flight, new Set(), "");
    const again = generateTasksForPassenger(sage, c.flight, new Set(first.map((t) => t.id)), "");
    expect(again).toHaveLength(0);
  });
});

describe("copilot", () => {
  it("refuses aircraft-specific emergency procedures without a source", () => {
    const a = answer("What is the evacuation procedure?", ctx());
    expect(a.markdown.startsWith(NO_SOURCE_MESSAGE)).toBe(true);
  });

  it("refuses to authorize departure", () => {
    const a = answer("Are we cleared to depart?", ctx());
    expect(a.kind).toBe("authorization_refusal");
    expect(a.citations.length).toBeGreaterThan(0);
  });

  it("refuses medical treatment questions", () => {
    expect(answer("What medication should I give SAGE?", ctx()).kind).toBe("medical_refusal");
  });

  it("answers allergen procedure questions with citations", () => {
    const a = answer("How do we control peanut cross-contact?", ctx());
    expect(a.kind).toBe("document");
    expect(a.citations[0].code).toBe("CSI-CAT-003");
  });

  it("returns the no-source message for unsupported questions", () => {
    expect(answer("What is the cruise altitude limit?", ctx()).markdown).toBe(NO_SOURCE_MESSAGE);
  });

  it("lists incomplete items from records", () => {
    const a = answer("What is still incomplete for this flight?", ctx());
    expect(a.kind).toBe("incomplete");
    expect(a.markdown).toMatch(/AED readiness inspection/);
  });

  it("hides restricted medical detail from non-lead roles", () => {
    const lead = answer("Review passenger accommodations", ctx());
    const ca = answer("Review passenger accommodations", ctx({ role: "contract_ca" }));
    expect(lead.markdown).toMatch(/COPD/);
    expect(ca.markdown).not.toMatch(/COPD/);
  });

  it("never retrieves superseded documents", () => {
    expect(retrieve("ordering superseded allergen", 5, 0).every((p) => p.version !== "1.0" || p.code !== "CSI-CAT-003")).toBe(true);
  });
});

describe("briefing", () => {
  it("contains all ten sections and labels simulated advisories", () => {
    const b = generateBriefing(ctx({ role: "contract_ca" }));
    for (let i = 1; i <= 10; i++) expect(b.markdown).toContain(`## ${i}.`);
    expect(b.markdown).toContain("[SIMULATED]");
    expect(b.markdown).not.toMatch(/COPD|Parkinson/);
    expect(b.markdown).toMatch(/does not authorize departure/);
  });

  it("reflects the assigned cabin attendant", () => {
    const b = generateBriefing(ctx());
    expect(b.markdown).toContain("Sam Whitaker");
    void CA_SAM;
  });
});
