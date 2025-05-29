import { getServerAuthSession } from "~/server/auth";
import PrecisaLogin from "~/app/_components/PrecisaLogin";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { 
    Users, 
    ExternalLink, 
    FileSpreadsheet, 
    Info, 
    CheckCircle,
    AlertTriangle,
    ClipboardCheck
} from "lucide-react";
import Link from "next/link";

export default async function ComitesLocaisPage() {
    const session = await getServerAuthSession();

    if (!session) {
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
                                Gerencie os dados dos comitês locais através do Google Drive
                            </p>
                        </div>
                    </div>

                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                                <span>Configuração do Google Drive</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Overview */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
                                <div className="flex items-start space-x-3">
                                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                                    <div>
                                        <h3 className="text-lg font-semibold text-blue-800 mb-2">
                                            Como Funciona
                                        </h3>
                                        <p className="text-blue-700 mb-4">
                                            Para manter os dados dos comitês locais atualizados, você pode:
                                        </p>
                                        <ul className="list-disc list-inside space-y-2 text-blue-600">
                                            <li>Atualizar a URL do Google Drive que contém os dados</li>
                                            <li>Copiar a URL formatada para uso em outros sistemas</li>
                                            <li>Visualizar quem fez a última atualização</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Instructions */}
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-100">
                                <div className="flex items-start space-x-3">
                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                    <div>
                                        <h3 className="text-lg font-semibold text-green-800 mb-3">
                                            Instruções Importantes
                                        </h3>
                                        <ul className="list-disc list-inside space-y-2 text-green-700">
                                            <li>Certifique-se de que o arquivo no Google Drive está no formato correto</li>
                                            <li>A URL será automaticamente convertida para o formato CSV</li>
                                            <li>Mantenha o arquivo atualizado com as informações mais recentes</li>
                                            <li>Verifique se o arquivo está acessível para todos os usuários necessários</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Warning */}
                            <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-lg border border-amber-100">
                                <div className="flex items-start space-x-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                                    <div>
                                        <h3 className="text-lg font-semibold text-amber-800 mb-2">
                                            Atenção
                                        </h3>
                                        <p className="text-amber-700">
                                            Certifique-se de que o arquivo do Google Drive está configurado com as permissões corretas 
                                            para que o sistema possa acessar os dados automaticamente.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Action */}
                            <div className="bg-white p-6 rounded-lg border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                            Gerenciar URL do Google Drive
                                        </h3>
                                        <p className="text-gray-600">
                                            Configure e gerencie a URL do Google Drive que contém os dados dos comitês locais.
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                    <Link href="/registros">
                                        <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300">
                                            <ExternalLink className="w-4 h-4 mr-2" />
                                            Gerenciar URL
                                        </Button>
                                    </Link>
                                        <Link href="/comites-locais/chamada-ag">
                                            <Button variant="outline" className="hover:bg-green-50 hover:border-green-200 border-green-300 text-green-700">
                                                <ClipboardCheck className="w-4 h-4 mr-2" />
                                                Chamada de AG
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
} 