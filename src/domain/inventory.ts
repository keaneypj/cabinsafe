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
  other: "Other",
};

export const CATEGORY_ORDER: InventoryCategory[] = ["wine", "soft_drinks", "fresh", "snacks", "coffee", "other"];

export interface InventoryItemInput {
  name: string;
  category: InventoryCategory;
  par: number | string;
  /** Only used when adding an item; counts are otherwise logged from the list. */
  onBoard?: number | string;
}

export type ValidItem = { name: string; category: InventoryCategory; par: number; onBoard: number };

/**
 * Checks an item being added or edited. `editingId` is the item being edited,
 * so it doesn't clash with its own name.
 */
export function validateInventoryItem(input: InventoryItemInput, existing: InventoryItem[], editingId?: string): { ok: true; value: ValidItem } | { ok: false; error: string } {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 40) return { ok: false, error: "Give the item a name of 2 to 40 characters." };
  const clash = existing.find((i) => i.id !== editingId && i.name.toLowerCase() === name.toLowerCase());
  if (clash) return { ok: false, error: `${clash.name} is already on the list.` };
  if (!CATEGORY_ORDER.includes(input.category)) return { ok: false, error: "Choose a category." };
  const par = parseCount(input.par);
  if (par === null || par < 1) return { ok: false, error: `Set the usual amount to a whole number from 1 to ${MAX_COUNT}.` };
  const onBoard = input.onBoard === undefined || input.onBoard === "" ? 0 : parseCount(input.onBoard);
  if (onBoard === null) return { ok: false, error: `Set the amount on board to a whole number from 0 to ${MAX_COUNT}.` };
  return { ok: true, value: { name, category: input.category, par, onBoard } };
}

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
