"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { createOrgAndUser } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhoneInput, toE164 } from "@/components/ui/phone-input";
import { INDUSTRIES } from "@/lib/constants";

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [industry, setIndustry] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("Failed to create account. Please try again.");
      setLoading(false);
      return;
    }

    const result = await createOrgAndUser({
      authId: authData.user.id,
      orgName,
      firstName,
      lastName: lastName || null,
      email,
      industry: industry || null,
      businessPhone: toE164(businessPhone) || null,
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
      <h2 className="text-center text-[18px] font-semibold text-zinc-900 sm:text-[15px] sm:font-medium">
        Create your account
      </h2>
      <p className="mt-1 text-center text-[14px] text-zinc-500 sm:text-[13px] sm:text-zinc-400">
        Get started with your AI voice agent portal
      </p>

      <form onSubmit={handleSignup} className="mt-8 space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firstName" className="text-[13px] font-medium text-zinc-700">
              First name
            </Label>
            <Input
              id="firstName"
              placeholder="John"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="h-11 sm:h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName" className="text-[13px] font-medium text-zinc-700">
              Last name
            </Label>
            <Input
              id="lastName"
              placeholder="Smith"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="h-11 sm:h-10"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="orgName" className="text-[13px] font-medium text-zinc-700">
            Organization name
          </Label>
          <Input
            id="orgName"
            placeholder="Ace Sports Complex"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            required
            className="h-11 sm:h-10"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium text-zinc-700">
              Industry
            </Label>
            <Select value={industry} onValueChange={(v) => setIndustry(v ?? "")}>
              <SelectTrigger className="h-11 sm:h-10 w-full">
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind.value} value={ind.value}>
                    {ind.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium text-zinc-700">
              Business phone
            </Label>
            <PhoneInput
              value={businessPhone}
              onChange={setBusinessPhone}
              className="h-11 sm:h-10"
            />
          </div>
        </div>

        <div className="h-px bg-zinc-100" />

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
            className="h-11 sm:h-10"
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="h-12 w-full text-[14px] sm:h-10 sm:text-[13px]"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <div className="mt-8 border-t border-zinc-100 pt-6">
        <p className="text-center text-[13px] text-zinc-500">
          Already have an account?{" "}
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
