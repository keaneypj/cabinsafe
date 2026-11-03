import { TABLE_SETTINGS, type Piece, type TableSettingId } from "@/data/tableSettings";

// Ink colors for the paper-style guide pages (the pages are white in light and dark mode).
const INK = "#33425c";
const FILL = "#f4efe6";
const BADGE = "#1c2a44";

/** One place setting seen from above, with numbered pieces and a matching list underneath. */
export function TableSettingDiagram({ id }: { id: TableSettingId }) {
  const s = TABLE_SETTINGS[id];
  return (
    <figure className="my-3" data-testid={`setting-${id}`}>
      <svg viewBox="14 12 292 200" className="w-full h-auto rounded-md bg-[#fbf8f2] border border-[#e3dccd]" role="img" aria-label={`${s.title} table setting: ${s.pieces.map((p, i) => `${i + 1} ${p.label}`).join(", ")}`}>
        {s.pieces.map((p, i) => (
          <PieceShape key={i} p={p} />
        ))}
        <line x1="12" y1="196" x2="308" y2="196" stroke={INK} strokeOpacity="0.35" strokeDasharray="4 4" />
        <text x="160" y="207" textAnchor="middle" fontSize="8" fill={INK} fillOpacity="0.7">
          Table edge · guest sits here
        </text>
        {s.pieces.map((p, i) => {
          const [bx, by] = badgeAt(p);
          return (
            <g key={`b${i}`} transform={`translate(${bx} ${by})`}>
              <circle r="7.5" fill={BADGE} />
              <text y="3" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#fff">
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption>
        <ol className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2 text-[0.8125rem] leading-snug">
          {s.pieces.map((p, i) => (
            <li key={i} className="flex gap-2">
              <span className="grid size-[1.125rem] shrink-0 place-items-center rounded-full bg-[#1c2a44] text-[0.625rem] font-bold text-white">{i + 1}</span>
              <span>{p.label}</span>
            </li>
          ))}
        </ol>
        {s.tips.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-[0.8125rem] leading-snug text-[#4a5568]">
            {s.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
      </figcaption>
    </figure>
  );
}

const UTENSILS = new Set(["fork", "knife", "spoon"]);

function badgeAt(p: Piece): [number, number] {
  if (p.badge) return [p.x + p.badge[0], p.y + p.badge[1]];
  if (UTENSILS.has(p.kind)) {
    // Just past the end of the handle, turned with the utensil.
    const d = 44 * (p.scale ?? 1);
    const a = ((p.rot ?? 0) * Math.PI) / 180;
    return [p.x - d * Math.sin(a), p.y + d * Math.cos(a)];
  }
  // Small glasses and bowls would be hidden under their number, so it sits just above them.
  if ((p.kind === "glass" || p.kind === "bowl" || p.kind === "plate") && (p.r ?? 10) <= 14) return [p.x, p.y - (p.r ?? 10) - 8];
  return [p.x, p.y];
}

function PieceShape({ p }: { p: Piece }) {
  const line = { stroke: INK, strokeWidth: 1.6, fill: FILL } as const;
  const r = p.r ?? 10;
  const w = p.w ?? 30;
  const h = p.h ?? 30;
  switch (p.kind) {
    case "plate":
      return (
        <g>
          <circle cx={p.x} cy={p.y} r={r} {...line} fill="#fff" />
          <circle cx={p.x} cy={p.y} r={r * 0.72} fill="none" stroke={INK} strokeOpacity="0.3" />
        </g>
      );
    case "bowl":
      return (
        <g>
          <circle cx={p.x} cy={p.y} r={r} {...line} fill="#fff" />
          <circle cx={p.x} cy={p.y} r={r * 0.62} fill={FILL} stroke={INK} strokeOpacity="0.45" />
        </g>
      );
    case "rectPlate":
      return <rect x={p.x - w / 2} y={p.y - h / 2} width={w} height={h} rx="6" {...line} fill="#fff" />;
    case "glass":
      return (
        <g>
          <circle cx={p.x} cy={p.y} r={r} {...line} fill="#eef4f8" />
          <circle cx={p.x} cy={p.y} r={r * 0.55} fill="none" stroke={INK} strokeOpacity="0.4" />
        </g>
      );
    case "cup":
      return (
        <g>
          <circle cx={p.x} cy={p.y} r="14" {...line} fill="#fff" />
          <circle cx={p.x} cy={p.y} r="8.5" {...line} />
          <rect x={p.x + 8} y={p.y - 2.5} width="6" height="5" rx="2" {...line} />
        </g>
      );
    case "napkin":
      return (
        <g>
          <rect x={p.x - w / 2} y={p.y - h / 2} width={w} height={h} rx="2" {...line} fill="#e9e3f3" />
          <line x1={p.x} y1={p.y - h / 2} x2={p.x} y2={p.y + h / 2} stroke={INK} strokeOpacity="0.3" />
        </g>
      );
    case "towel":
      return <rect x={p.x - w / 2} y={p.y - h / 2} width={w} height={h} rx={h / 2} {...line} fill="#fff" />;
    case "basket":
      return (
        <g>
          <rect x={p.x - w / 2} y={p.y - h / 2} width={w} height={h} rx="6" {...line} fill="#ecdcc0" />
          <path d={`M${p.x - w / 2 + 6} ${p.y} h${w - 12}`} stroke={INK} strokeOpacity="0.35" />
        </g>
      );
    case "warmer":
      return (
        <g>
          <circle cx={p.x} cy={p.y} r={r} {...line} fill="#ecdcc0" />
          <circle cx={p.x} cy={p.y} r="3" fill={INK} fillOpacity="0.5" />
        </g>
      );
    case "rest":
      return <rect x={p.x - 6} y={p.y - 3.5} width="12" height="7" rx="3" {...line} fill="#d9e4d0" />;
    case "chopsticks":
      return (
        <g stroke={INK} strokeWidth="2.4" strokeLinecap="round">
          <line x1={p.x - 46} y1={p.y - 3} x2={p.x + 46} y2={p.y - 4.5} />
          <line x1={p.x - 46} y1={p.y + 3} x2={p.x + 46} y2={p.y + 4.5} />
        </g>
      );
    default:
      return (
        <g transform={`translate(${p.x} ${p.y}) rotate(${p.rot ?? 0}) scale(${p.scale ?? 1})`} stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none">
          <Utensil kind={p.kind} />
        </g>
      );
  }
}

function Utensil({ kind }: { kind: Piece["kind"] }) {
  if (kind === "fork")
    return (
      <>
        <line x1="0" y1="34" x2="0" y2="-12" strokeWidth="2.6" />
        <path d="M-5 -14 Q0 -6 5 -14" />
        {[-5, -1.7, 1.7, 5].map((x) => (
          <line key={x} x1={x} y1="-14" x2={x} y2="-34" strokeWidth="1.3" />
        ))}
      </>
    );
  if (kind === "knife")
    return (
      <>
        <line x1="0" y1="34" x2="0" y2="-4" strokeWidth="2.6" />
        <path d="M1 -4 L1 -34 Q-4.5 -30 -4.5 -16 L-4.5 -4 Z" fill={FILL} strokeWidth="1.4" />
      </>
    );
  return (
    <>
      <line x1="0" y1="34" x2="0" y2="-17" strokeWidth="2.6" />
      <ellipse cx="0" cy="-26" rx="5.5" ry="8.5" fill={FILL} strokeWidth="1.4" />
    </>
  );
}
