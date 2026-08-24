import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Difficulty, DifficultyMeta } from "@/lib/types";

interface DifficultyPickerProps {
  options: DifficultyMeta[];
  value: Difficulty;
  onChange: (next: Difficulty) => void;
  disabled?: boolean;
  className?: string;
}

export function DifficultyPicker({
  options,
  value,
  onChange,
  disabled,
  className,
}: DifficultyPickerProps) {
  return (
    <div
      className={cn("grid gap-3 sm:grid-cols-3", className)}
      role="radiogroup"
      aria-label="Difficulty"
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.id)}
            className={cn(
              "group relative cursor-pointer overflow-hidden rounded-lg border p-4 text-left transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gl-purple/70",
              "disabled:cursor-not-allowed disabled:opacity-45",
              selected
                ? "border-transparent bg-surface-2"
                : "border-border bg-surface/60 hover:border-border-strong hover:bg-surface-2/70",
            )}
            style={
              selected
                ? { boxShadow: `inset 0 0 0 1px ${option.accent}, 0 12px 40px -22px ${option.accent}` }
                : undefined
            }
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
              style={{ background: `linear-gradient(90deg, transparent, ${option.accent}, transparent)` }}
            />
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.2em]"
                style={{ color: option.accent }}
              >
                {option.label}
              </span>
              {selected && <Check className="size-3.5" style={{ color: option.accent }} />}
            </div>
            <p className="text-base font-semibold leading-tight">{option.codename}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{option.blurb}</p>
          </button>
        );
      })}
    </div>
  );
}
