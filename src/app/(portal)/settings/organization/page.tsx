"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput, formatPhone, toE164 } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INDUSTRIES, OUTCOME_COLOR_PRESETS, getOutcomeColor } from "@/lib/constants";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogDescription as DialogDescription,
  ResponsiveDialogFooter as DialogFooter,
} from "@/components/ui/responsive-dialog";
import { Plus, Trash2, ArrowUp, ArrowDown, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { OutcomeCategory } from "@/lib/types";
import {
  saveOutcomeCategories,
  getOutcomeCategoryUsage,
  deleteOutcomeCategoryWithReassignment,
} from "./actions";

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
  { value: "UTC", label: "UTC" },
];

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const { organization, user } = useOrganization();
  const canEdit = user.role === "owner" || user.role === "admin";

  const [name, setName] = useState(organization.name);
  const [industry, setIndustry] = useState(organization.industry || "");
  const [businessPhone, setBusinessPhone] = useState(organization.business_phone ? formatPhone(organization.business_phone) : "");
  const [website, setWebsite] = useState(organization.website || "");
  const [address, setAddress] = useState(organization.address || "");
  const [timezone, setTimezone] = useState(organization.timezone);
  const [conversionLabel, setConversionLabel] = useState(organization.conversion_metric_label);
  const [avgOrderValue, setAvgOrderValue] = useState(organization.average_order_value.toString());
  const [primaryEmail, setPrimaryEmail] = useState(organization.primary_email || "");
  const [billingEmail, setBillingEmail] = useState(organization.billing_email || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Dirty tracking for org form
  const orgInitialValues = useMemo(() => ({
    name: organization.name,
    industry: organization.industry || "",
    businessPhone: organization.business_phone ? formatPhone(organization.business_phone) : "",
    website: organization.website || "",
    address: organization.address || "",
    timezone: organization.timezone,
    conversionLabel: organization.conversion_metric_label,
    avgOrderValue: organization.average_order_value.toString(),
    primaryEmail: organization.primary_email || "",
    billingEmail: organization.billing_email || "",
  }), [organization]);

  const orgDirty =
    name !== orgInitialValues.name ||
    industry !== orgInitialValues.industry ||
    businessPhone !== orgInitialValues.businessPhone ||
    website !== orgInitialValues.website ||
    address !== orgInitialValues.address ||
    timezone !== orgInitialValues.timezone ||
    conversionLabel !== orgInitialValues.conversionLabel ||
    avgOrderValue !== orgInitialValues.avgOrderValue ||
    primaryEmail !== orgInitialValues.primaryEmail ||
    billingEmail !== orgInitialValues.billingEmail;

  // Track categories dirty state from child
  const [categoriesChildDirty, setCategoriesChildDirty] = useState(false);
  const handleCategoriesDirtyChange = useCallback((dirty: boolean) => {
    setCategoriesChildDirty(dirty);
  }, []);

  // Unsaved changes prompt
  const anyDirty = orgDirty || categoriesChildDirty;

  useEffect(() => {
    if (!anyDirty) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [anyDirty]);

  const orgInitial = organization.name?.[0]?.toUpperCase() ?? "O";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("portal_organizations")
      .update({
        name,
        industry: industry || null,
        business_phone: toE164(businessPhone) || null,
        website: website || null,
        address: address || null,
        timezone,
        conversion_metric_label: conversionLabel,
        average_order_value: parseFloat(avgOrderValue) || 0,
        primary_email: primaryEmail || null,
        billing_email: billingEmail || null,
      })
      .eq("id", organization.id);

    setSaving(false);
    if (error) {
      setMessage({ text: "Failed to save: " + error.message, type: "error" });
    } else {
      setMessage({ text: "Organization updated.", type: "success" });
      router.refresh();
    }
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSave}>
        {/* Business details */}
        <div className="pb-10">
          <h2 className="text-[14px] font-semibold text-[#242529]">Business details</h2>
          <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">
            Information about your organization.
            {!canEdit && " Only admins and owners can edit these settings."}
          </p>

          <div className="mt-6 space-y-6">
            {/* Org identity */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#242529] text-[18px] font-medium text-white">
                {orgInitial}
              </div>
              <div>
                <p className="text-[14px] font-medium text-[#242529]">{organization.name}</p>
                <p className="text-[13px] text-[rgba(0,0,0,0.55)]">{organization.slug}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="orgName" className="text-[13px] text-[rgba(0,0,0,0.55)]">Business name</Label>
                <Input id="orgName" value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] text-[rgba(0,0,0,0.55)]">Industry</Label>
                <Select value={industry} onValueChange={(v) => setIndustry(v ?? "")} disabled={!canEdit}>
                  <SelectTrigger className="w-full">
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
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="bizPhone" className="text-[13px] text-[rgba(0,0,0,0.55)]">Phone</Label>
                <PhoneInput id="bizPhone" value={businessPhone} onChange={setBusinessPhone} disabled={!canEdit} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bizWebsite" className="text-[13px] text-[rgba(0,0,0,0.55)]">Website</Label>
                <Input id="bizWebsite" value={website} onChange={(e) => setWebsite(e.target.value)} disabled={!canEdit} placeholder="https://" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bizAddress" className="text-[13px] text-[rgba(0,0,0,0.55)]">Address</Label>
              <Input id="bizAddress" value={address} onChange={(e) => setAddress(e.target.value)} disabled={!canEdit} placeholder="123 Main St, City, State" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] text-[rgba(0,0,0,0.55)]">Timezone</Label>
              <Select value={timezone} onValueChange={(v) => setTimezone(v ?? timezone)} disabled={!canEdit}>
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
          </div>
        </div>

        <div className="h-px bg-[#eeeff1]" />

        {/* Email settings */}
        <div className="py-10">
          <h2 className="text-[14px] font-semibold text-[#242529]">Email settings</h2>
          <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">Where notifications and invoices are sent.</p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="primaryEmail" className="text-[13px] text-[rgba(0,0,0,0.55)]">Primary email</Label>
              <Input id="primaryEmail" type="email" value={primaryEmail} onChange={(e) => setPrimaryEmail(e.target.value)} disabled={!canEdit} placeholder="hello@company.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="billingEmail" className="text-[13px] text-[rgba(0,0,0,0.55)]">Billing email</Label>
              <Input id="billingEmail" type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} disabled={!canEdit} placeholder="billing@company.com" />
            </div>
          </div>
        </div>

        <div className="h-px bg-[#eeeff1]" />

        {/* Conversion metrics */}
        <div className="py-10">
          <h2 className="text-[14px] font-semibold text-[#242529]">Conversion metrics</h2>
          <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">Configure how revenue impact is calculated from calls.</p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="convLabel" className="text-[13px] text-[rgba(0,0,0,0.55)]">Conversion metric label</Label>
              <Input id="convLabel" value={conversionLabel} onChange={(e) => setConversionLabel(e.target.value)} disabled={!canEdit} />
              <p className="text-[12px] text-[rgba(0,0,0,0.35)]">e.g. &quot;Appointments Booked&quot;, &quot;Courts Booked&quot;</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aov" className="text-[13px] text-[rgba(0,0,0,0.55)]">Average order value ($)</Label>
              <Input id="aov" type="number" min="0" step="0.01" value={avgOrderValue} onChange={(e) => setAvgOrderValue(e.target.value)} disabled={!canEdit} />
              <p className="text-[12px] text-[rgba(0,0,0,0.35)]">Used to estimate revenue impact</p>
            </div>
          </div>
        </div>

        {message && (
          <p className={`text-[13px] ${message.type === "error" ? "text-red-600" : "text-emerald-600"}`}>
            {message.text}
          </p>
        )}

        {canEdit && (
          <Button type="submit" disabled={saving || !orgDirty} size="sm">
            {saving ? "Saving..." : "Save changes"}
          </Button>
        )}
      </form>

      <div className="mt-10 h-px bg-[#eeeff1]" />

      {/* Outcome categories */}
      <div className="py-10">
        <OutcomeCategoriesManager orgId={organization.id} canEdit={canEdit} onDirtyChange={handleCategoriesDirtyChange} />
      </div>
    </div>
  );
}

function isLocalOnly(id: string) {
  return id.startsWith("new-");
}

function OutcomeCategoriesManager({ orgId, canEdit, onDirtyChange }: { orgId: string; canEdit: boolean; onDirtyChange: (dirty: boolean) => void }) {
  const [categories, setCategories] = useState<OutcomeCategory[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OutcomeCategory | null>(null);
  const [deleteUsage, setDeleteUsage] = useState<number | null>(null);
  const [replacementId, setReplacementId] = useState<string>("");
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  function categoryFingerprint(cats: OutcomeCategory[]) {
    return JSON.stringify(cats.map((c) => ({
      name: c.name,
      description: c.description,
      impact_tier: c.impact_tier,
      color: c.color,
      sort_order: c.sort_order,
      close_likelihood: c.close_likelihood,
    })));
  }

  const categoriesDirty = savedSnapshot !== "" && categoryFingerprint(categories) !== savedSnapshot;

  useEffect(() => {
    onDirtyChange(categoriesDirty);
  }, [categoriesDirty, onDirtyChange]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("portal_outcome_categories")
        .select("*")
        .eq("org_id", orgId)
        .order("sort_order");
      const loaded = (data as OutcomeCategory[]) || [];
      setCategories(loaded);
      setSavedSnapshot(categoryFingerprint(loaded));
      setLoading(false);
    }
    load();
  }, [orgId]);

  function updateCategory(id: string, updates: Partial<OutcomeCategory>) {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  }

  function moveCategory(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= categories.length) return;
    const updated = [...categories];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setCategories(updated.map((c, i) => ({ ...c, sort_order: i + 1 })));
  }

  function addCategory() {
    const newId = "new-" + Date.now();
    const newCat: OutcomeCategory = {
      id: newId,
      org_id: orgId,
      name: "New Category",
      description: null,
      impact_tier: "low",
      color: null,
      sort_order: categories.length + 1,
      close_likelihood: 0,
      created_at: new Date().toISOString(),
    };
    setCategories([...categories, newCat]);
    setExpandedId(newId);
  }

  function removeCategoryLocal(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  async function startDelete(cat: OutcomeCategory) {
    // Unsaved (synthetic-id) rows have no server presence — delete locally.
    if (isLocalOnly(cat.id)) {
      removeCategoryLocal(cat.id);
      return;
    }
    setDeleteTarget(cat);
    setDeleteUsage(null);
    setReplacementId("");

    const result = await getOutcomeCategoryUsage({ orgId, categoryId: cat.id });
    if ("error" in result) {
      setMessage({ text: "Failed to check usage: " + result.error, type: "error" });
      setDeleteTarget(null);
      return;
    }
    setDeleteUsage(result.count);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteUsage === null) return;
    // Force reassignment when calls are attached. The Confirm button is
    // disabled in this branch until a replacement is picked.
    if (deleteUsage > 0 && !replacementId) return;

    setDeleting(true);
    const result = await deleteOutcomeCategoryWithReassignment({
      orgId,
      categoryId: deleteTarget.id,
      replacementId: deleteUsage > 0 ? replacementId : null,
    });
    setDeleting(false);

    if ("error" in result) {
      setMessage({ text: "Failed to delete: " + result.error, type: "error" });
      return;
    }

    removeCategoryLocal(deleteTarget.id);
    setDeleteTarget(null);
    setDeleteUsage(null);
    setReplacementId("");
    setMessage({
      text:
        result.reassigned > 0
          ? `Deleted "${deleteTarget.name}" and reassigned ${result.reassigned} call${result.reassigned === 1 ? "" : "s"}.`
          : `Deleted "${deleteTarget.name}".`,
      type: "success",
    });
  }

  function cancelDelete() {
    setDeleteTarget(null);
    setDeleteUsage(null);
    setReplacementId("");
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    // Build the diff payload. The server action strips synthetic local IDs
    // (created by addCategory) so the RPC inserts them as new rows, while
    // real UUIDs drive UPDATE-by-id and preserve portal_calls foreign keys.
    const result = await saveOutcomeCategories({
      orgId,
      categories: categories.map((c, i) => ({
        id: isLocalOnly(c.id) ? null : c.id,
        name: c.name,
        description: c.description || null,
        impact_tier: c.impact_tier,
        color: c.color,
        sort_order: i + 1,
        close_likelihood: c.close_likelihood,
      })),
    });

    setSaving(false);
    if ("error" in result) {
      setMessage({ text: "Failed to save: " + result.error, type: "error" });
      return;
    }

    setCategories(result.categories);
    setSavedSnapshot(categoryFingerprint(result.categories));
    setMessage({ text: "Outcome categories saved.", type: "success" });
  }

  if (loading) {
    return <p className="text-[13px] text-[rgba(0,0,0,0.35)]">Loading categories...</p>;
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-[#242529]">Outcome categories</h2>
          <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">
            Define how call outcomes are classified. Each category has an impact tier and close likelihood for revenue calculations.
          </p>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={addCategory} className="shrink-0 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        )}
      </div>

      <div className="mt-5 space-y-2">
        {categories.length === 0 && (
          <p className="text-[13px] text-[rgba(0,0,0,0.35)]">No outcome categories configured.</p>
        )}

        {categories.map((cat, index) => {
          const isExpanded = expandedId === cat.id;

          return (
            <div key={cat.id} className="rounded-lg border border-[#eeeff1]">
              {/* Main row */}
              <div
                className="flex cursor-pointer items-center gap-2 p-2.5"
                onClick={() => toggleExpand(cat.id)}
              >
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-[rgba(0,0,0,0.35)] transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />

                {canEdit && (
                  <div
                    className="flex flex-col gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => moveCategory(index, -1)}
                      disabled={index === 0}
                      className="text-[rgba(0,0,0,0.35)] hover:text-[rgba(0,0,0,0.65)] disabled:opacity-30"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => moveCategory(index, 1)}
                      disabled={index === categories.length - 1}
                      className="text-[rgba(0,0,0,0.35)] hover:text-[rgba(0,0,0,0.65)] disabled:opacity-30"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Color swatch */}
                <div onClick={(e) => e.stopPropagation()}>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <button
                          type="button"
                          disabled={!canEdit}
                          className="shrink-0 rounded-md border border-[#eeeff1] p-1 hover:border-[#eeeff1] disabled:opacity-50"
                        />
                      }
                    >
                      <span
                        className="block h-5 w-5 rounded-[3px]"
                        style={{ backgroundColor: getOutcomeColor(cat) }}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="start">
                      <div className="grid grid-cols-5 gap-1.5">
                        {OUTCOME_COLOR_PRESETS.map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => updateCategory(cat.id, { color: preset.value })}
                            className={cn(
                              "h-7 w-7 rounded-md border-2 transition-colors",
                              cat.color === preset.value ? "border-[#242529]" : "border-transparent hover:border-[#eeeff1]"
                            )}
                            style={{ backgroundColor: preset.value }}
                            title={preset.label}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Name */}
                <div
                  className="min-w-0 flex-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Input
                    value={cat.name}
                    onChange={(e) => updateCategory(cat.id, { name: e.target.value })}
                    disabled={!canEdit}
                    className="min-w-0"
                  />
                </div>

                {/* Impact tier */}
                <div onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={cat.impact_tier}
                    onValueChange={(v) => updateCategory(cat.id, { impact_tier: (v ?? cat.impact_tier) as "high" | "medium" | "low" })}
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Close likelihood */}
                <div
                  className="flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={cat.close_likelihood}
                    onChange={(e) => updateCategory(cat.id, { close_likelihood: parseInt(e.target.value) || 0 })}
                    disabled={!canEdit}
                    className="w-[60px]"
                  />
                  <span className="text-[12px] text-[rgba(0,0,0,0.35)]">%</span>
                </div>

                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void startDelete(cat);
                    }}
                    className="shrink-0 text-[rgba(0,0,0,0.35)] hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Expanded description */}
              {isExpanded && (
                <div className="border-t border-[#eeeff1]/60 px-2.5 pb-3 pt-2.5">
                  <Label className="text-[12px] text-[rgba(0,0,0,0.35)]">
                    Description
                  </Label>
                  <textarea
                    value={cat.description || ""}
                    onChange={(e) => updateCategory(cat.id, { description: e.target.value || null })}
                    disabled={!canEdit}
                    placeholder="Describe when this outcome should be assigned — used by AI for post-call classification..."
                    rows={2}
                    className="mt-1.5 w-full resize-none rounded-md border border-[#eeeff1] bg-white px-3 py-2 text-[13px] text-[#242529] placeholder:text-[rgba(0,0,0,0.35)] focus:border-[#eeeff1] focus:outline-none focus:ring-1 focus:ring-[#eeeff1] disabled:opacity-50"
                  />
                </div>
              )}
            </div>
          );
        })}

        {message && (
          <p className={`text-[13px] ${message.type === "error" ? "text-red-600" : "text-emerald-600"}`}>
            {message.text}
          </p>
        )}

        {canEdit && categories.length > 0 && (
          <div className="pt-2">
            <Button onClick={handleSave} disabled={saving || !categoriesDirty} size="sm">
              {saving ? "Saving..." : "Save categories"}
            </Button>
          </div>
        )}
      </div>

      {/* Delete dialog — forces reassignment when calls are attached */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) cancelDelete();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{deleteTarget?.name}&rdquo;?</DialogTitle>
            <DialogDescription>
              {deleteUsage === null
                ? "Checking how many calls use this category…"
                : deleteUsage === 0
                ? "No calls are assigned to this category. It can be deleted safely."
                : `${deleteUsage} call${deleteUsage === 1 ? " is" : "s are"} classified as "${deleteTarget?.name}". Pick a category to move them to before deleting.`}
            </DialogDescription>
          </DialogHeader>

          {deleteUsage !== null && deleteUsage > 0 && (
            <div className="space-y-1.5">
              <Label className="text-[13px] text-[rgba(0,0,0,0.55)]">Move calls to</Label>
              <Select value={replacementId} onValueChange={(v) => setReplacementId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a replacement category" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((c) => c.id !== deleteTarget?.id && !isLocalOnly(c.id))
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={cancelDelete} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void confirmDelete()}
              disabled={
                deleting ||
                deleteUsage === null ||
                (deleteUsage > 0 && !replacementId)
              }
            >
              {deleting
                ? "Deleting…"
                : deleteUsage && deleteUsage > 0
                ? "Reassign and delete"
                : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
