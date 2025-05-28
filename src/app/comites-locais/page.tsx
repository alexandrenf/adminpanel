import { getServerAuthSession } from "~/server/auth";
import PrecisaLogin from "~/app/_components/PrecisaLogin";
import { Card, CardContent, CardHeader, Typography } from "@mui/material";

export default async function ComitesLocaisPage() {
    const session = await getServerAuthSession();

    if (!session) {
        return <PrecisaLogin />;
    }

    return (
        <main className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Comitês Locais
                    </h1>
                    <p className="text-gray-600">
                        Gerencie os dados dos comitês locais através do Google Drive
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <Typography variant="h5" className="text-xl font-semibold text-gray-800">
                            URL do Google Drive
                        </Typography>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <div className="bg-gray-50 p-6 rounded-lg">
                                <p className="text-gray-700 mb-4">
                                    Para manter os dados dos comitês locais atualizados, você pode:
                                </p>
                                <ul className="list-disc list-inside space-y-2 text-gray-600">
                                    <li>Atualizar a URL do Google Drive que contém os dados</li>
                                    <li>Copiar a URL formatada para uso em outros sistemas</li>
                                    <li>Visualizar quem fez a última atualização</li>
                                </ul>
                            </div>

                            <div className="bg-blue-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold text-blue-800 mb-3">
                                    Instruções Importantes
                                </h3>
                                <ul className="list-disc list-inside space-y-2 text-blue-700">
                                    <li>Certifique-se de que o arquivo no Google Drive está no formato correto</li>
                                    <li>A URL será automaticamente convertida para o formato CSV</li>
                                    <li>Mantenha o arquivo atualizado com as informações mais recentes</li>
                                    <li>Verifique se o arquivo está acessível para todos os usuários necessários</li>
                                </ul>
                            </div>

                            <div className="bg-white p-6 rounded-lg border border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                    Gerenciar URL
                                </h3>
                                <div className="space-y-4">
                                    <p className="text-gray-600">
                                        Clique no botão abaixo para gerenciar a URL do Google Drive:
                                    </p>
                                    <a
                                        href="/registros"
                                        className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Gerenciar URL
                                    </a>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
} 