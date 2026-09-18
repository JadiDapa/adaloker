"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const VARIANT_CLASSES = {
  inline:
    "truncate rounded-sm bg-transparent px-1 py-0.5 neu-transition hover:bg-muted/50 focus:bg-background focus-visible:neu-focus-ring",
  field:
    "neu-pressed-sm neu-transition h-8 rounded-md bg-background px-2 text-sm focus-visible:neu-focus-ring",
} as const;

type Variant = keyof typeof VARIANT_CLASSES;

/** Mirrors props across renders without an effect, per React's "adjusting
 * state when a prop changes" pattern — avoids the cascading-render lint
 * flag that `useEffect(() => setDraft(value), [value])` would trigger. */
function useSyncedDraft(value: string) {
  const [draft, setDraft] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(value);
  }
  return [draft, setDraft] as const;
}

/**
 * Click-to-edit text input — looks like plain text/a normal field until
 * focused, and only fires `onSave` on blur (not per keystroke), so callers
 * never need to debounce or poll. No border, ever — matches this app's
 * borderless, shadow-based (neumorphic) input styling.
 */
export function EditableField({
  value,
  onSave,
  placeholder,
  required,
  variant = "inline",
  className,
}: {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  variant?: Variant;
  className?: string;
}) {
  const [draft, setDraft] = useSyncedDraft(value);

  const commit = () => {
    const trimmed = draft.trim();
    if (required && !trimmed) {
      setDraft(value);
      return;
    }
    if (trimmed !== value) onSave(trimmed);
    else if (trimmed !== draft) setDraft(trimmed);
  };

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(value);
          e.currentTarget.blur();
        }
      }}
      placeholder={placeholder}
      className={cn(
        "w-full min-w-0 border-none outline-none",
        VARIANT_CLASSES[variant],
        className,
      )}
    />
  );
}

function digitsOnly(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function formatRupiah(rawDigits: string) {
  return rawDigits ? `Rp ${Number(rawDigits).toLocaleString("id-ID")}` : "";
}

/** Salary field — edits as plain digits, formats to "Rp X.XXX.XXX" on blur. */
export function SalaryField({
  value,
  onSave,
  variant = "inline",
  className,
}: {
  value: string;
  onSave: (value: string) => void;
  variant?: Variant;
  className?: string;
}) {
  const [draft, setDraft] = useSyncedDraft(value);

  const handleFocus = () => setDraft(digitsOnly(draft));

  const commit = () => {
    const formatted = formatRupiah(digitsOnly(draft));
    setDraft(formatted);
    if (formatted !== value) onSave(formatted);
  };

  return (
    <input
      inputMode="numeric"
      value={draft}
      onChange={(e) => setDraft(digitsOnly(e.target.value))}
      onFocus={handleFocus}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(value);
          e.currentTarget.blur();
        }
      }}
      placeholder="Rp —"
      className={cn(
        "w-full min-w-0 border-none outline-none",
        VARIANT_CLASSES[variant],
        className,
      )}
    />
  );
}
