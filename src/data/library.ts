/**
 * The Documents page, in three categories.
 *
 * To add a real file:
 *   1. Put the file (PDF, Word, image…) in `public/files/`, e.g. `public/files/g700-cabin-familiarization.pdf`.
 *   2. Add a line to the right category below with `file: "/files/<file name>"`
 *      (or change a placeholder line: replace `placeholder: true` with the `file`).
 *
 * `code` entries open the built-in demonstration documents in `documents.ts`, which the Copilot quotes from.
 */

export type LibraryCategory = "training" | "safety" | "handover";

export interface LibraryEntry {
  title: string;
  description: string;
  /** A built-in demonstration document (see documents.ts). */
  code?: string;
  /** A file in public/files, e.g. "/files/manual.pdf". */
  file?: string;
  /** A page in the app. */
  href?: string;
  /** Not added yet. */
  placeholder?: boolean;
}

export const LIBRARY_CATEGORIES: { key: LibraryCategory; title: string; description: string }[] = [
  { key: "training", title: "Training Manuals", description: "Getting to know the aircraft and how we work" },
  { key: "safety", title: "Safety Manuals", description: "Safety, medical and security standards" },
  { key: "handover", title: "Handover Documents", description: "Passing the aircraft to the next cabin host" },
];

export const LIBRARY: Record<LibraryCategory, LibraryEntry[]> = {
  training: [
    { title: "G700 Cabin Familiarization", description: "Placeholder · cabin layout, zones and where things are", placeholder: true },
    { title: "Galley Equipment Guide", description: "Placeholder · ovens, coffee maker, water and chillers", placeholder: true },
    { title: "Service Standards", description: "Placeholder · how the principal likes the cabin and service", placeholder: true },
    { title: "Animal Carriage Coordination Guide", description: "Demonstration guide · traveling with pets", code: "CSI-PET-004" },
  ],
  safety: [
    { title: "Cabin Safety Program Manual", description: "Demonstration excerpt · inspections and readiness", code: "CSI-OPS-001" },
    { title: "Medical & Telemedical Protocol", description: "Demonstration · medical accommodations and getting advice", code: "CSI-MED-002" },
    { title: "Catering Allergen Control Standard", description: "Demonstration · ordering, labeling and serving safely", code: "CSI-CAT-003" },
    { title: "Risk Advisory Review Procedure", description: "Demonstration · weather, security and health advisories", code: "CSI-ADV-006" },
    { title: "Confidentiality & Information Handling", description: "Demonstration · protecting passenger information", code: "CSI-SEC-007" },
    { title: "Aircraft Cabin Emergency Procedures", description: "Operator-approved document required · not loaded", code: "OEM-G700-CABIN" },
  ],
  handover: [
    { title: "Crew Handover & Acknowledgement Standard", description: "Demonstration · what a good handover covers", code: "CSI-HND-005" },
    { title: "Cabin Host Handover Template", description: "Placeholder · fill-in sheet for the next cabin host", placeholder: true },
    { title: "Handovers in the app", description: "Open, write and accept handovers", href: "/handovers" },
  ],
};
