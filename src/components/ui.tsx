"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { CircleAlert, CircleCheck, FlaskConical, Info, ShieldAlert, X } from "lucide-react";
import { cx } from "@/lib/format";

// ───────────────────────── Buttons ─────────────────────────

type Variant = "primary" | "secondary" | "ghost" | "danger" | "quiet";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-gold text-midnight font-semibold hover:opacity-90 active:opacity-75",
  secondary: "bg-gold/12 text-gold font-semibold hover:bg-gold/18 active:bg-gold/25",
  ghost: "text-gold font-medium hover:bg-gold/10 active:bg-gold/15",
  danger: "bg-bad-bg text-bad font-semibold hover:opacity-90",
  quiet: "text-slate font-medium hover:bg-navy-700 hover:text-ivory",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  loading,
  children,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: "sm" | "md" | "lg"; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 transition-[opacity,background-color] disabled:opacity-40 disabled:pointer-events-none select-none",
        size === "sm" && "min-h-9 px-3.5 text-[0.875rem] rounded-full",
        size === "md" && "min-h-11 px-4 text-[1rem] rounded-xl",
        size === "lg" && "min-h-[3.25rem] px-5 text-[1.0625rem] rounded-[0.875rem]",
        VARIANTS[variant],
        className,
      )}
    >
      {loading && <span className="size-4 rounded-full border-2 border-current border-r-transparent animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({ href, variant = "primary", size = "md", className, children }: { href: string; variant?: Variant; size?: "sm" | "md" | "lg"; className?: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 transition-[opacity,background-color] select-none",
        size === "sm" && "min-h-9 px-3.5 text-[0.875rem] rounded-full",
        size === "md" && "min-h-11 px-4 text-[1rem] rounded-xl",
        size === "lg" && "min-h-[3.25rem] px-5 text-[1.0625rem] rounded-[0.875rem]",
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}

// ───────────────────────── Surfaces ─────────────────────────

export function Card({ className, children, ...rest }: ComponentProps<"section">) {
  return (
    <section {...rest} className={cx("card p-4", className)}>
      {children}
    </section>
  );
}

/** Section title in the Apple "Up Next" style. `eyebrow` is kept for context but rendered only to assistive tech. */
export function SectionHeader({ title, eyebrow, action }: { title: string; eyebrow?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-2 mt-1 px-1">
      <div>
        {eyebrow && <span className="sr-only">{eyebrow}: </span>}
        <h2 className="text-[1.25rem] font-bold tracking-[-0.02em] text-ivory leading-tight">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function PageTitle({ title, subtitle, eyebrow, action }: { title: string; subtitle?: ReactNode; eyebrow?: string; action?: ReactNode }) {
  return (
    <header className="mb-5 animate-fade-up">
      {action && <div className="flex justify-end mb-1">{action}</div>}
      <div className="min-w-0">
        {eyebrow && <span className="sr-only">{eyebrow}: </span>}
        <h1 className="display text-[2.125rem] leading-[1.1] text-ivory">{title}</h1>
        {subtitle && <div className="text-[0.9375rem] text-slate-400 mt-1">{subtitle}</div>}
      </div>
    </header>
  );
}

// ───────────────────────── Badges ─────────────────────────

export type Tone = "ok" | "warn" | "bad" | "info" | "neutral" | "gold" | "sim";

const TONES: Record<Tone, string> = {
  ok: "bg-ok-bg text-ok border-transparent",
  warn: "bg-warn-bg text-warn border-transparent",
  bad: "bg-bad-bg text-bad border-transparent",
  info: "bg-info-bg text-info border-transparent",
  neutral: "bg-navy-700 text-slate border-transparent",
  gold: "bg-gold/12 text-gold border-transparent",
  sim: "bg-sim-bg text-sim border-transparent",
};

export function Badge({ tone = "neutral", children, className, icon }: { tone?: Tone; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[0.6875rem] font-semibold whitespace-nowrap", TONES[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

export function SimulatedBadge({ className }: { className?: string }) {
  return (
    <Badge tone="sim" className={className} icon={<FlaskConical className="size-3" aria-hidden />}>
      SIMULATED
    </Badge>
  );
}

export function VerifyNotice({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cx("flex items-start gap-2 rounded-xl bg-warn-bg text-warn", compact ? "px-2.5 py-1.5 text-[0.6875rem]" : "px-3 py-2.5 text-[0.8125rem]", className)} role="note">
      <ShieldAlert className={cx("shrink-0", compact ? "size-3.5 mt-px" : "size-4")} aria-hidden />
      <span>
        <strong className="font-semibold">Demonstration — Aircraft Verification Required.</strong>
        {!compact && " Conceptual layout and equipment positions; not derived from approved aircraft documentation."}
      </span>
    </div>
  );
}

export function Notice({ tone = "info", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  const Icon = tone === "bad" || tone === "warn" ? CircleAlert : Info;
  return (
    <div className={cx("flex items-start gap-2 rounded-xl px-3 py-2.5 text-[0.8125rem] leading-snug", TONES[tone], className)} role="note">
      <Icon className="size-4 shrink-0 mt-px" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

// ───────────────────────── Progress ─────────────────────────

export function ProgressBar({ value, tone = "gold", label }: { value: number; tone?: "gold" | "ok" | "warn" | "bad"; label?: string }) {
  const color = { gold: "bg-gold", ok: "bg-ok", warn: "bg-warn", bad: "bg-bad" }[tone];
  return (
    <div className="h-1.5 w-full rounded-full bg-navy-700 overflow-hidden" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cx("h-full rounded-full transition-[width] duration-700 ease-out", color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Ring({ value, size = 112, stroke = 9, tone = "gold", children, label }: { value: number; size?: number; stroke?: number; tone?: "gold" | "ok" | "warn" | "bad"; children?: ReactNode; label: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = { gold: "var(--color-gold)", ok: "var(--color-ok)", warn: "var(--color-warn)", bad: "var(--color-bad)" }[tone];
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${Math.round(value)} of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} style={{ stroke: "var(--color-navy-700)" }} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          style={{ stroke: color, transition: "stroke-dashoffset 0.9s cubic-bezier(.2,.7,.2,1)" }}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(100, value)) / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

// ───────────────────────── States ─────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-xl bg-navy-700", className)} aria-hidden />;
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card-quiet flex flex-col items-center text-center px-6 py-8">
      {icon && <div className="mb-2.5 text-slate-500">{icon}</div>}
      <div className="font-semibold text-ivory">{title}</div>
      {children && <div className="text-[0.875rem] text-slate-400 mt-1 max-w-sm">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ───────────────────────── Sheet (modal) ─────────────────────────

export function Sheet({ open, onClose, title, subtitle, children, footer, labelledBy }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; labelledBy?: string }) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTimeout(() => panel.current?.focus(), 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open || !mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/35 animate-fade-in" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? id}
        tabIndex={-1}
        className="relative w-full md:max-w-xl max-h-[92dvh] flex flex-col rounded-t-[1.25rem] md:rounded-[1.25rem] bg-navy shadow-[var(--shadow-lift)] animate-sheet-up md:animate-fade-up outline-none"
        style={{ paddingBottom: "max(var(--safe-bottom), 0.5rem)" }}
      >
        <div className="mx-auto mt-1.5 h-[5px] w-9 rounded-full bg-slate-500/40 md:hidden" aria-hidden />
        <div className="flex items-start gap-3 px-5 pt-3 pb-3 border-b hairline">
          <div className="min-w-0 flex-1">
            <h2 id={labelledBy ?? id} className="text-[1.0625rem] font-semibold text-ivory leading-snug tracking-[-0.01em]">
              {title}
            </h2>
            {subtitle && <div className="text-xs text-slate mt-0.5">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="-mr-1 grid size-8 place-items-center rounded-full bg-navy-700 text-slate-400 hover:text-ivory" aria-label="Close">
            <X className="size-4" strokeWidth={2.5} />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 py-4 flex-1">{children}</div>
        {footer && <div className="px-5 pt-3 pb-2 border-t hairline flex gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({ open, title, body, confirmLabel, tone = "primary", onConfirm, onCancel }: { open: boolean; title: string; body: ReactNode; confirmLabel: string; tone?: "primary" | "danger"; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Sheet
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} className="flex-1" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-slate leading-relaxed">{body}</div>
    </Sheet>
  );
}

// ───────────────────────── Form fields ─────────────────────────

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="mb-3.5">
      <label htmlFor={htmlFor} className="block text-[0.8125rem] font-medium text-slate-400 mb-1.5 px-0.5">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[0.6875rem] text-slate-500 mt-1">{hint}</p>}
      {error && (
        <p className="text-xs text-bad mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** iOS segmented control for up to three options; tinted option pills beyond that. */
export function Segmented<T extends string>({ value, options, onChange, ariaLabel }: { value: T; options: { value: T; label: string; tone?: Tone }[]; onChange: (v: T) => void; ariaLabel: string }) {
  if (options.length <= 3) {
    return (
      <div role="radiogroup" aria-label={ariaLabel} className="inline-flex w-full min-w-[9rem] rounded-[0.6rem] bg-navy-700 p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cx("flex-1 min-h-8 rounded-[0.5rem] px-3 text-[0.8125rem] whitespace-nowrap transition-colors", value === o.value ? "seg-on text-ivory font-semibold" : "text-slate hover:text-ivory")}
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx("min-h-9 rounded-full px-3.5 text-[0.875rem] transition-colors", value === o.value ? "bg-gold text-midnight font-semibold" : "bg-navy-700 text-slate hover:text-ivory")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, children, onClick, count }: { active?: boolean; children: ReactNode; onClick?: () => void; count?: number }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "shrink-0 inline-flex items-center gap-1.5 min-h-9 rounded-full px-3.5 text-[0.875rem] transition-colors",
        active ? "bg-ivory text-midnight font-semibold" : "bg-navy text-slate hover:text-ivory border border-[var(--card-border)]",
      )}
    >
      {children}
      {count !== undefined && <span className={cx("tnum text-[0.75rem]", active ? "opacity-70" : "text-slate-500")}>{count}</span>}
    </button>
  );
}

export function Avatar({ initials, tone = "navy", size = 36 }: { initials: string; tone?: "navy" | "gold"; size?: number }) {
  return (
    <span
      className={cx("inline-grid place-items-center rounded-full font-semibold shrink-0", tone === "gold" ? "bg-gold/15 text-gold" : "bg-navy-600 text-slate")}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

// ───────────────────────── Toasts ─────────────────────────

interface Toast {
  id: number;
  tone: "ok" | "bad" | "info";
  text: string;
}

const useToasts = create<{ toasts: Toast[]; push: (t: Omit<Toast, "id">) => void; drop: (id: number) => void }>((set) => ({
  toasts: [],
  push: (t) => {
    const id = Date.now() + Math.random();
    set({ toasts: [{ ...t, id }] });
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), t.tone === "bad" ? 5200 : 3400);
  },
  drop: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export const toast = {
  ok: (text: string) => useToasts.getState().push({ tone: "ok", text }),
  error: (text: string) => useToasts.getState().push({ tone: "bad", text }),
  info: (text: string) => useToasts.getState().push({ tone: "info", text }),
};

/** Show the result of a store action as a toast. Returns true on success. */
export function report(res: { ok: boolean; error?: string }, success?: string): boolean {
  if (res.ok) {
    if (success) toast.ok(success);
    return true;
  }
  toast.error(res.error ?? "Something went wrong.");
  return false;
}

export function Toaster() {
  const { toasts, drop } = useToasts();
  return (
    <div className="fixed inset-x-0 top-0 z-[80] flex flex-col items-center gap-2 px-4 pointer-events-none" style={{ paddingTop: "calc(var(--safe-top) + 0.75rem)" }} aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === "bad" ? "alert" : "status"}
          className={cx(
            "pointer-events-auto w-full max-w-md flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[0.9375rem] font-medium shadow-[var(--shadow-lift)] animate-fade-up backdrop-blur-xl bg-[var(--chrome)] text-ivory border border-[var(--card-border)]",
          )}
          onClick={() => drop(t.id)}
        >
          {t.tone === "ok" ? <CircleCheck className="size-4.5 text-ok shrink-0 mt-px" /> : t.tone === "bad" ? <CircleAlert className="size-4.5 text-bad shrink-0 mt-px" /> : <Info className="size-4.5 text-gold shrink-0 mt-px" />}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
