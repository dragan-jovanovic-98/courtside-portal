"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Organization, PortalUser } from "@/lib/types";

interface OrgContextValue {
  organization: Organization;
  user: PortalUser;
  allMemberships: PortalUser[];
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({
  organization,
  user,
  allMemberships,
  children,
}: OrgContextValue & { children: ReactNode }) {
  return (
    <OrgContext.Provider value={{ organization, user, allMemberships }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error("useOrganization must be used within an OrgProvider");
  }
  return context;
}
