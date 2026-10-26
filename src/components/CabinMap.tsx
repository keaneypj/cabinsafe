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
  serviceable: { label: "Serviceable", fill: "#173327", stroke: "#6fb38a", text: "#6fb38a", description: "Inspected and current" },
  due_soon: { label: "Due soon", fill: "#2e2a1f", stroke: "#d7bd8c", text: "#d7bd8c", description: "Inspection or expiry approaching" },
  inspection_due: { label: "Inspection due", fill: "#3a2f17", stroke: "#e0b257", text: "#e0b257", description: "Inspection required now" },
  discrepancy: { label: "Discrepancy", fill: "#3d1f1d", stroke: "#e07a6c", text: "#e07a6c", description: "Open discrepancy recorded" },
  unserviceable: { label: "Unserviceable", fill: "#e07a6c", stroke: "#e07a6c", text: "#101d2b", description: "Not available for use" },
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
      <path d="M40 470 L0 585 L0 640 L40 560 Z M260 470 L300 585 L300 640 L260 560 Z" fill="#1a2a3c" opacity="0.8" />
      {/* Outer skin */}
      <path
        d="M150 16 C206 16 248 72 257 150 L262 232 L262 878 C262 925 226 962 150 978 C74 962 38 925 38 878 L38 232 L43 150 C52 72 94 16 150 16 Z"
        fill="url(#skin)"
        stroke="rgba(215,189,140,0.45)"
        strokeWidth="1.6"
      />
      {/* Inner cabin wall */}
      <path d="M150 34 C196 34 232 82 240 150 L244 232 L244 872 C244 912 214 944 150 958 C86 944 56 912 56 872 L56 232 L60 150 C68 82 104 34 150 34 Z" fill="#0f1b28" stroke="rgba(185,197,210,0.12)" strokeWidth="1" />
      {/* Windows */}
      {Array.from({ length: 15 }).map((_, i) => {
        const y = 250 + i * 42;
        return (
          <g key={i}>
            <ellipse cx="46.5" cy={y} rx="3.2" ry="9" fill="#2a3e55" stroke="rgba(215,189,140,0.35)" strokeWidth="0.8" />
            <ellipse cx="253.5" cy={y} rx="3.2" ry="9" fill="#2a3e55" stroke="rgba(215,189,140,0.35)" strokeWidth="0.8" />
          </g>
        );
      })}
    </g>
  );
}

function Interior() {
  const seat = (x: number, y: number, rot = 0, key?: string) => (
    <g key={key} transform={`translate(${x} ${y}) rotate(${rot})`}>
      <rect x="-15" y="-13" width="30" height="26" rx="8" fill="#2a3e55" stroke="rgba(185,197,210,0.28)" strokeWidth="1" />
      <rect x="-12" y="-13" width="24" height="7" rx="3.5" fill="#34495f" />
    </g>
  );
  return (
    <g>
      {/* Zone bulkheads */}
      {Object.entries(ZONE_BANDS).map(([z, [y0]]) =>
        z === "FLIGHTDECK" ? null : <line key={z} x1="60" x2="240" y1={y0} y2={y0} stroke="rgba(215,189,140,0.22)" strokeDasharray="3 4" strokeWidth="1" />,
      )}
      {/* Flight deck */}
      <path d="M100 92 Q150 66 200 92" fill="none" stroke="rgba(185,197,210,0.3)" strokeWidth="5" strokeLinecap="round" />
      {seat(126, 118, 0, "fd1")}
      {seat(174, 118, 0, "fd2")}
      {/* Galley counters */}
      <rect x="80" y="180" width="38" height="44" rx="5" fill="#1d2d40" stroke="rgba(185,197,210,0.2)" />
      <rect x="182" y="180" width="38" height="44" rx="5" fill="#1d2d40" stroke="rgba(185,197,210,0.2)" />
      <text x="99" y="205" textAnchor="middle" className="map-label">GALLEY</text>
      <text x="201" y="205" textAnchor="middle" className="map-label">LAV</text>
      {/* Zone 1 club */}
      {AIRCRAFT.seats.filter((s) => s.kind === "club").map((s) => seat(s.x, s.y, s.y > 290 ? 180 : 0, s.id))}
      {/* Zone 2 dining */}
      <rect x="128" y="408" width="44" height="38" rx="6" fill="#203145" stroke="rgba(215,189,140,0.35)" />
      <rect x="92" y="408" width="116" height="38" rx="6" fill="#203145" stroke="rgba(215,189,140,0.3)" />
      {AIRCRAFT.seats.filter((s) => s.kind === "dining").map((s) => seat(s.x, s.y, s.y > 430 ? 180 : 0, s.id))}
      {/* Zone 3 divan + credenza */}
      <rect x="84" y="512" width="34" height="106" rx="9" fill="#2a3e55" stroke="rgba(185,197,210,0.28)" />
      <rect x="84" y="512" width="10" height="106" rx="5" fill="#34495f" />
      <rect x="206" y="520" width="22" height="80" rx="4" fill="#1d2d40" stroke="rgba(185,197,210,0.2)" />
      <text x="217" y="563" textAnchor="middle" className="map-label" transform="rotate(90 217 563)">MEDIA</text>
      {/* Zone 4 guest divan */}
      <rect x="182" y="650" width="34" height="72" rx="9" fill="#2a3e55" stroke="rgba(185,197,210,0.28)" />
      <rect x="206" y="650" width="10" height="72" rx="5" fill="#34495f" />
      {/* Zone 5 suite: bed + seat */}
      <rect x="74" y="758" width="76" height="62" rx="8" fill="#203145" stroke="rgba(215,189,140,0.35)" />
      <rect x="78" y="762" width="18" height="54" rx="5" fill="#34495f" />
      <text x="120" y="793" textAnchor="middle" className="map-label">BED</text>
      {seat(188, 778, 0, "S1")}
      {/* Aft lav */}
      <rect x="80" y="876" width="120" height="40" rx="6" fill="#1d2d40" stroke="rgba(185,197,210,0.2)" />
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
          <stop offset="0" stopColor="#1a2a3c" />
          <stop offset="0.5" stopColor="#24384e" />
          <stop offset="1" stopColor="#1a2a3c" />
        </linearGradient>
        <style>{`.map-label{font:600 7.5px var(--font-sans);letter-spacing:.14em;fill:rgba(185,197,210,.55)}.zone-label{font:600 7px var(--font-sans);letter-spacing:.16em}`}</style>
      </defs>
      <Fuselage />
      {/* Zone highlight + tap targets */}
      {Object.entries(ZONE_BANDS).map(([z, [y0, y1]]) => {
        const active = activeZone === z;
        return (
          <g key={z} onClick={() => onZone(active ? undefined : (z as ZoneId))} className="cursor-pointer">
            <rect x="58" y={y0 + 1} width="184" height={y1 - y0 - 2} fill={active ? "rgba(215,189,140,0.08)" : "transparent"} stroke={active ? "rgba(215,189,140,0.5)" : "none"} rx="6" />
          </g>
        );
      })}
      <Interior />
      {Object.entries(ZONE_BANDS).map(([z, [y0]]) => (
        <text key={z} x="150" y={y0 + 11} textAnchor="middle" className="zone-label" fill={activeZone === z ? "#d7bd8c" : "rgba(215,189,140,0.55)"} pointerEvents="none">
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
            {pulse && show && <circle r="9" fill="none" stroke={st.stroke} strokeWidth="2" style={{ animation: "var(--animate-pulse-ring)" }} />}
            {selected && <circle r="16.5" fill="none" stroke="#d7bd8c" strokeWidth="2" />}
            <circle r="12" fill={st.fill} stroke={st.stroke} strokeWidth={selected ? 2.4 : 1.6} />
            <Icon x={-7} y={-7} width={14} height={14} color={st.text} strokeWidth={2.2} aria-hidden />
            <text y="23.5" textAnchor="middle" fontSize="6.5" fontWeight={600} letterSpacing="0.06em" fill={selected ? "#d7bd8c" : "rgba(247,245,240,0.8)"}>
              {e.code}
            </text>
          </g>
        );
      })}
      <text x="150" y={H - 2} textAnchor="middle" fontSize="7" fill="rgba(224,178,87,0.75)" letterSpacing="0.08em">
        DEMONSTRATION — AIRCRAFT VERIFICATION REQUIRED
      </text>
    </svg>
  );
});

export function StatusLegend({ counts }: { counts: Partial<Record<EquipmentStatus, number>> }) {
  return (
    <ul className="grid grid-cols-2 min-[460px]:grid-cols-3 md:grid-cols-1 gap-2" aria-label="Equipment status legend">
      {(Object.keys(STATUS_STYLE) as EquipmentStatus[]).map((k) => {
        const s = STATUS_STYLE[k];
        return (
          <li key={k} className="flex items-center gap-2.5 rounded-xl bg-midnight-900/35 border border-slate/10 px-2.5 py-2">
            <svg width="22" height="22" viewBox="-12 -12 24 24" aria-hidden>
              <circle r="9.5" fill={s.fill} stroke={s.stroke} strokeWidth="1.8" />
            </svg>
            <span className="flex-1 min-w-0">
              <span className="block text-xs text-ivory leading-tight">{s.label}</span>
              <span className="block text-[0.625rem] text-slate-500 leading-tight truncate">{s.description}</span>
            </span>
            <span className="text-xs tnum text-slate">{counts[k] ?? 0}</span>
          </li>
        );
      })}
    </ul>
  );
}
