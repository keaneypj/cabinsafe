"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, CircleCheck, CircleX } from "lucide-react";
import { Badge, Card, EmptyState, LinkButton } from "@/components/ui";
import { DUTIES, DUTY_GROUP_TITLES, DUTY_GROUPS, fmtFlightDate, missedDuties, sortHandoverForms, YES_NO_NA_LABELS } from "@/domain/handoverForm";
import { fmtDateTime } from "@/lib/format";
import { useStore } from "@/store/store";

/** One submitted Handover Form, read-only. */
export default function HandoverFormView() {
  const { id } = useParams<{ id: string }>();
  const forms = useStore((s) => s.handoverForms);
  const f = forms.find((x) => x.id === id);
  if (!f) return <EmptyState title="Handover not found" action={<LinkButton href="/documents" variant="secondary">Documents</LinkButton>} />;
  const latest = sortHandoverForms(forms)[0]?.id === f.id;
  const missed = missedDuties(f);
  const yn = (v?: boolean) => (v === undefined ? "—" : v ? "Yes" : "No");

  return (
    <div className="space-y-4" data-testid="handover-view">
      <Link href="/documents" className="inline-flex items-center gap-1 min-h-10 text-[0.9375rem] text-gold font-medium">
        <ChevronLeft className="size-5" aria-hidden /> Documents
      </Link>
      <header>
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {latest && <Badge tone="gold">Most recent</Badge>}
          {f.sample && <Badge tone="sim">Sample</Badge>}
        </div>
        <h1 className="display text-[1.875rem] leading-tight text-ivory">Handover · {f.parkingAirport}</h1>
        <p className="text-[0.9375rem] text-slate-400 mt-1">{fmtFlightDate(f.flightDate)}</p>
      </header>

      <Card className="grid grid-cols-2 gap-3 text-[0.875rem]">
        <Info label="Flight attendant" value={f.attendantName} />
        <Info label="Date of flight" value={fmtFlightDate(f.flightDate)} />
        <Info label="Parked overnight at" value={f.parkingAirport} />
        <Info label="Submitted" value={fmtDateTime(f.submittedAt)} />
      </Card>

      {missed.length > 0 ? (
        <Card className="border border-warn/30" data-testid="handover-missed">
          <h2 className="font-semibold text-warn mb-1.5">{missed.length === 1 ? "1 duty not completed" : `${missed.length} duties not completed`}</h2>
          <ul className="space-y-1.5 text-[0.875rem]">
            {missed.map((m) => (
              <li key={`${m.group}-${m.label}`}>
                <span className="text-ivory">{m.label}</span>
                <span className="block text-slate-400">{m.reason}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card className="text-[0.875rem] text-ok">All galley, cabin and washroom duties completed.</Card>
      )}

      {DUTY_GROUPS.map((g) => (
        <section key={g}>
          <h2 className="px-1 mb-2 text-[1.0625rem] font-semibold text-ivory">{DUTY_GROUP_TITLES[g]}</h2>
          <ul className="card p-0 divide-y divide-[var(--separator)]">
            {DUTIES[g].map((d) => {
              const a = f.duties[g][d.key];
              return (
                <li key={d.key} className="flex gap-2.5 px-3.5 py-2.5">
                  {a?.done ? <CircleCheck className="size-5 text-ok shrink-0" aria-label="Completed" /> : <CircleX className="size-5 text-warn shrink-0" aria-label="Not completed" />}
                  <span className="text-[0.9375rem] text-ivory">
                    {d.label}
                    {a?.done === false && a.reason && <span className="block text-[0.8125rem] text-slate-400">{a.reason}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <section>
        <h2 className="px-1 mb-2 text-[1.0625rem] font-semibold text-ivory">Offloaded to FBO</h2>
        <Card className="space-y-2.5 text-[0.9375rem]">
          <Row label="Dishes" value={yn(f.dishes)} detail={f.dishes ? f.dishesWhich : undefined} />
          <Row label="Fridge bag" value={yn(f.fridgeBag)} />
          <Row label="Laundry" value={yn(f.laundry)} detail={f.laundry ? f.laundryWhich : undefined} />
          <Row label="Winter ops completed" value={f.winterOps ? YES_NO_NA_LABELS[f.winterOps] : "—"} />
          <Row label="Summer ops completed" value={f.summerOps ? YES_NO_NA_LABELS[f.summerOps] : "—"} />
        </Card>
      </section>

      <section>
        <h2 className="px-1 mb-2 text-[1.0625rem] font-semibold text-ivory">Fridge Bag Contents</h2>
        <Card className="text-[0.9375rem]">
          {f.fridgeBagItems.length ? (
            <ul className="list-disc pl-5 space-y-1 text-ivory">
              {f.fridgeBagItems.map((it, i) => (
                <li key={`${it}-${i}`}>{it}</li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-400">No fridge bag offloaded.</p>
          )}
        </Card>
      </section>

      <section>
        <h2 className="px-1 mb-2 text-[1.0625rem] font-semibold text-ivory">Aircraft Comments</h2>
        <Card className="text-[0.9375rem] text-ivory whitespace-pre-wrap">{f.comments || <span className="text-slate-400">No comments.</span>}</Card>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[0.75rem] text-slate-500">{label}</span>
      <span className="text-ivory">{value}</span>
    </div>
  );
}

function Row({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div>
      <div className="flex justify-between gap-3">
        <span className="text-slate-400">{label}</span>
        <span className="text-ivory font-medium">{value}</span>
      </div>
      {detail && <p className="text-[0.8125rem] text-slate-400 mt-0.5">{detail}</p>}
    </div>
  );
}
