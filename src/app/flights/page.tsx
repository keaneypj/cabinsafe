"use client";

import { Plus, PlaneTakeoff } from "lucide-react";
import { FlightCard } from "@/components/flight";
import { EmptyState, LinkButton, PageTitle, SectionHeader } from "@/components/ui";
import { can } from "@/domain/permissions";
import { useUpcomingFlights } from "@/store/hooks";
import { useShallow } from "zustand/react/shallow";
import { useMe, useStore } from "@/store/store";

export default function FlightsPage() {
  const upcoming = useUpcomingFlights();
  const completed = useStore(useShallow((s) => s.flights.filter((f) => f.status === "completed")));
  const me = useMe();
  return (
    <div>
      <PageTitle
        eyebrow="Flight Operations"
        title="Flights"
        subtitle="Upcoming international sectors and cabin readiness"
        action={
          can(me.role, "flight.edit") ? (
            <LinkButton href="/flights/new" size="sm" variant="secondary">
              <Plus className="size-4" /> New
            </LinkButton>
          ) : undefined
        }
      />
      {upcoming.length === 0 ? (
        <EmptyState icon={<PlaneTakeoff className="size-7" />} title="No upcoming flights">
          Create a flight to start preparation.
        </EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {upcoming.map((f) => (
            <FlightCard key={f.id} flight={f} />
          ))}
        </div>
      )}
      {completed.length > 0 && (
        <div className="mt-6">
          <SectionHeader eyebrow="Postflight" title="Recently completed" />
          <div className="grid gap-3 md:grid-cols-2">
            {completed.map((f) => (
              <FlightCard key={f.id} flight={f} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
