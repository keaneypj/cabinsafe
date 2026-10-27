"use client";

import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { Badge, Notice, PageTitle } from "@/components/ui";
import { DOCUMENTS } from "@/data/documents";
import type { DocumentStatus } from "@/domain/types";

const DOC_STATUS: Record<DocumentStatus, { label: string; tone: "ok" | "warn" | "neutral" | "bad" }> = {
  approved_demo: { label: "Approved · demonstration", tone: "ok" },
  draft: { label: "Draft", tone: "warn" },
  superseded: { label: "Superseded", tone: "neutral" },
  required_not_loaded: { label: "Required · not loaded", tone: "bad" },
};

export default function DocumentsPage() {
  return (
    <div>
      <PageTitle eyebrow="Reference Library" title="Documents" subtitle="Versioned sources used by the Copilot and briefings" />
      <Notice tone="warn" className="mb-4">All documents are fictional demonstration material describing program practices. They contain no approved Gulfstream or operator emergency procedures.</Notice>
      <div className="card p-0 divide-y divide-[var(--separator)] overflow-hidden">
        {DOCUMENTS.map((d) => (
          <Link key={d.id} href={`/documents/${d.code}${d.status === "superseded" ? `?v=${d.version}` : ""}`} className="flex items-center gap-3 px-3.5 py-3 min-h-16 hover:bg-navy-700/30">
            <BookOpen className="size-5 text-gold shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block text-xs text-gold font-semibold tracking-wider">{d.code} · v{d.version}</span>
              <span className="block text-sm text-ivory leading-snug">{d.title}</span>
              <Badge tone={DOC_STATUS[d.status].tone} className="mt-1">{DOC_STATUS[d.status].label}</Badge>
            </span>
            <ChevronRight className="size-4 text-slate-500" />
          </Link>
        ))}
      </div>
    </div>
  );
}
