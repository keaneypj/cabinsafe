import { AIRCRAFT } from "@/data/aircraft";
import { airport } from "@/data/airports";
import { DOCUMENTS } from "@/data/documents";
import { fmtAirportTime, fmtDate, fmtDuration, fmtUtc } from "@/lib/format";
import {
  canSeeMedical,
  crewName,
  equipmentConcerns,
  manifestOf,
  openTasks,
  readinessOf,
  relevantAdvisories,
  STATUS_LABEL,
  type FlightContext,
} from "./context";
import { PIC_CAVEAT } from "./readiness";

const SEV_ORDER = { critical: 0, warning: 1, advisory: 2, info: 3 } as const;

/**
 * Deterministic, record-grounded Flight Safety Briefing.
 * Built entirely from current application state and the approved
 * demonstration document library — no generative text.
 */
export function generateBriefing(ctx: FlightContext): { markdown: string; citations: string[] } {
  const f = ctx.flight;
  const dep = airport(f.departure);
  const dst = airport(f.destination);
  const r = readinessOf(ctx);
  const cites = new Set<string>(["CSI-OPS-001 v1.3 §1", "CSI-OPS-001 v1.3 §2"]);
  const L: string[] = [];
  const medical = canSeeMedical(ctx);

  L.push(`# Cabin Safety Briefing — ${f.callsign}`);
  L.push(`_${AIRCRAFT.verificationNotice}_`);
  L.push("");

  // 1. Flight overview
  L.push("## 1. Flight overview");
  L.push(`- **Route:** ${dep?.name ?? f.departure} (${f.departure}) → ${dst?.name ?? f.destination} (${f.destination})`);
  L.push(`- **Departure:** ${fmtDate(f.departAt, dep?.tz)} ${fmtAirportTime(f.departAt, f.departure)} · ${fmtUtc(f.departAt)}`);
  L.push(`- **Arrival:** ${fmtDate(f.arriveAt, dst?.tz)} ${fmtAirportTime(f.arriveAt, f.destination)} · ${fmtUtc(f.arriveAt)}`);
  L.push(`- **Block time (planned):** ${fmtDuration(f.departAt, f.arriveAt)}`);
  L.push(`- **Alternates:** ${f.alternates.length ? f.alternates.join(", ") : "None recorded"}`);
  L.push(`- **Aircraft:** ${AIRCRAFT.tail} · ${AIRCRAFT.type}`);
  L.push(`- **Passengers:** ${manifestOf(ctx).filter((p) => p.category !== "pet").length} + ${manifestOf(ctx).filter((p) => p.category === "pet").length} animal`);
  L.push("");

  // 2. Crew
  L.push("## 2. Crew assignment");
  L.push(`- **Pilot in Command:** ${crewName(ctx, f.pilotIds[0])}`);
  if (f.pilotIds[1]) L.push(`- **Second in Command:** ${crewName(ctx, f.pilotIds[1])}`);
  L.push(`- **Lead Cabin Attendant:** ${crewName(ctx, f.leadId)}`);
  L.push(`- **Cabin Attendant:** ${crewName(ctx, f.cabinAttendantId)}`);
  L.push(`- **Security:** ${f.securityIds.map((id) => crewName(ctx, id)).join(", ") || "None assigned"}`);
  L.push("");

  // 3. Readiness
  L.push("## 3. Cabin readiness");
  L.push(`- **Operational status:** ${r.headline}`);
  L.push(`- **Readiness index:** ${r.index}/100 · **Task completion:** ${r.taskCompletion.pct}% (${r.taskCompletion.done}/${r.taskCompletion.total})`);
  for (const b of r.blockers) L.push(`- ⛔ ${b.label}`);
  for (const a of r.attention) L.push(`- ⚠️ ${a.label}`);
  L.push(`- _${PIC_CAVEAT}_`);
  L.push("");

  // 4. Accommodations
  L.push("## 4. Passenger accommodations (operational summary)");
  const pax = manifestOf(ctx);
  let anyAcc = false;
  for (const p of pax) {
    const items = p.accommodations.map((a) => `${a.summary}${a.planRef ? ` [${a.planRef}]` : ""}${a.documentation === "pending_confirmation" ? " — *pending confirmation*" : ""}`);
    if (p.dietary.length) items.push(`Dietary: ${p.dietary.join("; ")}`);
    if (!items.length) continue;
    anyAcc = true;
    L.push(`- **${p.alias}** (${p.relationship})`);
    for (const i of items) L.push(`  - ${i}`);
  }
  if (!anyAcc) L.push("- No documented accommodations on this manifest.");
  L.push(medical ? "- _Restricted medical detail is available to the Lead Cabin Attendant in passenger profiles and is intentionally excluded from this briefing._" : "- _Medical details are restricted to the Lead Cabin Attendant._");
  cites.add("CSI-MED-002 v2.0 §1");
  cites.add("CSI-MED-002 v2.0 §4");
  if (pax.some((p) => p.accommodations.some((a) => a.type === "allergy"))) cites.add("CSI-CAT-003 v1.1 §3").add("CSI-MED-002 v2.0 §5");
  if (pax.some((p) => p.category === "pet")) cites.add("CSI-PET-004 v1.0 §2");
  L.push("");

  // 5. Advisories
  L.push("## 5. Weather and destination advisories");
  const advs = relevantAdvisories(ctx).sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  if (ctx.liveWeather?.length) {
    L.push("**Live observations (NOAA Aviation Weather Center):**");
    for (const m of ctx.liveWeather) L.push(`- \`${m.raw}\``);
  } else {
    L.push("- Live METAR/TAF not available in this session — obtain current weather through the flight crew's approved briefing sources.");
  }
  if (ctx.liveTafs?.length) {
    for (const t of ctx.liveTafs) L.push(`- TAF ${t.station}: \`${t.raw}\``);
  }
  if (advs.length === 0) L.push("- No advisories associated with this flight. _Absence of alerts is not evidence of safety._");
  for (const a of advs) {
    L.push(`- **${a.origin === "simulated" ? "[SIMULATED] " : ""}${a.title}** — ${a.severity.toUpperCase()} · ${a.category.replace("_", " ")} · ${a.geography}`);
    L.push(`  - Cabin relevance: ${a.cabinRelevance}`);
    L.push(`  - Source: ${a.source} · published ${fmtUtc(a.publishedAt)} · ${a.acknowledged ? "acknowledged" : "**not yet acknowledged**"}`);
  }
  cites.add("CSI-ADV-006 v1.0 §2");
  L.push("");

  // 6. Equipment
  L.push("## 6. Equipment status and discrepancies");
  const concerns = equipmentConcerns(ctx);
  if (!concerns.length) L.push("- All register items serviceable with no open discrepancies.");
  for (const c of concerns) {
    L.push(`- **${c.e.code}** ${c.e.name} — ${c.status.replace("_", " ")}`);
    for (const d of c.open) L.push(`  - ${d.severity.toUpperCase()} (${d.status}): ${d.title}`);
  }
  const loose = ctx.discrepancies.filter((d) => !d.equipmentId && d.status !== "resolved");
  for (const d of loose) L.push(`- ${d.severity.toUpperCase()} (${d.status}): ${d.title}${d.location ? ` — ${d.location}` : ""}`);
  cites.add("CSI-OPS-001 v1.3 §4");
  L.push("");

  // 7. Outstanding tasks
  L.push("## 7. Outstanding tasks");
  const open = openTasks(ctx).sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));
  if (!open.length) L.push("- None.");
  for (const t of open.slice(0, 25)) {
    L.push(`- [${t.priority.toUpperCase()}] ${t.title} — ${STATUS_LABEL[t.status]} · ${crewName(ctx, t.assigneeId)}${t.dueAt ? ` · due ${fmtUtc(t.dueAt)}` : ""}${t.blockedReason ? ` · blocked: ${t.blockedReason}` : ""}`);
  }
  if (open.length > 25) L.push(`- …and ${open.length - 25} more.`);
  L.push("");

  // 8. Coordination
  L.push("## 8. Items requiring pilot or security coordination");
  const coord = open.filter((t) => t.coordinateWith?.some((c) => c === "pilot" || c === "security"));
  for (const t of coord) L.push(`- **${t.coordinateWith!.filter((c) => c !== "assistant").map((c) => (c === "pilot" ? "PIC" : "Security")).join(" + ")}:** ${t.title}`);
  for (const b of r.blockers) L.push(`- **PIC:** ${b.label} (report per CSI-OPS-001 §4)`);
  for (const a of advs.filter((x) => x.severity === "warning" || x.severity === "critical")) L.push(`- **${a.category === "weather" ? "PIC" : "Security"}:** ${a.origin === "simulated" ? "[SIMULATED] " : ""}${a.title}`);
  const inputs = (ctx.crewInputs ?? []).filter((i) => i.flightId === f.id);
  for (const i of inputs) L.push(`- **Input from ${crewName(ctx, i.fromId)}** (${i.priority}${i.requiresAck ? (i.acks.length ? ", acknowledged" : ", **awaiting acknowledgement**") : ""}): ${i.text}`);
  if (!coord.length && !r.blockers.length && !inputs.length) L.push("- No open coordination items recorded.");
  L.push("");

  // 9. References
  L.push("## 9. Document references");
  for (const c of [...cites].sort()) {
    const [code] = c.split(" ");
    const d = DOCUMENTS.find((x) => x.code === code && x.status === "approved_demo");
    const sec = d?.sections.find((s) => `§${s.id}` === c.split(" ")[2]);
    L.push(`- ${c} — ${d?.title ?? ""}${sec ? `: ${sec.heading}` : ""} _(demonstration document)_`);
  }
  L.push("- OEM-G700-CABIN — Aircraft-specific cabin emergency procedures: **required, not loaded**. Approved aircraft-specific documentation is required for emergency procedures.");
  L.push("");

  // 10. Timestamp
  L.push("## 10. Briefing generated");
  L.push(`- ${new Date(ctx.nowMs).toISOString().replace("T", " ").slice(0, 16)}Z by CabinSafe (deterministic generator from current records)`);
  L.push(`- This briefing supports, and does not replace, the PIC's crew briefing. It does not authorize departure.`);

  return { markdown: L.join("\n"), citations: [...cites] };
}
