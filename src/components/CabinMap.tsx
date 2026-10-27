"use client";

import { memo } from "react";
import { Activity, BriefcaseMedical, Cross, Flame, Flashlight, HardHat, Headset, Wind, type LucideIcon } from "lucide-react";
import { AIRCRAFT, ZONE_BANDS } from "@/data/aircraft";
import type { Equipment, EquipmentCategory, EquipmentStatus, ZoneId } from "@/domain/types";

export const CATEGORY_META: Record<EquipmentCategory, { label: string; icon: LucideIcon }> = {
  aed: { label: "AED", icon: Activity },
  first_aid: { label: "First-aid kit", icon: Cross },
  medical_kit: { label: "Emergency medical kit", icon: BriefcaseMedical },
  fire_extinguisher: { label: "Fire extinguisher", icon: Flame },
  flashlight: { label: "Flashlight", icon: Flashlight },
  oxygen: { label: "Portable oxygen", icon: Wind },
  pbe: { label: "Protective breathing equipment", icon: HardHat },
  telemedical: { label: "Telemedical kit", icon: Headset },
};

export const STATUS_STYLE: Record<EquipmentStatus, { label: string; fill: string; stroke: string; text: string; description: string }> = {
  serviceable: { label: "Serviceable", fill: "var(--color-ok-bg)", stroke: "var(--color-ok)", text: "var(--color-ok)", description: "Inspected and current" },
  due_soon: { label: "Due soon", fill: "color-mix(in oklab, var(--color-gold) 14%, var(--color-navy))", stroke: "var(--color-gold)", text: "var(--color-gold)", description: "Inspection or expiry approaching" },
  inspection_due: { label: "Inspection due", fill: "var(--color-warn-bg)", stroke: "var(--color-warn)", text: "var(--color-warn)", description: "Inspection required now" },
  discrepancy: { label: "Discrepancy", fill: "var(--color-bad-bg)", stroke: "var(--color-bad)", text: "var(--color-bad)", description: "Open discrepancy recorded" },
  unserviceable: { label: "Unserviceable", fill: "var(--color-bad)", stroke: "var(--color-bad)", text: "var(--color-navy)", description: "Not available for use" },
};

const W = 300;
const H = 990;

const ZONE_SHORT: Record<ZoneId, string> = {
  FLIGHTDECK: "FLIGHT DECK",
  GALLEY: "GALLEY · CREW",
  Z1: "ZONE 1 · CLUB",
  Z2: "ZONE 2 · DINING",
  Z3: "ZONE 3 · LOUNGE",
  Z4: "ZONE 4 · GUEST REST",
  Z5: "ZONE 5 · SUITE",
  AFT: "AFT · LAV · BAGGAGE",
};

function Fuselage() {
  return (
    <g>
      {/* Wing roots (subtle) */}
      <path d="M40 470 L0 585 L0 640 L40 560 Z M260 470 L300 585 L300 640 L260 560 Z" opacity="0.8" style={{ fill: "var(--map-wing)" }} />
      {/* Outer skin */}
      <path
        d="M150 16 C206 16 248 72 257 150 L262 232 L262 878 C262 925 226 962 150 978 C74 962 38 925 38 878 L38 232 L43 150 C52 72 94 16 150 16 Z"
        fill="url(#skin)"
       
        strokeWidth="1.6" style={{ stroke: "var(--map-skin-edge)" }}
      />
      {/* Inner cabin wall */}
      <path d="M150 34 C196 34 232 82 240 150 L244 232 L244 872 C244 912 214 944 150 958 C86 944 56 912 56 872 L56 232 L60 150 C68 82 104 34 150 34 Z" strokeWidth="1" style={{ fill: "var(--map-floor)", stroke: "var(--map-floor-edge)" }} />
      {/* Windows */}
      {Array.from({ length: 15 }).map((_, i) => {
        const y = 250 + i * 42;
        return (
          <g key={i}>
            <ellipse cx="46.5" cy={y} rx="3.2" ry="9" strokeWidth="0.8" style={{ fill: "var(--map-window)", stroke: "var(--map-skin-edge)" }} />
            <ellipse cx="253.5" cy={y} rx="3.2" ry="9" strokeWidth="0.8" style={{ fill: "var(--map-window)", stroke: "var(--map-skin-edge)" }} />
          </g>
        );
      })}
    </g>
  );
}

function Interior() {
  const seat = (x: number, y: number, rot = 0, key?: string) => (
    <g key={key} transform={`translate(${x} ${y}) rotate(${rot})`}>
      <rect x="-15" y="-13" width="30" height="26" rx="8" strokeWidth="1" style={{ fill: "var(--map-seat)", stroke: "var(--map-stroke)" }} />
      <rect x="-12" y="-13" width="24" height="7" rx="3.5" style={{ fill: "var(--map-seat-back)" }} />
    </g>
  );
  return (
    <g>
      {/* Zone bulkheads */}
      {Object.entries(ZONE_BANDS).map(([z, [y0]]) =>
        z === "FLIGHTDECK" ? null : <line key={z} x1="60" x2="240" y1={y0} y2={y0} strokeDasharray="3 4" strokeWidth="1" style={{ stroke: "var(--map-zone-line)" }} />,
      )}
      {/* Flight deck */}
      <path d="M100 92 Q150 66 200 92" fill="none" strokeWidth="5" strokeLinecap="round" style={{ stroke: "var(--map-stroke)" }} />
      {seat(126, 118, 0, "fd1")}
      {seat(174, 118, 0, "fd2")}
      {/* Galley counters */}
      <rect x="80" y="180" width="38" height="44" rx="5" style={{ fill: "var(--map-furn)", stroke: "var(--map-stroke)" }} />
      <rect x="182" y="180" width="38" height="44" rx="5" style={{ fill: "var(--map-furn)", stroke: "var(--map-stroke)" }} />
      <text x="99" y="205" textAnchor="middle" className="map-label">GALLEY</text>
      <text x="201" y="205" textAnchor="middle" className="map-label">LAV</text>
      {/* Zone 1 club */}
      {AIRCRAFT.seats.filter((s) => s.kind === "club").map((s) => seat(s.x, s.y, s.y > 290 ? 180 : 0, s.id))}
      {/* Zone 2 dining */}
      <rect x="128" y="408" width="44" height="38" rx="6" style={{ fill: "var(--map-furn)", stroke: "var(--map-zone-line)" }} />
      <rect x="92" y="408" width="116" height="38" rx="6" style={{ fill: "var(--map-furn)", stroke: "var(--map-zone-line)" }} />
      {AIRCRAFT.seats.filter((s) => s.kind === "dining").map((s) => seat(s.x, s.y, s.y > 430 ? 180 : 0, s.id))}
      {/* Zone 3 divan + credenza */}
      <rect x="84" y="512" width="34" height="106" rx="9" style={{ fill: "var(--map-seat)", stroke: "var(--map-stroke)" }} />
      <rect x="84" y="512" width="10" height="106" rx="5" style={{ fill: "var(--map-seat-back)" }} />
      <rect x="206" y="520" width="22" height="80" rx="4" style={{ fill: "var(--map-furn)", stroke: "var(--map-stroke)" }} />
      <text x="217" y="563" textAnchor="middle" className="map-label" transform="rotate(90 217 563)">MEDIA</text>
      {/* Zone 4 guest divan */}
      <rect x="182" y="650" width="34" height="72" rx="9" style={{ fill: "var(--map-seat)", stroke: "var(--map-stroke)" }} />
      <rect x="206" y="650" width="10" height="72" rx="5" style={{ fill: "var(--map-seat-back)" }} />
      {/* Zone 5 suite: bed + seat */}
      <rect x="74" y="758" width="76" height="62" rx="8" style={{ fill: "var(--map-furn)", stroke: "var(--map-zone-line)" }} />
      <rect x="78" y="762" width="18" height="54" rx="5" style={{ fill: "var(--map-seat-back)" }} />
      <text x="120" y="793" textAnchor="middle" className="map-label">BED</text>
      {seat(188, 778, 0, "S1")}
      {/* Aft lav */}
      <rect x="80" y="876" width="120" height="40" rx="6" style={{ fill: "var(--map-furn)", stroke: "var(--map-stroke)" }} />
      <text x="140" y="900" textAnchor="middle" className="map-label">AFT LAV · BAGGAGE</text>
    </g>
  );
}

export const CabinMap = memo(function CabinMap({
  equipment,
  statusOf,
  selectedId,
  onSelect,
  visible,
  activeZone,
  onZone,
}: {
  equipment: Equipment[];
  statusOf: (e: Equipment) => EquipmentStatus;
  selectedId?: string;
  onSelect: (e: Equipment) => void;
  visible: (e: Equipment) => boolean;
  activeZone?: ZoneId;
  onZone: (z: ZoneId | undefined) => void;
}) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" role="group" aria-label="Conceptual G700 cabin safety map. Demonstration — aircraft verification required." data-testid="cabin-map">
      <defs>
        <linearGradient id="skin" x1="0" x2="1">
          <stop offset="0" style={{ stopColor: "var(--map-skin-a)" }} />
          <stop offset="0.5" style={{ stopColor: "var(--map-skin-b)" }} />
          <stop offset="1" style={{ stopColor: "var(--map-skin-a)" }} />
        </linearGradient>
        <style>{`.map-label{font:600 7px var(--font-sans);letter-spacing:.08em;fill:var(--map-label)}.zone-label{font:600 7px var(--font-sans);letter-spacing:.08em}`}</style>
      </defs>
      <Fuselage />
      {/* Zone highlight + tap targets */}
      {Object.entries(ZONE_BANDS).map(([z, [y0, y1]]) => {
        const active = activeZone === z;
        return (
          <g key={z} onClick={() => onZone(active ? undefined : (z as ZoneId))} className="cursor-pointer">
            <rect x="58" y={y0 + 1} width="184" height={y1 - y0 - 2} rx="6" style={{ fill: active ? "color-mix(in oklab, var(--color-gold) 10%, transparent)" : "transparent", stroke: active ? "var(--color-gold)" : "none" }} />
          </g>
        );
      })}
      <Interior />
      {Object.entries(ZONE_BANDS).map(([z, [y0]]) => (
        <text key={z} x="150" y={y0 + 11} textAnchor="middle" className="zone-label" style={{ fill: activeZone === z ? "var(--color-gold)" : "var(--map-zone)" }} pointerEvents="none">
          {ZONE_SHORT[z as ZoneId]}
        </text>
      ))}
      {/* Equipment markers */}
      {equipment.map((e) => {
        const st = STATUS_STYLE[statusOf(e)];
        const Icon = CATEGORY_META[e.category].icon;
        const show = visible(e);
        const selected = selectedId === e.id;
        const pulse = statusOf(e) === "inspection_due" || statusOf(e) === "unserviceable";
        return (
          <g
            key={e.id}
            transform={`translate(${e.x} ${e.y})`}
            opacity={show ? 1 : 0.18}
            className="cursor-pointer outline-none"
            role="button"
            tabIndex={show ? 0 : -1}
            aria-label={`${e.code} ${CATEGORY_META[e.category].label}, ${st.label}`}
            onClick={() => onSelect(e)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                onSelect(e);
              }
            }}
            data-testid={`marker-${e.code}`}
          >
            <circle r="22" fill="transparent" />
            {pulse && show && <circle r="9" fill="none" strokeWidth="2" style={{ stroke: st.stroke, animation: "var(--animate-pulse-ring)" }} />}
            {selected && <circle r="16.5" fill="none" style={{ stroke: "var(--color-gold)" }} strokeWidth="2" />}
            <circle r="12" strokeWidth={selected ? 2.4 : 1.6} style={{ fill: st.fill, stroke: st.stroke }} />
            <Icon x={-7} y={-7} width={14} height={14} strokeWidth={2.2} style={{ color: st.text }} aria-hidden />
            <text y="23.5" textAnchor="middle" fontSize="6.5" fontWeight={600} letterSpacing="0.06em" style={{ fill: selected ? "var(--color-gold)" : "var(--map-code)" }}>
              {e.code}
            </text>
          </g>
        );
      })}
      <text x="150" y={H - 2} textAnchor="middle" fontSize="7" style={{ fill: "var(--color-warn)" }} letterSpacing="0.06em">
        DEMONSTRATION — AIRCRAFT VERIFICATION REQUIRED
      </text>
    </svg>
  );
});

export function StatusLegend({ counts }: { counts: Partial<Record<EquipmentStatus, number>> }) {
  return (
    <ul className="grid grid-cols-2 min-[460px]:grid-cols-3 md:grid-cols-1 gap-x-3 gap-y-1" aria-label="Equipment status legend">
      {(Object.keys(STATUS_STYLE) as EquipmentStatus[]).map((k) => {
        const s = STATUS_STYLE[k];
        return (
          <li key={k} className="flex items-center gap-2 py-1.5">
            <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden className="shrink-0">
              <circle r="5.5" strokeWidth="1.6" style={{ fill: s.fill, stroke: s.stroke }} />
            </svg>
            <span className="flex-1 min-w-0 text-[0.8125rem] text-ivory leading-tight" title={s.description}>
              {s.label}
            </span>
            <span className="text-[0.8125rem] tnum text-slate-400">{counts[k] ?? 0}</span>
          </li>
        );
      })}
    </ul>
  );
}
