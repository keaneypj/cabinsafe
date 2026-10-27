// End-to-end workflow tests for CabinSafe Intelligence (mobile viewport).
// Usage: start the app (npm run build && npm start), then: BASE_URL=http://localhost:3000 npm run test:e2e
// Uses the globally available Playwright install; set PW_EXECUTABLE to override the browser binary.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = new URL("./artifacts/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const results = [];
let page;

async function step(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t0 });
    console.log(`  ✓ ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: String(e?.message ?? e).split("\n")[0] });
    if (process.env.E2E_VERBOSE) console.log(String(e?.message ?? e).split("\n").slice(0, 14).join("\n"));
    console.log(`  ✗ ${name}\n      ${String(e?.message ?? e).split("\n")[0]}`);
    await page.screenshot({ path: `${OUT}fail-${results.length}.png` }).catch(() => {});
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
const tid = (id) => page.getByTestId(id);
async function go(path) {
  await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main#main >> :not([aria-busy])", { timeout: 15000 });
  await page.waitForTimeout(250);
}
async function demoNext() {
  if (await tid("demo-next").isVisible().catch(() => false)) await tid("demo-next").click();
  else await tid("demo-next-mini").click();
}
async function noHorizontalOverflow(label) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  assert(sw <= iw + 1, `${label}: horizontal overflow (${sw} > ${iw})`);
}

const browser = await chromium.launch(process.env.PW_EXECUTABLE ? { executablePath: process.env.PW_EXECUTABLE } : {});
const context = await browser.newContext({ ...devices["iPhone 14 Pro"] });
// Workflow tests start past the opening sequence; it has its own test below.
await context.addInitScript(() => {
  try {
    sessionStorage.setItem("cabinsafe-intro-seen", "1");
  } catch {}
});
page = await context.newPage();
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(String(e)));
page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && consoleErrors.push(m.text()));

console.log(`CabinSafe E2E against ${BASE}`);

await step("Opening sequence plays on first visit and hands off to the tour", async () => {
  const fresh = await browser.newContext({ ...devices["iPhone 14 Pro"] });
  const p = await fresh.newPage();
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await p.getByTestId("intro").waitFor();
  const text = await p.getByTestId("intro").innerText();
  for (const s of ["CabinSafe", "Kate Keaney", "Kevin Carnes", "Aviation Search Group", "Cabin Attendant Subject Matter Expert", "Professionalism and Discretion", "today's jets"]) assert(text.includes(s), `intro missing: ${s}`);
  await p.getByTestId("intro-tour").waitFor({ state: "visible", timeout: 15000 });
  await p.screenshot({ path: `${OUT}00-intro.png` });
  await p.getByTestId("intro-tour").click();
  await p.getByTestId("intro").waitFor({ state: "detached" });
  await p.getByTestId("demo-coach").waitFor();
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.getByTestId("featured-flight").waitFor();
  assert((await p.getByTestId("intro").count()) === 0, "intro replayed in the same session");
  await fresh.close();
});

await step("Opening sequence can be skipped", async () => {
  const fresh = await browser.newContext({ ...devices["iPhone 14 Pro"] });
  const p = await fresh.newPage();
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await p.getByTestId("intro-skip").click();
  await p.getByTestId("intro").waitFor({ state: "detached" });
  await p.getByTestId("featured-flight").waitFor();
  await fresh.close();
});

await step("Home dashboard loads with featured flight and Not Ready blocker", async () => {
  await go("/");
  await tid("featured-flight").waitFor();
  const headline = await tid("readiness-headline").first().innerText();
  assert(/Not Ready/.test(headline), `unexpected headline: ${headline}`);
  await page.screenshot({ path: `${OUT}01-home.png` });
});

await step("1. Create a flight", async () => {
  await go("/flights/new");
  await page.fill("#ff-callsign", "CSI104");
  await page.selectOption("#ff-dep", "KPBI");
  await page.selectOption("#ff-dst", "EGLF");
  await tid("flight-save").click();
  await page.waitForURL(/\/flights\/flt-/);
  await page.getByText("CSI104").first().waitFor();
});

await step("1b. Validation rejects an invalid flight", async () => {
  await go("/flights/new");
  await page.fill("#ff-callsign", "x");
  await tid("flight-save").click();
  await page.getByText("Flight ID must be 3–8 letters or digits.").waitFor();
});

await step("1c. Edit a flight", async () => {
  await go("/flights");
  await tid("flight-card-CSI104").click();
  await page.getByRole("link", { name: "Edit" }).click();
  await page.fill("#ff-notes", "Edited by E2E test");
  await tid("flight-save").click();
  await page.getByText("Flight CSI104 updated").waitFor();
});

await step("2. Complete a checklist item (and N/A requires a reason)", async () => {
  await go("/flights/flt-csi101?tab=checklist");
  await tid("task-chk:flt-csi101:gal-elec").click();
  await page.getByRole("radio", { name: "Not Applicable" }).click();
  await tid("task-save").click();
  await page.getByText("A reason is required for Not Applicable.").waitFor();
  await page.getByRole("radio", { name: "Completed" }).click();
  await tid("task-save").click();
  await page.getByText(/Completed: Galley electrical/).waitFor();
  const label = await tid("task-chk:flt-csi101:gal-elec").locator("svg").first().getAttribute("aria-label");
  assert(label === "Completed", `status icon is ${label}`);
});

await step("14. Reload and verify persistence", async () => {
  await page.reload({ waitUntil: "domcontentloaded" });
  await tid("task-chk:flt-csi101:gal-elec").waitFor();
  const label = await tid("task-chk:flt-csi101:gal-elec").locator("svg").first().getAttribute("aria-label");
  assert(label === "Completed", `after reload status is ${label}`);
  await go("/flights");
  await tid("flight-card-CSI104").waitFor();
});

await step("3+4. Add passenger to manifest and generate preparation tasks", async () => {
  await go("/flights/flt-csi102?tab=manifest");
  await tid("add-passenger").click();
  await tid("add-pax-SAGE").click();
  await tid("generated-result").waitFor();
  const txt = await tid("generated-result").innerText();
  assert(/Boarding assistance preparation — SAGE/.test(txt), "boarding task not generated");
  assert(/Confirm medical equipment requirements — SAGE/.test(txt), "confirmation task not generated");
  await page.screenshot({ path: `${OUT}03-generated.png` });
  await page.getByRole("button", { name: "Done" }).click();
  await tid("manifest-list").getByText("SAGE").waitFor();
});

await step("4b. Lead CA reviews a generated task", async () => {
  await go("/flights/flt-csi102?tab=checklist&filter=review");
  await page.locator('[data-testid^="task-gen:flt-csi102:pax-sage"]').first().click();
  await tid("task-review").click();
  await page.getByText("Marked reviewed").waitFor();
});

let beforeIndex = 0;
await step("5. Open an equipment marker on the cabin map", async () => {
  await go("/");
  beforeIndex = Number(await tid("readiness-index").first().innerText());
  await go("/cabin");
  await tid("cabin-map").waitFor();
  await page.screenshot({ path: `${OUT}05-cabin.png` });
  await tid("marker-AED-01").click();
  await page.getByRole("dialog").getByText("AED-01").first().waitFor();
});

await step("6. Complete an equipment inspection", async () => {
  await tid("eq-inspect").click();
  await tid("inspection-form").waitFor();
  await tid("eq-all-pass").click();
  await tid("eq-submit").click();
  await tid("inspection-result").waitFor();
  const txt = await tid("inspection-result").innerText();
  assert(/passed/.test(txt), "inspection did not pass");
  await page.screenshot({ path: `${OUT}06-inspection.png` });
});

await step("7. Readiness dashboard updates after inspection", async () => {
  await go("/");
  const after = Number(await tid("readiness-index").first().innerText());
  assert(after > beforeIndex, `index did not increase (${beforeIndex} → ${after})`);
  const headline = await tid("readiness-headline").first().innerText();
  assert(!/AED/.test(await tid("featured-flight").innerText()) || !/inspection due/.test(await tid("featured-flight").innerText()), "AED blocker still shown");
  console.log(`      readiness ${beforeIndex} → ${after} · ${headline}`);
});

await step("8. Retrieve live feeds (or explicit unavailable state) and acknowledge a simulated advisory", async () => {
  await go("/intel?flight=flt-csi101&adv=sim-wx-lsgg");
  await tid("intel-sources").waitFor();
  await page.waitForFunction(() => /available|Unavailable/.test(document.querySelector('[data-testid="intel-sources"]')?.textContent ?? ""), null, { timeout: 20000 });
  await tid("advisory-sim-wx-lsgg").getByText("SIMULATED").first().waitFor();
  await tid("adv-ack").click();
  await page.getByText(/Advisory acknowledged/).waitFor();
  await page.screenshot({ path: `${OUT}08-intel.png` });
});

await step("9. Generate a flight safety briefing (10 sections) and query the Copilot", async () => {
  await go("/copilot?flight=flt-csi101");
  await tid("generate-briefing").click();
  await tid("briefing").waitFor();
  const txt = await tid("briefing").innerText();
  for (const h of ["Flight overview", "Crew assignment", "Cabin readiness", "Passenger accommodations", "Weather and destination advisories", "Equipment status", "Outstanding tasks", "pilot or security coordination", "Document references", "Briefing generated"]) {
    assert(txt.toLowerCase().includes(h.toLowerCase()), `briefing missing section: ${h}`);
  }
  assert(/SIMULATED/.test(txt), "briefing must label simulated advisories");
  await page.screenshot({ path: `${OUT}09-briefing.png` });
  await page.getByRole("button", { name: "Close briefing" }).click();
  await tid("copilot-input").fill("What is the evacuation procedure?");
  await page.keyboard.press("Enter");
  await tid("chat-log").getByText("Approved aircraft-specific documentation is required to answer this question.").first().waitFor();
  await tid("copilot-input").fill("How do we control peanut cross-contact?");
  await page.keyboard.press("Enter");
  await tid("chat-log").getByText("CSI-CAT-003 v1.1 §3").first().waitFor();
});

await step("10. Assign a crew task to a contract attendant", async () => {
  await go("/handovers/hnd-001");
  const opt = await tid("assign-task-select").locator("option").nth(1).getAttribute("value");
  await tid("assign-task-select").selectOption(opt);
  await tid("assign-task-btn").click();
  await page.getByText(/now in their queue/).waitFor();
});

await step("11. Switch to contract attendant's demo view and accept the handover", async () => {
  await tid("switch-to-incoming").click();
  await page.getByText("You are previewing as").waitFor();
  for (const id of ["ack-ack-1", "ack-ack-2", "ack-ack-3", "ack-ack-4"]) await tid(id).click();
  await tid("accept-handover").click();
  await page.getByRole("button", { name: "Accept and sign" }).click();
  await tid("handover-accepted").waitFor();
  await page.screenshot({ path: `${OUT}11-handover.png` });
});

await step("10b. Assigned task appears in the contract attendant's queue", async () => {
  await go("/crew?tab=queue");
  await tid("queue").waitFor();
});

await step("Restricted medical details hidden in contract attendant role", async () => {
  await go("/passengers/pax-sage");
  await tid("restricted-locked").waitFor();
  assert(!(await page.content()).includes("COPD"), "COPD visible to contract attendant");
});

await step("Pre-boarding: PA sends an input to the cabin attendant", async () => {
  await go("/");
  await tid("role-chip").click();
  await tid("role-crew-pa").click();
  await go("/preboard?flight=flt-csi101");
  await tid("input-compose").click();
  await tid("input-text").fill("Principal requests the window blinds in Zone 1 half-closed at boarding.");
  await tid("input-send").click();
  await page.getByText("Added to the pre-boarding checklist").waitFor();
  await tid("crew-inputs").getByText("window blinds in Zone 1").waitFor();
});

await step("Pre-boarding: cabin attendant acknowledges inputs, completes checks and confirms", async () => {
  await tid("role-chip").click();
  await tid("role-crew-ca-sam").click();
  await go("/preboard");
  await tid("preboard-summary").waitFor();
  assert(!(await tid("preboard-confirm").isEnabled()), "sign-off should be disabled before checks are done");
  for (let i = 0; i < 20 && (await page.locator('[data-testid^="ack-input-"]').count()) > 0; i++) await page.locator('[data-testid^="ack-input-"]').first().click();
  for (let i = 0; i < 20 && (await page.locator('[data-testid^="pb-check-"][aria-pressed="false"]').count()) > 0; i++) {
    await page.locator('[data-testid^="pb-check-"][aria-pressed="false"]').first().click();
    await page.waitForTimeout(80);
  }
  await page.waitForFunction(() => document.querySelector('[data-testid="preboard-pct"]')?.textContent === "100%");
  await page.screenshot({ path: `${OUT}preboard-ready.png` });
  await tid("preboard-confirm").click();
  await page.getByRole("button", { name: "Confirm and sign" }).click();
  await tid("preboard-signed").waitFor();
  await go("/");
  assert((await tid("preboard-card").innerText()).includes("Pre-boarding confirmed"), "home card not updated");
});

await step("12. Review the audit trail", async () => {
  await go("/audit");
  const txt = await tid("audit-list").innerText();
  for (const s of ["Pre-boarding preparation confirmed", "Completed checklist item added by", "Handover accepted", "AED-01 inspection passed", "Acknowledged SIMULATED advisory", "Rule-generated", "Created flight CSI104"]) assert(txt.includes(s), `audit missing: ${s}`);
});

await step("13. Reset the demonstration", async () => {
  await go("/more");
  await tid("reset-demo").click();
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page.waitForURL(BASE + "/");
  await go("/flights");
  assert((await page.getByText("CSI104").count()) === 0, "CSI104 still present after reset");
  await go("/audit");
  assert((await tid("audit-list").innerText()).includes("restored to original seeded state"), "reset not audited");
});

await step("Guided demo: Experience CabinSafe runs end-to-end", async () => {
  await go("/");
  await tid("experience-cta").click();
  await tid("demo-begin").click();
  await tid("demo-coach").waitFor();
  await demoNext(); // step 1 → 2
  await page.waitForURL(/\/intel/);
  await tid("adv-ack").click();
  await demoNext(); // → 3
  await page.waitForURL(/\/passengers\/pax-sage/);
  await tid("generated-tasks").waitFor();
  await demoNext(); // → 4
  await page.waitForURL(/\/cabin/);
  await tid("eq-inspect").click();
  await tid("eq-all-pass").click();
  await tid("eq-submit").click();
  await tid("inspection-result").waitFor();
  await page.getByRole("button", { name: "Close" }).first().click();
  await demoNext(); // → 5
  await page.waitForURL(/\/copilot/);
  await tid("generate-briefing").click();
  await tid("briefing").waitFor();
  await page.getByRole("button", { name: "Close briefing" }).click();
  await demoNext(); // → 6
  await page.waitForURL(/\/handovers\/hnd-001/);
  const opt = await tid("assign-task-select").locator("option").nth(1).getAttribute("value");
  await tid("assign-task-select").selectOption(opt);
  await tid("assign-task-btn").click();
  await tid("switch-to-incoming").click();
  for (const id of ["ack-ack-1", "ack-ack-2", "ack-ack-3", "ack-ack-4"]) await tid(id).click();
  await tid("accept-handover").click();
  await page.getByRole("button", { name: "Accept and sign" }).click();
  await tid("handover-accepted").waitFor();
  await demoNext(); // finish
  await page.getByText("Demonstration complete").waitFor();
  await page.screenshot({ path: `${OUT}demo-complete.png` });
});

await step("15. Mobile layout: no horizontal overflow on any screen", async () => {
  for (const p of ["/", "/preboard", "/flights", "/flights/flt-csi101", "/flights/flt-csi101?tab=checklist", "/flights/flt-csi101?tab=manifest", "/flights/flt-csi101?tab=crew", "/cabin", "/intel", "/copilot", "/more", "/passengers", "/passengers/pax-orion", "/crew", "/handovers", "/handovers/hnd-001", "/audit", "/documents", "/documents/CSI-CAT-003", "/more/discrepancies", "/about", "/flights/new"]) {
    await go(p);
    await noHorizontalOverflow(p);
  }
  await context.setDefaultTimeout(10000);
});

await step("PWA: manifest and service worker are served", async () => {
  const m = await (await page.request.get(BASE + "/manifest.webmanifest")).json();
  assert(m.display === "standalone" && m.icons.length >= 3, "manifest invalid");
  const sw = await page.request.get(BASE + "/sw.js");
  assert(sw.ok(), "sw.js not served");
  const icon = await page.request.get(BASE + "/icons/icon-512.png");
  assert(icon.ok(), "icon missing");
});

await step("No uncaught page errors", async () => {
  assert(consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
});

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
