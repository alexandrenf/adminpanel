import Link from "next/link";
import { getIfmsaEmailSession } from "~/server/lib/authcheck";
import PrecisaLogin from "~/app/_components/PrecisaLogin";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Users, Plus, MapPin, Calendar, Filter, Download, Upload, ExternalLink, ClipboardCheck } from "lucide-react";

export default async function ComitesLocaisPage() {
    const { session, hasIfmsaEmail } = await getIfmsaEmailSession();

    if (!hasIfmsaEmail) {
        return (
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

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="container mx-auto px-6 py-12">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                                Comitês Locais
                            </h1>
                            <p className="text-gray-600">
                                Gerencie os dados dos comitês locais através do Google Drive e as chamadas das AGs.
                            </p>
                        </div>
                    </div>

                    

                    {/* Management Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Gerenciar Comitês */}
                        <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center space-x-3">
                                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                                        <ExternalLink className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-xl">Gerenciar Dados dos Comitês</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-gray-600 leading-relaxed">
                                    Configure e gerencie a URL do Google Drive que contém a planilha com todos os dados dos comitês locais. 
                                    Esta é a fonte principal de informações para o sistema.
                                </p>
                                
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <h4 className="font-semibold text-blue-800 mb-2">O que você pode fazer:</h4>
                                    <ul className="text-sm text-blue-700 space-y-1">
                                        <li>• Atualizar a URL da planilha do Google Drive</li>
                                        <li>• Copiar URL formatada para outros sistemas</li>
                                        <li>• Visualizar histórico de atualizações</li>
                                        <li>• Verificar status da conexão com o Drive</li>
                                    </ul>
                                </div>

                                <Link href="/registros" className="block">
                                    <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 py-3">
                                        <ExternalLink className="w-5 h-5 mr-3" />
                                        Gerenciar URL do Google Drive
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* Chamada de AG */}
                        <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center space-x-3">
                                    <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                                        <ClipboardCheck className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-xl">Chamada de Assembleia Geral</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-gray-600 leading-relaxed">
                                    Acesse o sistema de controle de presença para Assembleias Gerais. 
                                    Gerencie a presença de EBs, CRs e Comitês Locais em tempo real.
                                </p>
                                
                                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                    <h4 className="font-semibold text-green-800 mb-2">Funcionalidades:</h4>
                                    <ul className="text-sm text-green-700 space-y-1">
                                        <li>• Controle de presença em tempo real</li>
                                        <li>• Cálculo automático de quórum</li>
                                        <li>• Relatórios em Excel</li>
                                        <li>• Sincronização com banco de dados</li>
                                    </ul>
                                </div>

                                <Link href="/comites-locais/chamada-ag" className="block">
                                    <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300 py-3">
                                        <ClipboardCheck className="w-5 h-5 mr-3" />
                                        Acessar Chamada de AG
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </main>
    );
} 