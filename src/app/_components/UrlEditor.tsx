"use client";

import React, { useState, useEffect } from "react";
import { api } from "~/trpc/react";

const UrlEditor = () => {
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
        return <div>Carregando...</div>;
    }

    return (
        <div className="flex items-center space-x-2">
            {isEditing ? (
                <>
                    <input
                        type="text"
                        value={tempUrl}
                        onChange={(e) => setTempUrl(e.target.value)}
                        className="px-2 py-1 text-black rounded w-full"
                        placeholder="Cole a URL do Google Drive"
                    />
                    <button
                        onClick={handleSave}
                        className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                        disabled={updateUrl.isPending}
                    >
                        {updateUrl.isPending ? "Salvando..." : "Salvar"}
                    </button>
                    <button
                        onClick={handleCancel}
                        className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                        Cancelar
                    </button>
                </>
            ) : (
                <>
                    <span className="text-sm truncate max-w-[200px]">{registros?.url}</span>
                    <button
                        onClick={handleEdit}
                        className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Editar
                    </button>
                    <button
                        onClick={handleCopy}
                        className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                        Copiar
                    </button>
                </>
            )}
        </div>
    );
};

export default UrlEditor; 