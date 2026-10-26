import type { Airport } from "@/domain/types";

/** Reference airport metadata used by the demonstration flights and live feed lookups. */
export const AIRPORTS: Record<string, Airport> = {
  KMIA: {
    icao: "KMIA", iata: "MIA", name: "Miami International", city: "Miami", country: "United States",
    countryCode: "US", lat: 25.7959, lon: -80.287, tz: "America/New_York", firs: ["KZMA"],
  },
  KPBI: {
    icao: "KPBI", iata: "PBI", name: "Palm Beach International", city: "West Palm Beach", country: "United States",
    countryCode: "US", lat: 26.6832, lon: -80.0956, tz: "America/New_York", firs: ["KZMA"],
  },
  KFLL: {
    icao: "KFLL", iata: "FLL", name: "Fort Lauderdale–Hollywood International", city: "Fort Lauderdale",
    country: "United States", countryCode: "US", lat: 26.0726, lon: -80.1527, tz: "America/New_York", firs: ["KZMA"],
  },
  KTEB: {
    icao: "KTEB", iata: "TEB", name: "Teterboro", city: "Teterboro", country: "United States",
    countryCode: "US", lat: 40.8501, lon: -74.0608, tz: "America/New_York", firs: ["KZNY"],
  },
  LSGG: {
    icao: "LSGG", iata: "GVA", name: "Geneva Airport", city: "Geneva", country: "Switzerland",
    countryCode: "CH", lat: 46.2381, lon: 6.1089, tz: "Europe/Zurich", firs: ["LSAS"],
  },
  LSZH: {
    icao: "LSZH", iata: "ZRH", name: "Zurich Airport", city: "Zurich", country: "Switzerland",
    countryCode: "CH", lat: 47.4647, lon: 8.5492, tz: "Europe/Zurich", firs: ["LSAS"],
  },
  LFLL: {
    icao: "LFLL", iata: "LYS", name: "Lyon–Saint Exupéry", city: "Lyon", country: "France",
    countryCode: "FR", lat: 45.7256, lon: 5.0811, tz: "Europe/Paris", firs: ["LFMM"],
  },
  EGLF: {
    icao: "EGLF", iata: "FAB", name: "Farnborough Airport", city: "Farnborough", country: "United Kingdom",
    countryCode: "GB", lat: 51.2758, lon: -0.7763, tz: "Europe/London", firs: ["EGTT"],
  },
  EGKK: {
    icao: "EGKK", iata: "LGW", name: "London Gatwick", city: "London", country: "United Kingdom",
    countryCode: "GB", lat: 51.1481, lon: -0.1903, tz: "Europe/London", firs: ["EGTT"],
  },
  EGLL: {
    icao: "EGLL", iata: "LHR", name: "London Heathrow", city: "London", country: "United Kingdom",
    countryCode: "GB", lat: 51.47, lon: -0.4543, tz: "Europe/London", firs: ["EGTT"],
  },
};

export function airport(icao: string): Airport | undefined {
  return AIRPORTS[icao.toUpperCase()];
}

export function airportLabel(icao: string): string {
  const a = airport(icao);
  return a ? `${a.city} (${a.icao})` : icao;
}

export const AIRPORT_OPTIONS = Object.values(AIRPORTS).sort((a, b) => a.icao.localeCompare(b.icao));
