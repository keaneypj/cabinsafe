import { CA_CLAIRE } from "./seed";
import { DUTIES, DUTY_GROUPS, type SubmittedHandoverForm } from "@/domain/handoverForm";

/** All duties done except the ones given here. */
function duties(missed: Record<string, string>): SubmittedHandoverForm["duties"] {
  return Object.fromEntries(
    DUTY_GROUPS.map((g) => [g, Object.fromEntries(DUTIES[g].map((d) => {
      const reason = missed[`${g}:${d.key}`];
      return [d.key, reason ? { done: false, reason } : { done: true }];
    }))]),
  ) as SubmittedHandoverForm["duties"];
}

/** One fictional handover from the completed CSI100 flight, so the list is never empty on a new phone. */
export function createHandoverForms(): SubmittedHandoverForm[] {
  return [
    {
      id: "hof-sample-csi100",
      sample: true,
      submittedAt: "2026-11-01T18:30:00.000Z",
      submittedById: CA_CLAIRE,
      attendantName: "Claire Dubois",
      flightDate: "2026-11-01",
      parkingAirport: "KMIA",
      duties: duties({
        "galley:restock": "Caterer was closed on Sunday. Low items are listed in the comments.",
        "cabin:vacuum": "The FBO vacuum was out of order. Asked them to do it Monday morning.",
      }),
      dishes: true,
      dishesWhich: "6 dinner plates, 4 wine glasses, 1 serving platter",
      fridgeBag: true,
      laundry: true,
      laundryWhich: "2 duvet covers, 4 pillowcases, 6 napkins",
      winterOps: "na",
      summerOps: "yes",
      fridgeBagItems: ["Sparkling water (4 bottles)", "Oat milk (1, opened Nov 1)", "Fruit platter, covered", "Lemons and limes"],
      comments:
        "Seat D3 reading light still flickers. The flight crew has it in the tech log. Flashlight FL-03 is on charge. First-aid kit FAK-02 used two adhesive dressings and needs restocking. Running low on espresso pods and oat milk.",
    },
  ];
}
