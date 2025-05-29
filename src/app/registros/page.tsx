import { getServerAuthSession } from "~/server/auth";
import PrecisaLogin from "~/app/_components/PrecisaLogin";
import UrlManager from "~/app/_components/UrlManager";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { FileSpreadsheet, ArrowLeft, Info } from "lucide-react";
import { Button } from "../../components/ui/button";
import Link from "next/link";

export default async function RegistrosPage() {
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
                        <Link href="/comites-locais">
                            <Button variant="outline" className="hover:bg-gray-50">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Voltar
                            </Button>
                        </Link>
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                                <FileSpreadsheet className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                                    Gerenciar URL do Google Drive
                                </h1>
                                <p className="text-gray-600">
                                    Configure a fonte de dados dos comitês locais
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Info */}
                    <Card className="shadow-lg border-0">
                        <CardContent className="p-6">
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                                <div className="flex items-start space-x-3">
                                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h3 className="text-lg font-semibold text-blue-800 mb-2">
                                            Instruções
                                        </h3>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <h4 className="font-medium text-blue-800 mb-1">Configure:</h4>
                                                <ul className="text-sm text-blue-700 space-y-1">
                                                    <li>• URL da planilha do Google Drive</li>
                                                    <li>• Acesso público para visualização</li>
                                                    <li>• Formato CSV será gerado automaticamente</li>
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-blue-800 mb-1">Funcionalidades:</h4>
                                                <ul className="text-sm text-blue-700 space-y-1">
                                                    <li>• Copiar URL formatada</li>
                                                    <li>• Histórico de atualizações</li>
                                                    <li>• Verificação de status</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* URL Manager */}
                    <UrlManager />
                </div>
            </div>
        </main>
    );
} 