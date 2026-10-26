import { AIRCRAFT } from "@/data/aircraft";
import { fmtRelative, fmtUtc } from "@/lib/format";
import { generateBriefing } from "./briefing";
import {
  canSeeMedical,
  crewName,
  equipmentConcerns,
  flightTasks,
  manifestOf,
  openTasks,
  readinessOf,
  relevantAdvisories,
  STATUS_LABEL,
  type FlightContext,
} from "./context";
import { computePreboarding, PREBOARD_CAVEAT } from "./preboarding";
import { PIC_CAVEAT, effectiveEquipmentStatus, isOpenTask } from "./readiness";
import { citationLabel, retrieve, type Passage } from "./retrieval";

export const NO_SOURCE_MESSAGE = "Approved aircraft-specific documentation is required to answer this question.";

export type CopilotKind =
  | "briefing"
  | "handover"
  | "preboarding"
  | "incomplete"
  | "equipment"
  | "passengers"
  | "advisories"
  | "readiness"
  | "authorization_refusal"
  | "medical_refusal"
  | "aircraft_specific"
  | "document"
  | "no_source";

export interface CopilotAnswer {
  kind: CopilotKind;
  markdown: string;
  citations: Passage[];
  records: string[];
}

export const SUGGESTED_PROMPTS = [
  "What is still incomplete for this flight?",
  "Summarize equipment discrepancies",
  "Review passenger accommodations",
  "Summarize relevant advisories",
  "How do we control peanut cross-contact?",
  "Prepare a crew handover summary",
  "What's left before boarding?",
  "Where is the AED and is it inspected?",
  "What is the evacuation procedure?",
];

const AIRCRAFT_SPECIFIC = /\b(evacuat\w*|ditch\w*|emergency exits?|exit doors?|slides?|decompress\w*|brace|oxygen masks?|mask deploy\w*|fire[- ]?fight\w*|smoke removal|emergency procedures?|emergency landing|door operation|arming|disarm\w*|life ?rafts?|life ?vests?|emergency equipment locations?|emergency lighting)\b/i;
const AUTHORIZE = /\b(cleared|authori[sz]\w*|go\/?no[- ]?go|can we (depart|leave|go|take ?off)|ok to (depart|go)|safe to (fly|depart)|approve (departure|the flight)|dispatch)\b/i;
const MEDICAL = /\b(diagnos\w*|treat\w*|medication|medicine|dose|dosage|prescri\w*|what (should|do) (i|we) give|administer|inhaler|epinephrine|epipen|nebuli[sz]er|symptom\w*)\b/i;

function cite(passages: Passage[]): string {
  return passages.map((p) => `[${citationLabel(p)}]`).join(" ");
}

export function answer(question: string, ctx: FlightContext): CopilotAnswer {
  const q = question.trim();
  const f = ctx.flight;

  if (AUTHORIZE.test(q)) {
    const r = readinessOf(ctx);
    const passages = retrieve("authority pilot in command departure readiness status", 2, 0);
    return {
      kind: "authorization_refusal",
      markdown: `CabinSafe cannot authorize departure or make go/no-go decisions. Departure authority rests solely with the Pilot in Command. ${cite(passages)}\n\nFor information, the cabin team's current preparation status for **${f.callsign}** is **${r.headline}** (readiness index ${r.index}/100, task completion ${r.taskCompletion.pct}%). Report this to ${crewName(ctx, f.pilotIds[0])} during the crew briefing.`,
      citations: passages,
      records: ["readiness"],
    };
  }

  if (MEDICAL.test(q) && !/allerg\w* (control|cross|catering)|cross-contact/i.test(q)) {
    const passages = retrieve("in-flight medical event telemedical provider notify pilot in command diagnose treatment", 2, 0);
    return {
      kind: "medical_refusal",
      markdown: `I can't provide diagnoses, treatment or medication guidance. Cabin crew act only on documented accommodation records and the operator's approved first-aid procedures within their training. In any in-flight medical event: notify the Pilot in Command and contact the contracted telemedical provider using the approved method, then follow the provider's guidance. ${cite(passages)}`,
      citations: passages,
      records: [],
    };
  }

  if (AIRCRAFT_SPECIFIC.test(q)) {
    return {
      kind: "aircraft_specific",
      markdown: `${NO_SOURCE_MESSAGE}\n\nAircraft-specific emergency procedures (exits, evacuation, decompression, fire-fighting, emergency equipment locations) must come from operator-approved documentation, which is listed in the library as **OEM-G700-CABIN — Required, not loaded**. The cabin map shows a conceptual layout only (${AIRCRAFT.verificationNotice})`,
      citations: [],
      records: [],
    };
  }

  if (/\b(brief(ing)?)\b/i.test(q) && /\b(generate|create|prepare|build|write|safety|flight)\b/i.test(q) && !/handover/i.test(q)) {
    const b = generateBriefing(ctx);
    return { kind: "briefing", markdown: b.markdown, citations: [], records: ["flight", "tasks", "equipment", "passengers", "advisories"] };
  }

  if (/handover|hand-over|hand over|shift change/i.test(q)) return handoverSummary(ctx);

  if (/pre-?board\w*|before boarding|boarding check|ready (for|to) board/i.test(q)) return preboardSummary(ctx);

  if (/\b(aed|defib\w*|extinguisher|first[- ]aid|medical kit|kit|flashlight|torch|oxygen|pbe|equipment|discrepanc\w*|inspect\w*|defect\w*)\b/i.test(q)) {
    return equipmentSummary(q, ctx);
  }

  if (/\b(passenger|manifest|accommodat\w*|mobility|dietary|diet|pet|dog|vizsla|guest|family|wheelchair|boarding assistance)\b/i.test(q) || (/allerg/i.test(q) && !/(control|cross|catering|procedure|how)/i.test(q))) {
    return passengerSummary(ctx);
  }

  if (/\b(weather|metar|taf|advisor\w*|alert\w*|security|unrest|protest|demonstration|turbulence|wind|risk|earthquake|disaster|health notice|sigmet)\b/i.test(q)) {
    return advisorySummary(ctx);
  }

  if (/\b(incomplete|outstanding|open items?|remaining|left to do|not (yet )?(done|complete)|to-?do|tasks?|checklist|overdue|blocked)\b/i.test(q)) {
    return incompleteSummary(ctx);
  }

  if (/\b(ready|readiness|status|score|prepared)\b/i.test(q)) {
    const r = readinessOf(ctx);
    const lines = [
      `**${f.callsign} — ${r.headline}**`,
      `- Readiness index: **${r.index}/100**`,
      `- Task completion: **${r.taskCompletion.pct}%** (${r.taskCompletion.done}/${r.taskCompletion.total}) — a separate measure from operational readiness.`,
      ...r.components.map((c) => `- ${c.label}: ${Math.round(c.score * 100)}% (${c.detail})`),
      ...r.blockers.map((b) => `- ⛔ ${b.label}`),
      ...r.attention.map((b) => `- ⚠️ ${b.label}`),
      "",
      `_${PIC_CAVEAT}_`,
    ];
    const passages = retrieve("readiness status definitions task completion operational readiness", 1, 0);
    return { kind: "readiness", markdown: `${lines.join("\n")} ${cite(passages)}`, citations: passages, records: ["readiness"] };
  }

  // Document retrieval
  const passages = retrieve(q, 3);
  if (!passages.length) {
    return { kind: "no_source", markdown: NO_SOURCE_MESSAGE, citations: [], records: [] };
  }
  const lines = [`From the approved demonstration library:`, ""];
  for (const p of passages) lines.push(`**${p.heading}** — ${p.body} [${citationLabel(p)}]`, "");
  lines.push("_Demonstration documents describe program practices only. Aircraft-specific procedures require approved operator documentation._");
  return { kind: "document", markdown: lines.join("\n"), citations: passages, records: [] };
}

function incompleteSummary(ctx: FlightContext): CopilotAnswer {
  const open = openTasks(ctx);
  const f = ctx.flight;
  if (!open.length) return { kind: "incomplete", markdown: `All preflight items for **${f.callsign}** are completed or marked N/A.`, citations: [], records: ["tasks"] };
  const byPri = (p: string) => open.filter((t) => t.priority === p);
  const fmt = (t: (typeof open)[number]) =>
    `- ${t.title} — ${STATUS_LABEL[t.status]} · ${crewName(ctx, t.assigneeId)}${t.dueAt ? ` · due ${fmtRelative(t.dueAt, ctx.nowMs)}` : ""}${t.blockedReason ? ` · _${t.blockedReason}_` : ""}`;
  const lines = [`**${open.length} open preflight item${open.length > 1 ? "s" : ""}** for ${f.callsign} (${f.departure}→${f.destination}):`, ""];
  for (const p of ["critical", "high", "normal"]) {
    const list = byPri(p);
    if (!list.length) continue;
    lines.push(`**${p[0].toUpperCase() + p.slice(1)} (${list.length})**`, ...list.map(fmt), "");
  }
  const blocked = open.filter((t) => t.status === "blocked");
  if (blocked.length) lines.push(`⚠️ ${blocked.length} item(s) blocked — review with the responsible party.`);
  return { kind: "incomplete", markdown: lines.join("\n"), citations: retrieve("preflight inspection standard checklist blocked not applicable reason", 1, 0), records: ["tasks"] };
}

function equipmentSummary(q: string, ctx: FlightContext): CopilotAnswer {
  const named = ctx.equipment.filter((e) => new RegExp(`\\b(${e.code.replace("-", "-?")}|${e.category === "aed" ? "aed|defib\\w*" : "$^"})\\b`, "i").test(q));
  const lines: string[] = [];
  if (named.length) {
    for (const e of named) {
      const s = effectiveEquipmentStatus(e, ctx.nowMs);
      const last = e.history[0];
      lines.push(
        `**${e.code} · ${e.name}**`,
        `- Conceptual zone: ${AIRCRAFT.zones.find((z) => z.id === e.zone)?.name ?? e.zone} — _Demonstration — Aircraft Verification Required_`,
        `- Status: **${s.replace("_", " ")}**`,
        `- Last inspection: ${last ? `${fmtUtc(last.at)} by ${crewName(ctx, last.byId)} (${last.result.replace(/_/g, " ")})` : "none recorded"}`,
        `- Next due: ${fmtUtc(e.nextInspectionDue)} (${fmtRelative(e.nextInspectionDue, ctx.nowMs)})`,
        e.expiresAt ? `- Expiry: ${fmtUtc(e.expiresAt)}` : "",
        "",
      );
    }
  }
  const concerns = equipmentConcerns(ctx);
  lines.push(`**Equipment requiring attention (${concerns.length}):**`);
  if (!concerns.length) lines.push("- None — all register items serviceable.");
  for (const c of concerns) {
    lines.push(`- **${c.e.code}** ${c.e.name} — ${c.status.replace("_", " ")}${c.e.critical ? " · critical item" : ""}`);
    for (const d of c.open) lines.push(`  - ${d.severity.toUpperCase()} · ${d.status} · ${d.title}`);
  }
  const loose = ctx.discrepancies.filter((d) => !d.equipmentId && d.status !== "resolved");
  if (loose.length) {
    lines.push("", "**Other cabin discrepancies:**");
    for (const d of loose) lines.push(`- ${d.severity.toUpperCase()} · ${d.status} · ${d.title}`);
  }
  const passages = retrieve("discrepancy reporting critical major minor AED medical equipment readiness checks", 2, 0);
  lines.push("", cite(passages));
  return { kind: "equipment", markdown: lines.filter((l) => l !== "").join("\n").replace(/\n\*\*/g, "\n\n**"), citations: passages, records: ["equipment", "discrepancies"] };
}

function passengerSummary(ctx: FlightContext): CopilotAnswer {
  const pax = manifestOf(ctx);
  const medical = canSeeMedical(ctx);
  const lines = [`**Manifest for ${ctx.flight.callsign}: ${pax.length} (aliases only)**`, ""];
  for (const p of pax) {
    const acc = p.accommodations.map((a) => `${a.summary}${a.planRef ? ` [${a.planRef}]` : ""}${a.documentation === "pending_confirmation" ? " _(pending confirmation)_" : ""}`);
    lines.push(`**${p.alias}** — ${p.relationship}`);
    if (acc.length) for (const a of acc) lines.push(`- ${a}`);
    if (p.dietary.length) lines.push(`- Dietary: ${p.dietary.join("; ")}`);
    if (!acc.length && !p.dietary.length) lines.push("- No documented accommodations.");
    if (medical && p.restrictedMedical) lines.push(`- 🔒 Restricted (Lead CA): ${p.restrictedMedical}`);
    const gen = flightTasks(ctx).filter((t) => t.passengerId === p.id && t.status !== "not_applicable");
    if (gen.length) lines.push(`- Preparation tasks: ${gen.filter((t) => t.status === "completed").length}/${gen.length} complete`);
    lines.push("");
  }
  if (!medical) lines.push("_Medical details are restricted to the Lead Cabin Attendant._");
  const passages = retrieve("documented accommodation record crew do not diagnose confidentiality medical information restricted", 2, 0);
  lines.push(cite(passages));
  return { kind: "passengers", markdown: lines.join("\n"), citations: passages, records: ["passengers"] };
}

function advisorySummary(ctx: FlightContext): CopilotAnswer {
  const advs = relevantAdvisories(ctx);
  const lines: string[] = [`**Advisories associated with ${ctx.flight.callsign}** (${[ctx.flight.departure, ctx.flight.destination, ...ctx.flight.alternates].join(", ")}):`, ""];
  if (ctx.liveWeather?.length) {
    lines.push("**Live METAR (NOAA AWC):**", ...ctx.liveWeather.map((m) => `- \`${m.raw}\``), "");
  } else {
    lines.push("_Live weather is not loaded in this session. Open Risk Intelligence to retrieve current METAR/TAF, or obtain weather through the flight crew's approved sources._", "");
  }
  if (!advs.length) lines.push("No advisories on record. _Absence of alerts is not evidence of safety._");
  for (const a of advs) {
    lines.push(
      `**${a.origin === "simulated" ? "[SIMULATED] " : ""}${a.title}**`,
      `- ${a.severity.toUpperCase()} · ${a.category.replace("_", " ")} · ${a.geography}`,
      `- Why it matters: ${a.cabinRelevance}`,
      `- Source: ${a.source} · published ${fmtUtc(a.publishedAt)} · retrieved ${fmtUtc(a.retrievedAt)}`,
      `- ${a.acknowledged ? "✓ Acknowledged" : "Not yet acknowledged"}`,
      "",
    );
  }
  const passages = retrieve("advisory review acknowledgement cabin actions go no-go absence alerts", 2, 0);
  lines.push(cite(passages));
  return { kind: "advisories", markdown: lines.join("\n"), citations: passages, records: ["advisories"] };
}

function preboardSummary(ctx: FlightContext): CopilotAnswer {
  const v = computePreboarding({ ...ctx, inputs: ctx.crewInputs ?? [], signoffs: ctx.preboardSignoffs ?? [] });
  const lines = [
    `**Pre-boarding — ${ctx.flight.callsign}** · boarding ${fmtUtc(v.boardingAt)} (${fmtRelative(v.boardingAt, ctx.nowMs)})`,
    `- Progress: **${v.progress.pct}%** (${v.progress.done}/${v.progress.total} checks and acknowledgements)`,
    v.signoff ? `- ✓ Confirmed by ${crewName(ctx, v.signoff.byId)} at ${fmtUtc(v.signoff.at)}` : `- Not yet confirmed${v.signoffBlockers.length ? `: ${v.signoffBlockers.join("; ")}` : " — ready for the cabin attendant's confirmation"}`,
    "",
    `**Crew inputs awaiting acknowledgement (${v.pendingAcks.length}):**`,
    ...(v.pendingAcks.length ? v.pendingAcks.map((i) => `- ${crewName(ctx, i.fromId)} (${i.priority}): ${i.text}`) : ["- None"]),
    "",
    `**Needs attention (${v.attention.length}):**`,
    ...(v.attention.length ? v.attention.slice(0, 10).map((a) => `- ${a.label}${a.detail ? ` — ${a.detail}` : ""}`) : ["- None"]),
    "",
    `**Open pre-boarding checks (${v.checks.filter(isOpenTask).length}):**`,
    ...v.checks.filter(isOpenTask).map((t) => `- ${t.title}`),
    "",
    `_${PREBOARD_CAVEAT}_`,
  ];
  return { kind: "preboarding", markdown: lines.join("\n"), citations: retrieve("preflight inspection standard readiness status pilot in command", 1, 0), records: ["tasks", "inputs"] };
}

export function handoverSummary(ctx: FlightContext): CopilotAnswer {
  const open = openTasks(ctx);
  const r = readinessOf(ctx);
  const concerns = equipmentConcerns(ctx);
  const pax = manifestOf(ctx).filter((p) => p.accommodations.length);
  const pending = ctx.handovers.filter((h) => h.flightId === ctx.flight.id && h.status !== "accepted");
  const lines = [
    `**Crew handover summary — ${ctx.flight.callsign}**`,
    "",
    `- Status: ${r.headline} · index ${r.index}/100 · tasks ${r.taskCompletion.pct}%`,
    `- Cabin attendant: ${crewName(ctx, ctx.flight.cabinAttendantId)}`,
    "",
    `**Open safety items (${open.filter((t) => t.priority !== "normal").length} critical/high):**`,
    ...open.filter((t) => t.priority !== "normal").slice(0, 12).map((t) => `- ${t.title} — ${STATUS_LABEL[t.status]} · ${crewName(ctx, t.assigneeId)}`),
    "",
    "**Equipment status:**",
    ...(concerns.length ? concerns.map((c) => `- ${c.e.code}: ${c.status.replace("_", " ")}${c.open.length ? ` · ${c.open.map((d) => d.title).join("; ")}` : ""}`) : ["- All serviceable"]),
    "",
    "**Passenger accommodations (operational summary):**",
    ...pax.map((p) => `- ${p.alias}: ${p.accommodations.map((a) => a.summary).join(" ")}`),
    "",
    pending.length ? `**Pending handovers:** ${pending.map((h) => `${crewName(ctx, h.outgoingId)} → ${crewName(ctx, h.incomingId)} (${h.acknowledgements.filter((a) => a.ackedAt).length}/${h.acknowledgements.length} acknowledged)`).join("; ")}` : "No pending handovers for this flight.",
  ];
  const passages = retrieve("handover content acceptance acknowledgement open safety items", 2, 0);
  lines.push("", cite(passages));
  return { kind: "handover", markdown: lines.join("\n"), citations: passages, records: ["tasks", "equipment", "handovers"] };
}

/** Compact, role-filtered record digest sent to the live AI service as grounding context. */
export function contextDigest(ctx: FlightContext): string {
  const r = readinessOf(ctx);
  const medical = canSeeMedical(ctx);
  const out = {
    flight: { callsign: ctx.flight.callsign, route: `${ctx.flight.departure}-${ctx.flight.destination}`, alternates: ctx.flight.alternates, departUtc: ctx.flight.departAt, arriveUtc: ctx.flight.arriveAt, pic: crewName(ctx, ctx.flight.pilotIds[0]), lead: crewName(ctx, ctx.flight.leadId), cabinAttendant: crewName(ctx, ctx.flight.cabinAttendantId) },
    readiness: { status: r.headline, index: r.index, taskCompletionPct: r.taskCompletion.pct, blockers: r.blockers.map((b) => b.label), attention: r.attention.map((a) => a.label) },
    openTasks: openTasks(ctx).map((t) => ({ title: t.title, priority: t.priority, status: t.status, assignee: crewName(ctx, t.assigneeId), due: t.dueAt, blocked: t.blockedReason })),
    equipmentConcerns: equipmentConcerns(ctx).map((c) => ({ code: c.e.code, name: c.e.name, status: c.status, discrepancies: c.open.map((d) => `${d.severity}: ${d.title}`) })),
    passengers: manifestOf(ctx).map((p) => ({ alias: p.alias, relationship: p.relationship, accommodations: p.accommodations.map((a) => a.summary), dietary: p.dietary, ...(medical && p.restrictedMedical ? { restrictedMedical: p.restrictedMedical } : {}) })),
    advisories: relevantAdvisories(ctx).map((a) => ({ title: a.title, origin: a.origin, severity: a.severity, category: a.category, cabinRelevance: a.cabinRelevance, source: a.source, acknowledged: a.acknowledged })),
    liveMetar: ctx.liveWeather?.map((m) => m.raw) ?? [],
    crewInputs: (ctx.crewInputs ?? []).filter((i) => i.flightId === ctx.flight.id).map((i) => ({ from: crewName(ctx, i.fromId), role: i.fromRole, priority: i.priority, text: i.text, acknowledged: i.acks.length > 0 })),
    role: ctx.role,
    medicalAccess: medical,
  };
  return JSON.stringify(out);
}
