"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot, ChevronDown, ChevronRight, Phone, CalendarCheck } from "lucide-react";
import type { Agent } from "@/lib/types";

const AGENT_TYPES = [
  { value: "receptionist", label: "Receptionist" },
  { value: "intake", label: "Intake" },
  { value: "sales", label: "Sales" },
  { value: "support", label: "Support" },
  { value: "scheduling", label: "Scheduling" },
  { value: "general", label: "General" },
];

export default function AgentsSettingsPage() {
  const { organization, user } = useOrganization();
  const isAdmin = user.role === "owner" || user.role === "admin";
  const [agents, setAgents] = useState<Agent[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("portal_agents")
        .select("*")
        .eq("org_id", organization.id)
        .order("created_at");
      setAgents((data as Agent[]) || []);
      setLoading(false);
    }
    load();
  }, [organization.id]);

  async function handleSave(agent: Agent) {
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("portal_agents")
      .update({
        name: agent.name,
        agent_type: agent.agent_type,
        purpose_description: agent.purpose_description,
      })
      .eq("id", agent.id);
    setSaving(false);
    if (error) {
      setMessage({ text: "Failed to save: " + error.message, type: "error" });
    } else {
      setMessage({ text: "Agent updated.", type: "success" });
    }
  }

  function updateAgent(id: string, updates: Partial<Agent>) {
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl">
        <div className="pb-10">
          <div className="h-4 w-20 animate-pulse rounded bg-[#eeeff1]" />
          <div className="mt-2.5 h-3.5 w-64 animate-pulse rounded bg-[#eeeff1]" />
          <div className="mt-6 space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-[#eeeff1] px-4 py-3">
                <div className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-[#eeeff1]" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-28 animate-pulse rounded bg-[#eeeff1]" />
                  <div className="h-3 w-36 animate-pulse rounded bg-[#eeeff1]" />
                </div>
                <div className="h-5 w-14 animate-pulse rounded-md bg-[#eeeff1]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="pb-10">
        <h2 className="text-[14px] font-semibold text-[#242529]">AI Agents</h2>
        <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">
          {agents.length === 0
            ? "Your AI agents will appear here once configured."
            : `${agents.length} ${agents.length === 1 ? "agent" : "agents"} configured for ${organization.name}.`}
        </p>

        {agents.length === 0 ? (
          <div className="mt-8 flex flex-col items-center rounded-lg border border-[#eeeff1] py-16">
            <Bot className="h-10 w-10 text-[rgba(0,0,0,0.15)]" />
            <p className="mt-4 text-[14px] font-medium text-[#242529]">No agents configured</p>
            <p className="mt-1 text-[13px] text-[rgba(0,0,0,0.55)]">
              Your AI agent is being set up by the Court Side AI team.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            {agents.map((agent) => {
              const isExpanded = expandedId === agent.id;
              return (
                <div key={agent.id} className="rounded-lg border border-[#eeeff1]">
                  {/* Header row */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : agent.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f8f9fa]"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eeeff1]">
                      <Bot className="h-4 w-4 text-[rgba(0,0,0,0.55)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium text-[#242529]">{agent.name}</p>
                      <p className="text-[12px] text-[rgba(0,0,0,0.35)]">{agent.agent_type} · {agent.direction}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden items-center gap-3 text-[12px] text-[rgba(0,0,0,0.35)] sm:flex">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {agent.total_calls}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarCheck className="h-3 w-3" />
                          {agent.total_bookings}
                        </span>
                      </div>
                      <Badge
                        variant={agent.status === "active" ? "default" : "secondary"}
                        className="text-[11px]"
                      >
                        {agent.status}
                      </Badge>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-[rgba(0,0,0,0.35)]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-[rgba(0,0,0,0.35)]" />
                      )}
                    </div>
                  </button>

                  {/* Expanded config — client-editable fields only */}
                  {isExpanded && (
                    <div className="border-t border-[#eeeff1] px-4 py-5 space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[13px] text-[rgba(0,0,0,0.55)]">Display name</Label>
                          <Input
                            value={agent.name}
                            onChange={(e) => updateAgent(agent.id, { name: e.target.value })}
                            disabled={!isAdmin}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[13px] text-[rgba(0,0,0,0.55)]">Type</Label>
                          <Select
                            value={agent.agent_type}
                            onValueChange={(v) => updateAgent(agent.id, { agent_type: v ?? agent.agent_type })}
                            disabled={!isAdmin}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {AGENT_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[13px] text-[rgba(0,0,0,0.55)]">Purpose</Label>
                        <Textarea
                          value={agent.purpose_description || ""}
                          onChange={(e) => updateAgent(agent.id, { purpose_description: e.target.value })}
                          disabled={!isAdmin}
                          rows={3}
                          placeholder="Describe what this agent does..."
                        />
                      </div>

                      {message && (
                        <p className={`text-[13px] ${message.type === "error" ? "text-red-600" : "text-emerald-600"}`}>
                          {message.text}
                        </p>
                      )}

                      {isAdmin && (
                        <Button onClick={() => handleSave(agent)} disabled={saving} size="sm">
                          {saving ? "Saving..." : "Save changes"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="h-px bg-[#eeeff1]" />

      {/* Request new agent */}
      <div className="py-10">
        <h2 className="text-[14px] font-semibold text-[#242529]">Need another agent?</h2>
        <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">
          Contact the Courtside AI team to provision a new agent for your organization.
        </p>
        <Button variant="outline" size="sm" className="mt-4" disabled>
          Request new agent
        </Button>
      </div>
    </div>
  );
}
