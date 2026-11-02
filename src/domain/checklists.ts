import type { ChecklistCategory, ChecklistPhase, Flight, Task } from "./types";

export interface ChecklistTemplateItem {
  key: string;
  title: string;
  detail: string;
  category: ChecklistCategory;
  phase: ChecklistPhase;
  priority: Task["priority"];
  requiresSignOff: boolean;
  /** Hours before departure (preflight) or after arrival (postflight). */
  dueOffsetHours: number;
  coordinateWith?: Task["coordinateWith"];
  documentRef?: string;
  /** Equipment record whose inspection satisfies this item. */
  equipmentCode?: string;
  defaultAssignee: "lead" | "attendant";
}

export const CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  briefing: "Flight Briefing Review",
  cabin_inspection: "Cabin Inspection",
  emergency_equipment: "Emergency Equipment",
  aed: "AED Inspection",
  medical_kit: "Medical Kit Readiness",
  galley: "Galley Safety",
  catering_allergen: "Catering & Allergen Controls",
  accommodation: "Passenger Accommodations",
  security: "Cabin Security Coordination",
  crew_briefing: "Crew Briefing",
  postflight_discrepancy: "Postflight Discrepancies",
  restock: "Restocking & Follow-up",
  coordination: "Coordination",
  preboarding: "Pre-Boarding Checklist",
  offboarding: "Off-Boarding Checklist",
};

export const PREFLIGHT_ORDER: ChecklistCategory[] = [
  "briefing",
  "cabin_inspection",
  "emergency_equipment",
  "aed",
  "medical_kit",
  "galley",
  "catering_allergen",
  "accommodation",
  "security",
  "crew_briefing",
  "coordination",
  "preboarding",
];

export const POSTFLIGHT_ORDER: ChecklistCategory[] = ["offboarding", "postflight_discrepancy", "restock"];

export interface ChecklistSection {
  id: string;
  title: string;
  items: string[];
}

/** The cabin host's pre-boarding checklist, in order. Edit the wording here; the count updates itself. */
export const PREBOARD_SECTIONS: ChecklistSection[] = [
  {
    id: "fbo",
    title: "At the FBO",
    items: [
      "Check in with the FBO front desk and confirm departure time",
      "Confirm catering has arrived and matches the order",
      "Check catering temperatures and that items are labeled",
      "Collect everything delivered to the FBO: flowers, newspapers, magazines, packages, dry cleaning",
      "Collect clean dishes/serviceware, fridge bag, and ice",
      "Send catering, dishes, fridge bag, flowers, newspapers and all deliveries out to the aircraft",
      "Confirm passenger count and any special requests with the captain",
    ],
  },
  {
    id: "onboard",
    title: "First onboard",
    items: [
      "Do a quick walkthrough of the entire cabin",
      "Brief with the pilots: flight time, weather, expected turbulence, passenger count",
      "Turn on cabin lights",
      "Set cabin temperature to the principal's preference",
      "Turn on and set TVs / moving map",
      "Check Wi-Fi is working and the password card is out",
      "Visually confirm emergency equipment is in place",
    ],
  },
  {
    id: "galley",
    title: "Galley and catering",
    items: [
      "Confirm all food is correct against the order",
      "Put all food away at proper temperatures",
      "Check ovens, coffee maker and water are working",
      "Stock the bar and beverages to the principal's preferences",
      "Stock snacks",
      "Load dishes and serviceware",
    ],
  },
  {
    id: "setup",
    title: "Cabin setup",
    items: [
      "Set up the welcome table",
      "Place flowers and newspapers",
      "Seats upright, seatbelts crossed neatly",
      "Blankets and pillows set out",
      "If it's an overnight or long flight: get the correct bed linens out, ready to make beds once in the air",
      "Chargers and headsets set out",
      "Set cabin music if requested",
    ],
  },
  {
    id: "lav",
    title: "Lavatories",
    items: ["Clean and fully stocked", "Toilet paper folded, amenities and hand towels set out"],
  },
  {
    id: "final",
    title: "Final check",
    items: ["Final cabin walkthrough", "Trash emptied and fresh bags in", "Stair carpet / entry area ready", "Confirm boarding time with the captain"],
  },
];

/** The cabin host's off-boarding checklist, in order. */
export const OFFBOARD_ITEMS_TEXT: string[] = [
  "Check every seat and compartment for items left behind",
  "Remove all trash",
  "Remove leftover catering and handle it per the principal's preferences",
  "Clean the galley: ovens, coffee maker, counters, sinks",
  "Bag dishes and serviceware for cleaning",
  "Strip beds, bag linens for laundry, fold blankets",
  "Vacuum the cabin",
  "Wipe down all tables and surfaces",
  "Clean and restock the lavatories",
  "Seats upright, seatbelts crossed",
  "Note any low inventory items",
  "Report anything broken to the pilots for maintenance",
  "Turn off TVs and cabin lights (coordinate with the crew)",
  "Leave handover notes for the next cabin host",
];

/** Template key for a pre-boarding item, e.g. "pb-fbo-1". */
export const preboardKey = (sectionId: string, n: number) => `pb-${sectionId}-${n}`;

/** The pre-boarding section a task belongs to, from its template key. */
export function preboardSectionOf(sourceRef: string | undefined): string | undefined {
  return sourceRef?.match(/^template:pb-([a-z]+)-[0-9]+$/)?.[1];
}

const PREBOARD_ITEMS: ChecklistTemplateItem[] = PREBOARD_SECTIONS.flatMap((sec) =>
  sec.items.map((title, i) => ({
    key: preboardKey(sec.id, i + 1),
    title,
    detail: `Pre-boarding · ${sec.title}`,
    category: "preboarding" as const,
    phase: "preflight" as const,
    priority: "normal" as const,
    requiresSignOff: false,
    // At the FBO first, then onboard; everything done 45 minutes before departure.
    dueOffsetHours: sec.id === "fbo" ? 2 : 0.75,
    defaultAssignee: "attendant" as const,
  })),
);

const OFFBOARD_ITEMS: ChecklistTemplateItem[] = OFFBOARD_ITEMS_TEXT.map((title, i) => ({
  key: `ob-${i + 1}`,
  title,
  detail: "Off-boarding · after the passengers leave",
  category: "offboarding" as const,
  phase: "postflight" as const,
  priority: "normal" as const,
  requiresSignOff: false,
  dueOffsetHours: 2,
  defaultAssignee: "attendant" as const,
}));

export const CHECKLIST_TEMPLATE: ChecklistTemplateItem[] = [
  // Briefing review
  { key: "brf-route", title: "Review schedule, routing and alternates", detail: "Confirm departure, destination, alternates and block time with the flight crew's briefing package.", category: "briefing", phase: "preflight", priority: "high", requiresSignOff: false, dueOffsetHours: 24, defaultAssignee: "lead" },
  { key: "brf-adv", title: "Review destination, weather and security advisories", detail: "Review all advisories associated with this flight. Acknowledge each advisory and raise relevant items with the PIC and security lead.", category: "briefing", phase: "preflight", priority: "high", requiresSignOff: false, dueOffsetHours: 12, documentRef: "CSI-ADV-006", defaultAssignee: "lead" },
  { key: "brf-manifest", title: "Review manifest and documented accommodations", detail: "Confirm manifest aliases and review each documented accommodation. Generated preparation tasks must be reviewed by the Lead Cabin Attendant.", category: "briefing", phase: "preflight", priority: "critical", requiresSignOff: true, dueOffsetHours: 12, documentRef: "CSI-MED-002", defaultAssignee: "lead" },
  // Cabin inspection
  { key: "cab-walk", title: "Cabin walkaround — seats, restraints, stowage, lavatories", detail: "Inspect seats and restraints, stowage latches, lavatories and cabin furnishings in all five zones.", category: "cabin_inspection", phase: "preflight", priority: "high", requiresSignOff: false, dueOffsetHours: 3, documentRef: "CSI-OPS-001", defaultAssignee: "attendant" },
  { key: "cab-light", title: "Cabin lighting, placards and signage check", detail: "Verify cabin lighting function and that required placards are present. Placard requirements: aircraft verification required.", category: "cabin_inspection", phase: "preflight", priority: "normal", requiresSignOff: false, dueOffsetHours: 3, defaultAssignee: "attendant" },
  // Emergency equipment
  { key: "eme-register", title: "Emergency equipment register verification", detail: "Verify presence, seals and inspection currency of all items in the equipment register. Open discrepancies must be reported to the PIC.", category: "emergency_equipment", phase: "preflight", priority: "critical", requiresSignOff: true, dueOffsetHours: 3, documentRef: "CSI-OPS-001", defaultAssignee: "lead" },
  { key: "eme-flash", title: "Flashlight charge indicators", detail: "Confirm charge indicators on all cabin flashlights.", category: "emergency_equipment", phase: "preflight", priority: "normal", requiresSignOff: false, dueOffsetHours: 3, defaultAssignee: "attendant" },
  // AED
  { key: "aed-check", title: "AED readiness inspection (AED-01)", detail: "Status indicator, electrode pads seal and expiry, battery indicator and stowage security. Completed automatically when the AED-01 inspection is recorded on the cabin map.", category: "aed", phase: "preflight", priority: "critical", requiresSignOff: true, dueOffsetHours: 4, documentRef: "CSI-OPS-001", equipmentCode: "AED-01", defaultAssignee: "lead" },
  // Medical kit
  { key: "med-kits", title: "Medical kit seals and expiry review", detail: "Check seals and expiry dates on emergency medical kit and first-aid kits.", category: "medical_kit", phase: "preflight", priority: "critical", requiresSignOff: true, dueOffsetHours: 4, documentRef: "CSI-OPS-001", defaultAssignee: "lead" },
  { key: "med-tele", title: "Telemedical provider contact & connectivity test", detail: "Confirm the contracted telemedical provider's contact details and test the approved communication link.", category: "medical_kit", phase: "preflight", priority: "high", requiresSignOff: false, dueOffsetHours: 4, coordinateWith: ["pilot"], documentRef: "CSI-MED-002", defaultAssignee: "lead" },
  // Galley
  { key: "gal-elec", title: "Galley electrical, oven and latch inspection", detail: "Inspect galley inserts, ovens, brewers and stowage latches. Report faults through the flight crew.", category: "galley", phase: "preflight", priority: "high", requiresSignOff: false, dueOffsetHours: 3, defaultAssignee: "attendant" },
  { key: "gal-hot", title: "Hot liquid and sharp-implement stowage protocol", detail: "Confirm hot liquid and knife stowage arrangements for taxi, take-off, landing and turbulence.", category: "galley", phase: "preflight", priority: "normal", requiresSignOff: false, dueOffsetHours: 3, defaultAssignee: "attendant" },
  // Catering
  { key: "cat-reconcile", title: "Catering order reconciled against manifest records", detail: "Reconcile the catering order with documented dietary and allergen records for every passenger on the manifest.", category: "catering_allergen", phase: "preflight", priority: "high", requiresSignOff: false, dueOffsetHours: 8, documentRef: "CSI-CAT-003", defaultAssignee: "lead" },
  { key: "cat-labels", title: "Allergen labelling verified on catering delivery", detail: "Verify every delivered item's ingredient declaration against the order. Segregate unlabelled items.", category: "catering_allergen", phase: "preflight", priority: "critical", requiresSignOff: true, dueOffsetHours: 2, documentRef: "CSI-CAT-003", defaultAssignee: "attendant" },
  // Security
  { key: "sec-brief", title: "Cabin security coordination with security lead", detail: "Agree boarding sequence, cabin seating for security personnel and arrival plan with the security lead.", category: "security", phase: "preflight", priority: "high", requiresSignOff: false, dueOffsetHours: 6, coordinateWith: ["security"], defaultAssignee: "lead" },
  { key: "sec-access", title: "Aircraft access log reviewed", detail: "Review aircraft access since last flight with the security lead.", category: "security", phase: "preflight", priority: "normal", requiresSignOff: false, dueOffsetHours: 3, coordinateWith: ["security"], defaultAssignee: "lead" },
  // Crew briefing
  { key: "crw-brief", title: "Crew safety briefing with flight crew", detail: "Present the cabin safety briefing to the PIC and SIC. Record items requiring pilot coordination.", category: "crew_briefing", phase: "preflight", priority: "critical", requiresSignOff: true, dueOffsetHours: 1.5, coordinateWith: ["pilot"], defaultAssignee: "lead" },
  { key: "crw-ack", title: "Cabin attendant briefing acknowledgement", detail: "Assigned cabin attendant acknowledges the briefing and their responsibilities.", category: "crew_briefing", phase: "preflight", priority: "high", requiresSignOff: false, dueOffsetHours: 1.25, documentRef: "CSI-HND-005", defaultAssignee: "attendant" },
  // Pre-boarding — the cabin host's checklist, grouped into sections (see PREBOARD_SECTIONS)
  ...PREBOARD_ITEMS,
  // Postflight
  { key: "pf-log", title: "Record cabin discrepancies", detail: "Record any cabin, galley or equipment discrepancies observed during the flight.", category: "postflight_discrepancy", phase: "postflight", priority: "high", requiresSignOff: false, dueOffsetHours: 1, documentRef: "CSI-OPS-001", defaultAssignee: "lead" },
  { key: "pf-used", title: "Report emergency or medical equipment used or opened", detail: "Any opened seal or used item is recorded as a discrepancy for replacement.", category: "postflight_discrepancy", phase: "postflight", priority: "critical", requiresSignOff: true, dueOffsetHours: 1, defaultAssignee: "lead" },
  { key: "pf-restock", title: "Restock medical consumables and cabin supplies", detail: "Restock consumables and raise replacement requests for sealed equipment.", category: "restock", phase: "postflight", priority: "high", requiresSignOff: false, dueOffsetHours: 12, defaultAssignee: "attendant" },
  { key: "pf-clean", title: "Galley sanitation and allergen cleandown", detail: "Full galley cleandown when an allergen precaution applied on the flight.", category: "restock", phase: "postflight", priority: "high", requiresSignOff: false, dueOffsetHours: 4, documentRef: "CSI-CAT-003", defaultAssignee: "attendant" },
  { key: "pf-confid", title: "Secure confidential materials and passenger items", detail: "Clear and secure documents, devices and personal items left on board.", category: "restock", phase: "postflight", priority: "high", requiresSignOff: false, dueOffsetHours: 1, documentRef: "CSI-SEC-007", defaultAssignee: "lead" },
  // Off-boarding — the cabin host's checklist after the passengers leave
  ...OFFBOARD_ITEMS,
];

export function checklistTaskId(flightId: string, key: string): string {
  return `chk:${flightId}:${key}`;
}

/** Checklist for an upcoming flight: all preflight items plus the off-boarding list, ready to tick after landing. */
export function buildUpcomingChecklist(flight: Flight, nowIso: string): Task[] {
  return buildChecklist(flight, nowIso).filter((t) => t.phase === "preflight" || t.category === "offboarding");
}

/** Instantiate the checklist template for a flight. */
export function buildChecklist(flight: Flight, nowIso: string, phase?: ChecklistPhase): Task[] {
  const depart = new Date(flight.departAt).getTime();
  const arrive = new Date(flight.arriveAt).getTime();
  return CHECKLIST_TEMPLATE.filter((t) => !phase || t.phase === phase).map((t) => {
    const anchor = t.phase === "preflight" ? depart - t.dueOffsetHours * 3_600_000 : arrive + t.dueOffsetHours * 3_600_000;
    return {
      id: checklistTaskId(flight.id, t.key),
      flightId: flight.id,
      title: t.title,
      detail: t.detail,
      category: t.category,
      phase: t.phase,
      source: "checklist",
      sourceRef: t.equipmentCode ? `equipment:${t.equipmentCode}` : `template:${t.key}`,
      priority: t.priority,
      status: "not_started",
      assigneeId: t.defaultAssignee === "lead" ? flight.leadId : flight.cabinAttendantId ?? flight.leadId,
      dueAt: new Date(anchor).toISOString(),
      requiresSignOff: t.requiresSignOff,
      coordinateWith: t.coordinateWith,
      documentRef: t.documentRef,
      createdAt: nowIso,
      history: [],
    } satisfies Task;
  });
}
