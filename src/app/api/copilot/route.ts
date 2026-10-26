import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Live AI Safety Copilot (optional).
 *
 * Enabled only when ANTHROPIC_API_KEY is set on the server. The key is never
 * sent to the browser. Without it, GET reports `mode: "demo"` and the client
 * uses the clearly-labelled deterministic demonstration assistant.
 *
 * Grounding: the client sends a role-filtered digest of current flight records
 * and the passages retrieved from the approved demonstration library. In a
 * production deployment the server would load records itself under the
 * authenticated user's permissions (see README → Production hardening).
 */

const MODEL = process.env.COPILOT_MODEL || "claude-opus-5-5";
const NO_SOURCE = "Approved aircraft-specific documentation is required to answer this question.";

const SYSTEM = `You are the CabinSafe Safety Copilot, assisting the cabin crew of a privately operated aircraft (a conceptual 2026 Gulfstream G700 configuration used for a demonstration).

Answer ONLY from the two sources provided in the user turn:
1. FLIGHT RECORDS — a JSON digest of the current application state (tasks, equipment, passengers by alias, advisories, readiness).
2. APPROVED PASSAGES — excerpts from the operator's demonstration document library, each labelled like [CSI-CAT-003 v1.1 §2].

Rules you must follow:
- Every procedural statement must cite the passage label it came from, in square brackets, exactly as given.
- If neither source supports an answer to a procedural or aircraft-specific question, reply with exactly: "${NO_SOURCE}" and nothing else.
- Aircraft-specific emergency procedures (exits, evacuation, decompression, fire-fighting, equipment locations) are NOT in the library. Treat them as unsupported.
- Never provide a medical diagnosis, treatment, medication or dosage advice. For medical events, state that crew notify the Pilot in Command and contact the telemedical provider, citing the passage if provided.
- Never authorise departure or make go/no-go decisions; departure authority rests with the Pilot in Command.
- Simulated advisories must always be described as SIMULATED.
- Refer to passengers only by alias. If the digest omits restricted medical details, do not speculate about them.
- Be concise and operational. Use short markdown bullet lists. No preamble.`;

function client(): Anthropic | null {
  return process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
}

export async function GET() {
  return NextResponse.json({ mode: client() ? "live" : "demo", model: client() ? MODEL : null });
}

interface Body {
  question?: unknown;
  digest?: unknown;
  passages?: unknown;
}

// Best-effort per-instance limiter for a public demo URL.
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 12;
}

export async function POST(req: NextRequest) {
  const anthropic = client();
  if (!anthropic) return NextResponse.json({ error: "Live AI is not configured on this deployment." }, { status: 503 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return NextResponse.json({ error: "Too many requests — please wait a minute." }, { status: 429 });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const digest = typeof body.digest === "string" ? body.digest : "";
  const passages = Array.isArray(body.passages) ? body.passages.filter((p): p is { label: string; heading: string; body: string } => !!p && typeof p.label === "string" && typeof p.body === "string") : [];
  if (!question || question.length > 800) return NextResponse.json({ error: "Ask a question of up to 800 characters." }, { status: 400 });
  if (digest.length > 60_000) return NextResponse.json({ error: "Record digest too large." }, { status: 413 });

  const passageText = passages.length ? passages.slice(0, 6).map((p) => `[${p.label}] ${p.heading}: ${p.body}`).join("\n\n") : "(no passages matched)";

  try {
    const response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `FLIGHT RECORDS (JSON):\n${digest}\n\nAPPROVED PASSAGES:\n${passageText}\n\nQUESTION: ${question}`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ answer: "The AI service declined this request. Please rephrase, or consult the Lead Cabin Attendant.", model: response.model, refused: true });
    }
    const answer = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return NextResponse.json({ answer: answer || NO_SOURCE, model: response.model, truncated: response.stop_reason === "max_tokens" });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "AI service is busy — try again shortly." }, { status: 429 });
    if (error instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: "AI service credentials are invalid on the server." }, { status: 502 });
    if (error instanceof Anthropic.APIError) return NextResponse.json({ error: `AI service error (${error.status ?? "unknown"}).` }, { status: 502 });
    console.error("copilot route failed", error);
    return NextResponse.json({ error: "AI service could not be reached." }, { status: 502 });
  }
}
