import type { InventoryCategory, InventoryItem } from "@/domain/types";
import { LEAD_ID } from "./seed";

type Stock = Omit<InventoryItem, "category" | "updatedAt" | "updatedById" | "verified">;

/**
 * Items usually stocked on a G700, grouped by category, with their usual stock level (par).
 * Every amount is a demonstration value marked "To be verified" until it has been
 * checked against the real aircraft. A few counts start short of par so the
 * restock list has something to show.
 */
const STOCK: Record<InventoryCategory, Stock[]> = {
  galley: [
    { id: "inv-milk", name: "Milk", par: 2, onBoard: 2 },
    { id: "inv-orange-juice", name: "Orange juice", par: 2, onBoard: 1 },
    { id: "inv-still-water", name: "Still water (bottles)", par: 24, onBoard: 24 },
    { id: "inv-sparkling-water", name: "Sparkling water (bottles)", par: 12, onBoard: 12 },
    { id: "inv-coffee", name: "Coffee", par: 2, onBoard: 2 },
    { id: "inv-tea", name: "Tea selection (boxes)", par: 2, onBoard: 2 },
    { id: "inv-sugar", name: "Sugar and sweeteners (caddies)", par: 1, onBoard: 1 },
    { id: "inv-chips", name: "Chips", par: 10, onBoard: 10 },
    { id: "inv-nuts", name: "Mixed nuts", par: 6, onBoard: 6 },
    { id: "inv-chocolate", name: "Chocolate", par: 6, onBoard: 6 },
  ],
  bar: [
    { id: "inv-white-wine", name: "White wine", par: 5, onBoard: 5 },
    { id: "inv-red-wine", name: "Red wine", par: 5, onBoard: 3 },
    { id: "inv-champagne", name: "Champagne", par: 4, onBoard: 4 },
    { id: "inv-coke", name: "Coke", par: 5, onBoard: 5 },
    { id: "inv-diet-coke", name: "Diet Coke", par: 5, onBoard: 2 },
    { id: "inv-sprite", name: "Sprite", par: 5, onBoard: 5 },
    { id: "inv-ginger-ale", name: "Ginger ale", par: 5, onBoard: 0 },
    { id: "inv-tonic", name: "Tonic water", par: 6, onBoard: 6 },
    { id: "inv-soda", name: "Soda water", par: 6, onBoard: 6 },
    { id: "inv-ice", name: "Ice (bags)", par: 4, onBoard: 4 },
    { id: "inv-citrus", name: "Lemons and limes", par: 4, onBoard: 4 },
  ],
  serviceware: [
    { id: "inv-dinner-plates", name: "Dinner plates", par: 16, onBoard: 16 },
    { id: "inv-side-plates", name: "Side plates", par: 16, onBoard: 16 },
    { id: "inv-bowls", name: "Bowls", par: 12, onBoard: 12 },
    { id: "inv-cutlery", name: "Cutlery sets", par: 16, onBoard: 16 },
    { id: "inv-wine-glasses", name: "Wine glasses", par: 12, onBoard: 12 },
    { id: "inv-flutes", name: "Champagne flutes", par: 8, onBoard: 8 },
    { id: "inv-tumblers", name: "Tumblers", par: 12, onBoard: 12 },
    { id: "inv-cups", name: "Coffee cups and saucers", par: 12, onBoard: 12 },
    { id: "inv-napkins", name: "Cloth napkins", par: 24, onBoard: 24 },
    { id: "inv-trays", name: "Serving trays", par: 4, onBoard: 4 },
  ],
  linens: [
    { id: "inv-bed-sets", name: "Bed linen sets", par: 2, onBoard: 2 },
    { id: "inv-duvets", name: "Duvets", par: 2, onBoard: 2 },
    { id: "inv-pillows", name: "Pillows", par: 8, onBoard: 8 },
    { id: "inv-pillowcases", name: "Pillowcases", par: 12, onBoard: 12 },
    { id: "inv-blankets", name: "Blankets", par: 8, onBoard: 8 },
    { id: "inv-table-linens", name: "Table linens", par: 6, onBoard: 6 },
  ],
  lav: [
    { id: "inv-toilet-paper", name: "Toilet paper (rolls)", par: 12, onBoard: 12 },
    { id: "inv-hand-towels", name: "Hand towels", par: 20, onBoard: 20 },
    { id: "inv-hand-soap", name: "Hand soap", par: 3, onBoard: 3 },
    { id: "inv-lotion", name: "Hand lotion", par: 3, onBoard: 3 },
    { id: "inv-tissues", name: "Tissues (boxes)", par: 6, onBoard: 6 },
    { id: "inv-amenity-kits", name: "Amenity kits", par: 10, onBoard: 10 },
    { id: "inv-dental-kits", name: "Toothbrush kits", par: 10, onBoard: 10 },
  ],
  cabin: [
    { id: "inv-headsets", name: "Headsets", par: 14, onBoard: 14 },
    { id: "inv-chargers", name: "Phone chargers and cables", par: 8, onBoard: 8 },
    { id: "inv-wifi-cards", name: "Wi-Fi password cards", par: 4, onBoard: 4 },
    { id: "inv-slippers", name: "Slippers (pairs)", par: 14, onBoard: 14 },
    { id: "inv-eye-masks", name: "Eye masks", par: 14, onBoard: 14 },
    { id: "inv-trash-bags", name: "Trash bags", par: 20, onBoard: 20 },
    { id: "inv-wipes", name: "Cleaning wipes (packs)", par: 4, onBoard: 4 },
  ],
  first_aid: [
    { id: "inv-dressings", name: "Adhesive dressings (boxes)", par: 2, onBoard: 1 },
    { id: "inv-gloves", name: "Disposable gloves (pairs)", par: 20, onBoard: 20 },
    { id: "inv-pain-relief", name: "Pain relief tablets (packs)", par: 2, onBoard: 2 },
    { id: "inv-burn-gel", name: "Burn gel", par: 2, onBoard: 2 },
    { id: "inv-sick-bags", name: "Motion sickness bags", par: 20, onBoard: 20 },
  ],
  emergency: [
    { id: "inv-extinguishers", name: "Fire extinguishers", par: 4, onBoard: 4 },
    { id: "inv-flashlights", name: "Flashlights", par: 4, onBoard: 4 },
    { id: "inv-smoke-hoods", name: "Smoke hoods (PBE)", par: 2, onBoard: 2 },
    { id: "inv-oxygen", name: "Portable oxygen bottles", par: 2, onBoard: 2 },
    { id: "inv-life-vests", name: "Life vests", par: 16, onBoard: 16 },
    { id: "inv-first-aid-kits", name: "First-aid kits", par: 2, onBoard: 2 },
    { id: "inv-aed", name: "AED", par: 1, onBoard: 1 },
  ],
  other: [],
};

/** Where each original (v9) category moves to, so counts already logged on a device are kept. */
export const LEGACY_CATEGORY: Record<string, InventoryCategory> = { wine: "bar", soft_drinks: "bar", fresh: "galley", snacks: "galley", coffee: "galley" };

export function createInventory(nowMs: number = Date.now()): InventoryItem[] {
  const countedAt = new Date(nowMs - 6 * 3_600_000).toISOString();
  return (Object.entries(STOCK) as [InventoryCategory, Stock[]][]).flatMap(([category, items]) => items.map((i) => ({ ...i, category, verified: false, updatedAt: countedAt, updatedById: LEAD_ID })));
}
