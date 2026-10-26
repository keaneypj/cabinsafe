import { DOCUMENTS } from "@/data/documents";
import type { ReferenceDocument } from "./types";

/**
 * Lightweight lexical retrieval (BM25) over the APPROVED demonstration
 * document library. Superseded, draft and not-loaded documents are excluded.
 */

export interface Passage {
  docId: string;
  code: string;
  version: string;
  title: string;
  sectionId: string;
  heading: string;
  body: string;
  score: number;
}

export function citationLabel(p: Pick<Passage, "code" | "version" | "sectionId">): string {
  return `${p.code} v${p.version} §${p.sectionId}`;
}

const STOP = new Set(
  "a an the and or of to in on for with by is are be been was were it this that these those what which who whom how when where why do does did can could should would will may might must i we you our your my me us at as from about into over under than then there their they them not no yes if any all each".split(" "),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(stem);
}

function stem(w: string): string {
  return w.replace(/(ings|ing|ies|ied|es|s|ed)$/u, (m) => (m === "ies" || m === "ied" ? "y" : "")) || w;
}

interface Indexed extends Omit<Passage, "score"> {
  tokens: string[];
}

let INDEX: Indexed[] | null = null;
let DF: Map<string, number> | null = null;
let AVGDL = 1;

function build(docs: ReferenceDocument[]) {
  INDEX = docs
    .filter((d) => d.status === "approved_demo")
    .flatMap((d) =>
      d.sections.map((s) => ({
        docId: d.id,
        code: d.code,
        version: d.version,
        title: d.title,
        sectionId: s.id,
        heading: s.heading,
        body: s.body,
        tokens: tokenize(`${d.title} ${s.heading} ${s.heading} ${s.body}`),
      })),
    );
  DF = new Map();
  for (const p of INDEX) for (const t of new Set(p.tokens)) DF.set(t, (DF.get(t) ?? 0) + 1);
  AVGDL = INDEX.reduce((s, p) => s + p.tokens.length, 0) / Math.max(INDEX.length, 1);
}

export function retrieve(query: string, k = 3, minScore = 2.2): Passage[] {
  if (!INDEX || !DF) build(DOCUMENTS);
  const q = [...new Set(tokenize(query))];
  const N = INDEX!.length;
  const k1 = 1.4;
  const b = 0.75;
  return INDEX!
    .map((p) => {
      let score = 0;
      for (const t of q) {
        const tf = p.tokens.filter((x) => x === t).length;
        if (!tf) continue;
        const df = DF!.get(t) ?? 0;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * p.tokens.length) / AVGDL)));
      }
      const { tokens: _tokens, ...rest } = p;
      void _tokens;
      return { ...rest, score };
    })
    .filter((p) => p.score >= minScore)
    .sort((a, b2) => b2.score - a.score)
    .slice(0, k);
}
