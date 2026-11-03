import { describe, expect, it } from "vitest";
import { DOCUMENTS } from "@/data/documents";
import { GUIDES, MOCK_STAMP } from "@/data/guides";
import { createHandoverForms } from "@/data/handoverForms";
import { LIBRARY_GUIDES } from "@/data/library";
import { TABLE_SETTINGS } from "@/data/tableSettings";
import { createPreferences } from "@/data/preferences";
import { createSeed, FEATURED_FLIGHT_ID } from "@/data/seed";
import { checklistTaskId } from "@/domain/checklists";
import { validatePersonName, validatePreferenceText } from "@/domain/preferences";
import type { InventoryItem, Task } from "@/domain/types";
import { upgradeToV10, upgradeToV11, upgradeToV13 } from "./migrate";

const NOW = Date.UTC(2026, 10, 2, 12, 0);

/** Demo data as version 9 saved it: eight everyday checks, old inventory categories, relative equipment dates. */
function v9State() {
  const s = createSeed(NOW);
  const old = (key: string, flightId = FEATURED_FLIGHT_ID): Task => ({
    id: checklistTaskId(flightId, key), flightId, title: key, detail: "", category: "preboarding", phase: "preflight", source: "checklist",
    sourceRef: `template:${key}`, priority: "normal", requiresSignOff: false, status: key === "pb-walk" ? "completed" : "not_started", createdAt: "2026-10-30T00:00:00.000Z", history: [],
  });
  const keys = ["pb-walk", "pb-seals", "pb-galley", "pb-lav", "pb-welcome", "pb-climate", "pb-confid", "pb-sequence"];
  const tasks = [...s.tasks.filter((t) => t.category !== "preboarding" && t.category !== "offboarding"), ...keys.map((k) => old(k))];
  const equipment = s.equipment.map((e) => ({ ...e, lastInspectionAt: "2026-10-20T00:00:00.000Z", nextInspectionDue: "2026-10-25T00:00:00.000Z" }));
  const inventory = [
    { id: "inv-red-wine", name: "Red wine", category: "wine", par: 6, onBoard: 4 },
    { id: "inv-custom", name: "Kombucha", category: "soft_drinks", par: 3, onBoard: 1 },
  ] as unknown as InventoryItem[];
  return { ...s, tasks, equipment, inventory, preferences: undefined };
}

describe("upgrading saved demo data to version 10", () => {
  const up = upgradeToV10(v9State(), NOW);

  it("replaces the old everyday checks with the sectioned list and adds off-boarding", () => {
    const featured = up.tasks.filter((t) => t.flightId === FEATURED_FLIGHT_ID);
    expect(featured.filter((t) => t.category === "preboarding")).toHaveLength(33);
    expect(featured.filter((t) => t.category === "offboarding")).toHaveLength(14);
    expect(up.tasks.some((t) => t.sourceRef === "template:pb-walk")).toBe(false);
    // Other checklist work is untouched.
    expect(up.tasks.filter((t) => t.category !== "preboarding" && t.category !== "offboarding")).toEqual(v9State().tasks.filter((t) => t.category !== "preboarding"));
  });

  it("sets the demo-day equipment dates and keeps open discrepancies", () => {
    const aed = up.equipment.find((e) => e.code === "AED-01")!;
    expect(aed.nextInspectionDue).toBe("2026-11-09T14:00:00.000Z");
    expect(up.equipment.find((e) => e.code === "FAK-02")!.status).toBe("discrepancy");
    expect(up.equipment.every((e) => e.lastInspectionAt! <= "2026-11-02T23:59:59.999Z")).toBe(true);
  });

  it("keeps logged counts and custom items, moves old categories and adds the fuller list", () => {
    const red = up.inventory.find((i) => i.id === "inv-red-wine")!;
    expect(red).toMatchObject({ category: "bar", par: 6, onBoard: 4, verified: false });
    expect(up.inventory.find((i) => i.id === "inv-custom")!.category).toBe("bar");
    expect(up.inventory.filter((i) => i.name === "Red wine")).toHaveLength(1);
    expect(up.inventory.some((i) => i.id === "inv-life-vests")).toBe(true);
  });

  it("adds placeholder preferences once", () => {
    expect(up.preferences).toEqual(createPreferences());
    const mine = [{ ...createPreferences()[0], name: "Real name" }];
    expect(upgradeToV10({ ...v9State(), preferences: mine }, NOW).preferences).toBe(mine);
  });
});

describe("upgrading saved demo data to version 11", () => {
  it("swaps in the fixed-date demo but keeps stock, preferences and the demo role", () => {
    const fresh = { ...createSeed(NOW), currentUserId: "crew-lead", inventory: [] as InventoryItem[], preferences: createPreferences() };
    const saved = { ...upgradeToV10(v9State(), NOW), currentUserId: "crew-pic", preferences: [{ ...createPreferences()[0], name: "Kept" }] };
    for (const [state, version] of [[saved, 10], [v9State(), 9]] as const) {
      const up = upgradeToV11({ ...state, currentUserId: "crew-pic" }, version, fresh, NOW);
      expect(up.flights).toBe(fresh.flights);
      expect(up.tasks).toBe(fresh.tasks);
      expect(up.currentUserId).toBe("crew-pic");
      expect(up.inventory.find((i) => i.id === "inv-red-wine")).toMatchObject({ par: 6, onBoard: 4, category: "bar" });
    }
    expect(upgradeToV11(saved, 10, fresh, NOW).preferences[0].name).toBe("Kept");
  });
});

describe("preferences", () => {
  it("seeds a principal and clearly fake frequent passengers in every category", () => {
    const people = createPreferences();
    expect(people.filter((p) => p.relation === "principal")).toHaveLength(1);
    expect(people.every((p) => p.name.includes("(placeholder)"))).toBe(true);
    expect(new Set(people[0].preferences.map((x) => x.category)).size).toBe(8);
    expect(new Set(people.flatMap((p) => p.preferences.map((x) => x.id))).size).toBe(people.flatMap((p) => p.preferences).length);
  });

  it("checks names and preference text", () => {
    const people = createPreferences();
    expect(validatePersonName("  Guest   E ", people)).toEqual({ ok: true, value: "Guest E" });
    expect(validatePersonName("guest b (placeholder)", people).ok).toBe(false);
    expect(validatePersonName("Guest B (placeholder)", people, "pref-guest-b").ok).toBe(true);
    expect(validatePersonName("A", people).ok).toBe(false);
    expect(validatePreferenceText("   ").ok).toBe(false);
    expect(validatePreferenceText("x".repeat(201)).ok).toBe(false);
    expect(validatePreferenceText(" Still  water ")).toEqual({ ok: true, value: "Still water" });
  });
});

describe("documents", () => {
  it("lists the four mock guides", () => {
    expect(LIBRARY_GUIDES.map((d) => d.title)).toEqual(["G700 Cabin Familiarization", "Galley Guide", "Service Standards", "Safety Guide"]);
    expect(MOCK_STAMP).toBe("MOCK DOCUMENT - For Demonstration Only");
  });

  it("gives every guide unique section and heading ids, so the contents links land in one place", () => {
    for (const g of GUIDES) {
      const ids = g.sections.flatMap((s) => [s.id, ...s.blocks.flatMap((b) => (b.type === "h3" ? [b.id] : []))]);
      expect(new Set(ids).size, g.slug).toBe(ids.length);
      expect(ids).not.toContain("contents");
    }
  });

  it("draws a table setting for each meal type and each cuisine", () => {
    const service = GUIDES.find((g) => g.slug === "service-standards")!;
    const drawn = service.sections.flatMap((s) => s.blocks.flatMap((b) => (b.type === "setting" ? [b.id] : [])));
    expect(drawn.sort()).toEqual(Object.keys(TABLE_SETTINGS).sort());
    for (const s of Object.values(TABLE_SETTINGS)) for (const p of s.pieces) expect(p.x >= 0 && p.x <= 320 && p.y >= 0 && p.y <= 196, `${s.title}: ${p.label}`).toBe(true);
  });

  it("puts all the safety content in the one Safety Guide", () => {
    const safety = GUIDES.find((g) => g.slug === "safety-guide")!;
    expect(safety.sections.map((s) => s.title)).toEqual(expect.arrayContaining(["Emergency Equipment and Locations", "Oxygen", "Fire Extinguishers", "First Aid and AED", "Evacuation and Exits", "Turbulence Procedures", "Medical Situations"]));
    // The older documents stay available for the Copilot.
    expect(DOCUMENTS.some((d) => d.code === "CSI-MED-002")).toBe(true);
  });
});

describe("upgrading saved demo data to version 13", () => {
  it("keeps saved data and adds the sample handover", () => {
    const saved = { currentUserId: "crew-x", inventory: [], preferences: [] } as { currentUserId: string; inventory: never[]; preferences: never[]; handoverForms?: ReturnType<typeof createHandoverForms> };
    const up = upgradeToV13(saved);
    expect(up.currentUserId).toBe("crew-x");
    expect(up.handoverForms.map((f) => f.id)).toEqual(["hof-sample-csi100"]);
    const mine = [{ ...createHandoverForms()[0], id: "hof-mine", sample: false }];
    expect(upgradeToV13({ ...saved, handoverForms: mine }).handoverForms).toBe(mine);
  });
});
