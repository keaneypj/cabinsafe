"use client";

import { ShieldCheck } from "lucide-react";
import { PassengerRow } from "@/components/passengers";
import { Notice, PageTitle } from "@/components/ui";
import { can } from "@/domain/permissions";
import { RULES_DESCRIPTION } from "@/domain/rules";
import { useMe, useStore } from "@/store/store";

export default function PassengersPage() {
  const passengers = useStore((s) => s.passengers);
  const me = useMe();
  return (
    <div>
      <PageTitle eyebrow="Passenger Safety" title="Passenger Profiles" subtitle="Fictional aliases · synthetic records · need-to-know access" />
      <Notice tone={can(me.role, "medical.view") ? "gold" : "neutral"} className="mb-4">
        {can(me.role, "medical.view")
          ? "You are viewing as Lead Cabin Attendant: restricted medical context is visible and must not be shared beyond authorized personnel (CSI-MED-002 §4)."
          : "Medical details are restricted to the Lead Cabin Attendant. Operational summaries only."}
      </Notice>
      <div className="card p-0 divide-y divide-slate/10 overflow-hidden mb-5">
        {passengers.map((p) => (
          <PassengerRow key={p.id} p={p} href={`/passengers/${p.id}`} />
        ))}
      </div>
      <section className="card p-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="size-4.5 text-gold" />
          <h2 className="font-semibold">Preparation rules engine</h2>
        </div>
        <p className="text-xs text-slate mb-3">Rules act only on documented records and create preparation, verification or confirmation tasks. They never infer treatment or equipment from a medical condition. Generated tasks require Lead CA review.</p>
        <ul className="space-y-2">
          {RULES_DESCRIPTION.map((r) => (
            <li key={r.key} className="rounded-xl bg-midnight-900/35 border border-slate/10 p-3 text-xs">
              <div className="text-ivory font-medium">{r.when}</div>
              <div className="text-slate mt-0.5">→ {r.creates}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
