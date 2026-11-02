import type { PreferenceCategory, PreferencePerson } from "./types";

export const PREFERENCE_CATEGORIES: { key: PreferenceCategory; label: string; example: string }[] = [
  { key: "food", label: "Food and dietary", example: "e.g. Prefers a light lunch; no shellfish" },
  { key: "beverages", label: "Beverages and coffee/tea", example: "e.g. Oat milk flat white on boarding" },
  { key: "temperature", label: "Cabin temperature", example: "e.g. 70°F for takeoff, cooler when sleeping" },
  { key: "entertainment", label: "Entertainment/TV", example: "e.g. Moving map on the forward screen" },
  { key: "bedding", label: "Bedding", example: "e.g. Two firm pillows, extra blanket" },
  { key: "seating", label: "Seating", example: "e.g. Forward-facing window seat" },
  { key: "welcome", label: "Welcome setup", example: "e.g. Sparkling water and fresh fruit at the seat" },
  { key: "avoid", label: "Things to avoid", example: "e.g. Strong scents in the cabin" },
];

export const RELATION_LABELS: Record<PreferencePerson["relation"], string> = {
  principal: "Principal",
  family: "Family",
  guest: "Guest",
  staff: "Staff",
};

export const PREFERENCE_MAX = 200;

export function validatePreferenceText(text: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = text.trim().replace(/\s+/g, " ");
  if (!value) return { ok: false, error: "Write the preference first." };
  if (value.length > PREFERENCE_MAX) return { ok: false, error: `Keep it under ${PREFERENCE_MAX} characters.` };
  return { ok: true, value };
}

export function validatePersonName(name: string, people: PreferencePerson[], editingId?: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = name.trim().replace(/\s+/g, " ");
  if (value.length < 2 || value.length > 50) return { ok: false, error: "Give the person a name of 2 to 50 characters." };
  if (people.some((p) => p.id !== editingId && p.name.toLowerCase() === value.toLowerCase())) return { ok: false, error: `${value} is already on the list.` };
  return { ok: true, value };
}
