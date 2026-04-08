"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput, formatPhone, toE164 } from "@/components/ui/phone-input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Toronto", label: "Eastern Time — Canada" },
  { value: "America/Vancouver", label: "Pacific Time — Canada" },
  { value: "Europe/London", label: "Greenwich Mean Time (GMT)" },
  { value: "Europe/Paris", label: "Central European Time (CET)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET)" },
];

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user } = useOrganization();
  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name || "");
  const [phone, setPhone] = useState(user.phone ? formatPhone(user.phone) : "");
  const [timezone, setTimezone] = useState(user.timezone || "America/New_York");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const initials = `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase();

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("portal_users")
      .update({
        first_name: firstName,
        last_name: lastName || null,
        phone: toE164(phone) || null,
        timezone,
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      setMessage({ text: "Failed to save: " + error.message, type: "error" });
    } else {
      setMessage({ text: "Profile updated.", type: "success" });
      router.refresh();
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ text: "Password must be at least 6 characters.", type: "error" });
      return;
    }

    setSavingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);

    if (error) {
      setPasswordMessage({ text: "Failed: " + error.message, type: "error" });
    } else {
      setPasswordMessage({ text: "Password updated.", type: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Profile section */}
      <div className="pb-10">
        <h2 className="text-[14px] font-semibold text-[#242529]">Profile</h2>
        <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">Manage your personal details.</p>

        <form onSubmit={handleSaveProfile} className="mt-6 space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#242529] text-[18px] font-medium text-white">
              {initials}
            </div>
            <div>
              <p className="text-[14px] font-medium text-[#242529]">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-[13px] text-[rgba(0,0,0,0.55)]">{user.email}</p>
            </div>
          </div>

          {/* Name fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-[13px] text-[rgba(0,0,0,0.55)]">
                First name
              </Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-[13px] text-[rgba(0,0,0,0.55)]">
                Last name
              </Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label className="text-[13px] text-[rgba(0,0,0,0.55)]">Email address</Label>
            <div className="flex items-center gap-3">
              <Input value={user.email} disabled className="flex-1" />
              <span className="shrink-0 text-[13px] text-[rgba(0,0,0,0.35)]">Contact support to change</span>
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-[13px] text-[rgba(0,0,0,0.55)]">
              Phone number
            </Label>
            <PhoneInput
              id="phone"
              value={phone}
              onChange={setPhone}
            />
          </div>

          {/* Timezone */}
          <div className="space-y-1.5">
            <Label className="text-[13px] text-[rgba(0,0,0,0.55)]">Timezone</Label>
            <Select value={timezone} onValueChange={(v) => { if (v) setTimezone(v); }}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {TIMEZONES.find((tz) => tz.value === timezone)?.label ?? timezone}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {message && (
            <p className={`text-[13px] ${message.type === "error" ? "text-red-600" : "text-emerald-600"}`}>
              {message.text}
            </p>
          )}

          <Button type="submit" disabled={saving} size="sm">
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </div>

      <div className="h-px bg-[#eeeff1]" />

      {/* Password section */}
      <div className="py-10">
        <h2 className="text-[14px] font-semibold text-[#242529]">Password</h2>
        <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">Update your password.</p>

        <form onSubmit={handleChangePassword} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword" className="text-[13px] text-[rgba(0,0,0,0.55)]">
              Current password
            </Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-[13px] text-[rgba(0,0,0,0.55)]">
                New password
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-[13px] text-[rgba(0,0,0,0.55)]">
                Confirm new password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
          </div>

          {passwordMessage && (
            <p className={`text-[13px] ${passwordMessage.type === "error" ? "text-red-600" : "text-emerald-600"}`}>
              {passwordMessage.text}
            </p>
          )}

          <Button type="submit" disabled={savingPassword} size="sm">
            {savingPassword ? "Updating..." : "Update password"}
          </Button>
        </form>
      </div>

      <div className="h-px bg-[#eeeff1]" />

      {/* Danger zone */}
      <div className="py-10">
        <h2 className="text-[14px] font-semibold text-red-600">Delete account</h2>
        <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <Button variant="destructive" size="sm" className="mt-4" disabled>
          Delete account
        </Button>
      </div>
    </div>
  );
}
