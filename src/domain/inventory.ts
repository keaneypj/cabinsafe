import type { InventoryCategory, InventoryItem } from "./types";

export type StockLevel = "full" | "low" | "out";

/** Highest count that can be logged for one item. */
export const MAX_COUNT = 99;

export const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  wine: "Wine",
  soft_drinks: "Soft drinks",
  fresh: "Milk & juice",
  snacks: "Snacks",
  coffee: "Coffee",
};

export const CATEGORY_ORDER: InventoryCategory[] = ["wine", "soft_drinks", "fresh", "snacks", "coffee"];

export function stockLevel(item: Pick<InventoryItem, "onBoard" | "par">): StockLevel {
  if (item.onBoard <= 0) return "out";
  if (item.onBoard < item.par) return "low";
  return "full";
}

/** Turns typed or stepped input into a valid count, or null if it isn't one. */
export function parseCount(value: unknown): number | null {
  const n = typeof value === "string" ? (value.trim() === "" ? NaN : Number(value)) : typeof value === "number" ? value : NaN;
  if (!Number.isInteger(n) || n < 0 || n > MAX_COUNT) return null;
  return n;
}

export interface InventorySummary {
  total: number;
  full: number;
  low: number;
  out: number;
  /** Items below their usual stock, most urgent first, with how many are needed. */
  restock: { item: InventoryItem; need: number }[];
  lastUpdatedAt?: string;
  lastUpdatedById?: string;
}

export function summarizeInventory(items: InventoryItem[]): InventorySummary {
  const levels = items.map(stockLevel);
  const restock = items
    .filter((i) => i.onBoard < i.par)
    .map((item) => ({ item, need: item.par - item.onBoard }))
    .sort((a, b) => a.item.onBoard / a.item.par - b.item.onBoard / b.item.par || a.item.name.localeCompare(b.item.name));
  const latest = items.reduce<InventoryItem | undefined>((acc, i) => (i.updatedAt && (!acc?.updatedAt || i.updatedAt > acc.updatedAt) ? i : acc), undefined);
  return {
    total: items.length,
    full: levels.filter((l) => l === "full").length,
    low: levels.filter((l) => l === "low").length,
    out: levels.filter((l) => l === "out").length,
    restock,
    lastUpdatedAt: latest?.updatedAt,
    lastUpdatedById: latest?.updatedById,
  };
}

export function groupInventory(items: InventoryItem[]): { category: InventoryCategory; label: string; items: InventoryItem[] }[] {
  return CATEGORY_ORDER.map((category) => ({ category, label: CATEGORY_LABELS[category], items: items.filter((i) => i.category === category) })).filter((g) => g.items.length > 0);
}
