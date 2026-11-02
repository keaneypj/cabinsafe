"use client";

import Link from "next/link";
import { BookOpen, ChevronRight, ExternalLink, FileClock, FileText, Handshake } from "lucide-react";
import { Badge, Notice, PageTitle } from "@/components/ui";
import { LIBRARY, LIBRARY_CATEGORIES, type LibraryEntry } from "@/data/library";

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <PageTitle title="Documents" subtitle="Training, safety and handover documents for this aircraft" />
      <Notice tone="warn">Demonstration documents are fictional. They contain no approved Gulfstream or operator emergency procedures.</Notice>
      {LIBRARY_CATEGORIES.map((c) => (
        <section key={c.key} data-testid={`docs-${c.key}`}>
          <div className="px-1 mb-2">
            <h2 className="text-[1.0625rem] font-semibold text-ivory">{c.title}</h2>
            <p className="text-[0.8125rem] text-slate-400">{c.description}</p>
          </div>
          <ul className="card p-0 divide-y divide-[var(--separator)] overflow-hidden">
            {LIBRARY[c.key].map((d) => (
              <li key={d.title}>
                <Entry d={d} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Entry({ d }: { d: LibraryEntry }) {
  const Icon = d.placeholder ? FileClock : d.href ? Handshake : d.code ? BookOpen : FileText;
  const inner = (
    <>
      <Icon className={d.placeholder ? "size-5 text-slate-500 shrink-0" : "size-5 text-gold shrink-0"} aria-hidden />
      <span className="flex-1 min-w-0">
        <span className={d.placeholder ? "block text-[0.9375rem] text-slate-300 leading-snug" : "block text-[0.9375rem] text-ivory leading-snug"}>{d.title}</span>
        <span className="block text-[0.75rem] text-slate-500 leading-snug">{d.description}</span>
        {d.placeholder && <Badge tone="neutral" className="mt-1">File to be added</Badge>}
      </span>
      {d.file ? <ExternalLink className="size-4 text-slate-500" aria-hidden /> : !d.placeholder && <ChevronRight className="size-4 text-slate-500" aria-hidden />}
    </>
  );
  const cls = "flex items-center gap-3 px-3.5 py-3 min-h-16";
  if (d.file)
    return (
      <a href={d.file} target="_blank" rel="noopener" className={`${cls} hover:bg-navy-700/30`}>
        {inner}
      </a>
    );
  if (d.code || d.href)
    return (
      <Link href={d.href ?? `/documents/${d.code}`} className={`${cls} hover:bg-navy-700/30`}>
        {inner}
      </Link>
    );
  return <div className={cls}>{inner}</div>;
}
