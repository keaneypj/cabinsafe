import { describe, expect, it } from "vitest";
import { AIRPORTS } from "@/data/airports";
import { parseCdcRss, parseMetars, parseStateDept, parseTafs, parseUsgs } from "./feedParsers";

// Fixtures follow the documented public response shapes. They are test inputs
// only and are never displayed by the application.
const route = [AIRPORTS.KMIA, AIRPORTS.LSGG];
const NOW = "2026-10-26T12:00:00.000Z";

describe("feed parsers", () => {
  it("parses AWC METAR JSON and keeps the latest per station", () => {
    const out = parseMetars([
      { icaoId: "LSGG", obsTime: 1792000000, rawOb: "LSGG OLD", wdir: 40, wspd: 12 },
      { icaoId: "LSGG", obsTime: 1792003600, rawOb: "LSGG NEW", wdir: "VRB", wspd: 3, visib: "6+", temp: 9, dewp: 4, clouds: [{ cover: "FEW", base: 3000 }] },
      { icaoId: "KMIA" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].raw).toBe("LSGG NEW");
    expect(out[0].windDir).toBe("VRB");
    expect(out[0].clouds).toBe("FEW030");
  });

  it("parses AWC TAF validity", () => {
    const [t] = parseTafs([{ icaoId: "KMIA", rawTAF: "TAF KMIA ...", issueTime: "2026-10-26 11:20:00", validTimeFrom: 1792000000, validTimeTo: 1792108000 }]);
    expect(t.issuedAt).toBe("2026-10-26T11:20:00.000Z");
    expect(t.validTo).toBeDefined();
  });

  it("matches State Department advisories to destination countries only", () => {
    const out = parseStateDept(
      [
        { Title: "Switzerland - Level 1: Exercise Normal Precautions", Link: "https://travel.state.gov/x", Summary: "<p>Exercise normal precautions.</p>", Updated: "2026-07-01T00:00:00Z" },
        { Title: "France - Level 2: Exercise Increased Caution", Link: "https://travel.state.gov/y" },
      ],
      route,
      NOW,
    );
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe("info");
    expect(out[0].origin).toBe("live");
    expect(out[0].summary).toBe("Exercise normal precautions.");
  });

  it("filters USGS earthquakes by distance from route airports", () => {
    const out = parseUsgs(
      { features: [
        { id: "near", properties: { mag: 4.8, place: "Haute-Savoie", time: Date.parse(NOW), url: "https://earthquake.usgs.gov/e" }, geometry: { coordinates: [6.5, 46.0, 10] } },
        { id: "far", properties: { mag: 6.1, place: "Pacific" }, geometry: { coordinates: [170, -20, 10] } },
      ] },
      route,
      NOW,
    );
    expect(out.map((a) => a.id)).toEqual(["live-usgs-near"]);
    expect(out[0].airports).toContain("LSGG");
  });

  it("parses CDC RSS items mentioning route countries or global notices", () => {
    const xml = `<rss><channel>
      <item><title>Level 1 - Global Measles</title><link>https://wwwnc.cdc.gov/a</link><pubDate>Mon, 20 Oct 2026 10:00:00 GMT</pubDate><description><![CDATA[Measles cases worldwide.]]></description></item>
      <item><title>Level 1 - Dengue in Asia</title><link>https://wwwnc.cdc.gov/b</link></item>
    </channel></rss>`;
    const out = parseCdcRss(xml, route, NOW);
    expect(out).toHaveLength(1);
    expect(out[0].geography).toBe("Global");
  });

  it("returns nothing for malformed input rather than guessing", () => {
    expect(parseMetars({ nope: true })).toEqual([]);
    expect(parseStateDept(null, route, NOW)).toEqual([]);
    expect(parseCdcRss("not xml", route, NOW)).toEqual([]);
  });
});
