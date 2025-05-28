"use client";

import React, { useState } from "react";
import { api } from "~/trpc/react";

const UrlEditor = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [url, setUrl] = useState("https://docs.google.com/spreadsheets/d/example/edit");
    const [tempUrl, setTempUrl] = useState(url);

    const handleEdit = () => {
        setIsEditing(true);
        setTempUrl(url);
    };

    const handleSave = () => {
        // Here we would normally save to the server
        setUrl(tempUrl);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setTempUrl(url);
        setIsEditing(false);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(url);
    };

    const formatGoogleDriveUrl = (inputUrl: string) => {
        // Convert Google Drive URL to CSV download URL
        const match = inputUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
            const fileId = match[1];
            return `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`;
        }
        return inputUrl;
    };

    return (
        <div className="flex items-center space-x-2">
            {isEditing ? (
                <>
                    <input
                        type="text"
                        value={tempUrl}
                        onChange={(e) => setTempUrl(e.target.value)}
                        className="px-2 py-1 text-black rounded"
                        placeholder="Cole a URL do Google Drive"
                    />
                    <button
                        onClick={handleSave}
                        className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                        Salvar
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
                    <span className="text-sm truncate max-w-[200px]">{url}</span>
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