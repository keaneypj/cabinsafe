"use client";

import Link from "next/link";
import { useState } from "react";
import { Accessibility, ChevronRight, Cpu, HeartPulse, Lock, Nut, PawPrint, Plus, Sparkle, Stethoscope, Utensils } from "lucide-react";
import { can } from "@/domain/permissions";
import { specsForPassenger } from "@/domain/rules";
import type { AccommodationType, Flight, Passenger, Task } from "@/domain/types";
import { cx } from "@/lib/format";
import { useMe, useStore } from "@/store/store";
import { Avatar, Badge, Button, EmptyState, Notice, Sheet, report } from "./ui";

export const ACC_META: Record<AccommodationType, { label: string; icon: typeof Nut }> = {
  mobility: { label: "Mobility", icon: Accessibility },
  allergy: { label: "Allergy", icon: Nut },
  medical_equipment: { label: "Medical equipment", icon: Stethoscope },
  medical_plan: { label: "Care plan", icon: HeartPulse },
  dietary: { label: "Dietary", icon: Utensils },
  pet: { label: "Animal", icon: PawPrint },
  comfort: { label: "Service", icon: Sparkle },
};

export function AccommodationChips({ p }: { p: Passenger }) {
  const me = useMe();
  const medical = can(me.role, "medical.view");
  const types = [...new Set(p.accommodations.map((a) => a.type))];
  return (
    <span className="flex flex-wrap gap-1">
      {types.map((t) => {
        const M = ACC_META[t];
        const restricted = (t === "medical_plan" || t === "medical_equipment") && !medical;
        return (
          <Badge key={t} tone={t === "allergy" ? "bad" : t === "mobility" || t === "medical_equipment" || t === "medical_plan" ? "warn" : "neutral"} icon={restricted ? <Lock className="size-3" /> : <M.icon className="size-3" />}>
            {restricted ? "Restricted" : M.label}
          </Badge>
        );
      })}
      {p.dietary.length > 0 && (
        <Badge tone="neutral" icon={<Utensils className="size-3" />}>
          Dietary
        </Badge>
      )}
    </span>
  );
}

export function PassengerRow({ p, href, trailing }: { p: Passenger; href: string; trailing?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3 min-h-16">
      <Link href={href} className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar initials={p.initials} tone={p.category === "principal" ? "gold" : "navy"} size={40} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="font-semibold tracking-wider text-ivory">{p.alias}</span>
            {p.category === "pet" && <PawPrint className="size-3.5 text-gold" aria-label="Animal" />}
          </span>
          <span className="block text-xs text-slate truncate mb-1">{p.relationship}</span>
          <AccommodationChips p={p} />
        </span>
        <ChevronRight className="size-4 text-slate-500 shrink-0" aria-hidden />
      </Link>
      {trailing}
    </div>
  );
}

export function AddPassengerSheet({ flight, open, onClose, onAdded }: { flight: Flight; open: boolean; onClose: () => void; onAdded?: (generated: Task[]) => void }) {
  const passengers = useStore((s) => s.passengers);
  const add = useStore((s) => s.addPassengerToFlight);
  const [result, setResult] = useState<{ alias: string; tasks: Task[] } | null>(null);
  const available = passengers.filter((p) => !flight.manifest.includes(p.id));
  const close = () => {
    setResult(null);
    onClose();
  };
  return (
    <Sheet open={open} onClose={close} title={result ? `${result.alias} added to ${flight.callsign}` : `Add passenger to ${flight.callsign}`} subtitle={result ? "Rules engine generated preparation tasks" : "Aliases only · synthetic profiles"}>
      {result ? (
        <div data-testid="generated-result">
          {result.tasks.length ? (
            <>
              <p className="text-sm text-slate mb-3">
                <span className="text-ivory font-semibold">{result.tasks.length} preparation task{result.tasks.length > 1 ? "s" : ""}</span> created from documented accommodation records. Review them in the checklist — they are flagged until reviewed by the Lead Cabin Attendant.
              </p>
              <ul className="space-y-2">
                {result.tasks.map((t) => (
                  <li key={t.id} className="rounded-xl border border-slate/12 bg-midnight-900/30 p-3">
                    <div className="text-sm text-ivory flex items-start gap-2">
                      <Cpu className="size-4 text-gold shrink-0 mt-0.5" />
                      {t.title}
                    </div>
                    <div className="text-[0.6875rem] text-slate-500 mt-1 pl-6">{t.sourceRef}</div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Notice tone="info">No documented accommodations — no preparation tasks were required.</Notice>
          )}
          <Button className="w-full mt-4" onClick={close}>
            Done
          </Button>
        </div>
      ) : available.length === 0 ? (
        <EmptyState title="All profiles are on this manifest" />
      ) : (
        <ul className="space-y-2">
          {available.map((p) => {
            const specs = specsForPassenger(p, flight);
            return (
              <li key={p.id}>
                <button
                  className="w-full flex items-center gap-3 rounded-2xl border border-slate/12 bg-midnight-900/30 p-3 text-left hover:border-gold/40 transition-colors min-h-16"
                  onClick={() => {
                    const res = add(flight.id, p.id);
                    if (report(res, `${p.alias} added to ${flight.callsign}`)) {
                      setResult({ alias: p.alias, tasks: res.ok ? res.value?.generated ?? [] : [] });
                      onAdded?.(res.ok ? res.value?.generated ?? [] : []);
                    }
                  }}
                  data-testid={`add-pax-${p.alias}`}
                >
                  <Avatar initials={p.initials} size={38} />
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold tracking-wider">{p.alias}</span>
                    <span className="block text-xs text-slate">{p.relationship}</span>
                    <span className={cx("block text-[0.6875rem] mt-0.5", specs.length ? "text-gold" : "text-slate-500")}>{specs.length ? `Will generate ${specs.length} preparation task${specs.length > 1 ? "s" : ""}` : "No rule-based tasks"}</span>
                  </span>
                  <Plus className="size-5 text-gold" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
