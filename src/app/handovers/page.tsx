"use client";

import Link from "next/link";
import { ChevronRight, Handshake, Plus } from "lucide-react";
import { Badge, EmptyState, LinkButton, PageTitle, SectionHeader } from "@/components/ui";
import { can } from "@/domain/permissions";
import { fmtRelative } from "@/lib/format";
import { useCrewName, useNow } from "@/store/hooks";
import { useMe, useStore } from "@/store/store";

export default function HandoversPage() {
  const handovers = useStore((s) => s.handovers);
  const flights = useStore((s) => s.flights);
  const me = useMe();
  const name = useCrewName();
  const now = useNow();
  const pending = handovers.filter((h) => h.status !== "accepted");
  const done = handovers.filter((h) => h.status === "accepted");
  const row = (h: (typeof handovers)[number]) => (
    <Link key={h.id} href={`/handovers/${h.id}`} className="card flex items-center gap-3 p-3.5 hover:border-gold/30" data-testid={`handover-${h.id}`}>
      <Handshake className="size-5 text-gold shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block text-sm text-ivory">
          {name(h.outgoingId)} → {name(h.incomingId)}
        </span>
        <span className="block text-xs text-slate">
          {flights.find((f) => f.id === h.flightId)?.callsign} · {h.openTaskIds.length} open items · {h.status === "accepted" ? `accepted ${fmtRelative(h.acceptedAt, now)}` : `submitted ${fmtRelative(h.createdAt, now)}`}
        </span>
      </span>
      <Badge tone={h.status === "accepted" ? "ok" : "warn"}>{h.status === "accepted" ? "Accepted" : `${h.acknowledgements.filter((a) => a.ackedAt).length}/${h.acknowledgements.length} acked`}</Badge>
      <ChevronRight className="size-4 text-slate-500" />
    </Link>
  );
  return (
    <div>
      <PageTitle
        eyebrow="Crew Coordination"
        title="Handovers"
        subtitle="Structured transfer of cabin responsibility (CSI-HND-005)"
        action={can(me.role, "handover.create") ? <LinkButton href="/handovers/new" size="sm" variant="secondary"><Plus className="size-4" /> New</LinkButton> : undefined}
      />
      <SectionHeader title="Awaiting acceptance" />
      <div className="space-y-2 mb-5">{pending.length ? pending.map(row) : <EmptyState title="No pending handovers" />}</div>
      <SectionHeader title="Accepted" />
      <div className="space-y-2">{done.length ? done.map(row) : <EmptyState title="No accepted handovers yet" />}</div>
    </div>
  );
}
