"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * StickySaveBar — bottom-fixed Cancel/Save bar visible when a form is dirty.
 * On mobile (< md) it pins to the viewport bottom respecting safe-area.
 * On desktop (md+) it can either pin to the bottom or render inline depending on `mode`.
 *
 * Default behavior: shown only on mobile (md:hidden) so desktop forms keep their
 * inline button placement. Pass `mode="always"` to always render at bottom.
 */
export function StickySaveBar({
  visible,
  saving = false,
  onSave,
  onCancel,
  saveLabel = "Save changes",
  cancelLabel = "Discard",
  mode = "mobile",
  className,
}: {
  visible: boolean;
  saving?: boolean;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  mode?: "mobile" | "always";
  className?: string;
}) {
  if (!visible) return null;

  return (
    <>
      {/* Spacer prevents content from being hidden behind the fixed bar */}
      <div
        aria-hidden
        className={cn(
          "h-[68px] safe-area-bottom",
          mode === "mobile" && "md:hidden"
        )}
      />
      <div
        role="region"
        aria-label="Unsaved changes"
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-[#eeeff1] bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/80 px-4 py-3 safe-area-bottom",
          "flex items-center justify-between gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]",
          mode === "mobile" && "md:hidden",
          className
        )}
      >
        <span className="flex-1 truncate text-[13px] text-[rgba(0,0,0,0.6)]">
          You have unsaved changes
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={saving}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "Saving..." : saveLabel}
          </Button>
        </div>
      </div>
    </>
  );
}
