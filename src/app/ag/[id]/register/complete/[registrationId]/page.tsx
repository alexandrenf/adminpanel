"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "../../../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../../components/ui/card";
import { Badge } from "../../../../../../components/ui/badge";
import { 
    CheckCircle, 
    Calendar, 
    Users, 
    MapPin,
    Home,
    FileText,
    Mail,
    Clock,
    Upload
} from "lucide-react";
import { useQuery } from "convex/react";
import { api as convexApi } from "../../../../../../../convex/_generated/api";
import { isIfmsaEmailSession } from "~/server/lib/authcheck";
import PrecisaLogin from "~/app/_components/PrecisaLogin";

export default function RegistrationCompletePage() {
    const { data: session } = useSession();
    const router = useRouter();
    const params = useParams() as { id: string; registrationId: string };
    
    const assemblyId = params.id;
    const registrationId = params.registrationId;
    
    const [isIfmsaEmail, setIsIfmsaEmail] = useState<boolean | null>(null);
    
    // Fetch assembly data
    const assembly = useQuery(convexApi.assemblies?.getById, { id: assemblyId as any });

    // Check if user has IFMSA email
    useEffect(() => {
        const checkEmail = async () => {
            if (session) {
                const result = await isIfmsaEmailSession(session);
                setIsIfmsaEmail(result);
            } else {
                setIsIfmsaEmail(false);
            }
        };
        checkEmail();
    }, [session]);

    if (!session) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                    <div className="w-full h-full" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                    }}></div>
                </div>
                <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="relative z-10 flex-grow flex items-center justify-center">
                    <PrecisaLogin />
                </div>
            </main>
        );
    }

    if (!assembly) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="container mx-auto px-6 py-12">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                                <CheckCircle className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                                    Inscrição Enviada!
                                </h1>
                                <p className="text-gray-600">Comprovante recebido com sucesso</p>
                            </div>
                        </div>
                    </div>

                    {/* Success Message */}
                    <Card className="bg-green-50 border-green-200 shadow-lg">
                        <CardContent className="pt-6">
                            <div className="text-center space-y-4">
                                <Upload className="w-16 h-16 text-green-600 mx-auto" />
                                <div>
                                    <h2 className="text-2xl font-bold text-green-900 mb-2">
                                        Comprovante Enviado com Sucesso!
                                    </h2>
                                    <p className="text-green-700">
                                        Seu comprovante de pagamento para <strong>{assembly.name}</strong> foi recebido e está sendo analisado pela administração.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Status Card */}
                    <Card className="bg-blue-50 border-blue-200 shadow-lg">
                        <CardContent className="pt-6">
                            <div className="flex items-center space-x-4">
                                <Clock className="w-12 h-12 text-blue-600" />
                                <div>
                                    <h3 className="text-xl font-bold text-blue-900">Status: Esperando Análise</h3>
                                    <p className="text-blue-700">
                                        Sua inscrição está completa e aguardando análise administrativa. 
                                        Você receberá uma confirmação por email assim que for aprovada.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Assembly Info */}
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="text-xl">Detalhes da Assembleia</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                                    <Calendar className="w-6 h-6 text-blue-600" />
                                    <div>
                                        <p className="text-sm font-medium text-blue-900">Data</p>
                                        <p className="text-blue-700">
                                            {new Date(assembly.startDate).toLocaleDateString('pt-BR')} - {" "}
                                            {new Date(assembly.endDate).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg">
                                    <MapPin className="w-6 h-6 text-purple-600" />
                                    <div>
                                        <p className="text-sm font-medium text-purple-900">Local</p>
                                        <p className="text-purple-700">{assembly.location}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3 p-4 bg-indigo-50 rounded-lg">
                                    <Users className="w-6 h-6 text-indigo-600" />
                                    <div>
                                        <p className="text-sm font-medium text-indigo-900">Tipo</p>
                                        <p className="text-indigo-700">{assembly.type === "AG" ? "Presencial" : "Online"}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Next Steps */}
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="text-xl">Próximos Passos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-start space-x-3">
                                    <div className="flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full text-sm font-medium">
                                        ✓
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900">Inscrição realizada</h4>
                                        <p className="text-sm text-gray-600">
                                            Seus dados foram registrados com sucesso.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full text-sm font-medium">
                                        ✓
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900">Comprovante enviado</h4>
                                        <p className="text-sm text-gray-600">
                                            Seu comprovante de pagamento foi recebido.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                                        3
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-blue-900">Análise administrativa</h4>
                                        <p className="text-sm text-gray-600">
                                            A administração da IFMSA Brazil está analisando sua inscrição e comprovante.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                                        4
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900">Confirmação final</h4>
                                        <p className="text-sm text-gray-600">
                                            Você receberá um email com a confirmação final da sua inscrição.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Important Notice */}
                    <Card className="bg-amber-50 border-amber-200">
                        <CardContent className="pt-6">
                            <div className="text-center space-y-4">
                                <Mail className="w-12 h-12 text-amber-600 mx-auto" />
                                <div>
                                    <h3 className="font-semibold text-amber-900">Mantenha seus Dados Atualizados</h3>
                                    <p className="text-sm text-amber-700 mb-4">
                                        Certifique-se de que seu email está ativo e monitore sua caixa de entrada 
                                        (incluindo spam) para não perder nenhuma comunicação importante sobre sua inscrição.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Button 
                            onClick={() => router.push('/ag')}
                            variant="outline"
                            size="lg"
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            Ver Outras AGs
                        </Button>
                        <Button 
                            onClick={() => router.push('/')}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                            size="lg"
                        >
                            <Home className="w-4 h-4 mr-2" />
                            Voltar ao Início
                        </Button>
                    </div>
                </div>
            </div>
        </main>
    );
} 