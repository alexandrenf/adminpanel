"use client";

import { SessionProvider } from "next-auth/react";
import { TRPCReactProvider } from "~/trpc/react";
import { type Session } from "next-auth";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
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