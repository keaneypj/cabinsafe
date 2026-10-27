import type { InventoryItem } from "@/domain/types";
import { LEAD_ID } from "./seed";

/**
 * Items usually stocked on board, with their usual stock level (par).
 * Starting counts are demonstration values, a few short of par so the
 * restock list has something to show.
 */
const STOCK: Omit<InventoryItem, "updatedAt" | "updatedById">[] = [
  { id: "inv-white-wine", name: "White wine", category: "wine", par: 5, onBoard: 5 },
  { id: "inv-red-wine", name: "Red wine", category: "wine", par: 5, onBoard: 3 },
  { id: "inv-milk", name: "Milk", category: "fresh", par: 2, onBoard: 2 },
  { id: "inv-orange-juice", name: "Orange juice", category: "fresh", par: 2, onBoard: 1 },
  { id: "inv-chips", name: "Chips", category: "snacks", par: 10, onBoard: 10 },
  { id: "inv-coke", name: "Coke", category: "soft_drinks", par: 5, onBoard: 5 },
  { id: "inv-diet-coke", name: "Diet Coke", category: "soft_drinks", par: 5, onBoard: 2 },
  { id: "inv-sprite", name: "Sprite", category: "soft_drinks", par: 5, onBoard: 5 },
  { id: "inv-ginger-ale", name: "Ginger ale", category: "soft_drinks", par: 5, onBoard: 0 },
  { id: "inv-coffee", name: "Coffee", category: "coffee", par: 2, onBoard: 2 },
];

export function createInventory(nowMs: number = Date.now()): InventoryItem[] {
  const countedAt = new Date(nowMs - 6 * 3_600_000).toISOString();
  return STOCK.map((i) => ({ ...i, updatedAt: countedAt, updatedById: LEAD_ID }));
}
