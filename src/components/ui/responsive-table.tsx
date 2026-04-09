"use client";

import * as React from "react";

/**
 * ResponsiveTable — renders the desktop slot at md+ and the mobile slot at <md.
 * Uses pure CSS so it's SSR-safe and avoids hook-based hydration mismatches.
 *
 * Usage:
 *   <ResponsiveTable
 *     desktop={<DataTable ... />}
 *     mobile={<CardList items={rows} renderCard={...} />}
 *   />
 */
export function ResponsiveTable({
  desktop,
  mobile,
}: {
  desktop: React.ReactNode;
  mobile: React.ReactNode;
}) {
  return (
    <>
      <div className="hidden md:block">{desktop}</div>
      <div className="md:hidden">{mobile}</div>
    </>
  );
}
