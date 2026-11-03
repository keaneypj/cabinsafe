/**
 * The Handover Form the cabin host fills out and submits after every flight. Submitted forms are
 * listed on the Documents page, newest first, so the next cabin host can read the latest one.
 */

export type DutyGroup = "galley" | "cabin" | "washroom";
export type YesNoNa = "yes" | "no" | "na";

export const DUTIES: Record<DutyGroup, { key: string; label: string }[]> = {
  galley: [
    { key: "ovens", label: "Ovens cleaned" },
    { key: "coffee", label: "Coffee/espresso machine cleaned" },
    { key: "counters", label: "Counters and sinks cleaned" },
    { key: "chillers", label: "Chillers/fridges emptied and wiped down" },
    { key: "trash", label: "Trash removed" },
    { key: "restock", label: "Galley restocked / low items noted" },
  ],
  cabin: [
    { key: "left-behind", label: "Checked for items left behind" },
    { key: "vacuum", label: "Cabin vacuumed" },
    { key: "surfaces", label: "Tables and surfaces wiped" },
    { key: "seats", label: "Seats upright, seatbelts crossed" },
    { key: "beds", label: "Beds stripped and blankets folded" },
    { key: "power", label: "TVs and cabin lights turned off" },
  ],
  washroom: [
    { key: "toilet", label: "Toilet and sink cleaned" },
    { key: "mirrors", label: "Mirrors and surfaces wiped" },
    { key: "restock", label: "Restocked (toilet paper, towels, amenities)" },
    { key: "trash", label: "Trash removed" },
  ],
};

export const DUTY_GROUP_TITLES: Record<DutyGroup, string> = {
  galley: "Galley Duties",
  cabin: "Cabin Duties",
  washroom: "Washroom Duties",
};

export const DUTY_GROUPS = Object.keys(DUTIES) as DutyGroup[];
export const DUTY_COUNT = DUTY_GROUPS.reduce((n, g) => n + DUTIES[g].length, 0);

export interface DutyAnswer {
  /** Unset until the cabin host picks Completed or Not completed. */
  done?: boolean;
  reason?: string;
}

export interface HandoverFormData {
  attendantName: string;
  /** Date of the flight, YYYY-MM-DD. */
  flightDate: string;
  /** Overnight parking airport code, e.g. KMIA. */
  parkingAirport: string;
  duties: Record<DutyGroup, Record<string, DutyAnswer>>;
  dishes?: boolean;
  dishesWhich: string;
  fridgeBag?: boolean;
  laundry?: boolean;
  laundryWhich: string;
  winterOps?: YesNoNa;
  summerOps?: YesNoNa;
  fridgeBagItems: string[];
  comments: string;
}

export interface SubmittedHandoverForm extends HandoverFormData {
  id: string;
  submittedAt: string;
  submittedById: string;
  /** The fictional example that ships with the demo. */
  sample?: boolean;
}

export const YES_NO_NA_LABELS: Record<YesNoNa, string> = { yes: "Yes", no: "No", na: "Not applicable" };

export const TEXT_MAX = 300;
export const COMMENTS_MAX = 2000;

export function blankHandoverForm(attendantName = "", flightDate = ""): HandoverFormData {
  return {
    attendantName,
    flightDate,
    parkingAirport: "",
    duties: { galley: {}, cabin: {}, washroom: {} },
    dishesWhich: "",
    laundryWhich: "",
    fridgeBagItems: [],
    comments: "",
  };
}

export type FormErrors = Record<string, string>;

/** Field keys used in the errors map: "name", "date", "airport", "duty:<group>:<key>", "dishes", "dishesWhich", … */
export function validateHandoverForm(f: HandoverFormData): FormErrors {
  const e: FormErrors = {};
  const name = f.attendantName.trim();
  if (name.length < 2 || name.length > 60) e.name = "Enter the flight attendant's name.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.flightDate) || Number.isNaN(Date.parse(f.flightDate))) e.date = "Enter the date of the flight.";
  if (!/^[A-Z0-9]{3,4}$/.test(f.parkingAirport.trim().toUpperCase())) e.airport = "Enter a 3- or 4-character airport code, e.g. KMIA.";
  for (const g of DUTY_GROUPS)
    for (const d of DUTIES[g]) {
      const a = f.duties[g][d.key];
      const k = `duty:${g}:${d.key}`;
      if (a?.done === undefined) e[k] = "Choose Completed or Not completed.";
      else if (!a.done && !a.reason?.trim()) e[k] = "Say why this wasn't completed.";
      else if ((a.reason?.trim().length ?? 0) > TEXT_MAX) e[k] = `Keep it under ${TEXT_MAX} characters.`;
    }
  if (f.dishes === undefined) e.dishes = "Choose Yes or No.";
  else if (f.dishes && !f.dishesWhich.trim()) e.dishesWhich = "List which dishes were offloaded.";
  if (f.fridgeBag === undefined) e.fridgeBag = "Choose Yes or No.";
  else if (f.fridgeBag && f.fridgeBagItems.length === 0) e.fridgeBagItems = "Add what is in the fridge bag.";
  if (f.laundry === undefined) e.laundry = "Choose Yes or No.";
  else if (f.laundry && !f.laundryWhich.trim()) e.laundryWhich = "List which linens were offloaded.";
  if (!f.winterOps) e.winterOps = "Choose Yes, No or Not applicable.";
  if (!f.summerOps) e.summerOps = "Choose Yes, No or Not applicable.";
  if (f.comments.length > COMMENTS_MAX) e.comments = `Keep comments under ${COMMENTS_MAX} characters.`;
  return e;
}

/** Tidies a valid form for saving: trims text, uppercases the airport, drops text for answers that don't need it. */
export function cleanHandoverForm(f: HandoverFormData): HandoverFormData {
  const duties = Object.fromEntries(
    DUTY_GROUPS.map((g) => [g, Object.fromEntries(DUTIES[g].map((d) => {
      const a = f.duties[g][d.key] ?? {};
      return [d.key, a.done ? { done: true } : { done: false, reason: a.reason?.trim() }];
    }))]),
  ) as HandoverFormData["duties"];
  return {
    attendantName: f.attendantName.trim().replace(/\s+/g, " "),
    flightDate: f.flightDate,
    parkingAirport: f.parkingAirport.trim().toUpperCase(),
    duties,
    dishes: f.dishes,
    dishesWhich: f.dishes ? f.dishesWhich.trim() : "",
    fridgeBag: f.fridgeBag,
    laundry: f.laundry,
    laundryWhich: f.laundry ? f.laundryWhich.trim() : "",
    winterOps: f.winterOps,
    summerOps: f.summerOps,
    fridgeBagItems: f.fridgeBag ? f.fridgeBagItems.map((i) => i.trim()).filter(Boolean) : [],
    comments: f.comments.trim(),
  };
}

/** The duties marked Not completed, with their reasons. */
export function missedDuties(f: HandoverFormData): { group: DutyGroup; label: string; reason: string }[] {
  return DUTY_GROUPS.flatMap((g) => DUTIES[g].flatMap((d) => {
    const a = f.duties[g][d.key];
    return a && a.done === false ? [{ group: g, label: d.label, reason: a.reason ?? "" }] : [];
  }));
}

/** Newest first. */
export function sortHandoverForms<T extends SubmittedHandoverForm>(forms: T[]): T[] {
  return [...forms].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

/** "2026-11-01" → "Sun, Nov 1, 2026". */
export function fmtFlightDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

/** A date as YYYY-MM-DD in the device's own time zone. */
export function localYmd(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
