# CabinSafe Intelligence

**A premium, mobile-first private aviation cabin safety command center** — built as an interview demonstration for the role of Lead Cabin Attendant aboard a privately owned 2026 Gulfstream G700.

> *Quiet excellence. Absolute discretion. Anticipatory safety.*

CabinSafe is a working Progressive Web App, not a mockup. It brings together six integrated modules:

| Module | What it does |
|---|---|
| **Pre-Boarding Checklist** (primary — *Boarding* tab) | The cabin attendant's single pre-boarding workspace for each flight. It shows: crew inputs from the Lead CA, pilots and the Principal's PA (acknowledgement can be required); outstanding items needing attention (critical blockers, blocked, overdue and critical items, equipment, unreviewed advisories); eight one-tap pre-boarding checks; and passenger-specific preparation. A time-stamped **Confirm pre-boarding complete** sign-off is enabled only when every check is done, every required input is acknowledged and no critical blocker remains. It confirms cabin preparation only; boarding and departure stay with the PIC. |
| **Global Risk Intelligence** | METAR/TAF/SIGMET from NOAA Aviation Weather Center, U.S. State Department travel advisories, USGS earthquakes, GDACS disaster alerts and CDC travel health notices, retrieved server-side per flight. Clearly labelled simulated scenarios. Acknowledge any advisory and turn it into a cabin preparation task. |
| **Flight & Cabin Readiness** | Flights, preflight/postflight checklists (Not Started / In Progress / Completed / Blocked / Not Applicable with reason), assignees, due times, notes, sign-off and history. A readiness index that is deliberately separate from task completion; unresolved critical blockers prevent a "Cabin Prepared" status. |
| **Passenger Safety Profiles** | Eight fictional profiles (aliases, synthetic health data, a Vizsla). A rules engine turns documented accommodations into preparation, verification or confirmation tasks — never treatment. Medical detail is restricted by role. |
| **Interactive G700 Cabin Map** | A custom SVG of a conceptual five-zone cabin with selectable equipment markers, inspection workflow, discrepancies, history and linked documents. Inspections update readiness live. |
| **AI Safety Copilot** | Retrieval over a versioned demonstration document library plus current flight records, with citations and hard guardrails. A one-tap ten-section **Flight Safety Briefing** with copy/export/print. Live Claude answers when `ANTHROPIC_API_KEY` is set; otherwise a clearly labelled deterministic assistant. |
| **Crew Coordination & Handovers** | Cabin attendant assignment, task assignment and queues, acknowledgements, structured handovers with acceptance, and a time-stamped audit history. **Demo Role Preview** for switching perspectives. |

The mobile navigation is **Home · Flights · Boarding · Cabin · Copilot · More**. The pre-boarding checklist is also the top card on Home: cabin attendants see their own next flight, everyone else sees the next departure.

A built-in guided demonstration — **Experience CabinSafe** — walks a recruiter through the whole story in about five minutes. See [docs/RECRUITER_WALKTHROUGH.md](docs/RECRUITER_WALKTHROUGH.md).

> All people, aliases, health information, flights and documents are fictional. Aircraft-specific information is labelled **Demonstration — Aircraft Verification Required**. The app never authorizes departure, makes go/no-go decisions, gives medical advice or replaces the Pilot in Command. Not affiliated with or endorsed by Gulfstream Aerospace.

---

## Quick start

```bash
npm install
npm run dev            # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

Requires Node.js 20+. No environment variables are required for the demonstration.

| Script | Purpose |
|---|---|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | Strict TypeScript check (`tsc --noEmit`) |
| `npm test` | Unit tests (Vitest) — domain rules, readiness, Copilot guardrails, briefing, feed parsers |
| `npm run test:e2e` | End-to-end mobile workflow tests (Playwright) against a running server (`BASE_URL`, default `http://localhost:3000`) |
| `npm run icons` | Regenerate PWA icons from the shield-and-aircraft mark |

---

## Architecture

```
src/
  app/                    Next.js App Router pages (mobile-first) and API routes
    api/intel/route.ts    Server-side retrieval of official public feeds (no keys)
    api/copilot/route.ts  Server-side Claude call (key never reaches the browser)
  domain/                 Framework-free business logic (unit tested)
    types.ts              Domain model
    readiness.ts          Readiness index vs. task completion; blockers
    rules.ts              Passenger accommodation → preparation task rules
    checklists.ts         Preflight/postflight templates
    briefing.ts           Deterministic ten-section safety briefing
    copilot.ts            Guardrails, intent routing, record-grounded answers
    retrieval.ts          BM25 retrieval over approved documents only
    permissions.ts        Demo Role Preview permission matrix
  data/                   Synthetic seed (dates relative to "now"), aircraft, airports, documents
  store/                  Zustand store: audited, permission-checked actions + persistence
  components/             Design system, cabin map, sheets, coach, etc.
  lib/                    Formatting, feed fetchers and defensive parsers
supabase/schema.sql       Production schema with row-level security and append-only audit
public/sw.js              Service worker (static assets only; never caches /api)
e2e/run.mjs               Playwright mobile workflow suite
```

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Zustand · lucide-react · Anthropic TypeScript SDK · Vitest · Playwright.

### Integration points (how the six modules connect)

- Adding a passenger to a manifest runs the rules engine and creates reviewable preparation tasks (audited).
- Recording an equipment inspection updates the equipment record, auto-completes linked checklist items (e.g. AED-01 → "AED readiness inspection") and changes the readiness index.
- Acknowledging an advisory can create a preparation task that carries the advisory's cabin relevance and source.
- The Copilot and briefing read the same live state the dashboard does.
- Assigning a task to a contract attendant places it in their queue; handover acceptance is time-stamped in the audit history.
- Pre-boarding draws together the readiness blockers, open tasks, equipment, advisories and passenger rules for the cabin attendant. Crew inputs also appear in the safety briefing (section 8), and the Copilot answers "What's left before boarding?".

### Data persistence

Supabase credentials were not available while this was built, so the demonstration uses a **local persistence layer**: the Zustand store is persisted to `localStorage` on the device and survives reloads. **Reset Demo** restores the seed with dates regenerated relative to now, so the scenario never goes stale.

**To enable the hosted database:**
1. Create a Supabase project and apply [`supabase/schema.sql`](supabase/schema.sql).
2. Enable Supabase Auth and link each `crew_members.auth_user_id` to an account.
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the server-only `SUPABASE_SERVICE_ROLE_KEY`.
4. Replace the store's local persistence with server actions or Supabase queries. Store actions are already shaped as single, audited operations to make this direct. *This step has not been implemented yet.*

### Security model — honest status

- **Demo Role Preview is not security.** Role checks in the browser only show what each role would see. Production enforcement belongs on the server: `schema.sql` provides RLS policies, including a Lead-CA-only `passenger_restricted` table and an append-only, trigger-written audit log. **The schema has not been applied or tested against a live project.**
- Secrets are read only in server route handlers (`ANTHROPIC_API_KEY`). Nothing secret is bundled into client code.
- The live Copilot receives a role-filtered digest built in the browser. In production the server should load records itself under the authenticated user's permissions.
- The service worker caches only static assets and visited page shells — never `/api/*` responses. Demonstration records (synthetic) live in `localStorage`; real data would require server-side storage and session-scoped access.
- Security headers (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`) are set in `next.config.ts`. A best-effort rate limiter protects the Copilot endpoint.
- **This prototype is not production-secure** and has not had a security review.

### Live intelligence

`/api/intel` calls NOAA AWC (`/api/data/metar`, `/taf`, `/isigmet`), `cadataapi.state.gov`, the USGS GeoJSON feed, the GDACS event API and the CDC RSS feed. Each source:
- has a 9-second timeout and 10-minute revalidation;
- reports `ok` / `unavailable` / `error` independently, with its retrieval time;
- is parsed defensively, so malformed entries are skipped, never guessed.

The UI shows stale-data warnings after 60 minutes and states that **absence of alerts is not evidence of safety**. Live alerts are never fabricated. The seeded advisories are the only simulated ones, and they are always badged **SIMULATED**.

> In the build environment, outbound access to these hosts was blocked. The integration was verified for its **unavailable** path and against fixture data shaped like the documented formats (`src/lib/feedParsers.test.ts`). Confirm live retrieval after deploying.

### AI Safety Copilot

- **Guardrails run first, deterministically, even in live mode.** Aircraft-specific emergency procedures return *"Approved aircraft-specific documentation is required to answer this question."* Medical treatment and departure-authorization questions are declined with cited escalation guidance. Briefings are always generated deterministically from records.
- **Retrieval:** BM25 over the approved demonstration library only. Superseded and not-loaded documents are excluded, and every procedural answer carries citations such as `[CSI-CAT-003 v1.1 §3]`.
- **Live mode** (`ANTHROPIC_API_KEY` set): `claude-opus-5-5` via `@anthropic-ai/sdk`, effort `medium`, with server-side refusal fallbacks enabled (`fallbacks: "default"`) and `stop_reason: "refusal"` handling. Override the model with `COPILOT_MODEL`.
- **Demo mode** (no key): a rules-based assistant over the real application records, labelled **"Demonstration Assistant · deterministic · not live AI"** on every answer.

### PWA

Web app manifest (`/manifest.webmanifest`), maskable and Apple touch icons, standalone display, theme colour, safe-area insets, an offline banner and `public/offline.html`. Add it to the home screen from Safari's Share menu or Chrome's install prompt. Live data and AI need a connection and are not available offline.

---

## Testing — what actually ran

Run in this repository's build environment (Chromium via Playwright, iPhone 14 Pro emulation, production build):

- **Unit tests:** 30 passing (`npm test`) — seed integrity, relative dates, readiness blocking rules, rules engine, no-duplicate generation, Copilot refusals, citations, role filtering, briefing sections, superseded-document exclusion, feed parsers.
- **End-to-end:** 25 passing (`npm run test:e2e`) — the 15 required workflows plus validation, role restriction, the pre-boarding flow (PA sends an input; cabin attendant acknowledges, completes checks and confirms), the full guided demo, PWA assets and console errors:
  1. create and edit a flight · 2. complete a checklist item (and N/A reason validation) · 3. add a passenger · 4. rule-generated tasks and Lead review · 5. open an equipment marker · 6. complete an inspection · 7. readiness updates · 8. live-feed status / simulated advisory acknowledgement · 9. briefing and Copilot citations and guardrails · 10. assign a crew task · 11. switch role and accept a handover · 12. audit trail · 13. reset · 14. reload persistence · 15. no horizontal overflow on 22 mobile screens.

Not tested: real iOS Safari / Android hardware, live external feeds (blocked in the build sandbox) and the live Claude path (no key available).

---

## Deploying to Vercel

1. Push this repository to GitHub (already done if you're reading this there).
2. In Vercel: **Add New → Project → Import** `cabinsafe`. The framework preset is detected as **Next.js**, and the default build settings work.
3. Optional environment variables (Project → Settings → Environment Variables): `ANTHROPIC_API_KEY` (enables live Copilot) and `COPILOT_MODEL`.
4. Deploy. Vercel serves over HTTPS, which the service worker and Add to Home Screen require.
5. After deploying, open **Risk Intelligence** and confirm the sources show **OK**. If a feed host blocks Vercel's egress, the app shows it as unavailable rather than failing.
6. Share the production URL. For a recruiter, the home screen's **Experience CabinSafe** card is the entry point.

CLI alternative: `npm i -g vercel && vercel --prod`.

*No deployment was made from the build environment (Vercel's API was not reachable), so no live URL is claimed here.*

---

## Status summary

**Fully functional:** flights (create/edit), checklists with every status, sign-off, notes and history; readiness model; rules engine and Lead review; manifest management; cabin map, inspections and discrepancies; advisory acknowledgement and tasks; deterministic briefing with export; Copilot retrieval and guardrails; crew assignment, queues, handovers and acceptance; audit history; guided demo; role preview; reset; on-device persistence; installable PWA.

**Simulated / demonstration-only:** the three seeded advisories; aircraft layout, equipment positions and intervals; all people and records; Copilot demo mode; client-side role permissions.

**Awaiting external integration:** `ANTHROPIC_API_KEY` for live AI; verifying live feeds after deployment; the Supabase project, Auth and client data layer; operator-approved aircraft documentation (`OEM-G700-CABIN`); a security review before any real data.

### Customising for the candidate

The Lead Cabin Attendant is **Kate Keaney** (`src/data/seed.ts`, `CREW`). Change `name` and `initials` to personalise the demo, then use **Reset Demo**.
