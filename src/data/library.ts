/**
 * What the Documents page lists, besides the Handover Form.
 *
 * Guides: the four mock guides in guides.ts open as scroll-through, PDF-style pages.
 *
 * To add a real file:
 *   1. Put the file (PDF, Word, image…) in `public/files/`, e.g. `public/files/cabin-checklist.pdf`.
 *   2. Add a line to `LIBRARY_FILES` below with `file: "/files/<file name>"`.
 *
 * The older demonstration documents in documents.ts (safety program, medical protocol, allergen
 * standard and so on) are no longer listed here, but they are kept: the Safety Copilot quotes from
 * them and they still open at /documents/<code>. To show one again, add it to `LIBRARY_FILES` with
 * `href: "/documents/<code>"`.
 */

import { GUIDES } from "./guides";

export interface LibraryEntry {
  title: string;
  description: string;
  /** A page in the app. */
  href?: string;
  /** A file in public/files, e.g. "/files/manual.pdf". */
  file?: string;
}

export const LIBRARY_GUIDES: LibraryEntry[] = GUIDES.map((g) => ({ title: g.title, description: g.summary, href: `/documents/guide/${g.slug}` }));

/** Extra files to list under Guides. Empty for now. */
export const LIBRARY_FILES: LibraryEntry[] = [];
