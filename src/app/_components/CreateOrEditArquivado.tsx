"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Button, FormControl, InputLabel, MenuItem, Select, TextField, Typography } from "@mui/material";
import { api } from "~/trpc/react";
import Pica from "pica";

const pica = new Pica();

const CreateOrEditArquivado = () => {
    const [name, setName] = useState("");
    const [acronym, setAcronym] = useState("");
    const [role, setRole] = useState("");
    const [order, setOrder] = useState<number | null>(null);
    const [image, setImage] = useState<string | null>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [arquivadoId, setArquivadoId] = useState<string | null>(null);
    const [type, setType] = useState<string | null>(null);
    const [gestaoId, setGestaoId] = useState<string | null>(null);
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchParams = useSearchParams();

    const latestArquivadoId = api.arquivado.latestArquivadoId.useQuery();
    const uploadPhoto = api.photo.uploadPhoto.useMutation();
    const updateFile = api.photo.updatePhoto.useMutation();
    const createArquivado = api.arquivado.create.useMutation({
        onError: (error) => {
            console.error("Error creating Arquivado", error);
            alert("Falha em criar esse Arquivado. Por favor tente novamente.");
        },
        onSuccess: () => {
            router.push("/historico");
        },
    });
    const updateArquivado = api.arquivado.update.useMutation({
        onError: (error) => {
            console.error("Error updating Arquivado", error);
            alert("Falha em atualizar Arquivado. Por favor tente novamente.");
        },
        onSuccess: () => {
            router.push("/historico");
        },
    });
    const { data: arquivadoData } = api.arquivado.getOne.useQuery(
        { id: parseInt(arquivadoId ?? "0", 10) },
        {
            enabled: isEditMode && arquivadoId !== null,
        }
    );
    const { data: maxOrder } = api.arquivado.getMaxOrder.useQuery();
    const { data: gestoes } = api.gestao.getAll.useQuery();

    useEffect(() => {
        const id = searchParams.get("id");
        const type = searchParams.get("type");
        const gestaoId = searchParams.get("gestaoId");
        if (id && type && gestaoId) {
            setIsEditMode(true);
            setArquivadoId(id);
            setType(type);
            setGestaoId(gestaoId);
        } else {
            setOrder((maxOrder ?? 0) + 1);
            setType(searchParams.get("type") ?? "EB");
            setGestaoId(searchParams.get("gestaoId"));
        }
    }, [searchParams, maxOrder]);

    useEffect(() => {
        if (arquivadoData) {
            setName(arquivadoData.name);
            setAcronym(arquivadoData.acronym);
            setRole(arquivadoData.role);
            setOrder(arquivadoData.order);
            setImageSrc(arquivadoData.imageLink);
        }
    }, [arquivadoData]);

    const onFileChange = async (file: File) => {
        const imageDataUrl = await readFile(file);
        const resizedImageDataUrl = await resizeImage(imageDataUrl);
        setImageSrc(resizedImageDataUrl);
        setImage(resizedImageDataUrl?.split(",")[1] ?? null); // Extract the base64 string
    };

    const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (file !== undefined) {
                await onFileChange(file);
            }
        }
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file !== undefined) {
                await onFileChange(file);
            }
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleButtonClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isEditMode && arquivadoId !== null) {
            try {
                const uploadResult = await updateFile.mutateAsync({
                    id: parseInt(arquivadoId ?? "0", 10),
                    image,
                    imageLink: arquivadoData?.imageLink ?? "",
                    tipo: "arquivado",
                });

                await updateArquivado.mutateAsync({
                    id: parseInt(arquivadoId ?? "0", 10),
                    name,
                    acronym,
                    role,
                    order: arquivadoData?.order ?? 0,
                    imageLink: uploadResult.imageUrl,
                    type: type ?? "EB",
                    gestaoId: parseInt(gestaoId ?? "0", 10),
                });
            } catch (error) {
                console.error("Erro atualizando Arquivado", error);
                alert("Falha em atualizar Arquivado. Por favor tente novamente.");
            }
        } else {
            try {
                if (latestArquivadoId.isLoading || !latestArquivadoId.data === null) {
                    alert("Carregando último ID de Arquivado, por favor aguarde 10 segundos e tente novamente.");
                    return;
                }

                const nextId = (latestArquivadoId.data ?? 0) + 1;

                const uploadResult = await uploadPhoto.mutateAsync({
                    id: nextId, // Generate a unique ID
                    image,
                    tipo: "arquivado",
                });

                await createArquivado.mutateAsync({
                    name,
                    acronym,
                    role,
                    order: order ?? 0,
                    imageLink: uploadResult.imageUrl,
                    type: type ?? "EB",
                    gestaoId: parseInt(gestaoId ?? "0", 10),
                });
            } catch (error) {
                console.error("Error creating Arquivado:", error);
                alert("Falha em criar esse Arquivado. Por favor tente novamente.");
            }
        }
    };

    return (
        <div className="container mx-auto p-6">
            <div className="bg-white shadow-md rounded-lg p-8 mt-8">
                <h1 className="text-3xl font-bold text-center text-blue-900 mb-8">
                    {isEditMode ? "Editar Arquivado" : "Criar novo Arquivado"}
                </h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nome</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-black"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Sigla (ex: CM-D)</label>
                        <input
                            type="text"
                            value={acronym}
                            onChange={(e) => setAcronym(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-black"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Cargo por extenso</label>
                        <input
                            type="text"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-black"
                        />
                    </div>
                    <div className="flex items-start space-x-4">
                        {imageSrc && (
                            <div className="w-32 h-32 bg-gray-100 border border-gray-300 flex items-center justify-center">
                                <img src={imageSrc} alt="Image preview" className="max-w-full h-auto" />
                            </div>
                        )}
                        <div
                            className="flex-1 border-dashed border-2 border-gray-300 p-4 text-center"
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                        >
                            <input
                                type="file"
                                onChange={handleFileInputChange}
                                className="hidden"
                                ref={fileInputRef}
                                accept="image/*"
                            />
                            <button
                                type="button"
                                onClick={handleButtonClick}
                                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                            >
                                Selecionar ou Arrastar Imagem
                            </button>
                        </div>
                    </div>
                    <div>
                        <button
                            type="submit"
                            className="w-full bg-blue-900 text-white p-3 rounded-md hover:bg-blue-700"
                            disabled={createArquivado.isPending || uploadPhoto.isPending || updateFile.isPending || updateArquivado.isPending}
                        >
                            {isEditMode
                                ? (updateFile.isPending || updateArquivado.isPending)
                                    ? "Atualizando..."
                                    : "Atualizar Arquivado"
                                : (createArquivado.isPending || uploadPhoto.isPending)
                                    ? "Criando..."
                                    : "Criar Arquivado"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const readFile = (file: File): Promise<string> =>
    new Promise((resolve) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolve(reader.result as string), false);
        reader.readAsDataURL(file);
    });

const resizeImage = (imageSrc: string): Promise<string> =>
    new Promise((resolve) => {
        const image = new Image();
        image.src = imageSrc;
        image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 400;
            canvas.height = 400;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(image, 0, 0, 400, 400);
                pica.resize(canvas, canvas, {
                    quality: 3
                }).then((result: HTMLCanvasElement) => {
                    resolve(result.toDataURL("image/png")); // Convert to PNG
                });
            }
        };
    });

export default CreateOrEditArquivado;
