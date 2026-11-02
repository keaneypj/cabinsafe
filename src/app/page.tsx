"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PreboardHero, usePreboardFlight } from "@/components/PreboardCard";
import { FlightTimes, RouteLine } from "@/components/flight";
import { Card, EmptyState } from "@/components/ui";
import { fmtRelative } from "@/lib/format";
import { useCrewName, useFeaturedFlight, useNow } from "@/store/hooks";
import { useMe } from "@/store/store";

function greeting(now: number) {
  const h = new Date(now).getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/**
 * Home is kept deliberately simple for the demo: the pre-boarding checklist and the next flight.
 * Readiness, advisories, equipment, handovers and activity each live on their own page.
 */
export default function HomePage() {
  const now = useNow();
  const me = useMe();
  const flight = useFeaturedFlight();
  const name = useCrewName();
  // Cabin attendants see their own next flight's pre-boarding first.
  const preboardFlight = usePreboardFlight();

  return (
    <div className="space-y-5">
      <div className="animate-fade-up">
        <div className="eyebrow">{new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(now)}</div>
        <h1 className="display text-[2.1rem] leading-tight mt-0.5">
          {greeting(now)}, <span className="gold-text">{/^(Capt\.|F\/O)/.test(me.name) ? me.name : me.name.split(" ")[0]}</span>
        </h1>
      </div>

      {preboardFlight && <PreboardHero flight={preboardFlight} />}

      {flight ? (
        <Card className="p-0 overflow-hidden animate-fade-up" data-testid="featured-flight">
          <Link href={`/flights/${flight.id}`} className="block p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="eyebrow !text-gold">
                Next flight <span className="normal-case tracking-normal text-slate">· {flight.callsign} · {fmtRelative(flight.departAt, now)}</span>
              </span>
              <ChevronRight className="size-4 text-slate" aria-hidden />
            </div>
            <RouteLine flight={flight} large />
            <FlightTimes flight={flight} />
            <p className="mt-3 text-[0.8125rem] text-slate">
              Cabin host <span className="text-ivory">{name(flight.cabinAttendantId)}</span> · <span className="text-ivory tnum">{flight.manifest.length}</span> passengers
            </p>
          </Link>
        </Card>
      ) : (
        <EmptyState title="No upcoming flights" action={<Link href="/flights/new" className="text-gold">Create a flight</Link>}>
          Upcoming flights will appear here.
        </EmptyState>
      )}
    </div>
  );
}
