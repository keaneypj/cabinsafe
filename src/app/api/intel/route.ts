import { NextResponse, type NextRequest } from "next/server";
import { airport } from "@/data/airports";
import { fetchIntel } from "@/lib/feeds";

export const dynamic = "force-dynamic";

/** GET /api/intel?airports=KMIA,LSGG — retrieves official public feeds server-side. */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("airports") ?? "";
  const icaos = [...new Set(raw.split(",").map((s) => s.trim().toUpperCase()).filter((s) => /^[A-Z]{4}$/.test(s)))].slice(0, 8);
  const known = icaos.filter((i) => airport(i));
  if (!known.length) return NextResponse.json({ error: "Provide one or more known ICAO airport codes." }, { status: 400 });
  try {
    const snap = await fetchIntel(known);
    return NextResponse.json(snap, { headers: { "Cache-Control": "private, max-age=120" } });
  } catch (e) {
    console.error("intel route failed", e);
    return NextResponse.json({ error: "Intelligence retrieval failed. Showing no live data." }, { status: 502 });
  }
}
