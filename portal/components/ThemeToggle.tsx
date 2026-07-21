"use client";

import { ToggleGroup } from "@navikt/ds-react";
import { MoonIcon, MonitorIcon, SunIcon } from "@navikt/aksel-icons";
import { useThemeMode, type ThemeMode } from "./ThemeProvider";

const OPTIONS: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { value: "light", label: "Lyst", icon: <SunIcon aria-hidden /> },
  { value: "dark", label: "Mørkt", icon: <MoonIcon aria-hidden /> },
  { value: "system", label: "System", icon: <MonitorIcon aria-hidden /> },
];

/** Header control for switching between light, dark and system colour themes. */
export function ThemeToggle() {
  const { mode, setMode } = useThemeMode();

  return (
    <ToggleGroup
      value={mode}
      onChange={(value) => setMode(value as ThemeMode)}
      size="small"
      aria-label="Fargetema"
    >
      {OPTIONS.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          label={option.label}
          icon={option.icon}
        />
      ))}
    </ToggleGroup>
  );
}
