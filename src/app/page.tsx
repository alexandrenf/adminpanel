"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Shield, Users, Settings, LogIn, LogOut, Calendar, ArrowRight, MapPin, Clock } from "lucide-react";
import { isIfmsaEmailSession } from "~/server/lib/authcheck";
import { useEffect, useState, useMemo, useCallback, memo } from "react";
import { useQuery } from "convex/react";
import { api as convexApi } from "../../convex/_generated/api";
import PrettyLoading from "~/components/ui/PrettyLoading";

// Utility function to format dates without timezone conversion - memoized
const formatDateWithoutTimezone = (timestamp: number): string => {
  const date = new Date(timestamp);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

// Helper function to check if current time is past deadline (BSB timezone)
// This correctly handles BSB timezone (UTC-3) regardless of server location
const isDeadlinePassed = (deadline: number): boolean => {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  
  // BSB timezone is UTC-3
  // We want to allow registration until 23:59:59.999 BSB time of the deadline day
  
  // Get the deadline date in UTC and extract date components
  const year = deadlineDate.getUTCFullYear();
  const month = deadlineDate.getUTCMonth();
  const day = deadlineDate.getUTCDate();
  
  // Create end of day in BSB timezone (23:59:59.999)
  // Since BSB is UTC-3, we need to create the end of day at UTC+3 hours
  const endOfDayBSB = new Date();
  endOfDayBSB.setUTCFullYear(year, month, day);
  endOfDayBSB.setUTCHours(23 + 3, 59, 59, 999); // Add 3 hours to convert BSB to UTC
  
  return now > endOfDayBSB;
};

// Memoized background component
const BackgroundElements = memo(() => (
  <>
    {/* Background decorative elements */}
    <div className="absolute inset-0 opacity-20">
      <div className="w-full h-full" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>
    </div>
    
    {/* Floating orbs */}
    <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
    <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
  </>
));
BackgroundElements.displayName = 'BackgroundElements';

// Memoized header component
const Header = memo(({ session }: { session: any }) => (
  <header className="pt-8 pb-4">
    <div className="container mx-auto px-6">
      {!session && (
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <Image
              src="/logo.svg"
              alt="IFMSA Brazil Logo"
              width={320}
              height={128}
              className="h-24 w-auto"
              priority
            />
          </div>
        </div>
      )}
    </div>
  </header>
));
Header.displayName = 'Header';

// Memoized authentication info component
const AuthInfo = memo(({ session }: { session: any }) => {
  if (!session) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 border border-blue-100">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-2">Acesso Parcialmente Restrito</h3>
            <p className="text-gray-700 text-sm leading-relaxed">
              Para ter acesso a funções administrativas, faça login com uma conta Google{" "}
              <span className="font-semibold text-blue-700">@ifmsabrazil.org</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 mb-8 border border-green-100">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
          <Users className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <p className="text-sm text-green-700 font-medium">Logado como</p>
          <p className="text-lg font-semibold text-green-900">{session.user?.name}</p>
          <p className="text-sm text-green-600">{session.user?.email}</p>
        </div>
      </div>
    </div>
  );
});
AuthInfo.displayName = 'AuthInfo';

// Memoized assembly info component
const AssemblyInfo = memo(({ assembly }: { assembly: any }) => {
  const formattedStartDate = useMemo(() => 
    assembly ? formatDateWithoutTimezone(assembly.startDate) : '', 
    [assembly?.startDate]
  );
  
  const formattedEndDate = useMemo(() => 
    assembly ? formatDateWithoutTimezone(assembly.endDate) : '', 
    [assembly?.endDate]
  );

  const registrationStatus = useMemo(() => {
    if (!assembly) return null;
    
    const isOpen = assembly.registrationOpen && 
      (!assembly.registrationDeadline || !isDeadlinePassed(assembly.registrationDeadline));
    const isExpired = assembly.registrationDeadline && isDeadlinePassed(assembly.registrationDeadline);
    
    return {
      isOpen,
      isExpired,
      text: isOpen ? "Inscrições Abertas" : isExpired ? "Prazo Expirado" : "Inscrições Fechadas",
      className: isOpen ? "bg-green-100 text-green-800" : 
                 isExpired ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800",
      linkText: isOpen ? "Inscrever-se agora" : "Ver detalhes"
    };
  }, [assembly]);

  if (!assembly) {
    return (
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl p-6 border border-gray-200">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-6 h-6 text-gray-500" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Nenhuma AG Programada</h4>
          <p className="text-sm text-gray-600 mb-4">
            Não há assembleias gerais programadas no momento.
          </p>
          <Link href="/ag" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700">
            Ver todas as assembleias
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-2">{assembly.name}</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>
                <span className="font-medium">Data:</span> {formattedStartDate} - {formattedEndDate}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>
                <span className="font-medium">Local:</span> {assembly.location}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <Users className="w-4 h-4 text-blue-600" />
              <span>
                <span className="font-medium">Tipo:</span> {assembly.type === "AG" ? "Presencial" : "Online"}
              </span>
            </div>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Status:</span>{" "}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${registrationStatus?.className}`}>
                {registrationStatus?.text}
              </span>
            </p>
            {assembly.description && (
              <p className="text-sm text-gray-600 mt-2">
                {assembly.description}
              </p>
            )}
          </div>
          <div className="mt-4">
            <Link href="/ag" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700">
              {registrationStatus?.linkText}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
});
AssemblyInfo.displayName = 'AssemblyInfo';

// Memoized quick access component
const QuickAccess = memo(() => (
  <div className="mt-12 pt-8 border-t border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">
      Acesso Rápido
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Link href="/comites-locais" className="group">
        <div className="bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 group-hover:scale-105">
          <Users className="w-8 h-8 text-blue-600 mb-2" />
          <p className="font-medium text-gray-900">Comitês Locais</p>
          <p className="text-sm text-gray-600">Gerenciar comitês</p>
        </div>
      </Link>
      <Link href="/times" className="group">
        <div className="bg-white rounded-xl p-4 border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-200 group-hover:scale-105">
          <Users className="w-8 h-8 text-purple-600 mb-2" />
          <p className="font-medium text-gray-900">Times</p>
          <p className="text-sm text-gray-600">Equipes e grupos</p>
        </div>
      </Link>
      <Link href="/config" className="group">
        <div className="bg-white rounded-xl p-4 border border-gray-200 hover:border-green-300 hover:shadow-md transition-all duration-200 group-hover:scale-105">
          <Settings className="w-8 h-8 text-green-600 mb-2" />
          <p className="font-medium text-gray-900">Configurações</p>
          <p className="text-sm text-gray-600">Sistema e ajustes</p>
        </div>
      </Link>
    </div>
  </div>
));
QuickAccess.displayName = 'QuickAccess';

export default function Home() {
  const { data: session } = useSession();
  const [isIfmsaEmail, setIsIfmsaEmail] = useState<boolean | null>(null);
  
  // Query for the next upcoming assembly
  const nextAssembly = useQuery(convexApi.assemblies?.getNextUpcoming);

  // Memoized email check function
  const checkEmail = useCallback(async () => {
    const result = await isIfmsaEmailSession(session);
    setIsIfmsaEmail(result);
  }, [session]);

  useEffect(() => {
    checkEmail();
  }, [checkEmail]);

  // Early return for loading state
  if (isIfmsaEmail === null) {
    return <PrettyLoading />;
  }

  return (
    <main className="flex-grow bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      <BackgroundElements />
      
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header session={session} />

        {/* Main content */}
        <div className="flex-grow flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-4xl">
            <Card className="bg-white/95 backdrop-blur-xl border-0 shadow-2xl shadow-black/20 rounded-3xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-white/30 pointer-events-none"></div>
              
              <CardHeader className="relative z-10 text-center py-12 px-8">
                <div className="mb-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-lg">
                    <Users className="w-10 h-10 text-white" />
                  </div>
                </div>
                <CardTitle className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-4">
                  Portal IFMSA Brazil
                </CardTitle>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  Sistema para membros da IFMSA Brazil
                </p>
              </CardHeader>

              <CardContent className="relative z-10 px-8 pb-12">
                <div className="max-w-2xl mx-auto">
                  <AuthInfo session={session} />

                  {/* AG Information Display */}
                  {session && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">
                        Próxima Assembleia Geral
                      </h3>
                                             <AssemblyInfo assembly={nextAssembly} />
                    </div>
                  )}

                  {/* Action button */}
                  <div className="text-center">
                    <Link href={session ? "/api/auth/signout" : "/api/auth/signin"} passHref legacyBehavior>
                      <Button 
                        asChild 
                        size="lg" 
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                      >
                        <a className="flex items-center space-x-3">
                          {session ? (
                            <>
                              <LogOut className="w-5 h-5" />
                              <span>Desconectar</span>
                            </>
                          ) : (
                            <>
                              <LogIn className="w-5 h-5" />
                              <span>Entrar com Google</span>
                            </>
                          )}
                        </a>
                      </Button>
                    </Link>
                  </div>

                  {/* Features preview for logged in users */}
                  {isIfmsaEmail && <QuickAccess />}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}