"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * ResponsiveDialog renders as a centered Dialog at md+ and as a bottom Sheet at <md.
 * Uses pure CSS breakpoints (no JS hook), so it is SSR-safe and avoids hydration flicker.
 *
 * Same API as <Dialog>: <ResponsiveDialog open onOpenChange><ResponsiveDialogContent>...</...></ResponsiveDialog>
 */

function ResponsiveDialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="responsive-dialog" {...props} />;
}

function ResponsiveDialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="responsive-dialog-trigger" {...props} />;
}

function ResponsiveDialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="responsive-dialog-close" {...props} />;
}

function ResponsiveDialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="responsive-dialog-portal" {...props} />;
}

function ResponsiveDialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="responsive-dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/20 duration-150 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  );
}

function ResponsiveDialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
}) {
  return (
    <ResponsiveDialogPortal>
      <ResponsiveDialogOverlay />
      <DialogPrimitive.Popup
        data-slot="responsive-dialog-content"
        className={cn(
          // Mobile (default): bottom sheet
          "fixed inset-x-0 bottom-0 z-50 grid w-full max-h-[90dvh] overflow-hidden rounded-t-2xl bg-popover pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] px-4 text-sm text-popover-foreground ring-1 ring-foreground/10 outline-none duration-200",
          "data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom",
          // Desktop md+: centered modal
          "md:fixed md:inset-x-auto md:bottom-auto md:top-1/2 md:left-1/2 md:max-h-none md:w-full md:max-w-[calc(100%-2rem)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:p-4 md:sm:max-w-sm md:gap-4",
          "md:data-open:slide-in-from-bottom-0 md:data-open:zoom-in-95 md:data-open:fade-in-0 md:data-closed:zoom-out-95 md:data-closed:fade-out-0",
          className
        )}
        {...props}
      >
        {/* Mobile drag handle */}
        <div className="md:hidden mx-auto -mt-2 mb-2 h-1 w-9 rounded-full bg-[rgba(0,0,0,0.15)]" aria-hidden />
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="responsive-dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </ResponsiveDialogPortal>
  );
}

function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="responsive-dialog-header"
      className={cn("flex flex-col gap-1.5 pb-2", className)}
      {...props}
    />
  );
}

function ResponsiveDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="responsive-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

function ResponsiveDialogTitle({
  className,
  ...props
}: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="responsive-dialog-title"
      className={cn(
        "font-heading text-[16px] leading-tight font-semibold text-foreground",
        className
      )}
      {...props}
    />
  );
}

function ResponsiveDialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="responsive-dialog-description"
      className={cn("text-[13px] text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
};
