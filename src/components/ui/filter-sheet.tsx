"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * FilterSheet — bottom sheet drill-in for filter selection on mobile.
 *
 * Renders the same hierarchical pattern as the desktop filter popover:
 *   1. Category list (top level)
 *   2. Drill into a category → option list
 *   3. Apply / Cancel footer
 *
 * The sheet is generic: pass `categories` describing each filter category and
 * a custom `renderCategoryDetail` callback per category. The sheet handles
 * navigation between the list view and the detail view.
 *
 * Use this only on mobile. The desktop popover stays in the original component.
 */

export type FilterCategory = {
  /** Stable key, e.g. "status", "sentiment", "date" */
  key: string;
  /** Display label, e.g. "Status" */
  label: string;
  /** Display summary of current selection, shown in the category row (e.g. "Completed, Missed") */
  summary?: string | null;
};

export function FilterSheet({
  open,
  onOpenChange,
  title = "Filters",
  categories,
  renderCategoryDetail,
  onClearAll,
  hasActiveFilters,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  categories: FilterCategory[];
  /**
   * Render the detail view for a category. Receives the category and a `close` callback
   * that returns to the category list view (NOT the same as closing the sheet).
   */
  renderCategoryDetail: (
    category: FilterCategory,
    close: () => void
  ) => React.ReactNode;
  onClearAll?: () => void;
  hasActiveFilters?: boolean;
}) {
  const [activeKey, setActiveKey] = React.useState<string | null>(null);

  // Reset to category list when sheet closes
  React.useEffect(() => {
    if (!open) {
      // small delay so the user doesn't see the view jump during the close animation
      const t = setTimeout(() => setActiveKey(null), 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const activeCategory = categories.find((c) => c.key === activeKey) ?? null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-50 bg-black/20 supports-backdrop-filter:backdrop-blur-xs duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />
        <DialogPrimitive.Popup
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-2xl bg-white text-popover-foreground ring-1 ring-foreground/10 outline-none duration-200",
            "data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom"
          )}
        >
          {/* Drag handle */}
          <div className="mx-auto mt-2 mb-1 h-1 w-9 shrink-0 rounded-full bg-[rgba(0,0,0,0.15)]" aria-hidden />

          {/* Header */}
          <div className="flex h-12 shrink-0 items-center gap-1 border-b border-[#eeeff1] px-2">
            {activeCategory ? (
              <button
                onClick={() => setActiveKey(null)}
                className="flex h-9 items-center gap-1 rounded-md px-2 text-[14px] font-medium text-[rgba(0,0,0,0.6)] active:bg-[#eeeff1]"
                aria-label="Back to filters"
              >
                <ChevronLeft className="h-4 w-4" />
                Filters
              </button>
            ) : (
              <DialogPrimitive.Title className="px-2 text-[15px] font-semibold text-[#242529]">
                {title}
              </DialogPrimitive.Title>
            )}
            <DialogPrimitive.Close
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-md text-[rgba(0,0,0,0.55)] active:bg-[#eeeff1]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-y-auto safe-area-bottom">
            {activeCategory ? (
              <div className="px-2 py-2">
                {renderCategoryDetail(activeCategory, () => setActiveKey(null))}
              </div>
            ) : (
              <div className="py-1">
                {categories.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setActiveKey(cat.key)}
                    className="flex h-14 w-full items-center gap-3 px-4 text-left active:bg-[#f5f7fa]"
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[15px] font-medium text-[#242529]">
                        {cat.label}
                      </span>
                      {cat.summary && (
                        <span className="truncate text-[13px] text-[#266df0]">
                          {cat.summary}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[rgba(0,0,0,0.3)]" />
                  </button>
                ))}

                {hasActiveFilters && onClearAll && (
                  <div className="mt-2 border-t border-[#eeeff1] px-4 py-3">
                    <button
                      onClick={onClearAll}
                      className="flex h-10 w-full items-center justify-center rounded-lg text-[14px] font-medium text-[#242529] active:bg-[#eeeff1]"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * FilterSheetOptionList — a multi-select option list for use inside a category detail view.
 * Renders checkboxes and an Apply / Cancel footer.
 */
export function FilterSheetOptionList({
  options,
  selected,
  onSelectedChange,
  onApply,
  onCancel,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onSelectedChange: (next: string[]) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  function toggle(value: string) {
    onSelectedChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  }

  return (
    <div className="flex flex-col">
      <div className="max-h-[50dvh] overflow-y-auto">
        {options.map((opt) => {
          const isSelected = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className="flex h-12 w-full items-center gap-3 rounded-lg px-3 text-left active:bg-[#f5f7fa]"
            >
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                  isSelected
                    ? "border-[#266df0] bg-[#266df0]"
                    : "border-[#d4d4d8]"
                )}
              >
                {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
              </div>
              <span className="text-[15px] text-[#242529]">{opt.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-[#eeeff1] pt-3 pb-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-11 flex-1 items-center justify-center rounded-lg text-[14px] font-medium text-[rgba(0,0,0,0.65)] active:bg-[#eeeff1]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onApply}
          className="flex h-11 flex-1 items-center justify-center rounded-lg bg-[#242529] text-[14px] font-semibold text-white active:bg-[#3a3b3f]"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
