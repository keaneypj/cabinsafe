"use client";

import { useEffect, useState } from "react";
import { Segmented } from "./ui";

type Theme = "system" | "light" | "dark";
const KEY = "cabinsafe-theme";

/** Appearance preference (per device). "System" follows the phone's Light/Dark setting. */
export function AppearanceControl() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    try {
      const t = localStorage.getItem(KEY);
      if (t === "light" || t === "dark") setTheme(t);
    } catch {
      /* storage unavailable — stay on system */
    }
  }, []);
  const apply = (t: Theme) => {
    setTheme(t);
    const root = document.documentElement;
    if (t === "system") delete root.dataset.theme;
    else root.dataset.theme = t;
    try {
      if (t === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, t);
    } catch {
      /* preference applies for this session only */
    }
  };
  return (
    <Segmented
      ariaLabel="Appearance"
      value={theme}
      onChange={apply}
      options={[
        { value: "system", label: "System" },
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
      ]}
    />
  );
}
