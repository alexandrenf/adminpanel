"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { isIfmsaEmailSession } from "~/server/lib/authcheck";
import PrecisaLogin from "./PrecisaLogin";

interface IfmsaEmailWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function IfmsaEmailWrapper({ children, fallback }: IfmsaEmailWrapperProps) {
  const { data: session } = useSession();
  const [isIfmsaEmail, setIsIfmsaEmail] = useState<boolean | null>(null);

  useEffect(() => {
    const checkEmail = async () => {
      const result = await isIfmsaEmailSession(session);
      setIsIfmsaEmail(result);
    };
    checkEmail();
  }, [session]);

  if (isIfmsaEmail === null) {
    return <div>Loading...</div>;
  }

  if (!isIfmsaEmail) {
    return fallback || (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
        
        {/* Floating orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        <div className="relative z-10 flex-grow flex items-center justify-center">
          <PrecisaLogin />
        </div>
      </main>
    );
  }

  return <>{children}</>;
} 