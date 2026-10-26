import { airport } from "@/data/airports";

export function fmtTime(isoDate: string | undefined, tz?: string): string {
  if (!isoDate) return "—";
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz, hour12: false }).format(new Date(isoDate));
}

export function fmtDate(isoDate: string | undefined, tz?: string): string {
  if (!isoDate) return "—";
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: tz }).format(new Date(isoDate));
}

export function fmtDateTime(isoDate: string | undefined, tz?: string): string {
  if (!isoDate) return "—";
  return `${fmtDate(isoDate, tz)} · ${fmtTime(isoDate, tz)}`;
}

export function fmtUtc(isoDate: string | undefined): string {
  if (!isoDate) return "—";
  const d = new Date(isoDate);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" })} ${String(d.getUTCHours()).padStart(2, "0")}${String(d.getUTCMinutes()).padStart(2, "0")}Z`;
}

/** Local time at the given airport, e.g. "18:30 EDT". */
export function fmtAirportTime(isoDate: string, icao: string): string {
  const a = airport(icao);
  const tz = a?.tz;
  const t = fmtTime(isoDate, tz);
  const zone = (locale: string) => new Intl.DateTimeFormat(locale, { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date(isoDate)).find((p) => p.type === "timeZoneName")?.value;
  // en-US names American zones (EDT); en-GB names European ones (CET, BST).
  const abbr = tz ? [zone("en-US"), zone("en-GB")].find((z) => z && !z.startsWith("GMT")) ?? zone("en-GB") : "";
  return `${t}${abbr ? ` ${abbr}` : ""}`;
}

export function fmtRelative(isoDate: string | undefined, nowMs: number = Date.now()): string {
  if (!isoDate) return "—";
  const diff = new Date(isoDate).getTime() - nowMs;
  const abs = Math.abs(diff);
  const m = Math.round(abs / 60_000);
  let s: string;
  if (m < 1) return "just now";
  if (m < 60) s = `${m}m`;
  else if (m < 48 * 60) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    s = mm && h < 10 ? `${h}h ${mm}m` : `${h}h`;
  } else s = `${Math.round(m / 1440)}d`;
  return diff >= 0 ? `in ${s}` : `${s} ago`;
}

export function fmtDuration(fromIso: string, toIso: string): string {
  const m = Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60_000);
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function uid(prefix: string): string {
  const rnd = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rnd}`;
}
