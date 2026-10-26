import { Card, PageTitle } from "@/components/ui";

export const metadata = { title: "About & Limitations" };

const FUNCTIONAL = [
  "Flight creation and editing with template-generated preflight checklists",
  "Checklist workflow: Not Started, In Progress, Completed, Blocked (reason), Not Applicable (reason), notes, assignee, due time, sign-off, history",
  "Readiness model separating task completion from operational readiness; critical blockers prevent a 'Cabin Prepared' status",
  "Rules-based passenger preparation task generation with Lead CA review",
  "Interactive conceptual cabin map, equipment records, inspections, discrepancies and inspection history",
  "Advisory acknowledgement and conversion into preparation tasks",
  "Deterministic flight safety briefing (10 sections) with copy and export",
  "Crew assignment, task assignment, structured handovers with acknowledgements and acceptance",
  "Audit history for checklist, equipment, task, handover and record changes",
  "Guided demonstration, Demo Role Preview and Reset Demo",
  "Persistence across reloads on this device; installable PWA with offline shell",
];
const SIMULATED = [
  "Bise wind, Geneva demonstration and UK health advisories (always labelled SIMULATED)",
  "Aircraft configuration, equipment positions and inspection intervals (Demonstration — Aircraft Verification Required)",
  "All people, aliases, health information, flights and documents (synthetic)",
  "Safety Copilot in demonstration mode: deterministic assistant over real application records, not a language model",
  "Role permissions: client-side Demo Role Preview, not security enforcement",
];
const AWAITING = [
  "Live AI answers: set ANTHROPIC_API_KEY on the server (Claude via the official Anthropic SDK)",
  "Live official feeds (NOAA AWC, U.S. State Dept, USGS, GDACS, CDC) are integrated server-side and show an explicit unavailable state when unreachable; verify on deployment",
  "Hosted database and authentication: Supabase schema and RLS policies provided; client still uses device storage",
  "Operator-approved aircraft documentation (OEM-G700-CABIN) for emergency procedures",
  "Security review, penetration testing and data-protection assessment before any real data",
];

export default function AboutPage() {
  const List = ({ title, items, tone }: { title: string; items: string[]; tone: string }) => (
    <Card>
      <h2 className={`font-semibold mb-2 ${tone}`}>{title}</h2>
      <ul className="space-y-1.5 text-sm text-slate list-disc pl-5">{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </Card>
  );
  return (
    <div className="space-y-4">
      <PageTitle eyebrow="CabinSafe Intelligence" title="About & Limitations" subtitle="Quiet excellence. Absolute discretion. Anticipatory safety." />
      <Card>
        <p className="text-sm text-slate leading-relaxed">CabinSafe Intelligence is a demonstration prototype of a private aviation cabin safety command center. It supports cabin preparation and documentation. It never issues dispatch authorization, makes go/no-go decisions, provides medical advice or replaces the authority of the Pilot in Command or approved operator procedures.</p>
      </Card>
      <List title="Fully functional" items={FUNCTIONAL} tone="text-ok" />
      <List title="Simulated or demonstration-only" items={SIMULATED} tone="text-sim" />
      <List title="Awaiting external integration" items={AWAITING} tone="text-warn" />
      <p className="text-[0.6875rem] text-slate-500">Gulfstream and G700 are trademarks of Gulfstream Aerospace Corporation. This project is not affiliated with, sponsored or endorsed by Gulfstream.</p>
    </div>
  );
}
