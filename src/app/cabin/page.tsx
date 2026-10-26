"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useState } from "react";
import { ChevronRight, List, Map as MapIcon } from "lucide-react";
import { CabinMap, CATEGORY_META, STATUS_STYLE, StatusLegend } from "@/components/CabinMap";
import { EquipmentSheet } from "@/components/EquipmentSheet";
import { Card, Chip, PageTitle, Segmented, VerifyNotice } from "@/components/ui";
import { AIRCRAFT } from "@/data/aircraft";
import { effectiveEquipmentStatus } from "@/domain/readiness";
import type { Equipment, EquipmentCategory, EquipmentStatus, ZoneId } from "@/domain/types";
import { fmtRelative } from "@/lib/format";
import { useNow } from "@/store/hooks";
import { useStore } from "@/store/store";

const FILTERS: { key: string; label: string; cats: EquipmentCategory[] }[] = [
  { key: "all", label: "All", cats: [] },
  { key: "medical", label: "Medical & AED", cats: ["aed", "first_aid", "medical_kit", "telemedical"] },
  { key: "fire", label: "Fire", cats: ["fire_extinguisher", "pbe"] },
  { key: "oxygen", label: "Oxygen", cats: ["oxygen"] },
  { key: "lights", label: "Flashlights", cats: ["flashlight"] },
  { key: "attention", label: "Needs attention", cats: [] },
];

const ORDER: EquipmentStatus[] = ["unserviceable", "inspection_due", "discrepancy", "due_soon", "serviceable"];

export default function CabinPage() {
  return (
    <Suspense>
      <Cabin />
    </Suspense>
  );
}

function Cabin() {
  const sp = useSearchParams();
  const router = useRouter();
  const now = useNow();
  const equipment = useStore((s) => s.equipment);
  const [view, setView] = useState<"map" | "list">("map");
  const [filter, setFilter] = useState("all");
  const [zone, setZone] = useState<ZoneId | undefined>();
  const selected = sp.get("eq");

  const statusOf = useCallback((e: Equipment) => effectiveEquipmentStatus(e, now), [now]);
  const visible = useCallback(
    (e: Equipment) => {
      const f = FILTERS.find((x) => x.key === filter)!;
      if (zone && e.zone !== zone) return false;
      if (filter === "attention") return statusOf(e) !== "serviceable";
      return f.cats.length === 0 || f.cats.includes(e.category);
    },
    [filter, zone, statusOf],
  );
  const counts = useMemo(() => equipment.reduce<Partial<Record<EquipmentStatus, number>>>((acc, e) => ({ ...acc, [statusOf(e)]: (acc[statusOf(e)] ?? 0) + 1 }), {}), [equipment, statusOf]);
  const select = (e: Equipment) => router.replace(`/cabin?eq=${e.id}`, { scroll: false });
  const close = () => router.replace("/cabin", { scroll: false });
  const list = equipment.filter(visible).sort((a, b) => ORDER.indexOf(statusOf(a)) - ORDER.indexOf(statusOf(b)) || a.code.localeCompare(b.code));

  return (
    <div>
      <PageTitle eyebrow={`${AIRCRAFT.tail} · ${AIRCRAFT.year} G700 · conceptual`} title="Cabin Safety Map" subtitle="Five living zones · tap any marker to open its equipment record" action={<Segmented ariaLabel="View" value={view} onChange={setView} options={[{ value: "map", label: "Map" }, { value: "list", label: "List" }]} />} />
      <VerifyNotice className="mb-3" />

      <div className="scroll-x -mx-4 px-4 mb-3">
        <div className="flex gap-1.5 w-max">
          {FILTERS.map((f) => (
            <Chip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)} count={f.key === "attention" ? equipment.filter((e) => statusOf(e) !== "serviceable").length : f.cats.length ? equipment.filter((e) => f.cats.includes(e.category)).length : equipment.length}>
              {f.label}
            </Chip>
          ))}
        </div>
      </div>

      {view === "map" ? (
        <div className="md:grid md:grid-cols-[minmax(0,1fr)_15rem] md:gap-4">
          <Card className="p-2 sm:p-3 overflow-hidden relative">
            {zone && (
              <button onClick={() => setZone(undefined)} className="absolute right-3 top-3 z-10 rounded-full bg-gold/15 border border-gold/40 text-gold text-xs px-3 min-h-8">
                {AIRCRAFT.zones.find((z) => z.id === zone)?.name} · clear
              </button>
            )}
            <div className="mx-auto max-w-[26rem]">
              <CabinMap equipment={equipment} statusOf={statusOf} selectedId={selected ?? undefined} onSelect={select} visible={visible} activeZone={zone} onZone={setZone} />
            </div>
          </Card>
          <div className="mt-4 md:mt-0 space-y-3">
            <Card className="p-3">
              <div className="eyebrow mb-2">Status legend</div>
              <StatusLegend counts={counts} />
            </Card>
            <Card className="p-3 hidden md:block">
              <div className="eyebrow mb-2">Zones</div>
              <ul className="space-y-1 text-xs">
                {AIRCRAFT.zones.map((z) => (
                  <li key={z.id}>
                    <button onClick={() => setZone(zone === z.id ? undefined : z.id)} className={zone === z.id ? "text-gold" : "text-slate hover:text-ivory"}>
                      {z.name}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      ) : (
        <div className="card p-0 divide-y divide-slate/10 overflow-hidden" data-testid="equipment-list">
          {list.map((e) => {
            const st = STATUS_STYLE[statusOf(e)];
            const Icon = CATEGORY_META[e.category].icon;
            return (
              <button key={e.id} onClick={() => select(e)} className="w-full flex items-center gap-3 px-3.5 py-3 min-h-15 text-left hover:bg-navy-700/30">
                <span className="grid size-9 place-items-center rounded-full border shrink-0" style={{ background: st.fill, borderColor: st.stroke, color: st.text }}>
                  <Icon className="size-4" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-ivory">
                    <span className="text-gold font-semibold tracking-wider mr-1.5">{e.code}</span>
                    {e.name}
                  </span>
                  <span className="block text-xs text-slate">
                    {AIRCRAFT.zones.find((z) => z.id === e.zone)?.name} · next due {fmtRelative(e.nextInspectionDue, now)}
                  </span>
                </span>
                <span className="text-[0.6875rem] font-semibold" style={{ color: st.stroke }}>
                  {st.label}
                </span>
                <ChevronRight className="size-4 text-slate-500" />
              </button>
            );
          })}
        </div>
      )}
      <p className="text-[0.6875rem] text-slate-500 mt-3 flex items-center gap-1.5">
        {view === "map" ? <MapIcon className="size-3.5" /> : <List className="size-3.5" />} Markers represent demonstration equipment categories in a conceptual layout; they do not represent actual G700 equipment locations.
      </p>
      <EquipmentSheet equipmentId={selected} onClose={close} />
    </div>
  );
}
