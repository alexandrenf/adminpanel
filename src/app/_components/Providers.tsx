"use client";

import { SessionProvider } from "next-auth/react";
import { TRPCReactProvider } from "~/trpc/react";
import { type Session } from "next-auth";

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <TRPCReactProvider>
        {children}
      </TRPCReactProvider>
    </SessionProvider>
  );
} 