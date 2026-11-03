"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, List } from "lucide-react";
import { TableSettingDiagram } from "@/components/TableSettingDiagram";
import { EmptyState, LinkButton } from "@/components/ui";
import { findGuide, MOCK_DISCLAIMER, MOCK_STAMP, type Guide, type GuideBlock } from "@/data/guides";

/** A mock guide shown as white, PDF-style pages: cover, contents, then one page per section. */
export default function GuidePage() {
  const { slug } = useParams<{ slug: string }>();
  const g = findGuide(decodeURIComponent(slug));
  if (!g) return <EmptyState title="Guide not found" action={<LinkButton href="/documents" variant="secondary">Documents</LinkButton>} />;
  const total = g.sections.length + 2;

  return (
    <div className="pb-6" data-testid="guide">
      <div className="flex items-center justify-between gap-2 mb-3">
        <Link href="/documents" className="inline-flex items-center gap-1 min-h-10 text-[0.9375rem] text-gold font-medium">
          <ChevronLeft className="size-5" aria-hidden /> Documents
        </Link>
        <span className="text-[0.75rem] text-slate-500 tnum">{total} pages</span>
      </div>

      <div className="space-y-4">
        {/* Cover */}
        <Paper g={g} page={1} total={total} cover>
          <div className="flex min-h-[26rem] flex-col justify-between text-center">
            <div className="mx-auto mt-2 rounded-md border-2 border-[#b4232a] px-3 py-2 text-[0.9375rem] font-bold tracking-[0.02em] text-[#b4232a]" data-testid="guide-stamp">
              {MOCK_STAMP}
            </div>
            <div>
              <div className="text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-[#7a6a48]">CabinSafe Demonstration Library</div>
              <h1 className="mt-3 font-serif text-[2rem] leading-tight text-[#1c2a44]">{g.title}</h1>
              <p className="mt-2 text-[0.9375rem] text-[#4a5568]">{g.summary}</p>
            </div>
            <div className="text-[0.75rem] leading-relaxed text-[#4a5568]">
              <div className="tnum">{g.docNo} · Revision 0 · November 2026</div>
              <p className="mt-2 mx-auto max-w-sm">{MOCK_DISCLAIMER}</p>
            </div>
          </div>
        </Paper>

        {/* Contents */}
        <Paper g={g} page={2} total={total} id="contents">
          <h2 className="font-serif text-[1.5rem] text-[#1c2a44] mb-3">Contents</h2>
          <ol className="space-y-0.5" data-testid="guide-toc">
            {g.sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="flex items-baseline gap-2 py-1.5 text-[0.9375rem] text-[#1c2a44] hover:underline">
                  <span className="w-6 shrink-0 tnum font-semibold">{i + 1}.</span>
                  <span className="flex-1">{s.title}</span>
                  <span className="tnum text-[#7a8597]">{i + 3}</span>
                </a>
                {s.blocks.some((b) => b.type === "h3") && (
                  <ul className="pl-8 pb-1">
                    {s.blocks.flatMap((b) =>
                      b.type === "h3"
                        ? [
                            <li key={b.id}>
                              <a href={`#${b.id}`} className="block py-1 text-[0.8125rem] text-[#4a5568] hover:underline">
                                {b.text}
                              </a>
                            </li>,
                          ]
                        : [],
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </Paper>

        {g.sections.map((s, i) => (
          <Paper key={s.id} g={g} page={i + 3} total={total} id={s.id}>
            <h2 className="font-serif text-[1.375rem] leading-tight text-[#1c2a44] mb-3">
              <span className="text-[#7a6a48] mr-2 tnum">{i + 1}.</span>
              {s.title}
            </h2>
            <div className="space-y-3">
              {s.blocks.map((b, j) => (
                <Block key={j} b={b} />
              ))}
            </div>
          </Paper>
        ))}
      </div>

      <a
        href="#contents"
        className="fixed right-4 z-40 inline-flex items-center gap-1.5 rounded-full bg-[#1c2a44] px-3.5 min-h-10 text-[0.8125rem] font-semibold text-white shadow-lg bottom-[calc(var(--nav-h)+var(--safe-bottom)+0.75rem)] md:bottom-6"
        data-testid="guide-contents-button"
      >
        <List className="size-4" aria-hidden /> Contents
      </a>
    </div>
  );
}

function Paper({ g, page, total, id, cover, children }: { g: Guide; page: number; total: number; id?: string; cover?: boolean; children: React.ReactNode }) {
  return (
    <article id={id} className="scroll-mt-4 rounded-[3px] bg-white text-[#2d3748] shadow-[0_1px_3px_rgba(0,0,0,0.25),0_8px_24px_rgba(0,0,0,0.12)]" data-testid="guide-page">
      {!cover && (
        <div className="flex items-center justify-between gap-2 border-b border-[#e5e7eb] px-5 py-2 text-[0.6875rem] text-[#7a8597]">
          <span className="truncate">
            {g.docNo} · {g.title}
          </span>
          <span className="shrink-0 font-bold tracking-wider text-[#b4232a]">MOCK</span>
        </div>
      )}
      <div className="px-5 py-5">{children}</div>
      <div className="flex items-center justify-between gap-2 border-t border-[#e5e7eb] px-5 py-2 text-[0.6875rem] text-[#7a8597]">
        <span>{MOCK_STAMP}</span>
        <span className="shrink-0 tnum">
          Page {page} of {total}
        </span>
      </div>
    </article>
  );
}

function Block({ b }: { b: GuideBlock }) {
  switch (b.type) {
    case "p":
      return <p className="text-[0.9375rem] leading-relaxed">{b.text}</p>;
    case "h3":
      return (
        <h3 id={b.id} className="scroll-mt-4 pt-2 text-[1.0625rem] font-semibold text-[#1c2a44]">
          {b.text}
        </h3>
      );
    case "list": {
      const Tag = b.ordered ? "ol" : "ul";
      return (
        <Tag className={b.ordered ? "list-decimal pl-5 space-y-1 text-[0.9375rem] leading-relaxed marker:font-semibold marker:text-[#7a6a48]" : "list-disc pl-5 space-y-1 text-[0.9375rem] leading-relaxed marker:text-[#7a6a48]"}>
          {b.items.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </Tag>
      );
    }
    case "table":
      return (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full border-collapse text-[0.8125rem] leading-snug">
            <thead>
              <tr>
                {b.head.map((h) => (
                  <th key={h} className="border border-[#d8dde5] bg-[#eef1f5] px-2 py-1.5 text-left font-semibold text-[#1c2a44]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} className={j === 0 ? "border border-[#d8dde5] px-2 py-1.5 align-top font-medium" : "border border-[#d8dde5] px-2 py-1.5 align-top"}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "note":
      return <p className="rounded-md border-l-4 border-[#c9a45c] bg-[#faf6ec] px-3 py-2 text-[0.875rem] leading-relaxed">{b.text}</p>;
    case "setting":
      return <TableSettingDiagram id={b.id} />;
  }
}
