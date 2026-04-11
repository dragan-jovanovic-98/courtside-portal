"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogDescription as DialogDescription,
  ResponsiveDialogFooter as DialogFooter,
} from "@/components/ui/responsive-dialog";
import { MoreHorizontal, X, Clock } from "lucide-react";
import { formatDate } from "@/lib/date";
import { inviteTeamMember, cancelInvitation, updateMemberRole, removeMember } from "./actions";
import type { PortalUser } from "@/lib/types";

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export default function TeamSettingsPage() {
  const { organization, user } = useOrganization();
  const isOwner = user.role === "owner";
  const isAdmin = user.role === "admin" || isOwner;

  const [members, setMembers] = useState<PortalUser[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Role change dialog
  const [roleDialogMember, setRoleDialogMember] = useState<PortalUser | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [changingRole, setChangingRole] = useState(false);

  // Remove dialog
  const [removeDialogMember, setRemoveDialogMember] = useState<PortalUser | null>(null);
  const [removing, setRemoving] = useState(false);

  // Invitations
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  useEffect(() => {
    async function loadMembers() {
      const supabase = createClient();
      const { data } = await supabase
        .from("portal_users")
        .select("*")
        .eq("org_id", organization.id)
        .order("created_at");
      setMembers((data as PortalUser[]) || []);

      // Load pending invitations
      const { data: invites } = await supabase
        .from("portal_invitations")
        .select("*")
        .eq("org_id", organization.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      setInvitations((invites as Invitation[]) || []);
      setLoading(false);
    }
    loadMembers();
  }, [organization.id]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setMessage(null);
    setInviting(true);

    const result = await inviteTeamMember({
      email: inviteEmail,
      role: inviteRole,
      orgId: organization.id,
    });

    setInviting(false);
    if (result.error) {
      setMessage({ text: "Invite failed: " + result.error, type: "error" });
    } else {
      setMessage({ text: `Invitation sent to ${inviteEmail}`, type: "success" });
      setInviteEmail("");
      // Refresh invitations list
      const supabase = createClient();
      const { data: invites } = await supabase
        .from("portal_invitations")
        .select("*")
        .eq("org_id", organization.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      setInvitations((invites as Invitation[]) || []);
    }
  }

  async function handleCancelInvite(invitationId: string) {
    const result = await cancelInvitation({
      invitationId,
      orgId: organization.id,
    });

    if (result.error) {
      setMessage({ text: result.error, type: "error" });
    } else {
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      setMessage({ text: "Invitation cancelled.", type: "success" });
    }
  }

  async function handleRoleChange() {
    if (!roleDialogMember || !selectedRole) return;
    setChangingRole(true);

    const result = await updateMemberRole({
      memberId: roleDialogMember.id,
      newRole: selectedRole,
      orgId: organization.id,
    });

    setChangingRole(false);
    if (result.error) {
      setMessage({ text: result.error, type: "error" });
    } else {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === roleDialogMember.id ? { ...m, role: selectedRole as PortalUser["role"] } : m
        )
      );
      setMessage({ text: `Role updated to ${selectedRole}.`, type: "success" });
    }
    setRoleDialogMember(null);
  }

  async function handleRemove() {
    if (!removeDialogMember) return;
    setRemoving(true);

    const result = await removeMember({
      memberId: removeDialogMember.id,
      orgId: organization.id,
    });

    setRemoving(false);
    if (result.error) {
      setMessage({ text: result.error, type: "error" });
    } else {
      setMembers((prev) => prev.filter((m) => m.id !== removeDialogMember.id));
      setMessage({ text: "Member removed.", type: "success" });
    }
    setRemoveDialogMember(null);
  }

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default" as const;
      case "admin":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  };

  const initials = (m: PortalUser) =>
    `${m.first_name?.[0] || ""}${m.last_name?.[0] || ""}`.toUpperCase();

  const canModify = (member: PortalUser) => {
    if (member.id === user.id) return false;
    if (member.role === "owner") return false;
    if (user.role === "admin" && member.role === "admin") return false;
    return isAdmin;
  };

  return (
    <div className="max-w-2xl">
      {/* Members list */}
      <div className="pb-10">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-[#242529]">Team members</h2>
            <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">
              {members.length} {members.length === 1 ? "member" : "members"} in {organization.name}.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-1">
          {loading ? (
            <div className="space-y-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                  <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-[#eeeff1]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-32 animate-pulse rounded bg-[#eeeff1]" />
                    <div className="h-3 w-44 animate-pulse rounded bg-[#eeeff1]" />
                  </div>
                  <div className="h-5 w-14 animate-pulse rounded-md bg-[#eeeff1]" />
                </div>
              ))}
            </div>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[#f8f9fa]"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#242529] text-[12px] font-medium text-white">
                  {initials(member)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-[#242529]">
                    {member.first_name} {member.last_name}
                    {member.id === user.id && (
                      <span className="ml-1.5 text-[12px] font-normal text-[rgba(0,0,0,0.35)]">you</span>
                    )}
                  </p>
                  <p className="truncate text-[13px] text-[rgba(0,0,0,0.55)]">{member.email}</p>
                </div>

                <Badge variant={roleBadgeVariant(member.role)} className="shrink-0 text-[11px]">
                  {member.role}
                </Badge>

                <span className="hidden shrink-0 text-[13px] text-[rgba(0,0,0,0.35)] sm:block">
                  {formatDate(member.created_at, organization.timezone)}
                </span>

                {canModify(member) ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button className="shrink-0 rounded-md p-1 text-[rgba(0,0,0,0.35)] transition-colors hover:bg-[#eeeff1] hover:text-[rgba(0,0,0,0.65)]" />
                      }
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="bottom">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedRole(member.role);
                          setRoleDialogMember(member);
                        }}
                      >
                        Change role
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setRemoveDialogMember(member)}
                      >
                        Remove from team
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  isAdmin && member.id !== user.id && (
                    <div className="w-[28px] shrink-0" />
                  )
                )}
              </div>
            ))
          )}
        </div>

        {message && (
          <p className={`mt-4 text-[13px] ${message.type === "error" ? "text-red-600" : "text-emerald-600"}`}>
            {message.text}
          </p>
        )}
      </div>

      {isAdmin && (
        <>
          <div className="h-px bg-[#eeeff1]" />

          <div className="py-10">
            <h2 className="text-[14px] font-semibold text-[#242529]">Invite team member</h2>
            <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">
              Send an email invitation to add someone to your team.
            </p>

            <form onSubmit={handleInvite} className="mt-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label htmlFor="inviteEmail" className="text-[13px] text-[rgba(0,0,0,0.55)]">
                    Email address
                  </Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="w-full space-y-1.5 sm:w-[130px]">
                  <Label className="text-[13px] text-[rgba(0,0,0,0.55)]">Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v ?? "member")}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={inviting} size="sm" className="w-full shrink-0 sm:w-auto">
                  {inviting ? "Sending..." : "Send invite"}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Pending invitations */}
      {isAdmin && invitations.length > 0 && (
        <>
          <div className="h-px bg-[#eeeff1]" />

          <div className="py-10">
            <h2 className="text-[14px] font-semibold text-[#242529]">Pending invitations</h2>
            <p className="mt-1.5 text-[13px] text-[rgba(0,0,0,0.55)]">
              {invitations.length} pending {invitations.length === 1 ? "invitation" : "invitations"}.
            </p>

            <div className="mt-6 space-y-1">
              {invitations.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[#f8f9fa]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-[#eeeff1] text-[rgba(0,0,0,0.35)]">
                    <Clock className="h-3.5 w-3.5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-[#242529]">{invite.email}</p>
                    <p className="text-[13px] text-[rgba(0,0,0,0.55)]">
                      Invited {formatDate(invite.created_at, organization.timezone)}
                    </p>
                  </div>

                  <Badge variant="outline" className="shrink-0 text-[11px]">
                    {invite.role}
                  </Badge>

                  <button
                    onClick={() => handleCancelInvite(invite.id)}
                    className="shrink-0 rounded-md p-1 text-[rgba(0,0,0,0.35)] transition-colors hover:bg-[#eeeff1] hover:text-[rgba(0,0,0,0.65)]"
                    title="Cancel invitation"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Change role dialog */}
      <Dialog
        open={!!roleDialogMember}
        onOpenChange={(open) => !open && setRoleDialogMember(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
            <DialogDescription>
              Update the role for {roleDialogMember?.first_name} {roleDialogMember?.last_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v ?? selectedRole)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                {isOwner && <SelectItem value="owner">Owner</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRoleDialogMember(null)}>
              Cancel
            </Button>
            <Button size="sm" disabled={changingRole} onClick={handleRoleChange}>
              {changingRole ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove member dialog */}
      <Dialog
        open={!!removeDialogMember}
        onOpenChange={(open) => !open && setRemoveDialogMember(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove team member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {removeDialogMember?.first_name}{" "}
              {removeDialogMember?.last_name} from {organization.name}? They will lose access to the
              portal immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRemoveDialogMember(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" disabled={removing} onClick={handleRemove}>
              {removing ? "Removing..." : "Remove member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
