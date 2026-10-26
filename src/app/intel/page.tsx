"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, CircleAlert, CloudOff, ExternalLink, Globe, HeartPulse, Megaphone, Mountain, Plane, RefreshCw, ShieldAlert, Wind } from "lucide-react";
import { Badge, Button, Card, Chip, EmptyState, Notice, PageTitle, SectionHeader, SimulatedBadge, Skeleton, report } from "@/components/ui";
import { airport } from "@/data/airports";
import { can } from "@/domain/permissions";
import { advisoriesForFlight, flightAirports, isAcked } from "@/domain/readiness";
import type { Advisory, AdvisoryCategory, Flight, IntelSnapshot, MetarObs } from "@/domain/types";
import { cx, fmtRelative, fmtUtc } from "@/lib/format";
import { useCrewName, useFeaturedFlight, useFlightAdvisories, useNow, useUpcomingFlights } from "@/store/hooks";
import { useMe, useStore } from "@/store/store";

const CAT_ICON: Record<AdvisoryCategory, typeof Wind> = { weather: Wind, security: ShieldAlert, political_unrest: Megaphone, natural_disaster: Mountain, public_health: HeartPulse, aviation: Plane };
const CAT_LABEL: Record<AdvisoryCategory, string> = { weather: "Weather", security: "Security", political_unrest: "Political unrest", natural_disaster: "Natural disaster", public_health: "Public health", aviation: "Aviation notice" };
const STALE_MS = 60 * 60_000;

export default function IntelPage() {
  return (
    <Suspense>
      <Intel />
    </Suspense>
  );
}

function useIntel(flight: Flight | undefined) {
  const snap = useStore((s) => (flight ? s.intel[flight.id] : undefined));
  const save = useStore((s) => s.saveIntel);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const refresh = useCallback(async () => {
    if (!flight) return;
    setLoading(true);
    setError(undefined);
    try {
      const res = await fetch(`/api/intel?airports=${flightAirports(flight).join(",")}`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      save(flight.id, body as IntelSnapshot);
    } catch (e) {
      setError(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "The intelligence service could not be reached. You may be offline.");
    } finally {
      setLoading(false);
    }
  }, [flight, save]);
  useEffect(() => {
    if (flight && (!snap || Date.now() - new Date(snap.retrievedAt).getTime() > 10 * 60_000)) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight?.id]);
  return { snap, loading, error, refresh };
}

function Intel() {
  const sp = useSearchParams();
  const router = useRouter();
  const now = useNow();
  const upcoming = useUpcomingFlights();
  const featured = useFeaturedFlight();
  const flight = upcoming.find((f) => f.id === sp.get("flight")) ?? featured;
  const { snap, loading, error, refresh } = useIntel(flight);
  const advisories = useFlightAdvisories(flight?.id);
  const focus = sp.get("adv");

  if (!flight) return <EmptyState title="No upcoming flights">Risk intelligence is associated with upcoming flights.</EmptyState>;

  const relevant = advisoriesForFlight(flight, advisories);
  const simulated = relevant.filter((a) => a.origin === "simulated");
  const live = relevant.filter((a) => a.origin === "live");
  const stale = snap && now - new Date(snap.retrievedAt).getTime() > STALE_MS;
  const okSources = snap?.sources.filter((s) => s.status === "ok").length ?? 0;

  return (
    <div>
      <PageTitle eyebrow="Global Risk Intelligence" title="Route Intelligence" subtitle={`${flight.callsign} · ${flight.departure} → ${flight.destination} · alternates ${flight.alternates.join(", ")}`} />

      <div className="scroll-x -mx-4 px-4 mb-4">
        <div className="flex gap-1.5 w-max">
          {upcoming.map((f) => (
            <Chip key={f.id} active={f.id === flight.id} onClick={() => router.replace(`/intel?flight=${f.id}`, { scroll: false })}>
              {f.callsign} · {f.departure}–{f.destination}
            </Chip>
          ))}
        </div>
      </div>

      <Notice tone="neutral" className="mb-4">
        CabinSafe supports cabin preparation only. It does not make go/no-go decisions, issue dispatch authorization or replace the Pilot in Command&apos;s judgement. <strong>The absence of alerts is not evidence of safety.</strong>
      </Notice>

      {/* Sources */}
      <Card className="mb-4" data-testid="intel-sources">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="eyebrow">Live sources</div>
            <div className="text-sm text-ivory mt-0.5">
              {loading && !snap ? "Retrieving…" : snap ? `${okSources} of ${snap.sources.length} available` : "Not yet retrieved"}
              {snap && <span className="text-slate"> · retrieved {fmtRelative(snap.retrievedAt, now)}</span>}
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={refresh} loading={loading} aria-label="Refresh live intelligence" data-testid="intel-refresh">
            {!loading && <RefreshCw className="size-4" />} Refresh
          </Button>
        </div>
        {stale && (
          <Notice tone="warn" className="mt-3">
            Stale data — last retrieved {fmtRelative(snap!.retrievedAt, now)}. Refresh before relying on it.
          </Notice>
        )}
        {error && (
          <Notice tone="bad" className="mt-3">
            {error} Previously retrieved data, if any, is shown with its retrieval time.
          </Notice>
        )}
        {loading && !snap && (
          <div className="space-y-2 mt-3">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </div>
        )}
        {snap && (
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {snap.sources.map((s) => (
              <li key={s.id} className="flex items-start gap-2 rounded-lg bg-midnight-900/35 px-2.5 py-2 text-xs">
                <span className={cx("mt-1 size-2 rounded-full shrink-0", s.status === "ok" ? "bg-ok" : s.status === "not_configured" ? "bg-slate-500" : "bg-warn")} aria-hidden />
                <span className="flex-1 min-w-0">
                  <a href={s.url} target="_blank" rel="noreferrer noopener" className="text-ivory hover:text-gold">
                    {s.name}
                  </a>
                  <span className={cx("block", s.status === "ok" ? "text-slate-500" : "text-warn")}>{s.status === "ok" ? `OK · ${s.detail ?? ""}` : `Unavailable · ${s.detail ?? "no response"}`}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Weather */}
      <SectionHeader eyebrow="NOAA Aviation Weather Center" title="METAR & TAF" />
      <div className="grid gap-3 md:grid-cols-2 mb-5">
        {flightAirports(flight).map((icao, i) => (
          <StationCard key={icao} icao={icao} role={i === 0 ? "Departure" : i === 1 ? "Destination" : "Alternate"} snap={snap} loading={loading} now={now} />
        ))}
      </div>

      {/* Advisories */}
      <SectionHeader eyebrow="Advisories" title={`Associated with ${flight.callsign}`} action={<span className="text-xs text-slate tnum">{relevant.length}</span>} />
      <div className="space-y-2.5" data-testid="advisory-list">
        {simulated.map((a) => (
          <AdvisoryCard key={a.id} a={a} flight={flight} defaultOpen={focus === a.id} />
        ))}
        {live.map((a) => (
          <AdvisoryCard key={a.id} a={a} flight={flight} defaultOpen={focus === a.id} />
        ))}
        {snap && live.length === 0 && (
          <div className="card-quiet p-3.5 text-xs text-slate flex items-start gap-2">
            <Globe className="size-4 shrink-0 mt-px" />
            <span>
              No live advisories were returned for these airports{okSources < snap.sources.length ? ", and some sources were unavailable" : ""}. This is not evidence of safety — confirm through the flight crew&apos;s approved briefing sources and the security lead.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function wind(m: MetarObs): string {
  if (m.windKt === undefined) return "—";
  if (m.windKt === 0) return "Calm";
  return `${m.windDir === "VRB" ? "VRB" : String(m.windDir ?? "").padStart(3, "0") + "°"} ${m.windKt} kt${m.gustKt ? ` G${m.gustKt}` : ""}`;
}

function StationCard({ icao, role, snap, loading, now }: { icao: string; role: string; snap?: IntelSnapshot; loading: boolean; now: number }) {
  const a = airport(icao);
  const m = snap?.metars.find((x) => x.station === icao);
  const t = snap?.tafs.find((x) => x.station === icao);
  const metarSrc = snap?.sources.find((s) => s.id === "awcMetar");
  return (
    <Card className="p-3.5" data-testid={`station-${icao}`}>
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold tracking-wider text-ivory">{icao}</span>
          <span className="text-xs text-slate ml-2">{a?.name}</span>
        </div>
        <Badge tone={role === "Alternate" ? "neutral" : "gold"}>{role}</Badge>
      </div>
      {loading && !snap ? (
        <Skeleton className="h-20 mt-3" />
      ) : m ? (
        <>
          <div className="grid grid-cols-4 gap-2 mt-3 text-center">
            {[
              ["Wind", wind(m)],
              ["Vis", m.visibility ? `${m.visibility}${/^\d/.test(m.visibility) && Number(m.visibility.replace("+", "")) <= 10 ? " sm" : ""}` : "—"],
              ["Temp", m.tempC !== undefined ? `${m.tempC}°C` : "—"],
              ["Cat", m.flightCategory ?? "—"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-midnight-900/40 py-2 px-1">
                <div className="text-[0.5625rem] uppercase tracking-wider text-slate-500">{k}</div>
                <div className="text-xs text-ivory tnum mt-0.5">{v}</div>
              </div>
            ))}
          </div>
          {m.weather && <div className="text-xs text-warn mt-2">Significant weather: {m.weather}</div>}
          <code className="block mt-2 text-[0.6875rem] text-slate bg-midnight-900/50 rounded-lg p-2 break-words">{m.raw}</code>
          <div className="text-[0.625rem] text-slate-500 mt-1">
            Observed {fmtUtc(m.observedAt)} ({fmtRelative(m.observedAt, now)}) · retrieved {fmtUtc(snap!.retrievedAt)}
          </div>
          {t ? (
            <details className="mt-2">
              <summary className="text-xs text-gold cursor-pointer min-h-8 flex items-center">TAF · valid {fmtUtc(t.validFrom)} – {fmtUtc(t.validTo)}</summary>
              <code className="block mt-1 text-[0.6875rem] text-slate bg-midnight-900/50 rounded-lg p-2 break-words whitespace-pre-wrap">{t.raw}</code>
              <div className="text-[0.625rem] text-slate-500 mt-1">Issued {fmtUtc(t.issuedAt)}</div>
            </details>
          ) : (
            <div className="text-[0.6875rem] text-slate-500 mt-2">No TAF returned for this station.</div>
          )}
        </>
      ) : (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-warn/20 bg-warn-bg/35 p-3 text-xs text-warn">
          <CloudOff className="size-4 shrink-0" />
          <span>
            {metarSrc && metarSrc.status !== "ok" ? `Live METAR unavailable — ${metarSrc.detail ?? "source unreachable"} (${fmtUtc(metarSrc.retrievedAt)}).` : snap ? "No current observation returned for this station." : "Not yet retrieved."} No substitute data is shown. Obtain weather through the flight crew&apos;s approved briefing sources.
          </span>
        </div>
      )}
    </Card>
  );
}

function AdvisoryCard({ a, flight, defaultOpen }: { a: Advisory; flight: Flight; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [withTask, setWithTask] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const acks = useStore((s) => s.acks);
  const ack = acks.find((x) => x.advisoryId === a.id && x.flightId === flight.id);
  const acknowledge = useStore((s) => s.acknowledgeAdvisory);
  const demoActive = useStore((s) => s.demo.active);
  const me = useMe();
  const name = useCrewName();
  const now = useNow();
  const router = useRouter();
  const Icon = CAT_ICON[a.category];
  const sevTone = a.severity === "critical" ? "bad" : a.severity === "warning" ? "warn" : a.severity === "advisory" ? "info" : "neutral";

  useEffect(() => {
    if (defaultOpen) {
      setOpen(true);
      setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
    }
  }, [defaultOpen]);

  return (
    <div ref={ref} className={cx("card p-0 overflow-hidden", defaultOpen && "ring-1 ring-gold/50")} data-testid={`advisory-${a.id}`}>
      <button className="w-full flex items-start gap-3 p-3.5 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className={cx("grid size-9 place-items-center rounded-full shrink-0", sevTone === "warn" ? "bg-warn-bg text-warn" : sevTone === "bad" ? "bg-bad-bg text-bad" : "bg-info-bg text-info")}>
          <Icon className="size-4.5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex flex-wrap gap-1.5 mb-1">
            {a.origin === "simulated" ? <SimulatedBadge /> : <Badge tone="info">LIVE</Badge>}
            <Badge tone={sevTone}>{a.severity.toUpperCase()}</Badge>
            <Badge tone="neutral">{CAT_LABEL[a.category]}</Badge>
            {isAcked(acks, a.id, flight.id) && (
              <Badge tone="ok" icon={<Check className="size-3" />}>
                Acknowledged
              </Badge>
            )}
          </span>
          <span className="block text-[0.9375rem] text-ivory leading-snug">{a.title}</span>
          <span className="block text-xs text-slate mt-0.5">
            {a.geography} · {a.airports.join(", ")}
          </span>
        </span>
        <ChevronDown className={cx("size-4.5 text-slate shrink-0 mt-1 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 animate-fade-in">
          {a.origin === "simulated" && (
            <Notice tone="sim" className="mb-3">
              Simulated demonstration scenario. This is not a real forecast or advisory and must not be used operationally.
            </Notice>
          )}
          <p className="text-sm text-slate leading-relaxed">{a.summary}</p>
          <div className="mt-3 rounded-xl border border-gold/20 bg-gold/5 p-3">
            <div className="eyebrow !text-gold mb-1">Why it matters to cabin preparation</div>
            <p className="text-sm text-ivory leading-relaxed">{a.cabinRelevance}</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3 text-xs">
            <div>
              <dt className="text-slate-500">Source</dt>
              <dd className="text-ivory">{a.source}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Geographic relevance</dt>
              <dd className="text-ivory">{a.geography}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Published</dt>
              <dd className="text-ivory">{fmtUtc(a.publishedAt)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Last retrieved</dt>
              <dd className="text-ivory">{fmtUtc(a.retrievedAt)}</dd>
            </div>
          </dl>
          <a href={a.sourceUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 text-xs text-gold mt-3 min-h-9">
            <ExternalLink className="size-3.5" /> {a.origin === "simulated" ? "Official source to verify against" : "Original advisory"}
          </a>
          {ack ? (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-ok-bg/60 border border-ok/25 px-3 py-2.5 text-xs text-ivory">
              <Check className="size-4 text-ok" />
              <span className="flex-1">
                Acknowledged by {name(ack.byId)} · {fmtRelative(ack.at, now)}
                {ack.taskId && " · preparation task created"}
              </span>
              {ack.taskId && (
                <button className="text-gold min-h-8" onClick={() => router.push(`/flights/${flight.id}?task=${ack.taskId}`)}>
                  View task
                </button>
              )}
            </div>
          ) : can(me.role, "advisory.ack") ? (
            <div className="mt-3 rounded-xl border border-slate/12 p-3">
              <label className="flex items-center gap-2.5 text-sm text-ivory cursor-pointer min-h-9">
                <input type="checkbox" className="size-5 accent-[#d7bd8c]" checked={withTask} onChange={(e) => setWithTask(e.target.checked)} data-testid="adv-create-task" />
                Create a cabin preparation task
              </label>
              <Button
                className="w-full mt-2"
                onClick={() => {
                  const ok = report(acknowledge(a, flight.id, withTask), withTask ? "Advisory acknowledged · preparation task created" : "Advisory acknowledged");
                  if (ok && demoActive && a.id === "sim-wx-lsgg") useStore.getState().demoMark("advisory");
                }}
                data-testid="adv-ack"
              >
                <Check className="size-4" /> Acknowledge for {flight.callsign}
              </Button>
              <p className="text-[0.625rem] text-slate-500 mt-2 flex items-start gap-1">
                <CircleAlert className="size-3 shrink-0 mt-px" /> Acknowledgement records review; it is not risk acceptance (CSI-OPS-001 §6).
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500 mt-3">Your demo role cannot acknowledge advisories.</p>
          )}
        </div>
      )}
    </div>
  );
}

