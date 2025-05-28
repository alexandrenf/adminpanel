"use client";

import React, { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useToast } from "../../hooks/use-toast";
import { 
    Link as LinkIcon, 
    Copy, 
    Edit, 
    Save, 
    X, 
    Loader2,
    ExternalLink,
    User,
    Calendar
} from "lucide-react";

const UrlManager = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempUrl, setTempUrl] = useState("");
    const { toast } = useToast();
    
    const { data: registros, isLoading } = api.registros.get.useQuery();
    const updateUrl = api.registros.update.useMutation({
        onSuccess: () => {
            setIsEditing(false);
            toast({
                title: "URL atualizada!",
                description: "A URL do Google Drive foi atualizada com sucesso.",
            });
        },
        onError: (error) => {
            toast({
                title: "Erro ao atualizar",
                description: error.message || "Ocorreu um erro ao atualizar a URL.",
                variant: "destructive",
            });
        },
    });

    useEffect(() => {
        if (registros) {
            setTempUrl(registros.url);
        }
    }, [registros]);

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleSave = () => {
        if (!tempUrl.trim()) {
            toast({
                title: "URL inválida",
                description: "Por favor, insira uma URL válida.",
                variant: "destructive",
            });
            return;
        }
        updateUrl.mutate({ url: tempUrl });
    };

    const handleCancel = () => {
        if (registros) {
            setTempUrl(registros.url);
        }
        setIsEditing(false);
    };

    const handleCopy = async () => {
        if (registros) {
            try {
                await navigator.clipboard.writeText(registros.url);
                toast({
                    title: "URL copiada!",
                    description: "A URL foi copiada para a área de transferência.",
                });
            } catch (error) {
                toast({
                    title: "Erro ao copiar",
                    description: "Não foi possível copiar a URL.",
                    variant: "destructive",
                });
            }
        }
    };

    if (isLoading) {
        return (
            <Card className="max-w-4xl mx-auto shadow-lg border-0">
                <CardContent className="flex items-center justify-center py-12">
                    <div className="flex items-center space-x-3">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        <span className="text-lg font-medium text-gray-700">Carregando dados...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                    <LinkIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                        Gerenciador de URL
                    </h2>
                    <p className="text-gray-600">Configure a URL do Google Drive para os dados dos comitês locais</p>
                </div>
            </div>

            <Card className="max-w-4xl shadow-lg border-0">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <ExternalLink className="w-5 h-5 text-blue-600" />
                        <span>URL do Google Drive</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Current URL Section */}
                    <div className="space-y-4">
                        <Label className="text-base font-semibold">URL Atual</Label>
                        {isEditing ? (
                            <div className="space-y-4">
                                <Input
                                    type="url"
                                    value={tempUrl}
                                    onChange={(e) => setTempUrl(e.target.value)}
                                    placeholder="Cole a URL do Google Drive aqui"
                                    className="text-sm"
                                />
                                <div className="flex space-x-3">
                                    <Button
                                        onClick={handleSave}
                                        disabled={updateUrl.isPending}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                    >
                                        {updateUrl.isPending ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Salvando...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4 mr-2" />
                                                Salvar
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleCancel}
                                        disabled={updateUrl.isPending}
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-600 truncate font-mono">
                                            {registros?.url || "Nenhuma URL configurada"}
                                        </p>
                                    </div>
                                    <div className="flex space-x-2 ml-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleEdit}
                                            className="hover:bg-blue-50 hover:border-blue-200"
                                        >
                                            <Edit className="w-4 h-4 mr-2" />
                                            Editar
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleCopy}
                                            disabled={!registros?.url}
                                            className="hover:bg-gray-50"
                                        >
                                            <Copy className="w-4 h-4 mr-2" />
                                            Copiar
                                        </Button>
                                    </div>
                                </div>
                                
                                {/* Last Updated Info */}
                                {registros?.updatedBy && (
                                    <div className="flex items-center space-x-4 text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
                                        <div className="flex items-center space-x-2">
                                            <User className="w-4 h-4" />
                                            <span>Atualizado por <strong>{registros.updatedBy.name}</strong></span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Calendar className="w-4 h-4" />
                                            <span>{new Date(registros.updatedAt).toLocaleString('pt-BR')}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Instructions */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
                        <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center space-x-2">
                            <LinkIcon className="w-5 h-5" />
                            <span>Instruções de Uso</span>
                        </h3>
                        <ul className="list-disc list-inside space-y-2 text-blue-700">
                            <li>Cole a URL do Google Drive que contém os dados dos comitês locais</li>
                            <li>A URL será automaticamente convertida para o formato CSV</li>
                            <li>O sistema mantém um histórico de quem fez a última atualização</li>
                            <li>Você pode copiar a URL formatada a qualquer momento</li>
                            <li>Certifique-se de que o arquivo está acessível publicamente</li>
                        </ul>
                    </div>

                    {/* Additional Info */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-lg border border-amber-100">
                        <h3 className="text-lg font-semibold text-amber-800 mb-3">
                            Formato Esperado
                        </h3>
                        <p className="text-amber-700 mb-2">
                            A URL deve seguir o formato do Google Sheets:
                        </p>
                        <code className="block bg-white p-3 rounded border text-sm text-gray-800 font-mono">
                            https://docs.google.com/spreadsheets/d/[FILE_ID]/edit#gid=[SHEET_ID]
                        </code>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default UrlManager; 