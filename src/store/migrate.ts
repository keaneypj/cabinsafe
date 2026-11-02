import { createInventory, LEGACY_CATEGORY } from "@/data/inventory";
import { createPreferences } from "@/data/preferences";
import { createSeed } from "@/data/seed";
import { buildUpcomingChecklist } from "@/domain/checklists";
import type { Equipment, InventoryCategory, InventoryItem, PreferencePerson, Task } from "@/domain/types";

/** The eight everyday pre-boarding checks that the sectioned checklist replaces. */
const OLD_PREBOARD_REF = /^template:pb-(walk|seals|galley|lav|welcome|climate|confid|sequence)$/;

/** The parts of saved demo data that version 10 changes. */
export interface V10Parts {
  flights: { id: string; status: string; departAt: string; arriveAt: string }[];
  tasks: Task[];
  equipment: Equipment[];
  inventory?: InventoryItem[];
  preferences?: PreferencePerson[];
}

/**
 * Brings demo data saved by version 8 or 9 up to version 10, keeping what people logged:
 *  - the eight old pre-boarding checks become the sectioned checklist, plus off-boarding;
 *  - seeded equipment gets the fixed demo-day inspection dates;
 *  - inventory items move to the new categories, the fuller G700 list is added and every
 *    amount is marked to be verified;
 *  - placeholder preferences are added.
 */
export function upgradeToV10<T extends V10Parts>(state: T, nowMs: number = Date.now()): T {
  const nowIso = new Date(nowMs).toISOString();
  const upcoming = state.flights.filter((f) => f.status !== "completed");
  const kept = state.tasks.filter((t) => !(t.category === "preboarding" && OLD_PREBOARD_REF.test(t.sourceRef ?? "")));
  const have = new Set(kept.map((t) => t.id));
  const added = upcoming.flatMap((f) =>
    buildUpcomingChecklist(f as Parameters<typeof buildUpcomingChecklist>[0], nowIso).filter((t) => (t.category === "preboarding" || t.category === "offboarding") && !have.has(t.id)),
  );

  const seedEquipment = new Map(createSeed(nowMs).equipment.map((e) => [e.id, e]));
  const equipment = state.equipment.map((e) => {
    const s = seedEquipment.get(e.id);
    return s ? { ...e, status: e.status === "discrepancy" || e.status === "unserviceable" ? e.status : s.status, lastInspectionAt: s.lastInspectionAt, nextInspectionDue: s.nextInspectionDue, expiresAt: s.expiresAt, history: s.history } : e;
  });

  const fresh = createInventory(nowMs);
  const saved = (state.inventory ?? []).map((i) => ({ ...i, category: (LEGACY_CATEGORY[i.category as string] ?? i.category) as InventoryCategory, verified: i.verified ?? false }));
  const savedIds = new Set(saved.map((i) => i.id));
  const savedNames = new Set(saved.map((i) => i.name.toLowerCase()));
  const inventory = [...saved, ...fresh.filter((i) => !savedIds.has(i.id) && !savedNames.has(i.name.toLowerCase()))];

  return { ...state, tasks: [...kept, ...added], equipment, inventory, preferences: state.preferences ?? createPreferences() };
}

/** The parts of saved demo data that carry over into version 11. */
export interface KeptParts {
  currentUserId: string;
  inventory?: InventoryItem[];
  preferences?: PreferencePerson[];
}

/**
 * Version 11 moves the demo onto fixed calendar dates (first flight Friday, Nov 6, 2026, nothing overdue).
 * Saved flights, checklists and equipment were built around the day the demo was first opened, so they are
 * replaced with the fresh demo data. The stock list and preferences people entered are kept.
 */
export function upgradeToV11<F extends KeptParts>(saved: V10Parts & KeptParts, version: number, fresh: F, nowMs: number = Date.now()): F {
  const v10 = version < 10 ? upgradeToV10(saved, nowMs) : saved;
  return { ...fresh, currentUserId: v10.currentUserId ?? fresh.currentUserId, inventory: v10.inventory ?? fresh.inventory, preferences: v10.preferences ?? fresh.preferences };
}
