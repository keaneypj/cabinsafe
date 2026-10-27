import { useId } from "react";

export const SHIELD_PATH = "M32 4 L54 11.5 V29.5 C54 43.5 44.6 53.6 32 60 C19.4 53.6 10 43.5 10 29.5 V11.5 Z";
export const AIRCRAFT_PATH =
  "M32 15 C33.3 15 34 16.8 34 18.6 L34 27.2 L46.5 34.6 L46.5 37.6 L34 33.6 L34 42.2 L37.8 45 L37.8 47.2 L32 45.8 L26.2 47.2 L26.2 45 L30 42.2 L30 33.6 L17.5 37.6 L17.5 34.6 L30 27.2 L30 18.6 C30 16.8 30.7 15 32 15 Z";

export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const gold = `lg-gold-${uid}`;
  const navy = `lg-navy-${uid}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#efe1c4" />
          <stop offset="0.55" stopColor="#d7bd8c" />
          <stop offset="1" stopColor="#a98d5c" />
        </linearGradient>
        <linearGradient id={navy} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a3e55" />
          <stop offset="1" stopColor="#101d2b" />
        </linearGradient>
      </defs>
      <path d={SHIELD_PATH} fill={`url(#${navy})`} stroke={`url(#${gold})`} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M32 9.2 L49.6 15.2 V29.5 C49.6 40.6 42.4 49 32 54.8" fill="none" stroke="#d7bd8c" strokeOpacity="0.22" strokeWidth="1" />
      <path d={AIRCRAFT_PATH} fill={`url(#${gold})`} />
    </svg>
  );
}

export function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <Logo size={28} />
      <span className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-ivory">CabinSafe</span>
    </div>
  );
}
