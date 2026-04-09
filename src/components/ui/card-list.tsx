"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * CardList renders an array of items as a vertically stacked, single-bordered card list.
 * Used as the mobile equivalent of a desktop data table.
 *
 * Pass `items` and a `renderCard` function. The container handles the borders/dividers.
 */
export function CardList<T>({
  items,
  renderCard,
  getKey,
  className,
  emptyState,
}: {
  items: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
  getKey: (item: T, index: number) => string;
  className?: string;
  emptyState?: React.ReactNode;
}) {
  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[#eeeff1] bg-white",
        className
      )}
    >
      {items.map((item, idx) => (
        <div
          key={getKey(item, idx)}
          className={cn(idx > 0 && "border-t border-[#eeeff1]")}
        >
          {renderCard(item, idx)}
        </div>
      ))}
    </div>
  );
}

/**
 * CardListItem provides a default tappable row layout. Use it inside `renderCard`
 * for typical "title + secondary + meta + chevron" patterns.
 */
export function CardListItem({
  href,
  onClick,
  children,
  className,
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const base = cn(
    "flex w-full items-center gap-3 px-4 py-3 text-left active:bg-[#f5f7fa]",
    className
  );

  if (href) {
    return (
      <Link href={href} className={base}>
        {children}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={base}>
        {children}
      </button>
    );
  }

  return <div className={base}>{children}</div>;
}
