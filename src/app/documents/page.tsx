"use client";

import Link from "next/link";
import { BookOpen, ChevronRight, ClipboardPen, ExternalLink, FileText } from "lucide-react";
import { Badge, LinkButton, PageTitle } from "@/components/ui";
import { LIBRARY_FILES, LIBRARY_GUIDES, type LibraryEntry } from "@/data/library";
import { fmtFlightDate, missedDuties, sortHandoverForms } from "@/domain/handoverForm";
import { fmtDateTime } from "@/lib/format";
import { useStore } from "@/store/store";

export default function DocumentsPage() {
  const forms = useStore((s) => s.handoverForms);
  const past = sortHandoverForms(forms);

  return (
    <div className="space-y-6">
      <PageTitle title="Documents" subtitle="Guides for this aircraft and the handover after every flight" />

      <section data-testid="docs-guides">
        <div className="px-1 mb-2">
          <h2 className="text-[1.0625rem] font-semibold text-ivory">Guides</h2>
          <p className="text-[0.8125rem] text-slate-400">Mock documents for demonstration only</p>
        </div>
        <ul className="card p-0 divide-y divide-[var(--separator)] overflow-hidden">
          {[...LIBRARY_GUIDES, ...LIBRARY_FILES].map((d) => (
            <li key={d.title}>
              <Entry d={d} />
            </li>
          ))}
        </ul>
      </section>

      <section data-testid="docs-handover">
        <div className="px-1 mb-2">
          <h2 className="text-[1.0625rem] font-semibold text-ivory">Handover Form</h2>
          <p className="text-[0.8125rem] text-slate-400">Fill out and submit after every flight</p>
        </div>
        <LinkButton href="/documents/handover" size="lg" className="w-full">
          <ClipboardPen className="size-5" aria-hidden /> Fill out handover form
        </LinkButton>

        <h3 className="px-1 mt-5 mb-2 text-[0.9375rem] font-semibold text-ivory">Past handovers</h3>
        {past.length ? (
          <ul className="card p-0 divide-y divide-[var(--separator)] overflow-hidden" data-testid="past-handovers">
            {past.map((f, i) => {
              const missed = missedDuties(f).length;
              return (
                <li key={f.id}>
                  <Link href={`/documents/handover/${f.id}`} className="flex items-center gap-3 px-3.5 py-3 min-h-16 hover:bg-navy-700/30">
                    <span className="flex-1 min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[0.9375rem] text-ivory leading-snug">
                          {fmtFlightDate(f.flightDate)} · {f.parkingAirport}
                        </span>
                        {i === 0 && <Badge tone="gold">Most recent</Badge>}
                      </span>
                      <span className="block text-[0.75rem] text-slate-500 leading-snug">
                        {f.attendantName} · submitted {fmtDateTime(f.submittedAt)}
                        {f.sample && " · sample"}
                      </span>
                      <Badge tone={missed ? "warn" : "ok"} className="mt-1">
                        {missed ? `${missed} not completed` : "All duties completed"}
                      </Badge>
                    </span>
                    <ChevronRight className="size-4 text-slate-500" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="card text-[0.875rem] text-slate-400">No handovers submitted yet.</p>
        )}
      </section>
    </div>
  );
}

function Entry({ d }: { d: LibraryEntry }) {
  const Icon = d.file ? FileText : BookOpen;
  const inner = (
    <>
      <Icon className="size-5 text-gold shrink-0" aria-hidden />
      <span className="flex-1 min-w-0">
        <span className="block text-[0.9375rem] text-ivory leading-snug">{d.title}</span>
        <span className="block text-[0.75rem] text-slate-500 leading-snug">{d.description}</span>
      </span>
      {d.file ? <ExternalLink className="size-4 text-slate-500" aria-hidden /> : <ChevronRight className="size-4 text-slate-500" aria-hidden />}
    </>
  );
  const cls = "flex items-center gap-3 px-3.5 py-3 min-h-16 hover:bg-navy-700/30";
  if (d.file)
    return (
      <a href={d.file} target="_blank" rel="noopener" className={cls}>
        {inner}
      </a>
    );
  return (
    <Link href={d.href ?? "/documents"} className={cls}>
      {inner}
    </Link>
  );
}
