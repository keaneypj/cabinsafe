"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, CircleCheck, Plus, X } from "lucide-react";
import { Button, Card, Field, LinkButton, Segmented, toast } from "@/components/ui";
import {
  blankHandoverForm,
  COMMENTS_MAX,
  DUTIES,
  DUTY_GROUP_TITLES,
  DUTY_GROUPS,
  fmtFlightDate,
  localYmd,
  TEXT_MAX,
  validateHandoverForm,
  YES_NO_NA_LABELS,
  type DutyGroup,
  type HandoverFormData,
  type SubmittedHandoverForm,
  type YesNoNa,
} from "@/domain/handoverForm";
import { useMe, useStore } from "@/store/store";

/** An unsent form is kept on this device so switching tabs doesn't lose it. */
const DRAFT_KEY = "cabinsafe-handover-draft";

function readDraft(): HandoverFormData | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as HandoverFormData) : null;
  } catch {
    return null;
  }
}
function writeDraft(f: HandoverFormData | null) {
  try {
    if (f) localStorage.setItem(DRAFT_KEY, JSON.stringify(f));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage unavailable: the form still works, it just isn't kept */
  }
}

const fieldId = (key: string) => `f-${key.replace(/:/g, "-")}`;

export default function HandoverFormPage() {
  const me = useMe();
  const flights = useStore((s) => s.flights);
  const submit = useStore((s) => s.submitHandoverForm);
  const defaults = useMemo(() => {
    const now = Date.now();
    const last = [...flights].filter((f) => Date.parse(f.departAt) <= now).sort((a, b) => b.departAt.localeCompare(a.departAt))[0];
    return blankHandoverForm(me.name, localYmd(last ? Date.parse(last.departAt) : now));
  }, [flights, me.name]);

  const [form, setForm] = useState<HandoverFormData>(defaults);
  const [loaded, setLoaded] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [done, setDone] = useState<SubmittedHandoverForm | null>(null);
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    const d = readDraft();
    if (d) setForm({ ...defaults, ...d, duties: { ...defaults.duties, ...d.duties } });
    setLoaded(true);
    // Only on first open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (loaded && !done) writeDraft(form);
  }, [form, loaded, done]);

  const errors = useMemo(() => validateHandoverForm(form), [form]);
  const err = (k: string) => (showErrors ? errors[k] : undefined);
  const patch = (p: Partial<HandoverFormData>) => setForm((f) => ({ ...f, ...p }));
  const setDuty = (g: DutyGroup, key: string, a: { done?: boolean; reason?: string }) =>
    setForm((f) => ({ ...f, duties: { ...f.duties, [g]: { ...f.duties[g], [key]: { ...f.duties[g][key], ...a } } } }));

  const addItem = () => {
    const v = newItem.trim().replace(/\s+/g, " ");
    if (!v) return;
    if (v.length > 80) return toast.error("Keep each item under 80 characters.");
    patch({ fridgeBagItems: [...form.fridgeBagItems, v] });
    setNewItem("");
  };

  const onSubmit = () => {
    const keys = Object.keys(errors);
    if (keys.length) {
      setShowErrors(true);
      toast.error(keys.length === 1 ? "1 thing to fix before sending." : `${keys.length} things to fix before sending.`);
      requestAnimationFrame(() => document.getElementById(fieldId(keys[0]))?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    const res = submit(form);
    if (!res.ok) return toast.error(res.error);
    writeDraft(null);
    setDone(res.value ?? null);
    toast.ok("Handover submitted");
    window.scrollTo({ top: 0 });
  };

  if (done)
    return (
      <div className="pt-6 text-center animate-fade-up" data-testid="handover-submitted">
        <CircleCheck className="mx-auto size-14 text-ok" aria-hidden />
        <h1 className="display mt-3 text-[1.75rem] text-ivory">Handover submitted</h1>
        <p className="mt-2 text-[0.9375rem] text-slate-400">
          {fmtFlightDate(done.flightDate)} · parked at {done.parkingAirport}
        </p>
        <p className="mt-1 mx-auto max-w-sm text-[0.875rem] text-slate-400">It is now at the top of Past handovers on the Documents page, so the next cabin host can read it.</p>
        <div className="mt-6 flex flex-col gap-2 max-w-xs mx-auto">
          <LinkButton href={`/documents/handover/${done.id}`}>View handover</LinkButton>
          <LinkButton href="/documents" variant="secondary">
            Back to Documents
          </LinkButton>
        </div>
      </div>
    );

  return (
    <div className="space-y-4" data-testid="handover-form">
      <Link href="/documents" className="inline-flex items-center gap-1 min-h-10 text-[0.9375rem] text-gold font-medium">
        <ChevronLeft className="size-5" aria-hidden /> Documents
      </Link>
      <header>
        <h1 className="display text-[2rem] leading-tight text-ivory">Handover Form</h1>
        <p className="text-[0.9375rem] text-slate-400 mt-1">Fill this out after every flight. The next cabin host reads it before their trip.</p>
      </header>

      <Card>
        <Field label="Flight attendant name" htmlFor={fieldId("name")} error={err("name")}>
          <input id={fieldId("name")} className="field" value={form.attendantName} onChange={(e) => patch({ attendantName: e.target.value })} maxLength={60} autoComplete="name" data-testid="hf-name" />
        </Field>
        <Field label="Date of flight" htmlFor={fieldId("date")} error={err("date")}>
          <input id={fieldId("date")} type="date" className="field" value={form.flightDate} onChange={(e) => patch({ flightDate: e.target.value })} data-testid="hf-date" />
        </Field>
        <Field label="Overnight parking airport code" htmlFor={fieldId("airport")} hint="3 or 4 letters, e.g. KMIA" error={err("airport")}>
          <input
            id={fieldId("airport")}
            className="field uppercase tnum"
            value={form.parkingAirport}
            onChange={(e) => patch({ parkingAirport: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
            maxLength={4}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="KMIA"
            data-testid="hf-airport"
          />
        </Field>
      </Card>

      {DUTY_GROUPS.map((g) => (
        <section key={g} data-testid={`hf-${g}`}>
          <h2 className="px-1 mb-2 text-[1.0625rem] font-semibold text-ivory">{DUTY_GROUP_TITLES[g]}</h2>
          <ul className="card p-0 divide-y divide-[var(--separator)]">
            {DUTIES[g].map((d) => {
              const k = `duty:${g}:${d.key}`;
              const a = form.duties[g][d.key] ?? {};
              return (
                <li key={d.key} id={fieldId(k)} className="px-3.5 py-3">
                  <div className="text-[0.9375rem] text-ivory mb-2">{d.label}</div>
                  <Segmented<"" | "done" | "not">
                    ariaLabel={d.label}
                    value={a.done === undefined ? "" : a.done ? "done" : "not"}
                    onChange={(v) => setDuty(g, d.key, { done: v === "done" })}
                    options={[
                      { value: "done", label: "Completed" },
                      { value: "not", label: "Not completed" },
                    ]}
                  />
                  {a.done === false && (
                    <textarea
                      className="field mt-2 min-h-16"
                      value={a.reason ?? ""}
                      onChange={(e) => setDuty(g, d.key, { reason: e.target.value })}
                      maxLength={TEXT_MAX}
                      placeholder="Why wasn't it completed?"
                      aria-label={`Why "${d.label}" wasn't completed`}
                      aria-invalid={!!err(k)}
                    />
                  )}
                  {err(k) && <p className="text-xs text-bad mt-1" role="alert">{err(k)}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <section data-testid="hf-offload">
        <h2 className="px-1 mb-2 text-[1.0625rem] font-semibold text-ivory">Offloaded to FBO</h2>
        <ul className="card p-0 divide-y divide-[var(--separator)]">
          <YesNoRow id={fieldId("dishes")} label="Dishes" value={form.dishes} onChange={(v) => patch({ dishes: v })} error={err("dishes")}>
            {form.dishes && (
              <>
                <textarea id={fieldId("dishesWhich")} className="field mt-2 min-h-16" value={form.dishesWhich} onChange={(e) => patch({ dishesWhich: e.target.value })} maxLength={TEXT_MAX} placeholder="Which dishes? e.g. 6 dinner plates, 4 wine glasses" aria-label="Which dishes" />
                {err("dishesWhich") && <p className="text-xs text-bad mt-1" role="alert">{err("dishesWhich")}</p>}
              </>
            )}
          </YesNoRow>
          <YesNoRow id={fieldId("fridgeBag")} label="Fridge bag" value={form.fridgeBag} onChange={(v) => patch({ fridgeBag: v })} error={err("fridgeBag")} />
          <YesNoRow id={fieldId("laundry")} label="Laundry" value={form.laundry} onChange={(v) => patch({ laundry: v })} error={err("laundry")}>
            {form.laundry && (
              <>
                <textarea id={fieldId("laundryWhich")} className="field mt-2 min-h-16" value={form.laundryWhich} onChange={(e) => patch({ laundryWhich: e.target.value })} maxLength={TEXT_MAX} placeholder="Which linens? e.g. 2 duvet covers, 4 pillowcases" aria-label="Which linens" />
                {err("laundryWhich") && <p className="text-xs text-bad mt-1" role="alert">{err("laundryWhich")}</p>}
              </>
            )}
          </YesNoRow>
          <OpsRow id={fieldId("winterOps")} label="Winter ops completed" value={form.winterOps} onChange={(v) => patch({ winterOps: v })} error={err("winterOps")} />
          <OpsRow id={fieldId("summerOps")} label="Summer ops completed" value={form.summerOps} onChange={(v) => patch({ summerOps: v })} error={err("summerOps")} />
        </ul>
      </section>

      <section id={fieldId("fridgeBagItems")} data-testid="hf-fridge">
        <h2 className="px-1 mb-2 text-[1.0625rem] font-semibold text-ivory">Fridge Bag Contents</h2>
        <Card>
          {form.fridgeBag ? (
            <>
              {form.fridgeBagItems.length > 0 && (
                <ul className="mb-3 divide-y divide-[var(--separator)]">
                  {form.fridgeBagItems.map((it, i) => (
                    <li key={`${it}-${i}`} className="flex items-center gap-2 py-2 text-[0.9375rem] text-ivory">
                      <span className="flex-1">{it}</span>
                      <button className="grid size-9 place-items-center rounded-full text-slate-400 hover:bg-navy-700" onClick={() => patch({ fridgeBagItems: form.fridgeBagItems.filter((_, j) => j !== i) })} aria-label={`Remove ${it}`}>
                        <X className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input
                  className="field flex-1"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addItem();
                    }
                  }}
                  maxLength={80}
                  placeholder="e.g. Oat milk (1, opened)"
                  aria-label="Fridge bag item"
                  data-testid="hf-fridge-input"
                />
                <Button variant="secondary" onClick={addItem} disabled={!newItem.trim()} aria-label="Add item" data-testid="hf-fridge-add">
                  <Plus className="size-4" /> Add
                </Button>
              </div>
              {err("fridgeBagItems") && <p className="text-xs text-bad mt-1" role="alert">{err("fridgeBagItems")}</p>}
            </>
          ) : (
            <p className="text-[0.875rem] text-slate-400">{form.fridgeBag === false ? "No fridge bag offloaded." : "Choose Yes for Fridge bag above to list what's in it."}</p>
          )}
        </Card>
      </section>

      <section>
        <h2 className="px-1 mb-2 text-[1.0625rem] font-semibold text-ivory">Aircraft Comments</h2>
        <Card>
          <textarea
            id={fieldId("comments")}
            className="field min-h-40"
            value={form.comments}
            onChange={(e) => patch({ comments: e.target.value })}
            maxLength={COMMENTS_MAX}
            placeholder="Anything the next cabin host or the flight crew should know about the aircraft"
            aria-label="Aircraft comments"
            data-testid="hf-comments"
          />
          {err("comments") && <p className="text-xs text-bad mt-1" role="alert">{err("comments")}</p>}
        </Card>
      </section>

      <Button size="lg" className="w-full" onClick={onSubmit} data-testid="hf-submit">
        Submit handover
      </Button>
      <p className="text-center text-[0.75rem] text-slate-500">Saved on this device only. Demonstration data.</p>
    </div>
  );
}

function YesNoRow({ id, label, value, onChange, error, children }: { id: string; label: string; value?: boolean; onChange: (v: boolean) => void; error?: string; children?: React.ReactNode }) {
  return (
    <li id={id} className="px-3.5 py-3">
      <div className="text-[0.9375rem] text-ivory mb-2">{label}</div>
      <Segmented<"" | "yes" | "no">
        ariaLabel={label}
        value={value === undefined ? "" : value ? "yes" : "no"}
        onChange={(v) => onChange(v === "yes")}
        options={[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ]}
      />
      {error && <p className="text-xs text-bad mt-1" role="alert">{error}</p>}
      {children}
    </li>
  );
}

function OpsRow({ id, label, value, onChange, error }: { id: string; label: string; value?: YesNoNa; onChange: (v: YesNoNa) => void; error?: string }) {
  return (
    <li id={id} className="px-3.5 py-3">
      <div className="text-[0.9375rem] text-ivory mb-2">{label}</div>
      <Segmented<"" | YesNoNa>
        ariaLabel={label}
        value={value ?? ""}
        onChange={(v) => v && onChange(v)}
        options={(["yes", "no", "na"] as const).map((v) => ({ value: v, label: YES_NO_NA_LABELS[v] }))}
      />
      {error && <p className="text-xs text-bad mt-1" role="alert">{error}</p>}
    </li>
  );
}
