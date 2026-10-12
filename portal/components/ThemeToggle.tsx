"use client";

import { ActionMenu, Button } from "@navikt/ds-react";
import { MoonIcon, MonitorIcon, SunIcon } from "@navikt/aksel-icons";
import { useThemeMode, type ThemeMode } from "./ThemeProvider";

const OPTIONS: { value: ThemeMode; label: string; Icon: typeof SunIcon }[] = [
  { value: "light", label: "Lyst", Icon: SunIcon },
  { value: "dark", label: "Mørkt", Icon: MoonIcon },
  { value: "system", label: "Følg systemet", Icon: MonitorIcon },
];

/** Compact icon button for switching between light, dark and system theme. */
export function ThemeToggle() {
  const { mode, setMode } = useThemeMode();
  const current = OPTIONS.find((o) => o.value === mode) ?? OPTIONS[2];
  const label = `Fargetema: ${current.label}`;

  return (
    <ActionMenu>
      <ActionMenu.Trigger>
        <Button
          variant="tertiary"
          data-color="neutral"
          size="small"
          aria-label={label}
          title={label}
          icon={<current.Icon aria-hidden />}
        />
      </ActionMenu.Trigger>
      <ActionMenu.Content align="end">
        <ActionMenu.RadioGroup
          label="Fargetema"
          value={mode}
          onValueChange={(value) => setMode(value as ThemeMode)}
        >
          {OPTIONS.map(({ value, label: optionLabel }) => (
            <ActionMenu.RadioItem key={value} value={value}>
              {optionLabel}
            </ActionMenu.RadioItem>
          ))}
        </ActionMenu.RadioGroup>
      </ActionMenu.Content>
    </ActionMenu>
  );
}
