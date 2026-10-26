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
  preboarding: "Pre-Boarding Checks",
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

export const POSTFLIGHT_ORDER: ChecklistCategory[] = ["postflight_discrepancy", "restock"];

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
  // Pre-boarding — the cabin attendant's final checks before passengers board (due 45 min before departure)
  { key: "pb-walk", title: "Final cabin walk-through — seats, belts, stowage, aisles clear", detail: "Walk all five zones: seats upright and positioned, belts laid out, overhead and credenza stowage latched, aisles and exits unobstructed.", category: "preboarding", phase: "preflight", priority: "high", requiresSignOff: false, dueOffsetHours: 0.75, documentRef: "CSI-OPS-001", defaultAssignee: "attendant" },
  { key: "pb-seals", title: "Visual check of emergency equipment seals at each station", detail: "Confirm seals and indicators are intact on the equipment visible at each station. Report any change immediately as a discrepancy.", category: "preboarding", phase: "preflight", priority: "critical", requiresSignOff: false, dueOffsetHours: 0.75, documentRef: "CSI-OPS-001", defaultAssignee: "attendant" },
  { key: "pb-galley", title: "Galley secured for boarding — hot liquids, inserts, latches", detail: "Hot liquids stowed or attended, inserts latched, knives and glassware secured before passengers move through the forward cabin.", category: "preboarding", phase: "preflight", priority: "high", requiresSignOff: false, dueOffsetHours: 0.75, defaultAssignee: "attendant" },
  { key: "pb-lav", title: "Lavatories checked, stocked and ready", detail: "Forward, suite and aft lavatories cleaned, stocked and checked for loose items.", category: "preboarding", phase: "preflight", priority: "normal", requiresSignOff: false, dueOffsetHours: 0.75, defaultAssignee: "attendant" },
  { key: "pb-welcome", title: "Welcome service prepared per documented preferences", detail: "Prepare welcome service from passenger preference records only; confirm allergen-safe items are segregated.", category: "preboarding", phase: "preflight", priority: "normal", requiresSignOff: false, dueOffsetHours: 0.75, documentRef: "CSI-CAT-003", defaultAssignee: "attendant" },
  { key: "pb-climate", title: "Cabin temperature, lighting and ambience set for boarding", detail: "Set cabin temperature, lighting and audio for boarding as documented.", category: "preboarding", phase: "preflight", priority: "normal", requiresSignOff: false, dueOffsetHours: 0.75, defaultAssignee: "attendant" },
  { key: "pb-confid", title: "Confidential materials and crew items secured", detail: "Manifest and briefing papers stowed; only aliases visible; crew bags stowed.", category: "preboarding", phase: "preflight", priority: "high", requiresSignOff: false, dueOffsetHours: 0.75, documentRef: "CSI-SEC-007", defaultAssignee: "attendant" },
  { key: "pb-sequence", title: "Boarding sequence and airstair confirmed with flight crew and security", detail: "Confirm boarding order, assistance timing and airstair/door readiness with the PIC and security lead.", category: "preboarding", phase: "preflight", priority: "high", requiresSignOff: false, dueOffsetHours: 0.5, coordinateWith: ["pilot", "security"], defaultAssignee: "attendant" },
  // Postflight
  { key: "pf-log", title: "Record cabin discrepancies", detail: "Record any cabin, galley or equipment discrepancies observed during the flight.", category: "postflight_discrepancy", phase: "postflight", priority: "high", requiresSignOff: false, dueOffsetHours: 1, documentRef: "CSI-OPS-001", defaultAssignee: "lead" },
  { key: "pf-used", title: "Report emergency or medical equipment used or opened", detail: "Any opened seal or used item is recorded as a discrepancy for replacement.", category: "postflight_discrepancy", phase: "postflight", priority: "critical", requiresSignOff: true, dueOffsetHours: 1, defaultAssignee: "lead" },
  { key: "pf-restock", title: "Restock medical consumables and cabin supplies", detail: "Restock consumables and raise replacement requests for sealed equipment.", category: "restock", phase: "postflight", priority: "high", requiresSignOff: false, dueOffsetHours: 12, defaultAssignee: "attendant" },
  { key: "pf-clean", title: "Galley sanitation and allergen cleandown", detail: "Full galley cleandown when an allergen precaution applied on the flight.", category: "restock", phase: "postflight", priority: "high", requiresSignOff: false, dueOffsetHours: 4, documentRef: "CSI-CAT-003", defaultAssignee: "attendant" },
  { key: "pf-confid", title: "Secure confidential materials and passenger items", detail: "Clear and secure documents, devices and personal items left on board.", category: "restock", phase: "postflight", priority: "high", requiresSignOff: false, dueOffsetHours: 1, documentRef: "CSI-SEC-007", defaultAssignee: "lead" },
];

export function checklistTaskId(flightId: string, key: string): string {
  return `chk:${flightId}:${key}`;
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
