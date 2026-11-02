"use client";

import Link from "next/link";
import { ChevronRight, CloudLightning, FlaskConical, Handshake, History, LayoutGrid, ListChecks, Sparkles, Wrench } from "lucide-react";
import { PreboardHero, usePreboardFlight } from "@/components/PreboardCard";
import { FlightTimes, ReadinessPanel, RouteLine } from "@/components/flight";
import { Badge, Card, EmptyState, SectionHeader, SimulatedBadge } from "@/components/ui";
import { effectiveEquipmentStatus, isAcked } from "@/domain/readiness";
import { fmtRelative } from "@/lib/format";
import { useCrewName, useFeaturedFlight, useFlightAdvisories, useNow, useReadiness } from "@/store/hooks";
import { useMe, useStore } from "@/store/store";

function greeting(now: number) {
  const h = new Date(now).getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function HomePage() {
  const now = useNow();
  const me = useMe();
  const flight = useFeaturedFlight();
  const r = useReadiness(flight?.id, now);
  const name = useCrewName();
  const equipment = useStore((s) => s.equipment);
  const acks = useStore((s) => s.acks);
  const handovers = useStore((s) => s.handovers);
  const audit = useStore((s) => s.audit);
  const advisories = useFlightAdvisories(flight?.id);

  const eqAttention = equipment.filter((e) => effectiveEquipmentStatus(e, now) !== "serviceable").length;
  const flightAdvs = flight ? advisories.filter((a) => a.airports.some((x) => [flight.departure, flight.destination, ...flight.alternates].includes(x))) : [];
  const unacked = flight ? flightAdvs.filter((a) => !isAcked(acks, a.id, flight.id)) : [];
  const pendingHandovers = handovers.filter((h) => h.status !== "accepted");
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

      {flight && r ? (
        <Card className="p-0 overflow-hidden animate-fade-up" data-testid="featured-flight">
          <Link href={`/flights/${flight.id}`} className="block p-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="eyebrow !text-gold">Next departure</span>
                <span className="text-xs text-slate">· {flight.callsign} · {fmtRelative(flight.departAt, now)}</span>
              </div>
              <ChevronRight className="size-4 text-slate" />
            </div>
            <RouteLine flight={flight} large />
            <FlightTimes flight={flight} />
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate">
              <span>
                Cabin Attendant · <span className="text-ivory">{name(flight.cabinAttendantId)}</span>
              </span>
              <span>
                Passengers · <span className="text-ivory tnum">{flight.manifest.length}</span>
              </span>
              <span>
                Alternates · <span className="text-ivory">{flight.alternates.join(", ")}</span>
              </span>
            </div>
          </Link>
          <div className="px-4 pb-4 pt-3 border-t hairline">
            <ReadinessPanel r={r} flightId={flight.id} compact />
          </div>
        </Card>
      ) : (
        <EmptyState title="No upcoming flights" action={<Link href="/flights/new" className="text-gold">Create a flight</Link>}>
          Upcoming flights and their readiness will appear here.
        </EmptyState>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile href={flight ? `/flights/${flight.id}?filter=open` : "/flights"} icon={<ListChecks className="size-4.5" />} label="Outstanding items" value={r?.outstanding.length ?? 0} sub={r?.overdue.length ? `${r.overdue.length} overdue` : "for next flight"} tone={r?.overdue.length ? "bad" : undefined} />
        <StatTile href="/cabin" icon={<Wrench className="size-4.5" />} label="Equipment attention" value={eqAttention} sub="due, discrepancy or expiring" tone={eqAttention ? "warn" : undefined} />
        <StatTile href={flight ? `/intel?flight=${flight.id}` : "/intel"} icon={<CloudLightning className="size-4.5" />} label="Advisories to review" value={unacked.length} sub={`${flightAdvs.length} associated`} tone={unacked.length ? "warn" : undefined} />
        <StatTile href="/handovers" icon={<Handshake className="size-4.5" />} label="Pending handovers" value={pendingHandovers.length} sub="awaiting acceptance" tone={pendingHandovers.length ? "warn" : undefined} />
      </div>

      {/* Advisories */}
      {flight && flightAdvs.length > 0 && (
        <section>
          <SectionHeader eyebrow="Risk Intelligence" title="Advisories for this flight" action={<Link href={`/intel?flight=${flight.id}`} className="text-sm text-gold min-h-9 inline-flex items-center">View all</Link>} />
          <div className="space-y-2">
            {flightAdvs.slice(0, 3).map((a) => (
              <Link key={a.id} href={`/intel?flight=${flight.id}&adv=${encodeURIComponent(a.id)}`} className="card-quiet flex items-start gap-3 p-3 hover:border-gold/30 transition-colors">
                <CloudLightning className={a.severity === "warning" || a.severity === "critical" ? "size-5 text-warn shrink-0 mt-0.5" : "size-5 text-info shrink-0 mt-0.5"} />
                <span className="flex-1 min-w-0">
                  <span className="flex flex-wrap gap-1.5 mb-1">
                    {a.origin === "simulated" ? <SimulatedBadge /> : <Badge tone="info">LIVE</Badge>}
                    <Badge tone={a.severity === "warning" || a.severity === "critical" ? "warn" : "neutral"}><span className="capitalize">{a.severity}</span></Badge>
                    {isAcked(acks, a.id, flight.id) && <Badge tone="ok">Acknowledged</Badge>}
                  </span>
                  <span className="block text-sm text-ivory leading-snug">{a.title}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Shortcuts */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/cabin" className="card p-4 hover:border-gold/30 transition-colors">
          <LayoutGrid className="size-5 text-gold" />
          <div className="font-semibold mt-2">Cabin Safety Map</div>
          <div className="text-xs text-slate mt-0.5">Interactive equipment register</div>
        </Link>
        <Link href="/copilot" className="card p-4 hover:border-gold/30 transition-colors">
          <Sparkles className="size-5 text-gold" />
          <div className="font-semibold mt-2">Safety Copilot</div>
          <div className="text-xs text-slate mt-0.5">Briefings grounded in records</div>
        </Link>
      </div>

      {/* Recent activity */}
      <section>
        <SectionHeader eyebrow="Accountability" title="Recent activity" action={<Link href="/audit" className="text-sm text-gold min-h-9 inline-flex items-center">Audit history</Link>} />
        <ol className="card p-0 divide-y divide-[var(--separator)]">
          {audit.slice(0, 4).map((e) => (
            <li key={e.id} className="flex items-start gap-3 px-3.5 py-3">
              <History className="size-4 text-slate-500 mt-0.5 shrink-0" />
              <span className="flex-1 min-w-0 text-[0.8125rem]">
                <span className="text-ivory leading-snug block">{e.summary}</span>
                <span className="text-[0.6875rem] text-slate-500">
                  {name(e.actorId)} · {fmtRelative(e.at, now)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-[0.6875rem] text-slate-500 text-center leading-relaxed px-4 flex items-center justify-center gap-1.5">
        <FlaskConical className="size-3.5" /> Demonstration prototype · all people, flights and records are fictional
      </p>

    </div>
  );
}

function StatTile({ href, icon, label, value, sub, tone }: { href: string; icon: React.ReactNode; label: string; value: number; sub: string; tone?: "bad" | "warn" }) {
  return (
    <Link href={href} className="card p-3.5 hover:border-gold/30 transition-colors">
      <div className="flex items-center justify-between text-slate">
        {icon}
        <span className={tone === "bad" ? "size-2 rounded-full bg-bad" : tone === "warn" ? "size-2 rounded-full bg-warn" : "size-2 rounded-full bg-ok"} aria-hidden />
      </div>
      <div className="text-[1.6rem] font-semibold tnum mt-1.5 leading-none">{value}</div>
      <div className="text-xs text-ivory mt-1.5">{label}</div>
      <div className="text-[0.6875rem] text-slate-500">{sub}</div>
    </Link>
  );
}
