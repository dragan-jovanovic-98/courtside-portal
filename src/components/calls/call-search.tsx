"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function CallSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("search") || "");
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setValue(searchParams.get("search") || "");
  }, [searchParams]);

  function updateSearch(newValue: string) {
    setValue(newValue);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (newValue) {
        params.set("search", newValue);
      } else {
        params.delete("search");
      }
      params.set("page", "1");
      router.push(`?${params.toString()}`);
    }, 300);
  }

  function clearSearch() {
    updateSearch("");
  }

  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(0,0,0,0.35)]" />
      <Input
        placeholder="Search by name, number, transcript, or summary..."
        value={value}
        onChange={(e) => updateSearch(e.target.value)}
        className="pl-9 pr-8 text-[14px] border-[#eeeff1] placeholder:text-[rgba(0,0,0,0.35)]"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
          onClick={clearSearch}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
