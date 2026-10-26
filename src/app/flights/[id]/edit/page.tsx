"use client";

import { useParams } from "next/navigation";
import { FlightForm } from "@/components/FlightForm";
import { EmptyState, Notice, PageTitle } from "@/components/ui";
import { can } from "@/domain/permissions";
import { useMe, useStore } from "@/store/store";

export default function EditFlightPage() {
  const { id } = useParams<{ id: string }>();
  const flight = useStore((s) => s.flights.find((f) => f.id === id));
  const me = useMe();
  if (!flight) return <EmptyState title="Flight not found">It may have been removed by a demo reset.</EmptyState>;
  return (
    <div>
      <PageTitle eyebrow={flight.callsign} title="Edit flight" subtitle="Task due times move with schedule changes" />
      {can(me.role, "flight.edit") ? <FlightForm flight={flight} /> : <Notice tone="warn">Only the Lead Cabin Attendant can edit flights in this demo role preview.</Notice>}
    </div>
  );
}
