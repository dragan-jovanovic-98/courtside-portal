"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
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
  // Dev-only: expose the Supabase client on window for console testing of
  // edge functions. Active in development only.
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      // deno-lint-ignore no-explicit-any
      (window as unknown as { __sb: ReturnType<typeof createClient> }).__sb = createClient();
    }
  }, []);

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
