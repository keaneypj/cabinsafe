import type { Preference, PreferenceCategory, PreferencePerson } from "@/domain/types";

/**
 * Placeholder preferences — clearly fake names and examples to be replaced in the app
 * (Preferences tab) with the real details. Nothing here describes a real person.
 */
const p = (personId: string, entries: [PreferenceCategory, string][]): Preference[] => entries.map(([category, text], i) => ({ id: `${personId}-pref-${i + 1}`, category, text }));

export function createPreferences(): PreferencePerson[] {
  return [
    {
      id: "pref-principal",
      name: "Principal (placeholder)",
      relation: "principal",
      preferences: p("pref-principal", [
        ["food", "Placeholder: light, simple meals; grilled fish or chicken"],
        ["food", "Placeholder: fresh fruit plate available at all times"],
        ["beverages", "Placeholder: black coffee on boarding, green tea after lunch"],
        ["beverages", "Placeholder: still water at room temperature"],
        ["temperature", "Placeholder: 70°F for takeoff, 68°F when sleeping"],
        ["entertainment", "Placeholder: news channel on the forward screen, moving map aft"],
        ["bedding", "Placeholder: two firm pillows and a light duvet"],
        ["seating", "Placeholder: forward club seat, window side"],
        ["welcome", "Placeholder: sparkling water and the day's newspapers at the seat"],
        ["avoid", "Placeholder: strong scents and fresh lilies in the cabin"],
      ]),
    },
    {
      id: "pref-family-a",
      name: "Family Member A (placeholder)",
      relation: "family",
      preferences: p("pref-family-a", [
        ["food", "Placeholder: vegetarian"],
        ["beverages", "Placeholder: oat milk latte"],
        ["entertainment", "Placeholder: films on the aft screen with headphones"],
        ["seating", "Placeholder: divan in the family lounge"],
      ]),
    },
    {
      id: "pref-guest-b",
      name: "Guest B (placeholder)",
      relation: "guest",
      preferences: p("pref-guest-b", [
        ["beverages", "Placeholder: sparkling water with lime"],
        ["temperature", "Placeholder: likes the cabin a little warmer; extra blanket"],
      ]),
    },
    {
      id: "pref-staff-c",
      name: "Staff Member C (placeholder)",
      relation: "staff",
      preferences: p("pref-staff-c", [
        ["food", "Placeholder: no dairy"],
        ["seating", "Placeholder: dining table to work during the flight"],
      ]),
    },
  ];
}
