"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { acceptInvite } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<p className="py-8 text-center text-[13px] text-zinc-400">Loading...</p>}>
      <AcceptInviteContent />
    </Suspense>
  );
}

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteId = searchParams.get("invite_id");

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authUser, setAuthUser] = useState<{ id: string; email: string } | null>(null);
  const [orgName, setOrgName] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setAuthUser({ id: user.id, email: user.email || "" });
      setOrgName(user.user_metadata?.org_name || "the team");
      setChecking(false);
    }
    checkAuth();
  }, [router]);

  if (!inviteId) {
    return (
      <p className="py-8 text-center text-[13px] text-zinc-500">Invalid invitation link.</p>
    );
  }

  if (checking) {
    return (
      <p className="py-8 text-center text-[13px] text-zinc-400">Verifying invitation...</p>
    );
  }

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!authUser || !inviteId) return;
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: pwError } = await supabase.auth.updateUser({
      password,
    });

    if (pwError) {
      setError("Failed to set password: " + pwError.message);
      setLoading(false);
      return;
    }

    const [firstName, ...lastParts] = fullName.trim().split(" ");
    const lastName = lastParts.join(" ") || null;

    const result = await acceptInvite({
      authId: authUser.id,
      inviteId,
      firstName,
      lastName,
      email: authUser.email,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <h2 className="text-center text-[15px] font-medium text-zinc-900">
        Join {orgName}
      </h2>
      <p className="mt-1 text-center text-[13px] text-zinc-400">
        Complete your profile to get started
      </p>

      <form onSubmit={handleAccept} className="mt-8 space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-[13px] font-medium text-zinc-700">Email</Label>
          <Input value={authUser?.email || ""} disabled className="h-10" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fullName" className="text-[13px] font-medium text-zinc-700">
            Full name
          </Label>
          <Input
            id="fullName"
            placeholder="John Smith"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="h-10"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-[13px] font-medium text-zinc-700">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-[13px] font-medium text-zinc-700">
              Confirm password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
              className="h-10"
            />
          </div>
        </div>

        <Button type="submit" size="lg" className="h-10 w-full text-[13px]" disabled={loading}>
          {loading ? "Joining..." : "Join team"}
        </Button>
      </form>
    </div>
  );
}
