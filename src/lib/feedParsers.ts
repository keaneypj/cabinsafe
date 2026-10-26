import type { Advisory, AdvisorySeverity, Airport, MetarObs, TafReport } from "@/domain/types";

/**
 * Pure, defensive parsers for public feed formats. Unknown or malformed
 * entries are skipped rather than guessed.
 */

type Json = Record<string, unknown>;

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined);
const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);

/** AWC times are unix seconds or ISO strings. */
function time(v: unknown): string | undefined {
  if (typeof v === "number") return new Date(v * (v < 1e12 ? 1000 : 1)).toISOString();
  if (typeof v === "string") {
    const d = new Date(v.includes("T") || v.endsWith("Z") ? v : `${v.replace(" ", "T")}Z`);
    return Number.isFinite(d.getTime()) ? d.toISOString() : undefined;
  }
  return undefined;
}

function arr(v: unknown): Json[] {
  if (Array.isArray(v)) return v.filter((x): x is Json => !!x && typeof x === "object");
  if (v && typeof v === "object" && Array.isArray((v as Json).features)) return arr((v as Json).features);
  return [];
}

export function parseMetars(data: unknown): MetarObs[] {
  const latest = new Map<string, MetarObs>();
  for (const m of arr(data)) {
    const station = str(m.icaoId);
    const raw = str(m.rawOb);
    if (!station || !raw) continue;
    const obs: MetarObs = {
      station,
      raw,
      observedAt: time(m.obsTime) ?? time(m.reportTime),
      windDir: m.wdir === "VRB" ? "VRB" : num(m.wdir),
      windKt: num(m.wspd),
      gustKt: num(m.wgst),
      visibility: m.visib !== undefined && m.visib !== null ? String(m.visib) : undefined,
      tempC: num(m.temp),
      dewpointC: num(m.dewp),
      altimeter: num(m.altim),
      weather: str(m.wxString),
      flightCategory: str(m.fltCat),
      clouds: Array.isArray(m.clouds) ? (m.clouds as Json[]).map((c) => `${str(c.cover) ?? ""}${num(c.base) !== undefined ? String(Math.round(num(c.base)! / 100)).padStart(3, "0") : ""}`).filter(Boolean).join(" ") : undefined,
    };
    const prev = latest.get(station);
    if (!prev || (obs.observedAt ?? "") > (prev.observedAt ?? "")) latest.set(station, obs);
  }
  return [...latest.values()];
}

export function parseTafs(data: unknown): TafReport[] {
  const latest = new Map<string, TafReport>();
  for (const t of arr(data)) {
    const station = str(t.icaoId);
    const raw = str(t.rawTAF);
    if (!station || !raw) continue;
    const r: TafReport = { station, raw, issuedAt: time(t.issueTime), validFrom: time(t.validTimeFrom), validTo: time(t.validTimeTo) };
    const prev = latest.get(station);
    if (!prev || (r.issuedAt ?? "") > (prev.issuedAt ?? "")) latest.set(station, r);
  }
  return [...latest.values()];
}

export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function nearest(airports: Airport[], lat: number, lon: number, maxKm: number): { a: Airport; km: number }[] {
  return airports.map((a) => ({ a, km: distanceKm(a.lat, a.lon, lat, lon) })).filter((x) => x.km <= maxKm).sort((x, y) => x.km - y.km);
}

export function parseIsigmets(data: unknown, airports: Airport[], retrievedAt: string): Advisory[] {
  const out: Advisory[] = [];
  for (const s of arr(data)) {
    const fir = str(s.firId);
    const matched = airports.filter((a) => fir && a.firs.includes(fir));
    if (!matched.length) continue;
    const hazard = str(s.hazard) ?? "SIGMET";
    const qualifier = str(s.qualifier) ?? "";
    const raw = str(s.rawSigmet) ?? "";
    out.push({
      id: `live-sigmet-${fir}-${str(s.seriesId) ?? ""}-${s.validTimeFrom ?? raw.slice(0, 20)}`,
      category: "weather",
      severity: /SEV|TC|VA/i.test(`${qualifier} ${hazard}`) ? "warning" : "advisory",
      title: `SIGMET ${fir}: ${qualifier} ${hazard}`.replace(/\s+/g, " ").trim(),
      summary: raw || `${qualifier} ${hazard} in ${str(s.firName) ?? fir}.`,
      cabinRelevance: "Active SIGMET in a flight information region on this route. Coordinate service timing and cabin securing with the PIC; the flight crew determines operational impact.",
      geography: str(s.firName) ?? fir!,
      airports: matched.map((a) => a.icao),
      source: "NOAA Aviation Weather Center (International SIGMET)",
      sourceUrl: "https://aviationweather.gov/gfa/#sigmet",
      publishedAt: time(s.receiptTime) ?? time(s.validTimeFrom) ?? retrievedAt,
      retrievedAt,
      origin: "live",
    });
  }
  return out;
}

const STATE_LEVEL: Record<string, AdvisorySeverity> = { "1": "info", "2": "advisory", "3": "warning", "4": "critical" };

export function parseStateDept(data: unknown, airports: Airport[], retrievedAt: string): Advisory[] {
  const out: Advisory[] = [];
  const countries = [...new Set(airports.filter((a) => a.countryCode !== "US").map((a) => a.country))];
  for (const item of arr(data)) {
    const title = str(item.Title) ?? str(item.title);
    if (!title) continue;
    const country = countries.find((c) => title.toLowerCase().startsWith(c.toLowerCase()) || (c === "United Kingdom" && /^united kingdom|^uk\b/i.test(title)));
    if (!country) continue;
    const level = title.match(/Level\s+(\d)/i)?.[1] ?? "1";
    const link = str(item.Link) ?? str(item.link) ?? "https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html";
    const summary = (str(item.Summary) ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
    out.push({
      id: `live-state-${country}`,
      category: "security",
      severity: STATE_LEVEL[level] ?? "info",
      title,
      summary: summary ? summary.slice(0, 420) + (summary.length > 420 ? "…" : "") : title,
      cabinRelevance: `Review with the security lead for ground movements in ${country}. Level ${level} of 4. Keep itinerary details confidential.`,
      geography: country,
      airports: airports.filter((a) => a.country === country).map((a) => a.icao),
      source: "U.S. Department of State — Travel Advisories",
      sourceUrl: link,
      publishedAt: time(item.Updated) ?? time(item.Published) ?? retrievedAt,
      retrievedAt,
      origin: "live",
    });
  }
  return out;
}

export function parseUsgs(data: unknown, airports: Airport[], retrievedAt: string): Advisory[] {
  const out: Advisory[] = [];
  for (const f of arr(data)) {
    const p = (f.properties ?? {}) as Json;
    const coords = ((f.geometry as Json | undefined)?.coordinates ?? []) as number[];
    const [lon, lat] = coords;
    if (typeof lat !== "number" || typeof lon !== "number") continue;
    const near = nearest(airports, lat, lon, 500);
    if (!near.length) continue;
    const mag = num(p.mag) ?? 0;
    const alert = str(p.alert);
    out.push({
      id: `live-usgs-${str(f.id as unknown) ?? `${lat},${lon}`}`,
      category: "natural_disaster",
      severity: alert === "red" || alert === "orange" ? "critical" : mag >= 6 ? "warning" : "advisory",
      title: `M${mag.toFixed(1)} earthquake — ${str(p.place) ?? "location unavailable"}`,
      summary: `${str(p.title) ?? "Earthquake"}. Approximately ${Math.round(near[0].km)} km from ${near[0].a.icao}.${alert ? ` PAGER alert: ${alert}.` : ""}`,
      cabinRelevance: "Possible effects on ground infrastructure or aftershocks near an airport on this route. Confirm FBO and ground transport status with the personal assistant and security lead.",
      geography: str(p.place) ?? "",
      airports: near.map((n) => n.a.icao),
      source: "USGS Earthquake Hazards Program",
      sourceUrl: str(p.url) ?? "https://earthquake.usgs.gov/earthquakes/map/",
      publishedAt: time(num(p.time) !== undefined ? num(p.time)! / 1000 : undefined) ?? retrievedAt,
      retrievedAt,
      origin: "live",
    });
  }
  return out;
}

export function parseGdacs(data: unknown, airports: Airport[], retrievedAt: string): Advisory[] {
  const out: Advisory[] = [];
  const TYPES: Record<string, string> = { EQ: "Earthquake", TC: "Tropical cyclone", FL: "Flood", VO: "Volcano", DR: "Drought", WF: "Wildfire" };
  for (const f of arr(data)) {
    const p = (f.properties ?? {}) as Json;
    const coords = ((f.geometry as Json | undefined)?.coordinates ?? []) as number[];
    const [lon, lat] = coords;
    if (typeof lat !== "number" || typeof lon !== "number") continue;
    const near = nearest(airports, lat, lon, 1000);
    if (!near.length) continue;
    const level = (str(p.alertlevel) ?? "").toLowerCase();
    const type = TYPES[str(p.eventtype) ?? ""] ?? "Disaster event";
    const url = (p.url as Json | undefined)?.report;
    out.push({
      id: `live-gdacs-${str(p.eventtype) ?? ""}-${p.eventid ?? `${lat},${lon}`}`,
      category: "natural_disaster",
      severity: level === "red" ? "critical" : level === "orange" ? "warning" : "advisory",
      title: `${type}: ${str(p.name) ?? str(p.description) ?? "GDACS event"}`,
      summary: `${str(p.description) ?? type} · GDACS alert level ${str(p.alertlevel) ?? "unknown"} · ~${Math.round(near[0].km)} km from ${near[0].a.icao}.`,
      cabinRelevance: "Regional disaster alert near this route. Confirm operational impact with the flight crew and ground arrangements with the security lead.",
      geography: str(p.country) ?? "",
      airports: near.map((n) => n.a.icao),
      source: "GDACS — Global Disaster Alert and Coordination System",
      sourceUrl: typeof url === "string" ? url : "https://www.gdacs.org/",
      publishedAt: time(p.fromdate) ?? retrievedAt,
      retrievedAt,
      origin: "live",
    });
  }
  return out;
}

function tag(xml: string, name: string): string | undefined {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim() : undefined;
}

export function parseCdcRss(xml: string, airports: Airport[], retrievedAt: string): Advisory[] {
  const out: Advisory[] = [];
  const countries = [...new Set(airports.map((a) => a.country))];
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  for (const item of items) {
    const title = tag(item, "title");
    if (!title) continue;
    const desc = tag(item, "description") ?? "";
    const text = `${title} ${desc}`;
    const matched = countries.filter((c) => text.toLowerCase().includes(c.toLowerCase()) || (c === "United Kingdom" && /\b(england|uk)\b/i.test(text)));
    const global = /\bglobal\b|worldwide/i.test(title);
    if (!matched.length && !global) continue;
    const level = title.match(/Level\s+(\d)/i)?.[1];
    out.push({
      id: `live-cdc-${(tag(item, "guid") ?? title).slice(0, 80)}`,
      category: "public_health",
      severity: level === "4" ? "critical" : level === "3" ? "warning" : level === "2" ? "advisory" : "info",
      title,
      summary: desc.slice(0, 360) || title,
      cabinRelevance: "Public health notice relevant to a route country. Review hygiene measures and any operator guidance; medical decisions remain with authorized personnel.",
      geography: global ? "Global" : matched.join(", "),
      airports: global ? airports.map((a) => a.icao) : airports.filter((a) => matched.includes(a.country)).map((a) => a.icao),
      source: "CDC Travelers' Health — Travel Notices",
      sourceUrl: tag(item, "link") ?? "https://wwwnc.cdc.gov/travel/notices",
      publishedAt: time(tag(item, "pubDate") ? new Date(tag(item, "pubDate")!).toISOString() : undefined) ?? retrievedAt,
      retrievedAt,
      origin: "live",
    });
  }
  return out;
}
