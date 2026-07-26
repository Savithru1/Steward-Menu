import React from "react";
import { cn } from "@/lib/utils";
import type { MenuItemModifierGroup, SelectedModifier, ModifierOption } from "@/types";

interface ModifierGroupSelectorProps {
  groupLink: MenuItemModifierGroup;
  selectedModifiers: SelectedModifier[];
  onChange: (groupId: string, options: SelectedModifier[]) => void;
  error?: string;
}

export function ModifierGroupSelector({
  groupLink,
  selectedModifiers,
  onChange,
  error,
}: ModifierGroupSelectorProps) {
  const { modifierGroup, required, minimumSelections, maximumSelections } = groupLink;
  const isMultiSelect = maximumSelections > 1;

  const currentSelections = selectedModifiers.filter((m) => m.groupId === modifierGroup.id);

  const handleOptionClick = (option: ModifierOption) => {
    const isSelected = currentSelections.some((m) => m.optionId === option.id);
    const newSelectedModifier: SelectedModifier = {
      optionId: option.id,
      optionName: option.name,
      groupId: modifierGroup.id,
      groupName: modifierGroup.name,
      priceAdjustment: Number(option.priceAdjustment),
    };

    if (isMultiSelect) {
      if (isSelected) {
        onChange(
          modifierGroup.id,
          currentSelections.filter((m) => m.optionId !== option.id)
        );
      } else {
        if (currentSelections.length >= maximumSelections) {
          // If at limit, swap last one or ignore. Standard UX is ignore or toast, let's ignore to enforce limit.
          return;
        }
        onChange(modifierGroup.id, [...currentSelections, newSelectedModifier]);
      }
    } else {
      // Single select behavior
      if (isSelected && !required) {
        // Toggle off if optional
        onChange(modifierGroup.id, []);
      } else {
        onChange(modifierGroup.id, [newSelectedModifier]);
      }
    }
  };

  const getSelectionRuleText = () => {
    if (required) {
      if (minimumSelections === 1 && maximumSelections === 1) {
        return "Select 1 option";
      }
      return `Select at least ${minimumSelections} and up to ${maximumSelections}`;
    }
    return `Choose up to ${maximumSelections}`;
  };

  return (
    <fieldset className="space-y-3.5 border-t border-border pt-4 pb-2">
      <div className="flex items-center justify-between gap-4">
        <legend className="block text-[13px] font-bold tracking-wide uppercase text-foreground">
          {modifierGroup.name}
        </legend>
        <div className="flex items-center gap-2">
          {required ? (
            <span className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
              Required
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-foreground/5 border border-border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/45">
              Optional
            </span>
          )}
          <span className="text-[10px] font-medium text-foreground/35">
            {getSelectionRuleText()}
          </span>
        </div>
      </div>

      {modifierGroup.description && (
        <p className="text-[11px] text-foreground/45 leading-relaxed font-medium">
          {modifierGroup.description}
        </p>
      )}

      {error && (
        <p className="text-[11px] font-semibold text-[#F87171]" role="alert">
          {error}
        </p>
      )}

      <div className="space-y-2">
        {modifierGroup.options
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((option) => {
            const isSelected = currentSelections.some((m) => m.optionId === option.id);
            return (
              <label
                key={option.id}
                onClick={(e) => {
                  e.preventDefault();
                  handleOptionClick(option);
                }}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border transition-all duration-150 cursor-pointer select-none",
                  isSelected
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-card hover:bg-accent text-foreground/80",
                  "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Selector indicator */}
                  <div
                    className={cn(
                      "grid h-5 w-5 place-items-center border transition-all",
                      isMultiSelect ? "rounded-lg" : "rounded-full",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-transparent"
                    )}
                  >
                    {isSelected && (
                      <span
                        className={cn(
                          "bg-current",
                          isMultiSelect ? "h-1.5 w-1.5 rounded-sm" : "h-2 w-2 rounded-full"
                        )}
                      />
                    )}
                  </div>
                  <span className="text-sm font-semibold tracking-tight">
                    {option.name}
                  </span>
                </div>
                {Number(option.priceAdjustment) > 0 && (
                  <span className="text-xs font-semibold tabular-nums text-foreground/50">
                    +₹{Number(option.priceAdjustment)}
                  </span>
                )}
              </label>
            );
          })}
      </div>
    </fieldset>
  );
}
