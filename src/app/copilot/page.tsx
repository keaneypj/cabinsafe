"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ArrowUp, BookOpen, Bot, Check, Copy, Download, FileText, FlaskConical, Printer, Sparkles, X } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { Badge, Button, Card, Chip, EmptyState, Notice, PageTitle, Sheet, report, toast } from "@/components/ui";
import { generateBriefing } from "@/domain/briefing";
import { answer, contextDigest, SUGGESTED_PROMPTS, type CopilotAnswer } from "@/domain/copilot";
import { can } from "@/domain/permissions";
import { citationLabel, retrieve } from "@/domain/retrieval";
import type { BriefingDoc } from "@/domain/types";
import { cx, fmtDateTime } from "@/lib/format";
import { useFeaturedFlight, useFlightContext, useNow, useUpcomingFlights } from "@/store/hooks";
import { useMe, useStore } from "@/store/store";

interface Msg {
  id: number;
  role: "user" | "assistant";
  text: string;
  source?: "demo" | "live" | "guardrail" | "fallback";
  citations?: string[];
  pending?: boolean;
}

const GUARDRAIL_KINDS: CopilotAnswer["kind"][] = ["aircraft_specific", "medical_refusal", "authorization_refusal", "briefing"];

export default function CopilotPage() {
  return (
    <Suspense>
      <Copilot />
    </Suspense>
  );
}

function Copilot() {
  const sp = useSearchParams();
  const router = useRouter();
  const now = useNow();
  const upcoming = useUpcomingFlights();
  const featured = useFeaturedFlight();
  const flight = upcoming.find((f) => f.id === sp.get("flight")) ?? featured;
  const ctx = useFlightContext(flight?.id, now);
  const me = useMe();
  const saveBriefing = useStore((s) => s.saveBriefing);
  const briefings = useStore((s) => s.briefings);
  const demoActive = useStore((s) => s.demo.active);
  const [mode, setMode] = useState<"demo" | "live" | "checking">("checking");
  const [model, setModel] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [briefing, setBriefing] = useState<BriefingDoc | null>(null);
  const [generating, setGenerating] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/copilot")
      .then((r) => r.json())
      .then((b) => {
        setMode(b.mode === "live" ? "live" : "demo");
        setModel(b.model ?? null);
      })
      .catch(() => setMode("demo"));
  }, []);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs]);

  if (!flight || !ctx) return <EmptyState title="No upcoming flights">The Copilot works with an upcoming flight&apos;s records.</EmptyState>;

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setInput("");
    const base = Date.now();
    const det = answer(question, ctx);
    const user: Msg = { id: base, role: "user", text: question };
    if (mode !== "live" || GUARDRAIL_KINDS.includes(det.kind)) {
      setMsgs((m) => [...m, user, { id: base + 1, role: "assistant", text: det.markdown, source: mode === "live" ? "guardrail" : "demo", citations: det.citations.map(citationLabel) }]);
      return;
    }
    setBusy(true);
    setMsgs((m) => [...m, user, { id: base + 1, role: "assistant", text: "", pending: true }]);
    const passages = retrieve(question, 4, 1.2);
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, digest: contextDigest(ctx), passages: passages.map((p) => ({ label: citationLabel(p), heading: p.heading, body: p.body })) }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setMsgs((m) => m.map((x) => (x.id === base + 1 ? { ...x, pending: false, text: body.answer, source: "live", citations: passages.map(citationLabel).filter((l) => body.answer.includes(l)) } : x)));
    } catch (e) {
      setMsgs((m) => m.map((x) => (x.id === base + 1 ? { ...x, pending: false, text: `${det.markdown}`, source: "fallback", citations: det.citations.map(citationLabel) } : x)));
      toast.error(`Live AI unavailable (${e instanceof Error ? e.message : "error"}). Showing the demonstration assistant's answer.`);
    } finally {
      setBusy(false);
    }
  };

  const generate = () => {
    setGenerating(true);
    // Short deliberate delay so the action reads as a generation step on mobile.
    setTimeout(() => {
      const b = generateBriefing({ ...ctx, nowMs: Date.now() });
      const res = saveBriefing({ flightId: flight.id, generatedAt: new Date().toISOString(), generatedById: me.id, markdown: b.markdown, citations: b.citations });
      setGenerating(false);
      if (report(res, "Flight safety briefing generated")) {
        setBriefing(res.ok ? res.value! : null);
        if (demoActive) useStore.getState().demoMark("briefing");
      }
    }, 650);
  };

  const lastForFlight = briefings.find((b) => b.flightId === flight.id);

  return (
    <div>
      <PageTitle eyebrow="AI Safety Copilot" title="Safety Copilot" subtitle="Answers grounded in current flight records and cited reference documents" />

      <div className="flex flex-wrap items-center gap-2 mb-3" data-testid="copilot-mode">
        {mode === "checking" ? (
          <Badge tone="neutral">Checking AI service…</Badge>
        ) : mode === "live" ? (
          <Badge tone="gold" icon={<Sparkles className="size-3" />}>
            Live AI · {model}
          </Badge>
        ) : (
          <Badge tone="sim" icon={<FlaskConical className="size-3" />}>
            Demonstration Assistant · deterministic · not live AI
          </Badge>
        )}
        <Badge tone="neutral" icon={<BookOpen className="size-3" />}>
          Retrieval from approved demo library
        </Badge>
      </div>
      {mode === "demo" && (
        <Notice tone="sim" className="mb-4">
          No AI service is configured on this deployment, so answers come from a rules-based demonstration assistant that reads the live application records and the approved document library. It is not a language model. Set <code>ANTHROPIC_API_KEY</code> on the server to enable live AI.
        </Notice>
      )}

      <div className="scroll-x -mx-4 px-4 mb-3">
        <div className="flex gap-1.5 w-max">
          {upcoming.map((f) => (
            <Chip key={f.id} active={f.id === flight.id} onClick={() => { setMsgs([]); router.replace(`/copilot?flight=${f.id}`, { scroll: false }); }}>
              {f.callsign} · {f.departure}–{f.destination}
            </Chip>
          ))}
        </div>
      </div>

      <Card className="mb-4 border-gold/25 bg-gradient-to-br from-gold/10 via-navy/50 to-navy/30">
        <div className="flex items-start gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-gold/15 text-gold shrink-0">
            <FileText className="size-5" />
          </span>
          <div className="flex-1">
            <div className="font-semibold">Flight Safety Briefing · {flight.callsign}</div>
            <p className="text-xs text-slate mt-0.5">Ten-section briefing built from current readiness, manifest accommodations, advisories, equipment and open tasks — with document references and a timestamp.</p>
          </div>
        </div>
        {can(me.role, "briefing.generate") ? (
          <Button className="w-full mt-3" size="lg" onClick={generate} loading={generating} data-testid="generate-briefing">
            {!generating && <Sparkles className="size-4" />} Generate Flight Safety Briefing
          </Button>
        ) : (
          <Notice tone="neutral" className="mt-3">Your demo role cannot generate briefings.</Notice>
        )}
        {lastForFlight && !briefing && (
          <button className="text-xs text-gold mt-2 min-h-9" onClick={() => setBriefing(lastForFlight)}>
            Open last briefing · {fmtDateTime(lastForFlight.generatedAt)}
          </button>
        )}
      </Card>

      {/* Chat */}
      <section className="card p-0 overflow-hidden" aria-label="Copilot conversation">
        <div className="max-h-[60dvh] min-h-48 overflow-y-auto p-3.5 space-y-3" aria-live="polite" data-testid="chat-log">
          {msgs.length === 0 && (
            <div className="text-center py-4">
              <Bot className="size-8 text-gold/70 mx-auto" />
              <p className="text-sm text-slate mt-2">Ask about {flight.callsign}&apos;s preparation records or approved procedures.</p>
            </div>
          )}
          {msgs.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gold text-midnight px-3.5 py-2 text-sm">{m.text}</div>
              </div>
            ) : (
              <div key={m.id} className="flex gap-2.5">
                <span className="grid size-7 place-items-center rounded-full bg-navy-600 text-gold shrink-0 mt-0.5">
                  <Bot className="size-4" />
                </span>
                <div className="flex-1 min-w-0 rounded-2xl rounded-tl-md bg-midnight-900/50 border border-slate/10 px-3.5 py-2.5">
                  {m.pending ? (
                    <div className="flex gap-1 py-1.5" aria-label="Thinking">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="size-1.5 rounded-full bg-gold/70 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </div>
                  ) : (
                    <>
                      <Markdown text={m.text} />
                      <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t hairline">
                        <Badge tone={m.source === "live" ? "gold" : m.source === "guardrail" ? "info" : "sim"}>{m.source === "live" ? "Live AI" : m.source === "guardrail" ? "Safety guardrail · deterministic" : m.source === "fallback" ? "Demo assistant (AI unavailable)" : "Demonstration assistant"}</Badge>
                        {m.citations?.map((c) => (
                          <Link key={c} href={`/documents/${c.split(" ")[0]}`} className="inline-flex items-center gap-1 rounded-full border border-gold/30 px-2 text-[0.6875rem] text-gold min-h-6">
                            <BookOpen className="size-3" /> {c}
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ),
          )}
          <div ref={end} />
        </div>
        <div className="border-t hairline p-3">
          <div className="scroll-x -mx-3 px-3 mb-2">
            <div className="flex gap-1.5 w-max">
              {SUGGESTED_PROMPTS.map((p) => (
                <button key={p} onClick={() => ask(p)} className="shrink-0 rounded-full border border-slate/15 px-3 min-h-9 text-xs text-slate hover:text-ivory hover:border-gold/40" disabled={busy}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
          >
            <label htmlFor="copilot-input" className="sr-only">
              Ask the Safety Copilot
            </label>
            <input id="copilot-input" className="field flex-1" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about this flight…" maxLength={800} autoComplete="off" data-testid="copilot-input" />
            <Button type="submit" className="!px-3.5" disabled={!input.trim() || busy} aria-label="Send">
              <ArrowUp className="size-5" />
            </Button>
          </form>
          <p className="text-[0.625rem] text-slate-500 mt-2">Does not diagnose, prescribe, authorize departure or override approved procedures. Unsupported procedural questions return: “Approved aircraft-specific documentation is required to answer this question.”</p>
        </div>
      </section>

      <BriefingSheet doc={briefing} onClose={() => setBriefing(null)} />
    </div>
  );
}

function BriefingSheet({ doc, onClose }: { doc: BriefingDoc | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const flight = useStore((s) => s.flights.find((f) => f.id === doc?.flightId));
  if (!doc) return null;
  const plain = doc.markdown;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plain);
      setCopied(true);
      toast.ok("Briefing copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Clipboard unavailable in this browser. Use Download instead.");
    }
  };
  const download = () => {
    const blob = new Blob([plain], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CabinSafe-briefing-${flight?.callsign ?? "flight"}-${doc.generatedAt.slice(0, 16).replace(/[:T]/g, "")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const print = () => {
    const w = window.open("", "_blank", "noopener,noreferrer,width=800,height=900");
    if (!w) return toast.error("Pop-up blocked. Use Download instead.");
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    w.document.write(`<!doctype html><title>Cabin Safety Briefing ${flight?.callsign ?? ""}</title><pre style="font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap;padding:24px">${esc(plain)}</pre>`);
    w.document.close();
    w.print();
  };
  return (
    <Sheet
      open={!!doc}
      onClose={onClose}
      title={`Cabin Safety Briefing · ${flight?.callsign ?? ""}`}
      subtitle={`Generated ${fmtDateTime(doc.generatedAt)} · deterministic, from current records`}
      footer={
        <>
          <Button variant="secondary" className="flex-1" onClick={copy} data-testid="briefing-copy">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />} Copy
          </Button>
          <Button variant="secondary" className="flex-1" onClick={download}>
            <Download className="size-4" /> Export
          </Button>
          <Button variant="secondary" className={cx("hidden min-[400px]:inline-flex")} onClick={print} aria-label="Print">
            <Printer className="size-4" />
          </Button>
          <Button variant="quiet" onClick={onClose} aria-label="Close briefing">
            <X className="size-4" />
          </Button>
        </>
      }
    >
      <div data-testid="briefing">
        <Markdown text={doc.markdown} />
      </div>
    </Sheet>
  );
}
