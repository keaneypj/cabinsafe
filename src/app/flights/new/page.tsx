"use client";

import { FlightForm } from "@/components/FlightForm";
import { Notice, PageTitle } from "@/components/ui";
import { can } from "@/domain/permissions";
import { useMe } from "@/store/store";

export default function NewFlightPage() {
  const me = useMe();
  return (
    <div>
      <PageTitle eyebrow="Flight Operations" title="New flight" subtitle="Create a sector and its preflight checklist" />
      {can(me.role, "flight.edit") ? <FlightForm /> : <Notice tone="warn">Only the Lead Cabin Attendant can create flights in this demo role preview.</Notice>}
    </div>
  );
}
