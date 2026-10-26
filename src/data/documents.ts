import type { ReferenceDocument } from "@/domain/types";

/**
 * Curated demonstration reference library.
 *
 * These are fictional operator-level documents written for the demonstration.
 * They describe program practices (inspection discipline, allergen control,
 * handovers, escalation) and intentionally contain NO aircraft-specific
 * emergency procedures. Aircraft emergency procedures require approved
 * operator / manufacturer documentation, which is listed as "Required — Not Loaded".
 */
export const DOCUMENTS: ReferenceDocument[] = [
  {
    id: "doc-csm",
    code: "CSI-OPS-001",
    title: "Cabin Safety Program Manual — Demonstration Excerpt",
    version: "1.3",
    status: "approved_demo",
    effective: "2026-01-15",
    owner: "Lead Cabin Attendant (fictional operator)",
    scope: "Program-level cabin safety practices for the fictional operator. Not an aircraft-specific procedure.",
    sections: [
      {
        id: "1",
        heading: "Purpose and authority",
        body:
          "This manual describes how the cabin team prepares, verifies and documents cabin safety readiness. The Pilot in Command holds sole authority for dispatch and departure decisions. Cabin readiness status reported by CabinSafe is an input to the crew briefing and never an authorization to depart.",
      },
      {
        id: "2",
        heading: "Readiness status definitions",
        body:
          "Task completion measures the share of checklist items completed or marked not applicable. Operational readiness considers critical equipment status, open discrepancies, critical checklist items and unreviewed advisories. Any unresolved critical discrepancy results in a Not Ready status regardless of task completion percentage. 'Cabin Prepared' means the cabin team has completed its preparation; it is reported to the Pilot in Command for consideration.",
      },
      {
        id: "3",
        heading: "Preflight cabin inspection standard",
        body:
          "Preflight inspection covers cabin furnishings, restraints, stowage latches, lavatories, galley equipment and the emergency equipment register. Each item is recorded as Completed, Blocked (with reason) or Not Applicable (with reason). Critical items require sign-off by the Lead Cabin Attendant or a delegated cabin attendant.",
      },
      {
        id: "4",
        heading: "Discrepancy reporting",
        body:
          "Discrepancies are classified as critical, major or minor. Critical discrepancies affecting emergency or medical equipment are reported to the Pilot in Command immediately and recorded in the aircraft technical log through the flight crew. Minor discrepancies may be deferred only when the deferral is recorded with an owner and a follow-up date. Cabin crew do not repair or modify certified equipment.",
      },
      {
        id: "5",
        heading: "AED and medical equipment readiness checks",
        body:
          "Daily readiness checks confirm the AED status indicator shows ready, electrode pads are sealed and within expiry, the battery indicator is acceptable, and the unit is present and secured in its stowage. Medical kits are checked for seal integrity and expiry dates. Any failed check is recorded as a discrepancy and the equipment is treated as unserviceable until cleared by authorized personnel. Manufacturer instructions and the operator's approved equipment list take precedence over this summary.",
      },
      {
        id: "6",
        heading: "Advisory review",
        body:
          "Weather, security, public health and natural-disaster advisories associated with a flight are reviewed during preparation. Acknowledgement records that the cabin team has read the advisory; it is not a risk acceptance and does not substitute for flight crew or security assessment. Absence of alerts is not evidence of safety.",
      },
    ],
  },
  {
    id: "doc-med",
    code: "CSI-MED-002",
    title: "Medical Accommodation & Telemedical Coordination Protocol",
    version: "2.0",
    status: "approved_demo",
    effective: "2026-03-01",
    owner: "Lead Cabin Attendant with operator medical adviser (fictional)",
    scope: "How documented passenger medical accommodations are prepared and escalated. Contains no clinical guidance.",
    sections: [
      {
        id: "1",
        heading: "Principles",
        body:
          "Cabin crew prepare only what is documented in a passenger's approved accommodation record. Crew do not diagnose, recommend treatment or alter a passenger's own care plan. Where a requirement is unclear, crew create a confirmation task and contact the passenger's designated representative.",
      },
      {
        id: "2",
        heading: "In-flight medical events",
        body:
          "In any in-flight medical event, the cabin crew notifies the Pilot in Command and contacts the contracted telemedical provider using the approved communication method. Crew provide care only within their training and the operator's approved first-aid procedures, and follow the telemedical provider's guidance. Decisions on diversion rest with the Pilot in Command.",
      },
      {
        id: "3",
        heading: "Personal medical equipment",
        body:
          "Passenger-owned medical devices, such as portable oxygen concentrators, require confirmation of the device model, quantity and battery arrangements before each flight. Acceptance of a device on board is a flight crew decision made against approved documentation. Cabin crew record the confirmation and coordinate stowage only after acceptance.",
      },
      {
        id: "4",
        heading: "Confidentiality of medical information",
        body:
          "Medical details are restricted to the Lead Cabin Attendant and authorized personnel. Operational summaries shared with other crew describe only what must be prepared, for example 'boarding assistance required', without disclosing diagnoses.",
      },
      {
        id: "5",
        heading: "Allergy emergency plans",
        body:
          "Where a passenger has a documented allergy precaution, the crew confirms that the passenger's individual emergency plan reference is on file and that the crew briefing covers its location and the escalation pathway. Crew do not administer medication beyond their training and the passenger's documented plan.",
      },
    ],
  },
  {
    id: "doc-cat",
    code: "CSI-CAT-003",
    title: "Catering Allergen Control Standard",
    version: "1.1",
    status: "approved_demo",
    effective: "2026-05-10",
    owner: "Lead Cabin Attendant (fictional operator)",
    scope: "Catering ordering, receipt, storage and service controls for documented allergens.",
    sections: [
      {
        id: "1",
        heading: "Ordering",
        body:
          "Catering orders reference the flight manifest's documented allergen precautions. The caterer must confirm in writing that ordered items are prepared without the declared allergen and state cross-contact controls at the kitchen.",
      },
      {
        id: "2",
        heading: "Receipt verification",
        body:
          "On delivery, the cabin attendant verifies every item's label and ingredient declaration against the order. Items without a legible ingredient declaration are not served to passengers with a documented allergen precaution and are segregated.",
      },
      {
        id: "3",
        heading: "Cross-contact prevention",
        body:
          "Allergen-safe items are stored, plated and served first using dedicated utensils and a cleaned surface. Products containing the declared allergen, including snacks and garnishes, are removed from open-service areas for the duration of the flight unless the principal's office directs otherwise in writing.",
      },
      {
        id: "4",
        heading: "Postflight cleandown",
        body:
          "After each flight with a documented allergen precaution, galley surfaces and service ware receive a full cleandown and the next crew is informed through the handover record.",
      },
    ],
  },
  {
    id: "doc-cat-old",
    code: "CSI-CAT-003",
    title: "Catering Allergen Control Standard",
    version: "1.0",
    status: "superseded",
    effective: "2025-09-01",
    owner: "Lead Cabin Attendant (fictional operator)",
    scope: "Superseded by version 1.1. Retained for audit history; excluded from Copilot retrieval.",
    sections: [
      {
        id: "1",
        heading: "Ordering (superseded)",
        body: "Superseded. Refer to CSI-CAT-003 version 1.1.",
      },
    ],
  },
  {
    id: "doc-pet",
    code: "CSI-PET-004",
    title: "Animal Carriage Coordination Guide",
    version: "1.0",
    status: "approved_demo",
    effective: "2026-02-20",
    owner: "Personal assistant & Lead Cabin Attendant (fictional)",
    scope: "Coordination steps for the family dog travelling in the cabin.",
    sections: [
      {
        id: "1",
        heading: "Documentation",
        body:
          "The personal assistant confirms destination entry requirements for the animal (identification, vaccination and health certificate) through official government sources before each international flight. Cabin crew record the confirmation; they do not determine entry eligibility.",
      },
      {
        id: "2",
        heading: "Restraint for taxi, take-off and landing",
        body:
          "The animal is restrained or contained during taxi, take-off, landing and turbulence in accordance with the operator's policy and any flight crew instruction. The specific restraint method requires operator approval.",
      },
      {
        id: "3",
        heading: "Cabin considerations",
        body:
          "Crew confirm the animal's water, waste management supplies and seating area, and check for conflicts with passenger allergy records before boarding.",
      },
    ],
  },
  {
    id: "doc-hnd",
    code: "CSI-HND-005",
    title: "Crew Handover & Acknowledgement Standard",
    version: "1.2",
    status: "approved_demo",
    effective: "2026-04-05",
    owner: "Lead Cabin Attendant (fictional operator)",
    scope: "Structured handovers between cabin attendants and acknowledgement tracking.",
    sections: [
      {
        id: "1",
        heading: "When a handover is required",
        body:
          "A structured handover is completed whenever cabin responsibility passes between attendants, including between trips and when a contract attendant joins a trip.",
      },
      {
        id: "2",
        heading: "Handover content",
        body:
          "Each handover lists flight details, outgoing and incoming attendants, open safety items, equipment status and discrepancies, relevant passenger accommodations (operational summary only), required acknowledgements and free-text notes.",
      },
      {
        id: "3",
        heading: "Acceptance",
        body:
          "The incoming attendant reviews and acknowledges each required item before accepting. Acceptance is time-stamped and recorded in the audit history. Open safety items remain open; acceptance transfers ownership, not resolution.",
      },
    ],
  },
  {
    id: "doc-adv",
    code: "CSI-ADV-006",
    title: "Risk Advisory Review Procedure",
    version: "1.0",
    status: "approved_demo",
    effective: "2026-06-01",
    owner: "Lead Cabin Attendant with security lead (fictional)",
    scope: "Use of external advisories in cabin preparation.",
    sections: [
      {
        id: "1",
        heading: "Sources",
        body:
          "Advisories are drawn from official sources: NOAA Aviation Weather Center for METAR, TAF and SIGMET; U.S. Department of State travel advisories; USGS earthquake feeds; GDACS disaster alerts; and CDC travel health notices. Simulated advisories used for training are always labeled as simulated.",
      },
      {
        id: "2",
        heading: "Cabin actions",
        body:
          "Weather advisories may lead to earlier service completion, galley securing and passenger briefing on seat-belt use. Security advisories are coordinated with the security lead. The cabin team does not make go/no-go decisions; relevant advisories are raised with the Pilot in Command and security lead.",
      },
      {
        id: "3",
        heading: "Stale or unavailable data",
        body:
          "If a feed is unavailable or data is older than its validity period, the cabin team records the gap and seeks the information through the flight crew's approved briefing sources.",
      },
    ],
  },
  {
    id: "doc-sec",
    code: "CSI-SEC-007",
    title: "Confidentiality & Information Handling",
    version: "1.0",
    status: "approved_demo",
    effective: "2026-01-15",
    owner: "Principal's office (fictional)",
    scope: "Discretion and handling of passenger information.",
    sections: [
      {
        id: "1",
        heading: "Aliases",
        body:
          "Passengers are referred to by assigned aliases in all crew systems and communications. Real names appear only on documents required by authorities.",
      },
      {
        id: "2",
        heading: "Need to know",
        body:
          "Crew access passenger information only as needed for their role. Medical information is restricted to the Lead Cabin Attendant and authorized personnel. Information is never discussed with third parties, including FBO and catering staff, beyond what is operationally required.",
      },
    ],
  },
  {
    id: "doc-afm",
    code: "OEM-G700-CABIN",
    title: "Aircraft-Specific Cabin Emergency Procedures (operator-approved)",
    version: "—",
    status: "required_not_loaded",
    effective: "",
    owner: "Operator / manufacturer",
    scope:
      "Emergency exits, evacuation, ditching, fire-fighting, decompression and emergency equipment locations for this aircraft. Approved documentation has not been loaded into this demonstration.",
    sections: [],
  },
];

export function documentLabel(d: ReferenceDocument): string {
  return `${d.code} v${d.version}`;
}

export function findDocumentByCode(code: string): ReferenceDocument | undefined {
  return DOCUMENTS.find((d) => d.code === code && d.status === "approved_demo");
}
