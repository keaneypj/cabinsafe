import { describe, expect, it } from "vitest";
import { createHandoverForms } from "@/data/handoverForms";
import { blankHandoverForm, cleanHandoverForm, DUTIES, DUTY_COUNT, DUTY_GROUPS, fmtFlightDate, missedDuties, sortHandoverForms, validateHandoverForm, type HandoverFormData } from "./handoverForm";

/** A form with every answer filled in. */
function filled(): HandoverFormData {
  const f = blankHandoverForm("Kate Keaney", "2026-11-06");
  f.parkingAirport = "kmia";
  for (const g of DUTY_GROUPS) for (const d of DUTIES[g]) f.duties[g][d.key] = { done: true };
  return { ...f, dishes: false, fridgeBag: false, laundry: false, winterOps: "na", summerOps: "yes" };
}

describe("handover form", () => {
  it("has the 16 duties from the request", () => {
    expect(DUTY_COUNT).toBe(16);
    expect(DUTIES.galley).toHaveLength(6);
    expect(DUTIES.cabin).toHaveLength(6);
    expect(DUTIES.washroom).toHaveLength(4);
  });

  it("asks for every answer on a blank form", () => {
    const e = validateHandoverForm(blankHandoverForm());
    expect(e.name).toBeTruthy();
    expect(e.date).toBeTruthy();
    expect(e.airport).toBeTruthy();
    expect(e["duty:galley:ovens"]).toMatch(/Completed or Not completed/);
    expect(e.dishes && e.fridgeBag && e.laundry && e.winterOps && e.summerOps).toBeTruthy();
  });

  it("accepts a complete form", () => {
    expect(validateHandoverForm(filled())).toEqual({});
  });

  it("needs a reason for a duty that wasn't completed", () => {
    const f = filled();
    f.duties.cabin.vacuum = { done: false };
    expect(validateHandoverForm(f)["duty:cabin:vacuum"]).toMatch(/why/i);
    f.duties.cabin.vacuum = { done: false, reason: "Vacuum broken" };
    expect(validateHandoverForm(f)).toEqual({});
    expect(missedDuties(f)).toEqual([{ group: "cabin", label: "Cabin vacuumed", reason: "Vacuum broken" }]);
  });

  it("asks which dishes and linens, and what is in the fridge bag, only when they were offloaded", () => {
    const f = { ...filled(), dishes: true, laundry: true, fridgeBag: true };
    const e = validateHandoverForm(f);
    expect(Object.keys(e).sort()).toEqual(["dishesWhich", "fridgeBagItems", "laundryWhich"]);
    expect(validateHandoverForm({ ...f, dishesWhich: "4 plates", laundryWhich: "2 pillowcases", fridgeBagItems: ["Milk"] })).toEqual({});
  });

  it("checks the airport code", () => {
    expect(validateHandoverForm({ ...filled(), parkingAirport: "MI" }).airport).toBeTruthy();
    expect(validateHandoverForm({ ...filled(), parkingAirport: "MIA" }).airport).toBeUndefined();
  });

  it("tidies the form for saving", () => {
    const f = { ...filled(), attendantName: "  Kate   Keaney ", dishes: false, dishesWhich: "left over", fridgeBag: false, fridgeBagItems: ["Milk"] };
    f.duties.galley.ovens = { done: true, reason: "ignored" };
    const c = cleanHandoverForm(f);
    expect(c.attendantName).toBe("Kate Keaney");
    expect(c.parkingAirport).toBe("KMIA");
    expect(c.dishesWhich).toBe("");
    expect(c.fridgeBagItems).toEqual([]);
    expect(c.duties.galley.ovens).toEqual({ done: true });
  });

  it("ships one valid sample and lists newest first", () => {
    const [sample] = createHandoverForms();
    expect(validateHandoverForm(sample)).toEqual({});
    expect(missedDuties(sample)).toHaveLength(2);
    const newer = { ...sample, id: "new", submittedAt: "2026-11-07T10:00:00.000Z" };
    expect(sortHandoverForms([sample, newer]).map((f) => f.id)).toEqual(["new", sample.id]);
    expect(fmtFlightDate("2026-11-01")).toBe("Sun, Nov 1, 2026");
  });
});
