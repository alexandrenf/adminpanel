"use client";

import React, { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, Typography } from "@mui/material";

const UrlManager = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempUrl, setTempUrl] = useState("");
    
    const { data: registros, isLoading } = api.registros.get.useQuery();
    const updateUrl = api.registros.update.useMutation({
        onSuccess: () => {
            setIsEditing(false);
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
        updateUrl.mutate({ url: tempUrl });
    };

    const handleCancel = () => {
        if (registros) {
            setTempUrl(registros.url);
        }
        setIsEditing(false);
    };

    const handleCopy = () => {
        if (registros) {
            navigator.clipboard.writeText(registros.url);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <Typography variant="h5" className="text-2xl font-bold text-gray-800">
                    Gerenciador de URL do Google Drive
                </Typography>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                            URL Atual
                        </h3>
                        {isEditing ? (
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    value={tempUrl}
                                    onChange={(e) => setTempUrl(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Cole a URL do Google Drive"
                                />
                                <div className="flex space-x-3">
                                    <button
                                        onClick={handleSave}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                        disabled={updateUrl.isPending}
                                    >
                                        {updateUrl.isPending ? "Salvando..." : "Salvar"}
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                                    <span className="text-sm text-gray-600 truncate flex-1">
                                        {registros?.url}
                                    </span>
                                    <div className="flex space-x-2 ml-4">
                                        <button
                                            onClick={handleEdit}
                                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={handleCopy}
                                            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                                        >
                                            Copiar
                                        </button>
                                    </div>
                                </div>
                                {registros?.updatedBy && (
                                    <div className="text-sm text-gray-500">
                                        Última atualização por {registros.updatedBy.name} em{" "}
                                        {new Date(registros.updatedAt).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-blue-800 mb-2">
                            Instruções
                        </h3>
                        <ul className="list-disc list-inside space-y-2 text-blue-700">
                            <li>Cole a URL do Google Drive que contém os dados dos comitês locais</li>
                            <li>A URL será automaticamente convertida para o formato CSV</li>
                            <li>O sistema mantém um histórico de quem fez a última atualização</li>
                            <li>Você pode copiar a URL formatada a qualquer momento</li>
                        </ul>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default UrlManager; 