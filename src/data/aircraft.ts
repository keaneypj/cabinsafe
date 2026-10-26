import type { Aircraft } from "@/domain/types";

export const AIRCRAFT_VERIFICATION_NOTICE =
  "Demonstration — Aircraft Verification Required. Conceptual cabin layout and equipment positions; not derived from approved Gulfstream or operator documentation.";

/**
 * Conceptual five-zone, family-oriented configuration. The SVG map is drawn
 * nose-up in a 300 × 980 coordinate space.
 */
export const AIRCRAFT: Aircraft = {
  id: "ac-demo-700",
  tail: "DEMO-700",
  type: "Gulfstream G700 (conceptual configuration)",
  year: 2026,
  configuration: "Five living areas · 14 passenger seats · forward galley · principal's suite",
  verificationNotice: AIRCRAFT_VERIFICATION_NOTICE,
  zones: [
    { id: "FLIGHTDECK", name: "Flight Deck", description: "Flight crew area. Shown for orientation only." },
    { id: "GALLEY", name: "Forward Galley & Crew Area", description: "Galley, crew rest and forward lavatory (conceptual)." },
    { id: "Z1", name: "Zone 1 · Club Lounge", description: "Four-place club seating for principal and senior guests." },
    { id: "Z2", name: "Zone 2 · Dining & Conference", description: "Four-place dining and meeting table." },
    { id: "Z3", name: "Zone 3 · Family Lounge", description: "Three-place divan, entertainment and family area." },
    { id: "Z4", name: "Zone 4 · Guest Rest", description: "Two-place berthable divan for guest rest." },
    { id: "Z5", name: "Zone 5 · Principal's Suite", description: "Private suite with bed, seat and ensuite lavatory." },
    { id: "AFT", name: "Aft Lavatory & Baggage", description: "Aft lavatory and in-flight accessible baggage (conceptual)." },
  ],
  seats: [
    { id: "1A", label: "1A", zone: "Z1", x: 112, y: 262, kind: "club" },
    { id: "1C", label: "1C", zone: "Z1", x: 188, y: 262, kind: "club" },
    { id: "2A", label: "2A", zone: "Z1", x: 112, y: 322, kind: "club" },
    { id: "2C", label: "2C", zone: "Z1", x: 188, y: 322, kind: "club" },
    { id: "D1", label: "D1", zone: "Z2", x: 112, y: 392, kind: "dining" },
    { id: "D2", label: "D2", zone: "Z2", x: 188, y: 392, kind: "dining" },
    { id: "D3", label: "D3", zone: "Z2", x: 112, y: 462, kind: "dining" },
    { id: "D4", label: "D4", zone: "Z2", x: 188, y: 462, kind: "dining" },
    { id: "V1", label: "V1", zone: "Z3", x: 104, y: 530, kind: "divan" },
    { id: "V2", label: "V2", zone: "Z3", x: 104, y: 565, kind: "divan" },
    { id: "V3", label: "V3", zone: "Z3", x: 104, y: 600, kind: "divan" },
    { id: "R1", label: "R1", zone: "Z4", x: 196, y: 668, kind: "divan" },
    { id: "R2", label: "R2", zone: "Z4", x: 196, y: 703, kind: "divan" },
    { id: "S1", label: "S1", zone: "Z5", x: 188, y: 778, kind: "suite" },
  ],
};

/** Vertical extents of each zone on the SVG map (y from → y to). */
export const ZONE_BANDS: Record<string, [number, number]> = {
  FLIGHTDECK: [70, 150],
  GALLEY: [150, 232],
  Z1: [232, 352],
  Z2: [352, 492],
  Z3: [492, 632],
  Z4: [632, 742],
  Z5: [742, 868],
  AFT: [868, 930],
};
