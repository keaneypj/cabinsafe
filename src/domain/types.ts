/**
 * CabinSafe Intelligence — core domain model.
 *
 * All records in the demonstration dataset are synthetic. Aircraft-specific
 * information is conceptual and must be verified against approved operator
 * documentation before any operational use.
 */

export type ISODate = string;

// ───────────────────────────── People & roles ─────────────────────────────

export type RoleKey = "lead" | "contract_ca" | "pilot" | "security" | "assistant";

export interface CrewMember {
  id: string;
  name: string;
  initials: string;
  role: RoleKey;
  title: string;
  /** Contract cabin attendants are engaged per trip. */
  employment: "staff" | "contract";
  phoneMasked: string;
  qualifications: string[];
}

// ───────────────────────────── Aircraft ─────────────────────────────

export type ZoneId = "Z1" | "Z2" | "Z3" | "Z4" | "Z5" | "GALLEY" | "FLIGHTDECK" | "AFT";

export interface CabinZone {
  id: ZoneId;
  name: string;
  description: string;
}

export interface Seat {
  id: string;
  label: string;
  zone: ZoneId;
  /** SVG coordinates within the conceptual cabin map. */
  x: number;
  y: number;
  kind: "club" | "divan" | "dining" | "suite";
}

export interface Aircraft {
  id: string;
  tail: string;
  type: string;
  year: number;
  configuration: string;
  seats: Seat[];
  zones: CabinZone[];
  verificationNotice: string;
}

// ───────────────────────────── Equipment ─────────────────────────────

export type EquipmentCategory =
  | "aed"
  | "first_aid"
  | "medical_kit"
  | "fire_extinguisher"
  | "flashlight"
  | "oxygen"
  | "pbe"
  | "telemedical";

export type EquipmentStatus = "serviceable" | "due_soon" | "inspection_due" | "discrepancy" | "unserviceable";

export type Severity = "critical" | "major" | "minor";

export interface InspectionRecord {
  id: string;
  at: ISODate;
  byId: string;
  result: "pass" | "pass_with_note" | "fail";
  checks: { label: string; ok: boolean }[];
  notes?: string;
}

export interface Discrepancy {
  id: string;
  equipmentId?: string;
  flightId?: string;
  title: string;
  detail: string;
  severity: Severity;
  reportedAt: ISODate;
  reportedById: string;
  status: "open" | "deferred" | "resolved";
  resolvedAt?: ISODate;
  resolution?: string;
  /** Postflight discrepancies are captured during postflight checks. */
  phase: "preflight" | "postflight" | "inspection";
  location?: string;
}

export interface Equipment {
  id: string;
  code: string;
  name: string;
  category: EquipmentCategory;
  zone: ZoneId;
  /** Map marker position in SVG user units. Conceptual — not a verified location. */
  x: number;
  y: number;
  status: EquipmentStatus;
  critical: boolean;
  lastInspectionAt?: ISODate;
  nextInspectionDue: ISODate;
  expiresAt?: ISODate;
  inspectionIntervalDays: number;
  serialMasked: string;
  checklist: string[];
  history: InspectionRecord[];
  documentIds: string[];
}

// ───────────────────────────── Passengers ─────────────────────────────

export type PassengerCategory = "principal" | "family" | "guest" | "pet";

export type AccommodationType =
  | "mobility"
  | "allergy"
  | "medical_equipment"
  | "medical_plan"
  | "dietary"
  | "pet"
  | "comfort";

export interface Accommodation {
  id: string;
  type: AccommodationType;
  /** Operational summary visible to cabin crew. Contains no diagnosis or treatment instruction. */
  summary: string;
  /** Status of the documentation backing this accommodation. */
  documentation: "documented" | "pending_confirmation";
  planRef?: string;
  allergen?: string;
}

export interface Passenger {
  id: string;
  alias: string;
  displayName: string;
  relationship: string;
  category: PassengerCategory;
  initials: string;
  accommodations: Accommodation[];
  dietary: string[];
  preferences: string[];
  emergencyPlanRef?: string;
  /** Restricted notes — Lead Cabin Attendant access only (demo role preview). */
  restrictedNotes?: string;
  /** Restricted medical context — Lead Cabin Attendant access only. Synthetic. */
  restrictedMedical?: string;
  pet?: { breed: string; weightKg: number; documentation: string };
}

// ───────────────────────────── Flights ─────────────────────────────

export interface Airport {
  icao: string;
  iata: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  tz: string;
  /** Flight information regions used to associate SIGMETs. */
  firs: string[];
}

export interface Flight {
  id: string;
  callsign: string;
  aircraftId: string;
  departure: string; // ICAO
  destination: string; // ICAO
  alternates: string[];
  departAt: ISODate;
  arriveAt: ISODate;
  leadId: string;
  cabinAttendantId?: string;
  pilotIds: string[];
  securityIds: string[];
  manifest: string[]; // passenger ids
  status: "planning" | "scheduled" | "completed";
  notes?: string;
}

// ───────────────────────────── Tasks & checklists ─────────────────────────────

export type TaskStatus = "not_started" | "in_progress" | "completed" | "blocked" | "not_applicable";

export type TaskSource = "checklist" | "passenger_rule" | "advisory" | "equipment" | "manual" | "handover";

export type ChecklistPhase = "preflight" | "postflight";

export type ChecklistCategory =
  | "briefing"
  | "cabin_inspection"
  | "emergency_equipment"
  | "aed"
  | "medical_kit"
  | "galley"
  | "catering_allergen"
  | "accommodation"
  | "security"
  | "crew_briefing"
  | "postflight_discrepancy"
  | "restock"
  | "coordination"
  | "preboarding";

export interface TaskEvent {
  at: ISODate;
  byId: string;
  text: string;
}

export interface Task {
  id: string;
  flightId: string;
  title: string;
  detail?: string;
  category: ChecklistCategory;
  phase: ChecklistPhase;
  source: TaskSource;
  /** Reference to the rule, advisory or equipment record that created the task. */
  sourceRef?: string;
  passengerId?: string;
  priority: "critical" | "high" | "normal";
  status: TaskStatus;
  assigneeId?: string;
  dueAt?: ISODate;
  completedAt?: ISODate;
  completedById?: string;
  notes?: string;
  naReason?: string;
  blockedReason?: string;
  signOff?: { byId: string; at: ISODate };
  requiresSignOff: boolean;
  /** Coordination flag: which other party must be consulted. */
  coordinateWith?: ("pilot" | "security" | "assistant")[];
  documentRef?: string;
  createdAt: ISODate;
  /** Lead CA has reviewed this auto-generated task. */
  reviewed?: boolean;
  history: TaskEvent[];
}

// ───────────────────────────── Advisories ─────────────────────────────

export type AdvisoryCategory =
  | "weather"
  | "security"
  | "political_unrest"
  | "natural_disaster"
  | "public_health"
  | "aviation";

export type AdvisorySeverity = "info" | "advisory" | "warning" | "critical";

export interface Advisory {
  id: string;
  category: AdvisoryCategory;
  severity: AdvisorySeverity;
  title: string;
  summary: string;
  /** Why it matters to cabin preparation. */
  cabinRelevance: string;
  geography: string;
  airports: string[];
  source: string;
  sourceUrl: string;
  publishedAt: ISODate;
  retrievedAt: ISODate;
  /** Simulated advisories are always visibly labeled as such. */
  origin: "simulated" | "live";
}

export interface AdvisoryAck {
  advisoryId: string;
  flightId: string;
  byId: string;
  at: ISODate;
  taskId?: string;
}

// ───────────────────────────── Handovers ─────────────────────────────

export interface HandoverAck {
  id: string;
  label: string;
  ackedAt?: ISODate;
}

export interface Handover {
  id: string;
  flightId: string;
  outgoingId: string;
  incomingId: string;
  createdAt: ISODate;
  createdById: string;
  status: "draft" | "submitted" | "accepted";
  openTaskIds: string[];
  equipmentSummary: string;
  accommodationSummary: string;
  acknowledgements: HandoverAck[];
  notes: string;
  acceptedAt?: ISODate;
  acceptedById?: string;
}

// ───────────────────────────── Documents ─────────────────────────────

export type DocumentStatus = "approved_demo" | "draft" | "superseded" | "required_not_loaded";

export interface DocSection {
  id: string;
  heading: string;
  body: string;
}

export interface ReferenceDocument {
  id: string;
  code: string;
  title: string;
  version: string;
  status: DocumentStatus;
  effective: ISODate;
  owner: string;
  scope: string;
  sections: DocSection[];
}

// ───────────────────────────── Audit ─────────────────────────────

export type AuditAction =
  | "checklist.update"
  | "task.create"
  | "task.assign"
  | "task.complete"
  | "task.update"
  | "equipment.inspect"
  | "discrepancy.create"
  | "discrepancy.update"
  | "advisory.acknowledge"
  | "passenger.manifest"
  | "passenger.update"
  | "flight.create"
  | "flight.update"
  | "handover.create"
  | "handover.acknowledge"
  | "handover.accept"
  | "briefing.generate"
  | "demo.reset"
  | "input.create"
  | "input.acknowledge"
  | "preboard.signoff";

export interface AuditEvent {
  id: string;
  at: ISODate;
  actorId: string;
  actorRole: RoleKey;
  action: AuditAction;
  entity: string;
  entityId: string;
  flightId?: string;
  summary: string;
}

// ───────────────────────────── Live intelligence ─────────────────────────────

export interface FeedSourceStatus {
  id: string;
  name: string;
  status: "ok" | "unavailable" | "error" | "not_configured";
  retrievedAt: ISODate;
  detail?: string;
  url: string;
}

export interface MetarObs {
  station: string;
  raw: string;
  observedAt?: ISODate;
  windDir?: number | "VRB";
  windKt?: number;
  gustKt?: number;
  visibility?: string;
  tempC?: number;
  dewpointC?: number;
  altimeter?: number;
  weather?: string;
  flightCategory?: string;
  clouds?: string;
}

export interface TafReport {
  station: string;
  raw: string;
  issuedAt?: ISODate;
  validFrom?: ISODate;
  validTo?: ISODate;
}

export interface IntelSnapshot {
  retrievedAt: ISODate;
  airports: string[];
  sources: FeedSourceStatus[];
  metars: MetarObs[];
  tafs: TafReport[];
  advisories: Advisory[];
}

export interface BriefingDoc {
  id: string;
  flightId: string;
  generatedAt: ISODate;
  generatedById: string;
  markdown: string;
  citations: string[];
}

// ───────────── Pre-boarding ─────────────

export type CrewInputCategory = "instruction" | "passenger" | "timing" | "catering" | "safety";

/** A specific pre-boarding input to the cabin attendant from the Lead CA, flight crew or the Principal's PA. */
export interface CrewInput {
  id: string;
  flightId: string;
  fromId: string;
  fromRole: RoleKey;
  category: CrewInputCategory;
  priority: "critical" | "important" | "normal";
  text: string;
  requiresAck: boolean;
  createdAt: ISODate;
  acks: { byId: string; at: ISODate }[];
}

/** Cabin attendant's confirmation that pre-boarding preparation is complete. Not a boarding or departure authorization. */
export interface PreboardSignoff {
  id: string;
  flightId: string;
  byId: string;
  at: ISODate;
  openItemsAtSignoff: number;
  note?: string;
}
