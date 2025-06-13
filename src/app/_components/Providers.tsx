"use client";

import { SessionProvider } from "next-auth/react";
import { TRPCReactProvider } from "~/trpc/react";
import { type Session } from "next-auth";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useMemo } from "react";

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  // Memoize the ConvexReactClient to prevent re-instantiation
  const convex = useMemo(() => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!), []);

  return (
    <ConvexProvider client={convex}>
      <SessionProvider session={session}>
        <TRPCReactProvider>
          {children}
        </TRPCReactProvider>
      </SessionProvider>
    </ConvexProvider>
  );
} 