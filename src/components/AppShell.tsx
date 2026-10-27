"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ClipboardCheck, Ellipsis, House, LayoutGrid, PlaneTakeoff, Sparkles, WifiOff } from "lucide-react";
import { cx } from "@/lib/format";
import { useHydrated } from "@/store/hooks";
import { useStore } from "@/store/store";
import { DemoCoach } from "./DemoCoach";
import { remainingItems, usePreboardFlight, usePreboardView } from "./PreboardCard";
import { Logo, Wordmark } from "./Logo";
import { RoleChip } from "./RoleSwitcher";
import { Skeleton, Toaster } from "./ui";

const NAV = [
  { href: "/", label: "Home", icon: House, match: (p: string) => p === "/" },
  { href: "/flights", label: "Flights", icon: PlaneTakeoff, match: (p: string) => p.startsWith("/flights") },
  { href: "/preboard", label: "Boarding", icon: ClipboardCheck, match: (p: string) => p.startsWith("/preboard") },
  { href: "/cabin", label: "Cabin", icon: LayoutGrid, match: (p: string) => p.startsWith("/cabin") },
  { href: "/copilot", label: "Copilot", icon: Sparkles, match: (p: string) => p.startsWith("/copilot") },
  { href: "/more", label: "More", icon: Ellipsis, match: (p: string) => !["/", "/flights", "/preboard", "/cabin", "/copilot"].some((x) => (x === "/" ? p === "/" : p.startsWith(x))) },
];

function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

function useServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((e) => console.warn("Service worker registration failed", e));
  }, []);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const demoActive = useStore((s) => s.demo.active);
  const online = useOnline();
  const preboardView = usePreboardView(usePreboardFlight());
  const preboardLeft = preboardView ? remainingItems(preboardView) : 0;
  useServiceWorker();

  return (
    <div className="min-h-dvh md:pl-[15.5rem]">
      <Toaster />

      {/* Desktop / tablet side rail */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-[15.5rem] flex-col border-r hairline bg-navy px-3 py-5 no-print">
        <Link href="/" className="px-3 mb-6" aria-label="CabinSafe Intelligence home">
          <Wordmark />
        </Link>
        <nav aria-label="Primary" className="flex flex-col gap-1">
          {NAV.map((n) => {
            const active = n.match(pathname);
            return (
              <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} aria-label={n.href === "/preboard" && hydrated && preboardLeft ? `${n.label}, ${preboardLeft} items to do` : undefined} className={cx("flex items-center gap-3 rounded-lg px-3 min-h-10 text-[0.9375rem] transition-colors", active ? "bg-gold/12 text-gold font-semibold" : "text-ivory hover:bg-navy-700")}>
                <n.icon className={cx("size-5", !active && "text-gold")} aria-hidden />
                <span className="flex-1">{n.label}</span>
                {n.href === "/preboard" && hydrated && preboardLeft > 0 && <span className="rounded-full bg-bad px-1.5 text-[0.75rem] font-semibold text-white tnum">{preboardLeft}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto px-2 text-[0.6875rem] leading-relaxed text-slate-500">
          Demonstration prototype. Synthetic data only. Not affiliated with Gulfstream Aerospace.
        </div>
      </aside>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b hairline bg-[var(--chrome)] backdrop-blur-xl backdrop-saturate-150 no-print" style={{ paddingTop: "var(--safe-top)" }}>
        <div className="mx-auto max-w-4xl flex items-center justify-between gap-3 px-4 h-13">
          <Link href="/" className="md:hidden" aria-label="CabinSafe Intelligence home">
            <Wordmark />
          </Link>
          <div className="hidden md:block text-[0.8125rem] text-slate-400">Private aviation cabin safety</div>
          {hydrated ? <RoleChip /> : <Skeleton className="h-9 w-28 rounded-full" />}
        </div>
        {!online && (
          <div className="flex items-center justify-center gap-2 bg-warn-bg text-warn text-xs px-4 py-1.5" role="status">
            <WifiOff className="size-3.5" /> Offline — showing demonstration data stored on this device. Live intelligence and AI are unavailable.
          </div>
        )}
      </header>

      <main
        id="main"
        className={cx("mx-auto max-w-4xl px-4 pt-3", demoActive ? "pb-[calc(var(--nav-h)+var(--safe-bottom)+13rem)]" : "pb-[calc(var(--nav-h)+var(--safe-bottom)+1.5rem)]", "md:pb-12")}
      >
        {hydrated ? children : <LoadingScreen />}
      </main>

      {hydrated && <DemoCoach />}

      {/* Mobile bottom navigation */}
      <nav aria-label="Primary" className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t hairline bg-[var(--chrome)] backdrop-blur-xl backdrop-saturate-150 no-print" style={{ paddingBottom: "var(--safe-bottom)" }}>
        <ul className="grid grid-cols-6 h-[var(--nav-h)]">
          {NAV.map((n) => {
            const active = n.match(pathname);
            return (
              <li key={n.href}>
                <Link href={n.href} aria-current={active ? "page" : undefined} className={cx("relative flex h-full flex-col items-center justify-center gap-0.5 pt-1 text-[0.625rem] font-medium tracking-[0.005em] transition-colors", active ? "text-gold" : "text-slate-500 hover:text-ivory")} data-testid={`nav-${n.label.toLowerCase()}`}>
                  <span className="relative">
                    <n.icon className="size-6" strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                    {n.href === "/preboard" && hydrated && preboardLeft > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 grid min-w-[1.125rem] h-[1.125rem] place-items-center rounded-full bg-bad px-1 text-[0.6875rem] font-semibold leading-none text-white tnum" data-testid="boarding-badge">
                        {preboardLeft}
                      </span>
                    )}
                  </span>
                  <span>{n.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading CabinSafe">
      <div className="flex items-center gap-3 py-6">
        <Logo size={44} className="animate-pulse" />
        <div>
          <div className="display text-2xl text-ivory">CabinSafe</div>
          <div className="text-xs text-slate">Preparing your command center…</div>
        </div>
      </div>
      <Skeleton className="h-44" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  );
}
