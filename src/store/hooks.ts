"use client";

import { useEffect, useMemo, useState } from "react";
import { FEATURED_FLIGHT_ID } from "@/data/seed";
import type { FlightContext } from "@/domain/context";
import { computeReadiness, type ReadinessResult } from "@/domain/readiness";
import type { Advisory, Flight } from "@/domain/types";
import { useMe, useStore } from "./store";

/** False during SSR and the first client render; avoids hydration mismatches with persisted data. */
export function useHydrated(): boolean {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

/** Current time, refreshed periodically so relative times and due states stay accurate. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useUpcomingFlights(): Flight[] {
  const flights = useStore((s) => s.flights);
  return useMemo(() => flights.filter((f) => f.status !== "completed").sort((a, b) => a.departAt.localeCompare(b.departAt)), [flights]);
}

/** Featured flight: the seeded demo flight if still upcoming, otherwise the next departure. */
export function useFeaturedFlight(): Flight | undefined {
  const upcoming = useUpcomingFlights();
  return upcoming.find((f) => f.id === FEATURED_FLIGHT_ID) ?? upcoming[0];
}

/** Simulated advisories plus any live advisories retrieved for this flight. */
export function useFlightAdvisories(flightId: string | undefined): Advisory[] {
  const sim = useStore((s) => s.advisories);
  const intel = useStore((s) => (flightId ? s.intel[flightId] : undefined));
  return useMemo(() => [...sim, ...(intel?.advisories ?? [])], [sim, intel]);
}

export function useReadiness(flightId: string | undefined, now: number): ReadinessResult | undefined {
  const flight = useStore((s) => s.flights.find((f) => f.id === flightId));
  const tasks = useStore((s) => s.tasks);
  const equipment = useStore((s) => s.equipment);
  const discrepancies = useStore((s) => s.discrepancies);
  const acks = useStore((s) => s.acks);
  const advisories = useFlightAdvisories(flightId);
  return useMemo(
    () => (flight ? computeReadiness({ flight, tasks, equipment, discrepancies, advisories, acks, nowMs: now }) : undefined),
    [flight, tasks, equipment, discrepancies, advisories, acks, now],
  );
}

export function useFlightContext(flightId: string | undefined, now: number): FlightContext | undefined {
  const s = useStore();
  const me = useMe();
  const advisories = useFlightAdvisories(flightId);
  return useMemo(() => {
    const flight = s.flights.find((f) => f.id === flightId);
    if (!flight) return undefined;
    const intel = s.intel[flight.id];
    return {
      flight,
      tasks: s.tasks,
      equipment: s.equipment,
      discrepancies: s.discrepancies,
      advisories,
      acks: s.acks,
      passengers: s.passengers,
      crew: s.crew,
      handovers: s.handovers,
      role: me.role,
      nowMs: now,
      crewInputs: s.crewInputs,
      preboardSignoffs: s.preboardSignoffs,
      liveWeather: intel?.metars.map((m) => ({ station: m.station, raw: m.raw, observedAt: m.observedAt })),
      liveTafs: intel?.tafs.map((t) => ({ station: t.station, raw: t.raw, validFrom: t.validFrom, validTo: t.validTo })),
    };
  }, [s.flights, s.tasks, s.equipment, s.discrepancies, s.acks, s.passengers, s.crew, s.handovers, s.intel, s.crewInputs, s.preboardSignoffs, advisories, flightId, me.role, now]);
}

export function useCrewName(): (id?: string) => string {
  const crew = useStore((s) => s.crew);
  return (id?: string) => (!id ? "Unassigned" : id === "system" ? "Rules engine" : crew.find((c) => c.id === id)?.name ?? id);
}
