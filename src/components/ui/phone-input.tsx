"use client";

import { useCallback } from "react";
import { Input } from "@/components/ui/input";

function formatPhone(raw: string): string {
  // Strip everything except digits
  const digits = raw.replace(/\D/g, "");

  // Remove leading 1 (country code) — we always prefix +1
  const national = digits.startsWith("1") ? digits.slice(1) : digits;

  // Cap at 10 digits
  const d = national.slice(0, 10);

  if (d.length === 0) return "";
  if (d.length <= 3) return `+1 (${d}`;
  if (d.length <= 6) return `+1 (${d.slice(0, 3)}) ${d.slice(3)}`;
  return `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function toE164(formatted: string): string {
  const digits = formatted.replace(/\D/g, "");
  const national = digits.startsWith("1") ? digits.slice(1) : digits;
  if (national.length === 0) return "";
  return `+1${national.slice(0, 10)}`;
}

function isValidPhone(formatted: string): boolean {
  if (!formatted) return true; // empty is valid (optional field)
  const digits = formatted.replace(/\D/g, "");
  const national = digits.startsWith("1") ? digits.slice(1) : digits;
  return national.length === 10;
}

interface PhoneInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

function PhoneInput({ id, value, onChange, disabled, className }: PhoneInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(formatPhone(e.target.value));
    },
    [onChange]
  );

  return (
    <Input
      id={id}
      type="tel"
      value={value}
      onChange={handleChange}
      disabled={disabled}
      placeholder="+1 (555) 000-0000"
      className={className}
    />
  );
}

export { PhoneInput, formatPhone, toE164, isValidPhone };
