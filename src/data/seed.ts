import { buildChecklist, checklistTaskId } from "@/domain/checklists";
import { generateTasksForPassenger } from "@/domain/rules";
import type {
  Advisory,
  CrewInput,
  AuditEvent,
  CrewMember,
  Discrepancy,
  Equipment,
  Flight,
  Handover,
  InspectionRecord,
  Passenger,
  Task,
} from "@/domain/types";

/**
 * Synthetic demonstration dataset. Every person, alias, health detail, flight
 * and record below is fictional. Dates are generated relative to the moment the
 * demo is seeded so the scenario never goes stale.
 */

export const LEAD_ID = "crew-lead";
export const CA_CLAIRE = "crew-ca-claire";
export const CA_SAM = "crew-ca-sam";
export const PIC_ID = "crew-pic";
export const SIC_ID = "crew-sic";
export const SEC_ID = "crew-sec";
export const PA_ID = "crew-pa";

export const FEATURED_FLIGHT_ID = "flt-csi101";

export const CREW: CrewMember[] = [
  { id: LEAD_ID, name: "Kate Keaney", initials: "KK", role: "lead", title: "Lead Cabin Attendant", employment: "staff", phoneMasked: "+1 ••• ••• 0142", qualifications: ["Cabin safety program lead", "First aid & AED (current)", "Allergen control", "Security awareness"] },
  { id: CA_CLAIRE, name: "Claire Dubois", initials: "CD", role: "contract_ca", title: "Contract Cabin Attendant", employment: "contract", phoneMasked: "+33 •• •• •• 18", qualifications: ["G-type cabin experience", "First aid & AED (current)", "French / English"] },
  { id: CA_SAM, name: "Sam Whitaker", initials: "SW", role: "contract_ca", title: "Contract Cabin Attendant", employment: "contract", phoneMasked: "+1 ••• ••• 7730", qualifications: ["First aid & AED (current)", "Food safety level 3"] },
  { id: PIC_ID, name: "Capt. Daniel Hart", initials: "DH", role: "pilot", title: "Captain · Pilot in Command", employment: "staff", phoneMasked: "+1 ••• ••• 2201", qualifications: ["PIC authority"] },
  { id: SIC_ID, name: "F/O Priya Nair", initials: "PN", role: "pilot", title: "First Officer", employment: "staff", phoneMasked: "+1 ••• ••• 5518", qualifications: ["SIC"] },
  { id: SEC_ID, name: "Marcus Vale", initials: "MV", role: "security", title: "Security Lead", employment: "staff", phoneMasked: "+1 ••• ••• 9034", qualifications: ["Executive protection"] },
  { id: PA_ID, name: "Elena Ruiz", initials: "ER", role: "assistant", title: "Personal Assistant to the Principal", employment: "staff", phoneMasked: "+1 ••• ••• 4477", qualifications: ["Travel documentation"] },
];

export const PASSENGERS: Passenger[] = [
  {
    id: "pax-atlas", alias: "ATLAS", displayName: "Principal", relationship: "Principal · Aircraft owner", category: "principal", initials: "AT",
    accommodations: [
      { id: "acc-atlas-1", type: "comfort", summary: "Quiet, uninterrupted cabin during work periods; service on request only. Health-conscious menu with an occasional indulgent snack; wine selection per principal's cellar list.", documentation: "documented" },
    ],
    dietary: ["Health-conscious menu; light meals preferred"],
    preferences: ["Still water, room temperature", "Burgundy and Napa reds from cellar list", "Dark chocolate after dinner service"],
    emergencyPlanRef: "EP-ATLAS-01",
    restrictedNotes: "Discretion: no names in FBO or catering communications. Alias only.",
  },
  {
    id: "pax-aurora", alias: "AURORA", displayName: "Spouse of the Principal", relationship: "Spouse", category: "family", initials: "AU",
    accommodations: [],
    dietary: ["Pescatarian"],
    preferences: ["Herbal tea service", "Blanket and eye mask on overnight sectors"],
    emergencyPlanRef: "EP-AURORA-01",
  },
  {
    id: "pax-orion", alias: "ORION", displayName: "Adult son", relationship: "Adult child", category: "family", initials: "OR",
    accommodations: [
      { id: "acc-orion-1", type: "allergy", summary: "Peanut allergy precaution. Cross-contact prevention required for all catering and open-service snacks.", documentation: "documented", planRef: "EP-ORION-01", allergen: "peanut" },
    ],
    dietary: [],
    preferences: ["Sparkling water", "Late breakfast service"],
    emergencyPlanRef: "EP-ORION-01",
    restrictedMedical: "Synthetic record: peanut allergy, historically mild reactions that can flare. Individual emergency plan EP-ORION-01 held by the family physician; passenger carries own prescribed items per plan.",
  },
  {
    id: "pax-lyra", alias: "LYRA", displayName: "Adult daughter", relationship: "Adult child", category: "family", initials: "LY",
    accommodations: [],
    dietary: ["Vegetarian"],
    preferences: ["Oat milk", "Window seat"],
    emergencyPlanRef: "EP-LYRA-01",
  },
  {
    id: "pax-rebecca", alias: "REBECCA", displayName: "Mother of the Principal", relationship: "Parent · senior family member", category: "family", initials: "RB",
    accommodations: [
      { id: "acc-rebecca-1", type: "mobility", summary: "Unhurried boarding with airstair assistance offered; seat close to forward lavatory.", documentation: "documented", planRef: "MAP-REBECCA-02" },
      { id: "acc-rebecca-2", type: "medical_equipment", summary: "May travel with personal medical equipment. Requirements to be confirmed with her representative before each flight.", documentation: "pending_confirmation" },
      { id: "acc-rebecca-3", type: "medical_plan", summary: "Individual care plan on file (restricted).", documentation: "documented", planRef: "ICP-REBECCA-01" },
    ],
    dietary: ["Low-sodium meals"],
    preferences: ["Warm cabin temperature", "Reading light and large-print menu"],
    emergencyPlanRef: "ICP-REBECCA-01",
    restrictedMedical: "Synthetic record: chronic obstructive pulmonary disease (COPD). Care decisions rest with the passenger and her physician. Escalation per CSI-MED-002 §2.",
  },
  {
    id: "pax-cedar", alias: "CEDAR", displayName: "Father of the Spouse", relationship: "Parent · senior family member", category: "family", initials: "CE",
    accommodations: [
      { id: "acc-cedar-1", type: "mobility", summary: "Boarding assistance; seat with firm armrest support; allow additional time for transitions.", documentation: "documented", planRef: "MAP-CEDAR-01" },
      { id: "acc-cedar-2", type: "comfort", summary: "Documented preference for quiet, unhurried service and meals served on his requested schedule.", documentation: "documented" },
      { id: "acc-cedar-3", type: "medical_plan", summary: "Individual care plan on file (restricted).", documentation: "documented", planRef: "ICP-CEDAR-01" },
    ],
    dietary: ["Soft-texture options available on request"],
    preferences: ["Weighted cutlery available on request", "Aisle-access seat"],
    emergencyPlanRef: "ICP-CEDAR-01",
    restrictedMedical: "Synthetic record: early-stage Parkinson's disease. Accommodations limited to documented mobility and service preferences.",
  },
  {
    id: "pax-meridian", alias: "MERIDIAN", displayName: "Frequent guest", relationship: "Family friend · frequent guest", category: "guest", initials: "ME",
    accommodations: [],
    dietary: ["Gluten-free"],
    preferences: ["Espresso, no sugar"],
    emergencyPlanRef: "EP-MERIDIAN-01",
    restrictedNotes: "Guest of the principal. Do not share itinerary details with guest's office.",
  },
  {
    id: "pax-copper", alias: "COPPER", displayName: "Family Vizsla", relationship: "Family dog", category: "pet", initials: "CO",
    accommodations: [
      { id: "acc-copper-1", type: "pet", summary: "Vizsla, 25 kg. Travels in cabin with family; restraint for taxi, take-off and landing per operator policy.", documentation: "documented" },
    ],
    dietary: [],
    preferences: ["Own water bowl and bed", "Walk at FBO before boarding"],
    pet: { breed: "Vizsla", weightKg: 25, documentation: "Microchip and vaccination records held by personal assistant; destination health certificate to be confirmed per trip." },
  },
];

const H = 3_600_000;
const D = 24 * H;

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

/** Round to the next quarter hour so schedules look natural. */
function quarter(ms: number): number {
  const q = 15 * 60_000;
  return Math.ceil(ms / q) * q;
}

export interface SeedState {
  seededAt: string;
  flights: Flight[];
  tasks: Task[];
  equipment: Equipment[];
  discrepancies: Discrepancy[];
  advisories: Advisory[];
  handovers: Handover[];
  audit: AuditEvent[];
  passengers: Passenger[];
  crew: CrewMember[];
  crewInputs: CrewInput[];
}

function history(now: number, intervalDays: number, count: number, byIds: string[], checks: string[]): InspectionRecord[] {
  const out: InspectionRecord[] = [];
  for (let i = count; i >= 1; i--) {
    const at = now - i * intervalDays * D - 3 * H;
    out.push({
      id: `insp-${Math.round(at / 1000)}-${i}`,
      at: iso(at),
      byId: byIds[i % byIds.length],
      result: "pass",
      checks: checks.map((label) => ({ label, ok: true })),
    });
  }
  return out.reverse();
}

export function createSeed(nowMs: number = Date.now()): SeedState {
  const now = nowMs;
  const nowIso = iso(now);

  // ── Flights ──
  const f101Depart = quarter(now + 20 * H);
  const f102Depart = quarter(now + 3 * D + 2 * H);
  const f103Depart = quarter(now + 6 * D + 5 * H);
  const f100Depart = quarter(now - 30 * H);

  const flights: Flight[] = [
    {
      id: "flt-csi100", callsign: "CSI100", aircraftId: "ac-demo-700", departure: "KTEB", destination: "KMIA", alternates: ["KFLL"],
      departAt: iso(f100Depart), arriveAt: iso(f100Depart + 2.75 * H), leadId: LEAD_ID, cabinAttendantId: CA_CLAIRE,
      pilotIds: [PIC_ID, SIC_ID], securityIds: [SEC_ID], manifest: ["pax-atlas", "pax-aurora", "pax-meridian"], status: "completed",
      notes: "Positioning sector with principal. Completed.",
    },
    {
      id: FEATURED_FLIGHT_ID, callsign: "CSI101", aircraftId: "ac-demo-700", departure: "KMIA", destination: "LSGG", alternates: ["LSZH", "LFLL"],
      departAt: iso(f101Depart), arriveAt: iso(f101Depart + 8.75 * H), leadId: LEAD_ID, cabinAttendantId: CA_SAM,
      pilotIds: [PIC_ID, SIC_ID], securityIds: [SEC_ID],
      manifest: ["pax-atlas", "pax-aurora", "pax-orion", "pax-rebecca", "pax-cedar", "pax-meridian", "pax-copper"], status: "scheduled",
      notes: "Overnight transatlantic. Family travel with senior family members and guest.",
    },
    {
      id: "flt-csi102", callsign: "CSI102", aircraftId: "ac-demo-700", departure: "LSGG", destination: "EGLF", alternates: ["EGKK", "EGLL"],
      departAt: iso(f102Depart), arriveAt: iso(f102Depart + 1.75 * H), leadId: LEAD_ID, cabinAttendantId: CA_CLAIRE,
      pilotIds: [PIC_ID, SIC_ID], securityIds: [SEC_ID], manifest: ["pax-atlas", "pax-aurora", "pax-lyra", "pax-copper"], status: "scheduled",
    },
    {
      id: "flt-csi103", callsign: "CSI103", aircraftId: "ac-demo-700", departure: "EGLF", destination: "KPBI", alternates: ["KFLL", "KMIA"],
      departAt: iso(f103Depart), arriveAt: iso(f103Depart + 9.5 * H), leadId: LEAD_ID, cabinAttendantId: CA_SAM,
      pilotIds: [PIC_ID, SIC_ID], securityIds: [SEC_ID],
      manifest: ["pax-atlas", "pax-aurora", "pax-orion", "pax-lyra", "pax-rebecca", "pax-cedar", "pax-copper"], status: "planning",
    },
  ];

  // ── Checklists ──
  const tasks: Task[] = [];
  for (const f of flights) {
    if (f.status === "completed") {
      tasks.push(...buildChecklist(f, iso(f100Depart - 2 * D), "postflight"));
    } else {
      tasks.push(...buildChecklist(f, iso(now - 2 * D), "preflight"));
    }
  }
  // ── Generated passenger tasks ──
  for (const f of flights.filter((x) => x.status !== "completed")) {
    for (const pid of f.manifest) {
      const p = PASSENGERS.find((x) => x.id === pid)!;
      tasks.push(...generateTasksForPassenger(p, f, new Set(tasks.map((t) => t.id)), iso(now - 36 * H)));
    }
  }

  const patch = (id: string, p: Partial<Task>) => {
    const t = tasks.find((x) => x.id === id);
    if (t) Object.assign(t, p);
  };
  const done = (id: string, by: string, hoursAgo: number, extra: Partial<Task> = {}) => {
    const at = iso(now - hoursAgo * H);
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    Object.assign(t, {
      status: "completed",
      completedAt: at,
      completedById: by,
      signOff: t.requiresSignOff ? { byId: by, at } : undefined,
      history: [...t.history, { at, byId: by, text: "Marked completed" }],
      ...extra,
    });
  };

  // Completed postflight on CSI100 except restock
  done(checklistTaskId("flt-csi100", "pf-log"), CA_CLAIRE, 26, { notes: "Two discrepancies recorded: FAK-02 dressings used; FL-03 charge indicator amber." });
  done(checklistTaskId("flt-csi100", "pf-used"), LEAD_ID, 26);
  done(checklistTaskId("flt-csi100", "pf-clean"), CA_CLAIRE, 25);
  done(checklistTaskId("flt-csi100", "pf-confid"), LEAD_ID, 26);
  patch(checklistTaskId("flt-csi100", "pf-restock"), { status: "in_progress", notes: "Dressing restock ordered; awaiting delivery to FBO.", assigneeId: CA_CLAIRE });

  // CSI101 — partially prepared
  const c = (k: string) => checklistTaskId(FEATURED_FLIGHT_ID, k);
  done(c("brf-route"), LEAD_ID, 10, { notes: "Routing KMIA–LSGG with LSZH/LFLL alternates confirmed with Capt. Hart." });
  done(c("cab-walk"), CA_CLAIRE, 5);
  done(c("cab-light"), CA_CLAIRE, 5);
  done(c("gal-hot"), CA_CLAIRE, 5);
  patch(c("cat-reconcile"), { status: "in_progress", notes: "Caterer confirmation for gluten-free and low-sodium items received; peanut-free written confirmation pending.", history: [{ at: iso(now - 4 * H), byId: LEAD_ID, text: "Status → In Progress" }] });
  patch(c("med-tele"), { status: "blocked", blockedReason: "Telemedical provider link test window not until 4 hours before departure. Retest scheduled.", history: [{ at: iso(now - 3 * H), byId: LEAD_ID, text: "Status → Blocked" }] });
  patch(c("sec-brief"), { status: "in_progress", notes: "Arrival plan for Geneva pending security lead confirmation." });
  patch(c("eme-flash"), { status: "in_progress", notes: "FL-03 indicator amber — see discrepancy." });

  // Generated tasks for CSI101: some reviewed / done
  const g = (pid: string, rule: string) => `gen:${FEATURED_FLIGHT_ID}:${pid}:${rule}`;
  patch(g("pax-rebecca", "acc-rebecca-1:boarding"), { reviewed: true });
  patch(g("pax-orion", "acc-orion-1:ingredients"), { reviewed: true, status: "in_progress", notes: "Written caterer confirmation requested." });
  done(g("pax-meridian", "dietary"), LEAD_ID, 8, { reviewed: true });
  done(g("pax-copper", "acc-copper-1:docs"), PA_ID, 30, { reviewed: true, notes: "PA confirmed via official Swiss government guidance. Certificate copy held by PA." });

  // ── Equipment ──
  const aedChecks = ["Status indicator shows ready", "Electrode pads sealed and within expiry", "Battery indicator acceptable", "Unit present and secured in stowage"];
  const kitChecks = ["Seal intact", "Contents within expiry", "Stowage secure"];
  const feChecks = ["Pressure / indicator in range", "Safety pin and seal intact", "Bracket secure"];
  const flChecks = ["Charge indicator acceptable", "Unit present in bracket"];
  const o2Checks = ["Pressure indicator in range", "Mask present and sealed", "Stowage secure"];
  const pbeChecks = ["Package seal intact", "Humidity indicator acceptable", "Within service life"];

  const eq = (e: Omit<Equipment, "history" | "documentIds"> & { documentIds?: string[]; history?: InspectionRecord[] }): Equipment => ({
    documentIds: ["CSI-OPS-001"],
    history: e.lastInspectionAt ? history(new Date(e.lastInspectionAt).getTime() + e.inspectionIntervalDays * D, e.inspectionIntervalDays, 3, [LEAD_ID, CA_CLAIRE, CA_SAM], e.checklist) : [],
    ...e,
  });

  const equipment: Equipment[] = [
    eq({ id: "eq-aed-01", code: "AED-01", name: "Automated External Defibrillator", category: "aed", zone: "GALLEY", x: 236, y: 214, status: "inspection_due", critical: true, lastInspectionAt: iso(now - 1 * D - 6 * H), nextInspectionDue: iso(now - 2 * H), expiresAt: iso(now + 214 * D), inspectionIntervalDays: 1, serialMasked: "AED-••••-4471", checklist: aedChecks, documentIds: ["CSI-OPS-001", "CSI-MED-002"] }),
    eq({ id: "eq-emk-01", code: "EMK-01", name: "Emergency Medical Kit", category: "medical_kit", zone: "GALLEY", x: 64, y: 214, status: "due_soon", critical: true, lastInspectionAt: iso(now - 6 * D), nextInspectionDue: iso(now + 1 * D), expiresAt: iso(now + 21 * D), inspectionIntervalDays: 7, serialMasked: "EMK-••••-0193", checklist: kitChecks, documentIds: ["CSI-OPS-001", "CSI-MED-002"] }),
    eq({ id: "eq-tms-01", code: "TMS-01", name: "Telemedical Link Kit", category: "telemedical", zone: "GALLEY", x: 168, y: 200, status: "serviceable", critical: false, lastInspectionAt: iso(now - 3 * D), nextInspectionDue: iso(now + 4 * D), inspectionIntervalDays: 7, serialMasked: "TMS-••••-8820", checklist: ["Device charged", "Provider contact card current", "Vital-signs peripherals present"], documentIds: ["CSI-MED-002"] }),
    eq({ id: "eq-fak-01", code: "FAK-01", name: "First-Aid Kit", category: "first_aid", zone: "Z2", x: 236, y: 427, status: "serviceable", critical: true, lastInspectionAt: iso(now - 5 * D), nextInspectionDue: iso(now + 2 * D), expiresAt: iso(now + 160 * D), inspectionIntervalDays: 7, serialMasked: "FAK-••••-2210", checklist: kitChecks }),
    eq({ id: "eq-fak-02", code: "FAK-02", name: "First-Aid Kit", category: "first_aid", zone: "Z5", x: 92, y: 836, status: "discrepancy", critical: true, lastInspectionAt: iso(now - 27 * H), nextInspectionDue: iso(now + 6 * D), expiresAt: iso(now + 90 * D), inspectionIntervalDays: 7, serialMasked: "FAK-••••-2211", checklist: kitChecks }),
    eq({ id: "eq-fe-01", code: "FE-01", name: "Fire Extinguisher", category: "fire_extinguisher", zone: "FLIGHTDECK", x: 192, y: 128, status: "serviceable", critical: true, lastInspectionAt: iso(now - 9 * D), nextInspectionDue: iso(now + 21 * D), inspectionIntervalDays: 30, serialMasked: "FE-••••-7101", checklist: feChecks }),
    eq({ id: "eq-fe-02", code: "FE-02", name: "Fire Extinguisher", category: "fire_extinguisher", zone: "GALLEY", x: 64, y: 168, status: "serviceable", critical: true, lastInspectionAt: iso(now - 9 * D), nextInspectionDue: iso(now + 21 * D), inspectionIntervalDays: 30, serialMasked: "FE-••••-7102", checklist: feChecks }),
    eq({ id: "eq-fe-03", code: "FE-03", name: "Fire Extinguisher", category: "fire_extinguisher", zone: "Z3", x: 236, y: 562, status: "serviceable", critical: true, lastInspectionAt: iso(now - 9 * D), nextInspectionDue: iso(now + 21 * D), inspectionIntervalDays: 30, serialMasked: "FE-••••-7103", checklist: feChecks }),
    eq({ id: "eq-fe-04", code: "FE-04", name: "Fire Extinguisher", category: "fire_extinguisher", zone: "AFT", x: 224, y: 893, status: "serviceable", critical: true, lastInspectionAt: iso(now - 9 * D), nextInspectionDue: iso(now + 21 * D), inspectionIntervalDays: 30, serialMasked: "FE-••••-7104", checklist: feChecks }),
    eq({ id: "eq-fl-01", code: "FL-01", name: "Cabin Flashlight", category: "flashlight", zone: "GALLEY", x: 236, y: 168, status: "serviceable", critical: false, lastInspectionAt: iso(now - 2 * D), nextInspectionDue: iso(now + 5 * D), inspectionIntervalDays: 7, serialMasked: "FL-••••-01", checklist: flChecks }),
    eq({ id: "eq-fl-02", code: "FL-02", name: "Cabin Flashlight", category: "flashlight", zone: "Z2", x: 64, y: 372, status: "serviceable", critical: false, lastInspectionAt: iso(now - 2 * D), nextInspectionDue: iso(now + 5 * D), inspectionIntervalDays: 7, serialMasked: "FL-••••-02", checklist: flChecks }),
    eq({ id: "eq-fl-03", code: "FL-03", name: "Cabin Flashlight", category: "flashlight", zone: "Z4", x: 64, y: 690, status: "discrepancy", critical: false, lastInspectionAt: iso(now - 27 * H), nextInspectionDue: iso(now + 5 * D), inspectionIntervalDays: 7, serialMasked: "FL-••••-03", checklist: flChecks }),
    eq({ id: "eq-fl-04", code: "FL-04", name: "Cabin Flashlight", category: "flashlight", zone: "Z5", x: 236, y: 836, status: "serviceable", critical: false, lastInspectionAt: iso(now - 2 * D), nextInspectionDue: iso(now + 5 * D), inspectionIntervalDays: 7, serialMasked: "FL-••••-04", checklist: flChecks }),
    eq({ id: "eq-o2-01", code: "O2-01", name: "Portable Oxygen (crew/first-aid)", category: "oxygen", zone: "Z1", x: 64, y: 292, status: "serviceable", critical: true, lastInspectionAt: iso(now - 4 * D), nextInspectionDue: iso(now + 3 * D), inspectionIntervalDays: 7, serialMasked: "O2-••••-301", checklist: o2Checks }),
    eq({ id: "eq-o2-02", code: "O2-02", name: "Portable Oxygen (crew/first-aid)", category: "oxygen", zone: "Z4", x: 236, y: 655, status: "due_soon", critical: true, lastInspectionAt: iso(now - 6 * D), nextInspectionDue: iso(now + 20 * H), inspectionIntervalDays: 7, serialMasked: "O2-••••-302", checklist: o2Checks }),
    eq({ id: "eq-pbe-01", code: "PBE-01", name: "Protective Breathing Equipment", category: "pbe", zone: "FLIGHTDECK", x: 108, y: 128, status: "serviceable", critical: true, lastInspectionAt: iso(now - 9 * D), nextInspectionDue: iso(now + 21 * D), inspectionIntervalDays: 30, serialMasked: "PBE-••••-11", checklist: pbeChecks }),
    eq({ id: "eq-pbe-02", code: "PBE-02", name: "Protective Breathing Equipment", category: "pbe", zone: "GALLEY", x: 132, y: 200, status: "serviceable", critical: true, lastInspectionAt: iso(now - 9 * D), nextInspectionDue: iso(now + 21 * D), inspectionIntervalDays: 30, serialMasked: "PBE-••••-12", checklist: pbeChecks }),
  ];

  // ── Discrepancies ──
  const discrepancies: Discrepancy[] = [
    { id: "dsc-fak02", equipmentId: "eq-fak-02", flightId: "flt-csi100", title: "FAK-02 adhesive dressings used — restock required", detail: "Two adhesive dressings used for a minor paper cut on CSI100. Kit seal re-applied pending restock.", severity: "minor", reportedAt: iso(now - 27 * H), reportedById: CA_CLAIRE, status: "open", phase: "postflight", location: "Zone 5" },
    { id: "dsc-fl03", equipmentId: "eq-fl-03", flightId: "flt-csi100", title: "FL-03 charge indicator amber", detail: "Charge indicator amber at postflight check. Placed on charge; recheck required before CSI101.", severity: "minor", reportedAt: iso(now - 27 * H), reportedById: CA_CLAIRE, status: "open", phase: "postflight", location: "Zone 4" },
    { id: "dsc-light", flightId: "flt-csi100", title: "Seat D3 reading light intermittent", detail: "Reading light at D3 flickers intermittently. Reported to flight crew for technical log entry.", severity: "minor", reportedAt: iso(now - 26 * H), reportedById: LEAD_ID, status: "deferred", phase: "postflight", location: "Zone 2 · D3" },
  ];

  // ── Simulated advisories (always labelled) ──
  const advisories: Advisory[] = [
    {
      id: "sim-wx-lsgg", origin: "simulated", category: "weather", severity: "warning",
      title: "Strong Bise wind with moderate turbulence on Geneva approach",
      summary: "Simulated scenario: north-easterly Bise gusting 35–40 kt forecast for the CSI101 arrival window, with moderate turbulence below FL100 on descent into LSGG.",
      cabinRelevance: "Plan to complete service and secure the galley well before top of descent. Brief senior passengers on early seat-belt use and assist with mobility needs before descent. Secure loose items and the animal restraint early. Coordinate timing with the PIC.",
      geography: "Geneva (LSGG) and Lake Geneva basin", airports: ["LSGG"],
      source: "CabinSafe demonstration scenario — SIMULATED (not an official forecast)",
      sourceUrl: "https://www.meteoswiss.admin.ch/",
      publishedAt: iso(now - 2 * H), retrievedAt: iso(now - 2 * H),
    },
    {
      id: "sim-sec-gva", origin: "simulated", category: "political_unrest", severity: "advisory",
      title: "Planned demonstration near Geneva city centre",
      summary: "Simulated scenario: a large permitted demonstration is planned near Place des Nations on the afternoon of arrival, with possible road closures between the airport and the city centre.",
      cabinRelevance: "Ground transport timing may change. Confirm the arrival and disembarkation plan with the security lead; keep passenger identities and itinerary details strictly confidential with FBO staff.",
      geography: "Geneva city centre", airports: ["LSGG"],
      source: "CabinSafe demonstration scenario — SIMULATED (not an official advisory)",
      sourceUrl: "https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html",
      publishedAt: iso(now - 5 * H), retrievedAt: iso(now - 5 * H),
    },
    {
      id: "sim-health-eglf", origin: "simulated", category: "public_health", severity: "info",
      title: "Elevated seasonal respiratory illness activity",
      summary: "Simulated scenario: seasonal respiratory illness activity is elevated in southern England.",
      cabinRelevance: "Reinforce cabin hygiene and hand-sanitiser availability, with particular care for senior passengers. No change to procedures without operator guidance.",
      geography: "South-east England", airports: ["EGLF"],
      source: "CabinSafe demonstration scenario — SIMULATED (not an official notice)",
      sourceUrl: "https://wwwnc.cdc.gov/travel/notices",
      publishedAt: iso(now - 20 * H), retrievedAt: iso(now - 20 * H),
    },
  ];

  // ── Incomplete handover ──
  const handovers: Handover[] = [
    {
      id: "hnd-001", flightId: FEATURED_FLIGHT_ID, outgoingId: CA_CLAIRE, incomingId: CA_SAM, createdAt: iso(now - 3 * H), createdById: CA_CLAIRE,
      status: "submitted",
      openTaskIds: [c("cat-reconcile"), c("med-tele"), c("eme-flash"), checklistTaskId("flt-csi100", "pf-restock")],
      equipmentSummary: "AED-01 daily inspection due before CSI101. FAK-02 dressings restock pending (minor). FL-03 charge indicator amber, on charge (minor). O2-02 inspection due within 24 h.",
      accommodationSummary: "REBECCA and CEDAR: documented boarding assistance. ORION: peanut precaution — cross-contact controls apply. COPPER travelling; restraint for taxi/take-off/landing. Medical details restricted to Lead CA.",
      acknowledgements: [
        { id: "ack-1", label: "Reviewed open safety items" },
        { id: "ack-2", label: "Reviewed equipment status and discrepancies" },
        { id: "ack-3", label: "Reviewed passenger accommodation summary" },
        { id: "ack-4", label: "Confirmed confidentiality obligations (CSI-SEC-007)" },
      ],
      notes: "Cabin walkaround complete in all five zones. Galley clean-down done after CSI100. Catering peanut-free confirmation still outstanding — please chase before 14:00 local.",
    },
  ];

  // ── Audit history ──
  const audit: AuditEvent[] = [
    { id: "aud-1", at: iso(now - 30 * H), actorId: PA_ID, actorRole: "assistant", action: "task.complete", entity: "task", entityId: g("pax-copper", "acc-copper-1:docs"), flightId: FEATURED_FLIGHT_ID, summary: "Confirmed animal entry documentation for Switzerland — COPPER" },
    { id: "aud-2", at: iso(now - 27 * H), actorId: CA_CLAIRE, actorRole: "contract_ca", action: "discrepancy.create", entity: "discrepancy", entityId: "dsc-fak02", flightId: "flt-csi100", summary: "Postflight discrepancy: FAK-02 adhesive dressings used — restock required" },
    { id: "aud-3", at: iso(now - 27 * H), actorId: CA_CLAIRE, actorRole: "contract_ca", action: "discrepancy.create", entity: "discrepancy", entityId: "dsc-fl03", flightId: "flt-csi100", summary: "Postflight discrepancy: FL-03 charge indicator amber" },
    { id: "aud-4", at: iso(now - 26 * H), actorId: LEAD_ID, actorRole: "lead", action: "discrepancy.update", entity: "discrepancy", entityId: "dsc-light", flightId: "flt-csi100", summary: "Deferred: Seat D3 reading light intermittent (reported to flight crew)" },
    { id: "aud-5", at: iso(now - 24 * H), actorId: LEAD_ID, actorRole: "lead", action: "task.assign", entity: "flight", entityId: FEATURED_FLIGHT_ID, flightId: FEATURED_FLIGHT_ID, summary: "Assigned Sam Whitaker as cabin attendant for CSI101" },
    { id: "aud-6", at: iso(now - 10 * H), actorId: LEAD_ID, actorRole: "lead", action: "checklist.update", entity: "task", entityId: c("brf-route"), flightId: FEATURED_FLIGHT_ID, summary: "Completed: Review schedule, routing and alternates" },
    { id: "aud-7", at: iso(now - 5 * H), actorId: CA_CLAIRE, actorRole: "contract_ca", action: "checklist.update", entity: "task", entityId: c("cab-walk"), flightId: FEATURED_FLIGHT_ID, summary: "Completed: Cabin walkaround — seats, restraints, stowage, lavatories" },
    { id: "aud-8", at: iso(now - 3 * H), actorId: LEAD_ID, actorRole: "lead", action: "checklist.update", entity: "task", entityId: c("med-tele"), flightId: FEATURED_FLIGHT_ID, summary: "Blocked: Telemedical provider contact & connectivity test" },
    { id: "aud-9", at: iso(now - 3 * H), actorId: CA_CLAIRE, actorRole: "contract_ca", action: "handover.create", entity: "handover", entityId: "hnd-001", flightId: FEATURED_FLIGHT_ID, summary: "Handover submitted: Claire Dubois → Sam Whitaker (CSI101)" },
  ].sort((a, b) => b.at.localeCompare(a.at)) as AuditEvent[];

  // ── Items added to the cabin attendant's pre-boarding checklist by others (three for the demo) ──
  const crewInputs: CrewInput[] = [
    {
      id: "inp-lead-1", flightId: FEATURED_FLIGHT_ID, fromId: LEAD_ID, fromRole: "lead", category: "catering", priority: "critical", requiresAck: true, createdAt: iso(now - 2 * H), acks: [],
      text: "Peanut-free cabin today. Remove the mixed-nut ramekins from the Zone 3 credenza before boarding, and do not plate dessert until the caterer's written peanut-free confirmation is on file.",
    },
    {
      id: "inp-pic-1", flightId: FEATURED_FLIGHT_ID, fromId: PIC_ID, fromRole: "pilot", category: "safety", priority: "important", requiresAck: true, createdAt: iso(now - 90 * 60_000), acks: [],
      text: "Expect moderate turbulence on descent into Geneva. Plan to complete service 45 minutes before top of descent; I will call 'cabin secure' 20 minutes prior. Brief REBECCA and CEDAR on early seat-belt use at boarding.",
    },
    {
      id: "inp-pa-1", flightId: FEATURED_FLIGHT_ID, fromId: PA_ID, fromRole: "assistant", category: "timing", priority: "important", requiresAck: true, createdAt: iso(now - 70 * 60_000), acks: [],
      text: "Family arrives 15 minutes before the Principal. The Principal will board directly from the car — no reception line, please; welcome service in Zone 1 once seated.",
    },
  ];

  return {
    crewInputs,
    seededAt: nowIso,
    flights,
    tasks,
    equipment,
    discrepancies,
    advisories,
    handovers,
    audit,
    passengers: structuredClone(PASSENGERS),
    crew: structuredClone(CREW),
  };
}
