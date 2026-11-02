import { describe, expect, it } from "vitest";
import { createInventory } from "@/data/inventory";
import { LEAD_ID } from "@/data/seed";
import { groupInventory, parseCount, stockLevel, summarizeInventory, validateInventoryItem } from "./inventory";
import type { InventoryItem } from "./types";

const NOW = Date.UTC(2026, 9, 26, 14, 0);

const item = (patch: Partial<InventoryItem>): InventoryItem => ({ id: "x", name: "X", category: "bar", par: 5, onBoard: 5, ...patch });

describe("cabin inventory", () => {
  it("seeds a G700 stock list with every category and every amount to be verified", () => {
    const inv = createInventory(NOW);
    const par = (n: string) => inv.find((i) => i.name === n)?.par;
    // The original list keeps its usual amounts.
    expect([par("White wine"), par("Red wine"), par("Milk"), par("Orange juice"), par("Chips"), par("Coke"), par("Diet Coke"), par("Sprite"), par("Ginger ale"), par("Coffee")]).toEqual([5, 5, 2, 2, 10, 5, 5, 5, 5, 2]);
    expect(new Set(inv.map((i) => i.category))).toEqual(new Set(["galley", "bar", "serviceware", "linens", "lav", "cabin", "first_aid", "emergency"]));
    expect(new Set(inv.map((i) => i.id)).size).toBe(inv.length);
    expect(new Set(inv.map((i) => i.name.toLowerCase())).size).toBe(inv.length);
    expect(inv.every((i) => i.onBoard >= 0 && i.onBoard <= i.par && i.par <= 99 && i.updatedById === LEAD_ID && i.verified === false)).toBe(true);
  });

  it("classifies stock as full, low or out", () => {
    expect(stockLevel(item({ onBoard: 5 }))).toBe("full");
    expect(stockLevel(item({ onBoard: 7 }))).toBe("full");
    expect(stockLevel(item({ onBoard: 4 }))).toBe("low");
    expect(stockLevel(item({ onBoard: 0 }))).toBe("out");
  });

  it("accepts only whole numbers from 0 to 99", () => {
    expect(parseCount("3")).toBe(3);
    expect(parseCount(0)).toBe(0);
    expect(parseCount(" 12 ")).toBe(12);
    for (const bad of ["", "-1", "2.5", "abc", 100, -1, Number.NaN, undefined]) expect(parseCount(bad)).toBeNull();
  });

  it("summarizes stock and lists what to restock, emptiest first", () => {
    const s = summarizeInventory(createInventory(NOW));
    expect(s).toMatchObject({ low: 4, out: 1, toVerify: s.total });
    expect(s.full).toBe(s.total - 5);
    expect(s.restock.map((r) => `${r.item.name} ${r.need}`)).toEqual(["Ginger ale 5", "Diet Coke 3", "Adhesive dressings (boxes) 1", "Orange juice 1", "Red wine 2"]);
    expect(s.lastUpdatedById).toBe(LEAD_ID);
  });

  it("reports the most recent update", () => {
    const s = summarizeInventory([item({ id: "a", updatedAt: "2026-10-26T10:00:00.000Z", updatedById: "p" }), item({ id: "b", updatedAt: "2026-10-26T12:00:00.000Z", updatedById: "q" }), item({ id: "c" })]);
    expect(s.lastUpdatedAt).toBe("2026-10-26T12:00:00.000Z");
    expect(s.lastUpdatedById).toBe("q");
  });

  it("groups items by category in a fixed order and skips empty groups", () => {
    const groups = groupInventory(createInventory(NOW));
    expect(groups.map((g) => g.label)).toEqual(["Galley", "Bar", "Serviceware", "Linens", "Lav supplies", "Cabin supplies", "First aid", "Emergency equipment"]);
    expect(groupInventory([item({ category: "linens" })]).map((g) => g.category)).toEqual(["linens"]);
    expect(groupInventory([item({ category: "other" }), item({ id: "y", category: "bar" })]).map((g) => g.label)).toEqual(["Bar", "Other"]);
  });

  describe("adding and editing items", () => {
    const list = createInventory(NOW);

    it("accepts a new item and tidies its name", () => {
      expect(validateInventoryItem({ name: "  Sparkling   water ", category: "galley", par: "6", onBoard: "2" }, list)).toEqual({
        ok: true,
        value: { name: "Sparkling water", category: "galley", par: 6, onBoard: 2, verified: false },
      });
      expect(validateInventoryItem({ name: "Sparkling wine", category: "other", par: 4 }, list)).toMatchObject({ ok: true, value: { onBoard: 0 } });
      expect(validateInventoryItem({ name: "Sparkling wine", category: "other", par: 4, verified: true }, list)).toMatchObject({ ok: true, value: { verified: true } });
    });

    it("rejects duplicates, bad names and bad amounts", () => {
      const bad = (input: Parameters<typeof validateInventoryItem>[0]) => validateInventoryItem(input, list).ok;
      expect(bad({ name: "red WINE", category: "bar", par: 5 })).toBe(false);
      expect(bad({ name: "x", category: "bar", par: 5 })).toBe(false);
      expect(bad({ name: "A".repeat(41), category: "bar", par: 5 })).toBe(false);
      expect(bad({ name: "Sparkling wine", category: "nope" as never, par: 5 })).toBe(false);
      for (const par of ["", "0", 0, 100, "2.5"]) expect(bad({ name: "Sparkling wine", category: "other", par })).toBe(false);
      expect(bad({ name: "Sparkling wine", category: "other", par: 5, onBoard: "100" })).toBe(false);
    });

    it("lets an item keep its own name when edited", () => {
      expect(validateInventoryItem({ name: "Red wine", category: "bar", par: 6 }, list, "inv-red-wine").ok).toBe(true);
      expect(validateInventoryItem({ name: "White wine", category: "bar", par: 6 }, list, "inv-red-wine").ok).toBe(false);
    });
  });
});
