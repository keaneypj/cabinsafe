"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Cpu, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { useStore } from "@/store/store";
import { Logo } from "./Logo";

/**
 * Opening sequence shown once per browser session on the home page
 * (or on demand via /?intro=1, e.g. More → Replay Intro).
 *
 *   Scene 1  A private jet crosses the screen; "CabinSafe" fades in and out.
 *   Scene 2  "Custom App created by Kate Keaney for Brian Smith at Aviation Recruiting".
 *   Scene 3  Kate Keaney and her three pillars, with the next step.
 *
 * Always rendered in the dark cinematic palette, independent of the app theme.
 */

export const INTRO_SEEN_KEY = "cabinsafe-intro-seen";

const SCENE_TIMES = { reduced: [1800, 3600], full: [4600, 8600] };

export function shouldShowIntro(pathname: string, search: string): boolean {
  if (new URLSearchParams(search).get("intro") === "1") return true;
  if (pathname !== "/") return false;
  try {
    return !sessionStorage.getItem(INTRO_SEEN_KEY);
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    /* private mode: intro simply plays again next visit */
  }
  delete document.documentElement.dataset.intro;
}

/** Side-profile private jet: long cabin, swept wing, aft engines, T-tail. Nose points right. */
function Jet({ className }: { className?: string }) {
  return (
    <svg viewBox="-420 0 680 70" className={className} aria-hidden overflow="visible">
      <defs>
        <linearGradient id="intro-contrail" x1="0" x2="1">
          <stop offset="0" stopColor="#d7bd8c" stopOpacity="0" />
          <stop offset="1" stopColor="#d7bd8c" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="intro-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d9dee5" />
        </linearGradient>
      </defs>
      {/* Contrails */}
      <rect x="-420" y="33.2" width="430" height="1.6" rx="0.8" fill="url(#intro-contrail)" />
      <rect x="-300" y="21.4" width="350" height="1.1" rx="0.55" fill="url(#intro-contrail)" opacity="0.6" />
      {/* T-tail */}
      <path d="M20 27 L10 5 L23 5 L44 27 Z" fill="url(#intro-body)" />
      <path d="M2 6.5 L34 6.5 L34 10 L5 10 Z" fill="#d7bd8c" />
      {/* Fuselage */}
      <path d="M8 33 C8 28 28 25.5 62 25.5 L200 25.5 C222 25.5 240 29 246 33.5 C240 38 222 41 200 41 L62 41 C28 41 8 38 8 33 Z" fill="url(#intro-body)" />
      {/* Cheatline */}
      <path d="M40 36.5 L214 36.5 C226 36.5 236 35.6 242 34.6" stroke="#d7bd8c" strokeWidth="1.3" fill="none" />
      {/* Aft engine */}
      <rect x="44" y="17.5" width="40" height="9.5" rx="4.75" fill="#c7ced8" />
      <rect x="44" y="17.5" width="7" height="9.5" rx="3" fill="#8e97a3" />
      {/* Wing */}
      <path d="M140 37 L168 37 L114 55 L100 55 Z" fill="#c7ced8" />
      <path d="M100 55 L114 55 L112 57.5 L101 57.5 Z" fill="#d7bd8c" />
      {/* Windows */}
      {Array.from({ length: 9 }).map((_, i) => (
        <ellipse key={i} cx={98 + i * 12} cy={31.2} rx="2.6" ry="2.1" fill="#203145" />
      ))}
      {/* Cockpit */}
      <path d="M214 28.4 L229 28.4 C233 29.4 236 30.6 238 31.8 L216 31.8 Z" fill="#203145" />
    </svg>
  );
}

export function Intro({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [scene, setScene] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [run, setRun] = useState(0);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    setScene(0);
    const [t1, t2] = reduced ? SCENE_TIMES.reduced : SCENE_TIMES.full;
    const a = setTimeout(() => setScene(1), t1);
    const b = setTimeout(() => setScene(2), t2);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [reduced, run]);

  const finish = useCallback(
    (then?: () => void) => {
      markSeen();
      setLeaving(true);
      setTimeout(() => {
        onDone();
        then?.();
      }, 450);
    },
    [onDone],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finish();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [finish]);

  const startTour = () =>
    finish(() => {
      const s = useStore.getState();
      s.resetDemo();
      s.demoStart();
      router.push("/");
    });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="CabinSafe introduction"
      className={`fixed inset-0 z-[200] overflow-hidden text-[#f5f5f2] transition-opacity duration-500 ${leaving ? "opacity-0" : "opacity-100"}`}
      style={{ background: "radial-gradient(120% 80% at 50% 0%, #1a2a3c 0%, #0c141d 55%, #070c12 100%)" }}
      data-testid="intro"
    >

      {/* Skip */}
      {scene < 2 && (
        <button
          onClick={() => finish()}
          className="absolute right-4 z-10 rounded-full bg-white/10 px-3.5 min-h-9 text-[0.8125rem] font-medium text-white/80 backdrop-blur hover:bg-white/15"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
          data-testid="intro-skip"
        >
          Skip
        </button>
      )}

      {/* Scene 1 — jet + brand */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${scene === 0 ? "opacity-100" : "opacity-0"}`} aria-hidden={scene !== 0} inert={scene !== 0}>
        {/* Horizon glow */}
        <div className="pointer-events-none absolute inset-x-0 top-[68%] h-px bg-gradient-to-r from-transparent via-[#d7bd8c]/35 to-transparent" aria-hidden />
        {!reduced && (
          <div key={run} className="absolute left-0 top-[54%] w-[min(150vw,720px)] intro-fly">
            <Jet className="w-full h-auto drop-shadow-[0_8px_24px_rgba(215,189,140,0.25)]" />
          </div>
        )}
        <div key={`brand-${run}`} className="absolute inset-x-0 top-[22%] flex flex-col items-center intro-brand">
          <Logo size={56} />
          <div className="mt-3 text-[2.5rem] font-bold tracking-[-0.03em]">CabinSafe</div>
          <div className="mt-1 text-[0.75rem] font-medium uppercase tracking-[0.3em] text-[#d7bd8c]">Intelligence</div>
        </div>
      </div>

      {/* Scene 2 — dedication */}
      <div className={`absolute inset-0 flex items-center justify-center px-8 text-center transition-opacity duration-700 ${scene === 1 ? "opacity-100" : "opacity-0"}`} aria-hidden={scene !== 1} inert={scene !== 1}>
        <div className={scene === 1 ? "intro-rise" : ""}>
          <div className="text-[0.8125rem] font-medium uppercase tracking-[0.22em] text-[#d7bd8c]">Custom App</div>
          <p className="mt-4 text-[1.625rem] font-semibold leading-snug tracking-[-0.02em]">
            created by <span className="text-[#d7bd8c]">Kate Keaney</span>
          </p>
          <p className="mt-2 text-[1.0625rem] text-white/70">
            for Brian Smith at Aviation Recruiting
          </p>
        </div>
      </div>

      {/* Scene 3 — Kate */}
      <div
        className={`absolute inset-0 flex flex-col justify-center px-7 transition-opacity duration-700 ${scene === 2 ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-hidden={scene !== 2}
        inert={scene !== 2}
      >
        <div className="mx-auto w-full max-w-md">
          <div className={scene === 2 ? "intro-rise" : ""}>
            <div className="text-[0.75rem] font-medium uppercase tracking-[0.22em] text-[#d7bd8c]">Lead Cabin Attendant Candidate</div>
            <h1 className="mt-2 text-[2.75rem] font-bold leading-[1.05] tracking-[-0.035em]">Kate Keaney</h1>
          </div>

          <ul className="mt-8 space-y-4">
            {[
              { icon: ShieldCheck, title: "Cabin Attendant Subject Matter Expert", sub: "Safety, service and preparation — done before anyone has to ask." },
              { icon: Sparkles, title: "Professionalism and Discretion", sub: "Quiet excellence for the principal, family and guests." },
              { icon: Cpu, title: "Technology adoption is critical with today's jets", sub: "Fluent with the systems modern aircraft and crews run on — this app is the proof." },
            ].map((p, i) => (
              <li key={p.title} className={`flex gap-3.5 ${scene === 2 ? "intro-rise" : ""}`} style={{ animationDelay: `${400 + i * 350}ms` }}>
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#d7bd8c]/15 text-[#d7bd8c]">
                  <p.icon className="size-5" />
                </span>
                <span>
                  <span className="block text-[1.0625rem] font-semibold leading-snug">{p.title}</span>
                  <span className="block text-[0.875rem] leading-snug text-white/60 mt-0.5">{p.sub}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className={`mt-10 space-y-2.5 ${scene === 2 ? "intro-rise" : ""}`} style={{ animationDelay: "1500ms" }}>
            <button onClick={startTour} className="flex w-full min-h-[3.25rem] items-center justify-center gap-1.5 rounded-[0.875rem] bg-[#d7bd8c] text-[1.0625rem] font-semibold text-[#0c141d] active:opacity-85" data-testid="intro-tour">
              Take the 5-minute tour <ChevronRight className="size-5" />
            </button>
            <button onClick={() => finish()} className="flex w-full min-h-12 items-center justify-center rounded-[0.875rem] bg-white/10 text-[1rem] font-medium text-white active:bg-white/15" data-testid="intro-enter">
              Explore on my own
            </button>
            <button onClick={() => setRun((r) => r + 1)} className="mx-auto mt-1 flex min-h-9 items-center gap-1.5 text-[0.8125rem] text-white/50 hover:text-white/80">
              <RotateCcw className="size-3.5" /> Replay intro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
