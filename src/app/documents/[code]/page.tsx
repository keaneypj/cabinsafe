"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Badge, Card, EmptyState, LinkButton, Notice, PageTitle } from "@/components/ui";
import { DOCUMENTS } from "@/data/documents";
import { NO_SOURCE_MESSAGE } from "@/domain/copilot";

const STATUS: Record<string, { label: string; tone: "ok" | "warn" | "neutral" | "bad" }> = {
  approved_demo: { label: "Approved · demonstration", tone: "ok" },
  draft: { label: "Draft", tone: "warn" },
  superseded: { label: "Superseded", tone: "neutral" },
  required_not_loaded: { label: "Required · not loaded", tone: "bad" },
};

export default function DocumentPage() {
  return (
    <Suspense>
      <Doc />
    </Suspense>
  );
}

function Doc() {
  const { code } = useParams<{ code: string }>();
  const v = useSearchParams().get("v");
  const decoded = decodeURIComponent(code);
  const d = DOCUMENTS.find((x) => x.code === decoded && (v ? x.version === v : x.status !== "superseded")) ?? DOCUMENTS.find((x) => x.code === decoded);
  if (!d) return <EmptyState title="Document not found" action={<LinkButton href="/documents" variant="secondary">Library</LinkButton>} />;
  return (
    <div>
      <PageTitle eyebrow={`${d.code} · version ${d.version}`} title={d.title} subtitle={<Badge tone={STATUS[d.status].tone}>{STATUS[d.status].label}</Badge>} />
      <Card className="mb-4 text-xs text-slate grid grid-cols-2 gap-2">
        <div><span className="block text-slate-500">Owner</span>{d.owner}</div>
        <div><span className="block text-slate-500">Effective</span>{d.effective || "—"}</div>
        <div className="col-span-2"><span className="block text-slate-500">Scope</span>{d.scope}</div>
      </Card>
      {d.status === "required_not_loaded" && <Notice tone="bad" className="mb-4">{NO_SOURCE_MESSAGE} Load the operator-approved document before the Copilot can answer aircraft-specific emergency questions.</Notice>}
      {d.status === "superseded" && <Notice tone="neutral" className="mb-4">Superseded — retained for audit history and excluded from Copilot retrieval.</Notice>}
      <div className="space-y-3">
        {d.sections.map((s) => (
          <Card key={s.id} id={`s${s.id}`}>
            <div className="text-xs text-gold font-semibold tracking-wider">§{s.id}</div>
            <h2 className="font-semibold text-ivory mt-0.5">{s.heading}</h2>
            <p className="text-sm text-slate leading-relaxed mt-1.5">{s.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
