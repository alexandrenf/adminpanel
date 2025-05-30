"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { 
  Shield, 
  Users, 
  Settings, 
  LogIn, 
  LogOut, 
  AlertTriangle, 
  Globe, 
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Star,
  Heart,
  Zap,
  Trophy,
  Target,
  BookOpen,
  Coffee
} from "lucide-react";
import { isIfmsaEmailSession } from "~/server/lib/authcheck";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api as convexApi } from "../../convex/_generated/api";

// Utility function to format dates
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

// Utility function to get days until event
const getDaysUntil = (timestamp: number): number => {
  const now = new Date();
  const eventDate = new Date(timestamp);
  const diffTime = eventDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "approved":
        return { 
          color: "bg-green-100 text-green-800 border-green-200", 
          icon: CheckCircle, 
          text: "Aprovado" 
        };
      case "pending":
        return { 
          color: "bg-yellow-100 text-yellow-800 border-yellow-200", 
          icon: Clock, 
          text: "Pendente" 
        };
      case "pending_review":
        return { 
          color: "bg-blue-100 text-blue-800 border-blue-200", 
          icon: Clock, 
          text: "Em Análise" 
        };
      case "rejected":
        return { 
          color: "bg-red-100 text-red-800 border-red-200", 
          icon: AlertTriangle, 
          text: "Rejeitado" 
        };
      default:
        return { 
          color: "bg-gray-100 text-gray-800 border-gray-200", 
          icon: Clock, 
          text: status 
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} flex items-center space-x-1 px-3 py-1`}>
      <Icon className="w-3 h-3" />
      <span>{config.text}</span>
    </Badge>
  );
}

// AG Card Component for logged-in users
function AGCard({ assembly, registrationStatus, userRegistration }: { 
  assembly: any; 
  registrationStatus: any; 
  userRegistration: any; 
}) {
  const daysUntil = getDaysUntil(assembly.startDate);
  const isUpcoming = daysUntil > 0;
  const isHappening = daysUntil <= 0 && getDaysUntil(assembly.endDate) >= 0;
  
  return (
    <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-2xl"></div>
      
      <CardHeader className="relative z-10 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <Badge className="bg-white/80 text-blue-700 border-blue-200">
                {assembly.type === "AG" ? "Presencial" : "Online"}
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-800 to-indigo-800 bg-clip-text text-transparent">
              {assembly.name}
            </CardTitle>
          </div>
          
          {registrationStatus && (
            <StatusBadge status={registrationStatus.status} />
          )}
        </div>
      </CardHeader>

      <CardContent className="relative z-10 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Local</p>
              <p className="font-medium text-gray-900">{assembly.location}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Data</p>
              <p className="font-medium text-gray-900">{formatDate(assembly.startDate)}</p>
            </div>
          </div>
        </div>

        {isUpcoming && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Sparkles className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-900">
                  {daysUntil === 1 ? "Amanhã!" : `Em ${daysUntil} dias!`}
                </p>
                <p className="text-sm text-green-700">
                  {registrationStatus ? "Você está inscrito!" : "Não perca a oportunidade!"}
                </p>
              </div>
            </div>
          </div>
        )}

        {isHappening && (
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg animate-pulse">
                <Zap className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold text-orange-900">Acontecendo agora!</p>
                <p className="text-sm text-orange-700">A assembleia está em andamento</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {registrationStatus ? (
            <Link href={`/ag/${assembly._id}/register/success/${registrationStatus.registrationId}`} className="flex-1">
              <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg">
                <Trophy className="w-4 h-4 mr-2" />
                Ver Minha Inscrição
              </Button>
            </Link>
          ) : assembly.registrationOpen ? (
            <Link href={`/ag/${assembly._id}/register`} className="flex-1">
              <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg">
                <Target className="w-4 h-4 mr-2" />
                Inscrever-se Agora
              </Button>
            </Link>
          ) : (
            <Button disabled className="w-full bg-gray-300 text-gray-500">
              <Clock className="w-4 h-4 mr-2" />
              Inscrições Fechadas
            </Button>
          )}
          
          <Link href={`/ag/${assembly._id}`}>
            <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
              <BookOpen className="w-4 h-4 mr-2" />
              Detalhes
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { data: session } = useSession();
  const [isIfmsaEmail, setIsIfmsaEmail] = useState<boolean | null>(null);

  // Fetch active assemblies for logged-in users
  const activeAssemblies = useQuery(
    convexApi.assemblies?.getActive,
    session ? {} : "skip"
  );

  // Get user registration statuses for all active assemblies
  const userRegistrationStatuses = useQuery(
    convexApi.agRegistrations?.getUserRegistrationStatus,
    session?.user?.id && activeAssemblies?.length && activeAssemblies[0] ? 
      { assemblyId: activeAssemblies[0]._id, userId: session.user.id } : "skip"
  );

  useEffect(() => {
    const checkEmail = async () => {
      const result = await isIfmsaEmailSession(session);
      setIsIfmsaEmail(result);
    };
    checkEmail();
  }, [session]);

  if (isIfmsaEmail === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/20 border-t-white mx-auto mb-4"></div>
          <p className="text-white/80 text-lg">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Enhanced background decorative elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>
      
      {/* Multiple floating orbs with different animations */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/5 rounded-full blur-2xl animate-pulse delay-500"></div>
      <div className="absolute top-10 right-1/4 w-48 h-48 bg-cyan-500/8 rounded-full blur-2xl animate-pulse delay-2000"></div>
      
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Enhanced Header */}
        <header className="pt-8 pb-4">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl shadow-2xl">
                  <Globe className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <span className="text-3xl font-bold text-white">IFMSA Brazil Portal</span>
                  <p className="text-blue-200 text-sm mt-1">Conectando estudantes de medicina</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="flex-grow flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-6xl">
            <Card className="bg-white/95 backdrop-blur-xl border-0 shadow-2xl shadow-black/20 rounded-3xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-white/40 pointer-events-none"></div>
              
              <CardHeader className="relative z-10 text-center py-12 px-8">
                <div className="mb-8">
                  <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-3xl mb-6 shadow-2xl">
                    <Globe className="w-12 h-12 text-white" />
                  </div>
                </div>
                <CardTitle className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-6">
                  Portal IFMSA Brazil
                </CardTitle>
                <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                  {session ? (
                    <>
                      Olá, <span className="font-semibold text-blue-700">{session.user?.name?.split(' ')[0]}</span>! 
                      Bem-vindo de volta ao seu portal 🎉
                    </>
                  ) : (
                    "Portal geral da IFMSA Brazil - Estudantes de Medicina que fazem a diferença"
                  )}
                </p>
              </CardHeader>

              <CardContent className="relative z-10 px-8 pb-12">
                <div className="max-w-4xl mx-auto space-y-8">
                  
                  {/* AG Information for logged-in users */}
                  {session && activeAssemblies && activeAssemblies.length > 0 && (
                    <div className="space-y-6">
                      <div className="text-center">
                        <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-indigo-100 px-6 py-3 rounded-full border border-blue-200">
                          <Sparkles className="w-5 h-5 text-blue-600" />
                          <h3 className="text-lg font-semibold text-blue-900">
                            Assembleias Ativas
                          </h3>
                          <Star className="w-5 h-5 text-blue-600" />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {activeAssemblies.map((assembly) => {
                          // For now, we'll show the first assembly's registration status
                          // In a real implementation, you'd fetch status for each assembly
                          const registrationStatus = assembly._id === activeAssemblies?.[0]?._id ? userRegistrationStatuses : null;
                          
                          return (
                            <AGCard
                              key={assembly._id}
                              assembly={assembly}
                              registrationStatus={registrationStatus}
                              userRegistration={null}
                            />
                          );
                        })}
                      </div>
                      
                      <div className="text-center">
                        <Link href="/ag">
                          <Button 
                            variant="outline" 
                            className="border-blue-200 text-blue-700 hover:bg-blue-50 px-8 py-3 rounded-2xl"
                          >
                            <Calendar className="w-5 h-5 mr-2" />
                            Ver Todas as Assembleias
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Welcome message for users without active AGs */}
                  {session && (!activeAssemblies || activeAssemblies.length === 0) && (
                    <div className="text-center space-y-6">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-8 border border-blue-100">
                        <div className="flex items-center justify-center mb-4">
                          <div className="p-4 bg-blue-100 rounded-2xl">
                            <Coffee className="w-8 h-8 text-blue-600" />
                          </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">
                          Tudo tranquilo por aqui! ☕
                        </h3>
                        <p className="text-gray-600 text-lg leading-relaxed">
                          Não há assembleias ativas no momento, mas fique de olho! 
                          Novas oportunidades aparecem sempre.
                        </p>
                      </div>
                      
                      <Link href="/ag">
                        <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-2xl text-lg font-semibold shadow-lg">
                          <Calendar className="w-5 h-5 mr-2" />
                          Explorar Assembleias
                        </Button>
                      </Link>
                    </div>
                  )}

                  {/* General portal info for non-logged users */}
                  {!session && (
                    <>
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-8 mb-8 border border-blue-100">
                        <div className="flex items-start space-x-6">
                          <div className="flex-shrink-0">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                              <Globe className="w-8 h-8 text-blue-600" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Bem-vindo ao Portal IFMSA Brazil</h3>
                            <p className="text-gray-700 text-lg leading-relaxed mb-4">
                              Este é o portal oficial da IFMSA Brazil, onde você pode se inscrever para nossas assembleias gerais!
                            </p>
                            <div className="flex items-center space-x-2 text-blue-700">
                              <Heart className="w-5 h-5" />
                              <span className="font-medium">Conectando estudantes em todo o Brasil</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl p-8 mb-8 border border-amber-200">
                        <div className="flex items-start space-x-6">
                          <div className="flex-shrink-0">
                            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
                              <AlertTriangle className="w-8 h-8 text-amber-600" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Acesso Administrativo</h3>
                            <p className="text-gray-700 text-lg leading-relaxed mb-4">
                              Para acessar as funcionalidades administrativas, você deve fazer login com uma conta Google oficial:
                            </p>
                            <div className="bg-amber-100 rounded-xl p-4 mb-4">
                              <p className="text-amber-800 font-bold text-lg">
                                @ifmsabrazil.org
                              </p>
                            </div>
                            <p className="text-gray-600 leading-relaxed">
                              Apenas membros oficiais com contas institucionais podem acessar o painel administrativo.
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* User info if logged in */}
                  {session && (
                    <div className={`rounded-3xl p-8 mb-8 border ${
                      isIfmsaEmail 
                        ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-100" 
                        : "bg-gradient-to-r from-red-50 to-rose-50 border-red-200"
                    }`}>
                      <div className="flex items-center space-x-6">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                          isIfmsaEmail ? "bg-green-100" : "bg-red-100"
                        }`}>
                          {isIfmsaEmail ? (
                            <Shield className="w-8 h-8 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-8 h-8 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium mb-2 ${
                            isIfmsaEmail ? "text-green-700" : "text-red-700"
                          }`}>
                            {isIfmsaEmail ? "✅ Acesso Administrativo Autorizado" : "⚠️ Acesso Limitado"}
                          </p>
                          <p className="text-2xl font-bold text-gray-900 mb-1">{session.user?.name}</p>
                          <p className="text-gray-600 text-lg">{session.user?.email}</p>
                          {!isIfmsaEmail && (
                            <p className="text-red-600 text-sm mt-2">
                              Conta não autorizada para acesso administrativo
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action button */}
                  <div className="text-center">
                    <Link href={session ? "/api/auth/signout" : "/api/auth/signin"} passHref legacyBehavior>
                      <Button 
                        asChild 
                        size="lg" 
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-12 py-6 rounded-3xl text-xl font-semibold shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
                      >
                        <a className="flex items-center space-x-4">
                          {session ? (
                            <>
                              <LogOut className="w-6 h-6" />
                              <span>Desconectar</span>
                            </>
                          ) : (
                            <>
                              <LogIn className="w-6 h-6" />
                              <span>Entrar com Google</span>
                            </>
                          )}
                        </a>
                      </Button>
                    </Link>
                  </div>

                  {/* Features preview for authorized users */}
                  {isIfmsaEmail && (
                    <div className="mt-16 pt-8 border-t border-gray-200">
                      <div className="text-center mb-8">
                        <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-100 to-indigo-100 px-6 py-3 rounded-full border border-purple-200">
                          <Settings className="w-5 h-5 text-purple-600" />
                          <h3 className="text-xl font-semibold text-purple-900">
                            Painel Administrativo
                          </h3>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Link href="/comites-locais" className="group">
                          <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                              <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <p className="font-bold text-gray-900 text-lg mb-2">Comitês Locais</p>
                            <p className="text-gray-600">Gerenciar comitês</p>
                          </div>
                        </Link>
                        <Link href="/times" className="group">
                          <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-purple-300 hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                              <Users className="w-6 h-6 text-purple-600" />
                            </div>
                            <p className="font-bold text-gray-900 text-lg mb-2">Times</p>
                            <p className="text-gray-600">Equipes e grupos</p>
                          </div>
                        </Link>
                        <Link href="/config" className="group">
                          <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-green-300 hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                              <Settings className="w-6 h-6 text-green-600" />
                            </div>
                            <p className="font-bold text-gray-900 text-lg mb-2">Configurações</p>
                            <p className="text-gray-600">Sistema e ajustes</p>
                          </div>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Information for non-authorized users */}
                  {session && !isIfmsaEmail && (
                    <div className="mt-12 pt-8 border-t border-gray-200">
                      <div className="text-center bg-gradient-to-r from-gray-50 to-blue-50 rounded-3xl p-8">
                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                          <Shield className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">
                          Precisa de Acesso Administrativo?
                        </h3>
                        <p className="text-gray-600 text-lg mb-6 max-w-2xl mx-auto leading-relaxed">
                          Se você é membro oficial da IFMSA Brazil e precisa de acesso administrativo, 
                          entre em contato com a coordenação para obter uma conta @ifmsabrazil.org.
                        </p>
                        <div className="bg-white rounded-2xl p-6 border border-gray-200">
                          <p className="text-gray-500 text-sm">
                            Apenas contas institucionais oficiais têm acesso às funcionalidades administrativas.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Enhanced Footer */}
        <footer className="py-8">
          <div className="container mx-auto px-6 text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Heart className="w-5 h-5 text-red-400" />
              <p className="text-white/90 text-lg">
                Feito com amor pela IFMSA Brazil
              </p>
              <Heart className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-white/70 text-sm">
              © 2024 IFMSA Brazil - Portal Oficial
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
