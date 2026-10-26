import { airport } from "@/data/airports";
import type { Accommodation, Flight, Passenger, Task } from "./types";

/**
 * Rules-based passenger preparation task generator.
 *
 * Rules act only on DOCUMENTED accommodation records. They create preparation,
 * verification or confirmation tasks; they never infer clinical needs,
 * treatments or equipment from a medical condition.
 */

export interface GeneratedTaskSpec {
  ruleKey: string;
  ruleName: string;
  title: string;
  detail: string;
  category: Task["category"];
  priority: Task["priority"];
  dueOffsetHours: number;
  coordinateWith?: Task["coordinateWith"];
  documentRef?: string;
  requiresSignOff?: boolean;
}

export const RULES_DESCRIPTION: { key: string; when: string; creates: string }[] = [
  { key: "mobility", when: "Documented mobility assistance requirement", creates: "Boarding assistance preparation and seat assignment review" },
  { key: "allergy", when: "Documented allergy precaution", creates: "Catering ingredient verification, galley cross-contact prevention, emergency plan reference confirmation" },
  { key: "medical_equipment", when: "Medical equipment coordination noted", creates: "Confirmation task with passenger representative and flight crew — never assumes equipment or treatment" },
  { key: "medical_plan", when: "Individual care plan on file", creates: "Restricted plan reference review and telemedical escalation briefing" },
  { key: "dietary", when: "Dietary requirement recorded", creates: "Catering order confirmation" },
  { key: "pet", when: "Animal travelling", creates: "Destination documentation confirmation, restraint arrangement, allergy conflict check" },
  { key: "comfort", when: "Documented service preference", creates: "Service preparation task" },
];

function specsForAccommodation(p: Passenger, a: Accommodation, flight: Flight): GeneratedTaskSpec[] {
  const ref = a.planRef ? ` (${a.planRef})` : "";
  switch (a.type) {
    case "mobility":
      return [
        {
          ruleKey: `${a.id}:boarding`,
          ruleName: "Mobility assistance → boarding preparation",
          title: `Boarding assistance preparation — ${p.alias}`,
          detail: `Prepare boarding assistance as documented${ref}: ${a.summary} Confirm boarding time with the personal assistant. Do not assume needs beyond the documented plan.`,
          category: "accommodation",
          priority: "high",
          dueOffsetHours: 6,
          coordinateWith: ["assistant"],
          documentRef: "CSI-MED-002",
        },
        {
          ruleKey: `${a.id}:seat`,
          ruleName: "Mobility assistance → seat assignment review",
          title: `Seat assignment review — ${p.alias}`,
          detail: `Review seat assignment against the documented accommodation${ref}.`,
          category: "accommodation",
          priority: "normal",
          dueOffsetHours: 8,
        },
      ];
    case "allergy": {
      const allergen = a.allergen ?? "declared allergen";
      return [
        {
          ruleKey: `${a.id}:ingredients`,
          ruleName: "Allergy precaution → catering ingredient verification",
          title: `Catering ingredient verification — ${allergen}`,
          detail: `Obtain written caterer confirmation that ordered items are prepared without ${allergen} and verify ingredient declarations on delivery (CSI-CAT-003 §1–2). Precaution recorded for ${p.alias}.`,
          category: "catering_allergen",
          priority: "critical",
          dueOffsetHours: 8,
          documentRef: "CSI-CAT-003",
          requiresSignOff: true,
        },
        {
          ruleKey: `${a.id}:crosscontact`,
          ruleName: "Allergy precaution → cross-contact prevention",
          title: `Galley cross-contact prevention — ${allergen}`,
          detail: `Remove ${allergen}-containing snacks and garnishes from open service; plate allergen-safe items first with dedicated utensils (CSI-CAT-003 §3).`,
          category: "catering_allergen",
          priority: "critical",
          dueOffsetHours: 2,
          documentRef: "CSI-CAT-003",
        },
        {
          ruleKey: `${a.id}:plan`,
          ruleName: "Allergy precaution → emergency plan reference",
          title: `Confirm emergency plan reference on file — ${p.alias}`,
          detail: `Confirm the passenger's individual emergency plan reference${ref} is on file and include its location and escalation pathway in the crew briefing (CSI-MED-002 §5). Do not administer medication beyond training and the documented plan.`,
          category: "accommodation",
          priority: "high",
          dueOffsetHours: 6,
          documentRef: "CSI-MED-002",
        },
      ];
    }
    case "medical_equipment":
      return [
        {
          ruleKey: `${a.id}:confirm`,
          ruleName: "Medical equipment coordination → confirmation task",
          title: `Confirm medical equipment requirements — ${p.alias}`,
          detail: `Contact the passenger's designated representative to confirm whether personal medical equipment will be carried, including model, quantity and battery arrangements. Device acceptance is a flight crew decision against approved documentation (CSI-MED-002 §3). Do not assume equipment or treatment requirements.`,
          category: "accommodation",
          priority: "high",
          dueOffsetHours: 24,
          coordinateWith: ["pilot", "assistant"],
          documentRef: "CSI-MED-002",
        },
      ];
    case "medical_plan":
      return [
        {
          ruleKey: `${a.id}:review`,
          ruleName: "Care plan on file → restricted plan review",
          title: `Review care plan reference (restricted) — ${p.alias}`,
          detail: `Lead Cabin Attendant reviews the restricted plan reference${ref}. Share only the operational summary with other crew (CSI-MED-002 §4).`,
          category: "accommodation",
          priority: "high",
          dueOffsetHours: 12,
          documentRef: "CSI-MED-002",
        },
        {
          ruleKey: `${a.id}:telemed`,
          ruleName: "Care plan on file → telemedical escalation briefing",
          title: `Brief telemedical escalation pathway — ${p.alias}`,
          detail: "Include the telemedical escalation pathway and PIC notification in the crew briefing (CSI-MED-002 §2).",
          category: "crew_briefing",
          priority: "high",
          dueOffsetHours: 2,
          coordinateWith: ["pilot"],
          documentRef: "CSI-MED-002",
        },
      ];
    case "comfort":
      return [
        {
          ruleKey: `${a.id}:service`,
          ruleName: "Documented preference → service preparation",
          title: `Prepare documented service preference — ${p.alias}`,
          detail: a.summary,
          category: "accommodation",
          priority: "normal",
          dueOffsetHours: 4,
        },
      ];
    case "pet": {
      const country = airport(flight.destination)?.country ?? flight.destination;
      return [
        {
          ruleKey: `${a.id}:docs`,
          ruleName: "Animal travelling → destination documentation",
          title: `Confirm animal entry documentation for ${country} — ${p.alias}`,
          detail: `Personal assistant confirms ${country} entry requirements through official government sources; cabin crew record the confirmation (CSI-PET-004 §1).`,
          category: "coordination",
          priority: "high",
          dueOffsetHours: 48,
          coordinateWith: ["assistant"],
          documentRef: "CSI-PET-004",
        },
        {
          ruleKey: `${a.id}:restraint`,
          ruleName: "Animal travelling → restraint arrangement",
          title: `Arrange restraint for taxi, take-off and landing — ${p.alias}`,
          detail: "Prepare the operator-approved restraint or containment arrangement (CSI-PET-004 §2). Restraint method requires operator approval.",
          category: "accommodation",
          priority: "high",
          dueOffsetHours: 3,
          documentRef: "CSI-PET-004",
        },
        {
          ruleKey: `${a.id}:allergy`,
          ruleName: "Animal travelling → allergy conflict check",
          title: `Check animal against passenger allergy records — ${p.alias}`,
          detail: "Confirm no documented passenger allergy conflicts with the animal's presence (CSI-PET-004 §3).",
          category: "accommodation",
          priority: "normal",
          dueOffsetHours: 12,
          documentRef: "CSI-PET-004",
        },
      ];
    }
    default:
      return [];
  }
}

export function specsForPassenger(p: Passenger, flight: Flight): GeneratedTaskSpec[] {
  const specs = p.accommodations
    .filter((a) => a.type !== "dietary")
    .flatMap((a) => specsForAccommodation(p, a, flight));
  if (p.dietary.length > 0) {
    specs.push({
      ruleKey: "dietary",
      ruleName: "Dietary requirement → catering confirmation",
      title: `Confirm dietary requirements in catering order — ${p.alias}`,
      detail: `Recorded requirements: ${p.dietary.join("; ")}.`,
      category: "catering_allergen",
      priority: "normal",
      dueOffsetHours: 10,
      documentRef: "CSI-CAT-003",
    });
  }
  return specs;
}

export function generatedTaskId(flightId: string, passengerId: string, ruleKey: string): string {
  return `gen:${flightId}:${passengerId}:${ruleKey}`;
}

/**
 * Produce generated tasks for a passenger on a flight that do not already exist.
 * Existing tasks (including ones the Lead CA edited) are never overwritten.
 */
export function generateTasksForPassenger(
  p: Passenger,
  flight: Flight,
  existingIds: Set<string>,
  nowIso: string,
): Task[] {
  const depart = new Date(flight.departAt).getTime();
  return specsForPassenger(p, flight)
    .map((s) => {
      const id = generatedTaskId(flight.id, p.id, s.ruleKey);
      return {
        id,
        flightId: flight.id,
        title: s.title,
        detail: s.detail,
        category: s.category,
        phase: "preflight",
        source: "passenger_rule",
        sourceRef: s.ruleName,
        passengerId: p.id,
        priority: s.priority,
        status: "not_started",
        assigneeId: flight.leadId,
        dueAt: new Date(depart - s.dueOffsetHours * 3_600_000).toISOString(),
        requiresSignOff: s.requiresSignOff ?? false,
        coordinateWith: s.coordinateWith,
        documentRef: s.documentRef,
        createdAt: nowIso,
        reviewed: false,
        history: [{ at: nowIso, byId: "system", text: `Generated by rule: ${s.ruleName}` }],
      } satisfies Task;
    })
    .filter((t) => !existingIds.has(t.id));
}
