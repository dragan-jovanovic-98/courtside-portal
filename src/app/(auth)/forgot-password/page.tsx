"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const siteUrl = window.location.origin;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?type=recovery`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <h2 className="text-[15px] font-medium text-zinc-900">Check your email</h2>
        <p className="mt-2 text-[13px] text-zinc-500">
          We sent a password reset link to <span className="font-medium text-zinc-700">{email}</span>.
          Click the link in the email to reset your password.
        </p>
        <p className="mt-6 text-[13px] text-zinc-400">
          Didn&apos;t receive it?{" "}
          <button
            onClick={() => setSent(false)}
            className="font-medium text-zinc-900 hover:underline"
          >
            Try again
          </button>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-center text-[18px] font-semibold text-zinc-900 sm:text-[15px] sm:font-medium">
        Reset your password
      </h2>
      <p className="mt-1 text-center text-[14px] text-zinc-500 sm:text-[13px] sm:text-zinc-400">
        Enter your email and we&apos;ll send you a reset link
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[13px] font-medium text-zinc-700">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11 sm:h-10"
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="h-12 w-full text-[14px] sm:h-10 sm:text-[13px]"
          disabled={loading}
        >
          {loading ? "Sending..." : "Send reset link"}
        </Button>
      </form>

      <div className="mt-8 border-t border-zinc-100 pt-6">
        <p className="text-center text-[13px] text-zinc-500">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-medium text-zinc-900 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
