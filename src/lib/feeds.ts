import "server-only";
import { airport } from "@/data/airports";
import type { Advisory, AdvisorySeverity, Airport, FeedSourceStatus, IntelSnapshot, MetarObs, TafReport } from "@/domain/types";
import { parseCdcRss, parseGdacs, parseIsigmets, parseMetars, parseStateDept, parseTafs, parseUsgs } from "./feedParsers";

/**
 * Server-side retrieval of official public feeds. Every feed is independent:
 * a failure produces an explicit "unavailable"/"error" source status and never
 * a fabricated alert. No API keys are required for these public endpoints.
 */

const UA = "CabinSafeIntelligence/0.1 (demonstration prototype; contact via repository)";
const TIMEOUT_MS = 9000;

export const SOURCES = {
  awcMetar: { name: "NOAA Aviation Weather Center — METAR", url: "https://aviationweather.gov/api/data/metar" },
  awcTaf: { name: "NOAA Aviation Weather Center — TAF", url: "https://aviationweather.gov/api/data/taf" },
  awcSigmet: { name: "NOAA Aviation Weather Center — International SIGMET", url: "https://aviationweather.gov/api/data/isigmet" },
  state: { name: "U.S. Department of State — Travel Advisories", url: "https://cadataapi.state.gov/api/TravelAdvisories" },
  usgs: { name: "USGS — Earthquakes M4.5+ (past 7 days)", url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson" },
  gdacs: { name: "GDACS — Global Disaster Alerts", url: "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH" },
  cdc: { name: "CDC — Travel Health Notices", url: "https://wwwnc.cdc.gov/travel/rss/notices.xml" },
} as const;

type SourceKey = keyof typeof SOURCES;

async function get(url: string, accept: string): Promise<Response> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: accept },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate: 600 },
  });
  if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
  return res;
}

function status(key: SourceKey, s: FeedSourceStatus["status"], detail?: string): FeedSourceStatus {
  return { id: key, name: SOURCES[key].name, status: s, retrievedAt: new Date().toISOString(), detail, url: SOURCES[key].url };
}

function describe(e: unknown): string {
  if (e instanceof Error) return e.name === "TimeoutError" ? "Request timed out" : e.message;
  return "Unknown error";
}

async function run<T>(key: SourceKey, fn: () => Promise<T>, sources: FeedSourceStatus[], fallback: T, okDetail?: (v: T) => string): Promise<T> {
  try {
    const v = await fn();
    sources.push(status(key, "ok", okDetail?.(v)));
    return v;
  } catch (e) {
    const msg = describe(e);
    const unreachable = /fetch failed|ENOTFOUND|ECONNREFUSED|timed out|403|502|503|504/i.test(msg);
    sources.push(status(key, unreachable ? "unavailable" : "error", msg));
    return fallback;
  }
}

export async function fetchIntel(icaos: string[]): Promise<IntelSnapshot> {
  const airports = icaos.map((i) => airport(i)).filter((a): a is Airport => !!a);
  const ids = airports.map((a) => a.icao).join(",");
  const sources: FeedSourceStatus[] = [];
  const retrievedAt = new Date().toISOString();

  const [metars, tafs, sigmets, state, quakes, gdacs, cdc] = await Promise.all([
    run<MetarObs[]>("awcMetar", async () => parseMetars(await (await get(`${SOURCES.awcMetar.url}?ids=${ids}&format=json&hours=3`, "application/json")).json()), sources, [], (v) => `${v.length} observation(s)`),
    run<TafReport[]>("awcTaf", async () => parseTafs(await (await get(`${SOURCES.awcTaf.url}?ids=${ids}&format=json`, "application/json")).json()), sources, [], (v) => `${v.length} forecast(s)`),
    run<Advisory[]>("awcSigmet", async () => parseIsigmets(await (await get(`${SOURCES.awcSigmet.url}?format=json`, "application/json")).json(), airports, retrievedAt), sources, [], (v) => `${v.length} relevant`),
    run<Advisory[]>("state", async () => parseStateDept(await (await get(SOURCES.state.url, "application/json")).json(), airports, retrievedAt), sources, [], (v) => `${v.length} relevant`),
    run<Advisory[]>("usgs", async () => parseUsgs(await (await get(SOURCES.usgs.url, "application/geo+json,application/json")).json(), airports, retrievedAt), sources, [], (v) => `${v.length} within 500 km`),
    run<Advisory[]>("gdacs", async () => {
      const from = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);
      const res = await get(`${SOURCES.gdacs.url}?eventlist=EQ;TC;FL;VO;DR;WF&alertlevel=Orange;Red&fromDate=${from}`, "application/json");
      if (res.status === 204) return [];
      return parseGdacs(await res.json(), airports, retrievedAt);
    }, sources, [], (v) => `${v.length} within 1000 km`),
    run<Advisory[]>("cdc", async () => parseCdcRss(await (await get(SOURCES.cdc.url, "application/rss+xml,application/xml,text/xml")).text(), airports, retrievedAt), sources, [], (v) => `${v.length} relevant`),
  ]);

  const order: Record<AdvisorySeverity, number> = { critical: 0, warning: 1, advisory: 2, info: 3 };
  return {
    retrievedAt,
    airports: airports.map((a) => a.icao),
    sources: Object.keys(SOURCES).map((k) => sources.find((s) => s.id === k)!),
    metars,
    tafs,
    advisories: [...sigmets, ...state, ...quakes, ...gdacs, ...cdc].sort((a, b) => order[a.severity] - order[b.severity]),
  };
}
