import { describe, expect, it } from "vitest";
import { createInventory } from "@/data/inventory";
import { LEAD_ID } from "@/data/seed";
import { groupInventory, parseCount, stockLevel, summarizeInventory } from "./inventory";
import type { InventoryItem } from "./types";

const NOW = Date.UTC(2026, 9, 26, 14, 0);

const item = (patch: Partial<InventoryItem>): InventoryItem => ({ id: "x", name: "X", category: "wine", par: 5, onBoard: 5, ...patch });

describe("cabin inventory", () => {
  it("seeds the usual stock list with its usual levels", () => {
    const inv = createInventory(NOW);
    expect(inv.map((i) => `${i.name} ${i.par}`)).toEqual([
      "White wine 5",
      "Red wine 5",
      "Milk 2",
      "Orange juice 2",
      "Chips 10",
      "Coke 5",
      "Diet Coke 5",
      "Sprite 5",
      "Ginger ale 5",
      "Coffee 2",
    ]);
    expect(new Set(inv.map((i) => i.id)).size).toBe(inv.length);
    expect(inv.every((i) => i.onBoard >= 0 && i.onBoard <= i.par && i.updatedById === LEAD_ID)).toBe(true);
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
    expect(s).toMatchObject({ total: 10, full: 6, low: 3, out: 1 });
    expect(s.restock.map((r) => `${r.item.name} ${r.need}`)).toEqual(["Ginger ale 5", "Diet Coke 3", "Orange juice 1", "Red wine 2"]);
    expect(s.lastUpdatedById).toBe(LEAD_ID);
  });

  it("reports the most recent update", () => {
    const s = summarizeInventory([item({ id: "a", updatedAt: "2026-10-26T10:00:00.000Z", updatedById: "p" }), item({ id: "b", updatedAt: "2026-10-26T12:00:00.000Z", updatedById: "q" }), item({ id: "c" })]);
    expect(s.lastUpdatedAt).toBe("2026-10-26T12:00:00.000Z");
    expect(s.lastUpdatedById).toBe("q");
  });

  it("groups items by category in a fixed order and skips empty groups", () => {
    const groups = groupInventory(createInventory(NOW));
    expect(groups.map((g) => g.label)).toEqual(["Wine", "Soft drinks", "Milk & juice", "Snacks", "Coffee"]);
    expect(groups.find((g) => g.category === "soft_drinks")!.items.map((i) => i.name)).toEqual(["Coke", "Diet Coke", "Sprite", "Ginger ale"]);
    expect(groupInventory([item({ category: "coffee" })]).map((g) => g.category)).toEqual(["coffee"]);
  });
});
