"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

const CYCLE = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ToggleTheme() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Standard next-themes hydration-safe mount check; no external system to sync to.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const index = CYCLE.findIndex((mode) => mode.value === theme);
  const current = mounted ? (CYCLE[index] ?? CYCLE[2]) : CYCLE[2];
  const next = CYCLE[(index + 1) % CYCLE.length] ?? CYCLE[0];

  return (
    <Button
      variant="outline"
      className="rounded-full"
      size="icon"
      onClick={() => setTheme(next.value)}
    >
      <current.icon className="size-4" />
      <span className="sr-only">
        {mounted
          ? `Current theme: ${current.label}. Click to switch to ${next.label}.`
          : "Toggle theme"}
      </span>
    </Button>
  );
}
