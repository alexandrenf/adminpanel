"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
    Users,
    Upload,
    Save,
    Loader2,
    ArrowLeft,
} from "lucide-react";
import { api } from "~/trpc/react";
import Pica from "pica";

const pica = new Pica();

const CreateOrEditCred = () => {
    const [name, setName] = useState("");
    const [acronym, setAcronym] = useState("");
    const [role, setRole] = useState("");
    const [email, setEmail] = useState("");
    const [order, setOrder] = useState<number | null>(null);
    const [image, setImage] = useState<string | null>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [credId, setCredId] = useState<number | null>(null);
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchParams = useSearchParams();

    const latestCredId = api.cred.latestCredId.useQuery();
    const uploadPhoto = api.photo.uploadPhoto.useMutation();
    const updateFile = api.photo.updatePhoto.useMutation();
    const createCred = api.cred.create.useMutation({
        onError: (error) => {
            console.error("Error creating CRED", error);
            alert("Falha em criar esse CRED. Por favor tente novamente.");
        },
        onSuccess: () => {
            router.push("/cred");
        },
    });
    const updateCred = api.cred.update.useMutation({
        onError: (error) => {
            console.error("Error updating CRED", error);
            alert("Falha em atualizar CRED. Por favor tente novamente.");
        },
        onSuccess: () => {
            router.push("/cred");
        },
    });
    const { data: credData } = api.cred.getOne.useQuery(
        { id: credId ?? -1 },
        {
            enabled: isEditMode && credId !== null,
        }
    );
    const { data: maxOrder } = api.cred.getMaxOrder.useQuery();

    useEffect(() => {
        if (!searchParams) return;

        const id = searchParams.get("id");
        if (id) {
            setIsEditMode(true);
            setCredId(parseInt(id, 10));
        } else {
            setOrder((maxOrder ?? 0) + 1);
        }
    }, [searchParams, maxOrder]);

    useEffect(() => {
        if (credData) {
            setName(credData.name);
            setAcronym(credData.acronym);
            setRole(credData.role);
            setEmail(credData.email);
            setOrder(credData.order);
            setImageSrc(credData.imageLink);
        }
    }, [credData]);

    const onFileChange = async (file: File) => {
        const imageDataUrl = await readFile(file);
        const resizedImageDataUrl = await resizeImage(imageDataUrl);
        setImageSrc(resizedImageDataUrl);
        setImage(resizedImageDataUrl?.split(",")[1] ?? null);
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

        if (isEditMode && credId !== null) {
            try {
                let imageLinkToSave = credData?.imageLink;

                if (image) {
                    if (credData?.imageLink) {
                        const uploadResult = await updateFile.mutateAsync({
                            id: credId,
                            image,
                            imageLink: credData.imageLink,
                            tipo: "cred",
                        });
                        imageLinkToSave = uploadResult.imageUrl;
                    } else {
                        const uploadResult = await uploadPhoto.mutateAsync({
                            id: credId,
                            image,
                            tipo: "cred",
                        });
                        imageLinkToSave = uploadResult.imageUrl;
                    }
                }

                await updateCred.mutateAsync({
                    id: credId,
                    name,
                    acronym,
                    role,
                    email,
                    order: credData?.order ?? order ?? 0,
                    imageLink: imageLinkToSave ?? undefined,
                });
            } catch (error) {
                console.error("Erro atualizando CRED", error);
                alert("Falha em atualizar CRED. Por favor tente novamente.");
            }
        } else {
            try {
                if (latestCredId.isLoading || latestCredId.data === undefined) {
                    alert("Carregando último ID de CRED, por favor aguarde alguns segundos e tente novamente.");
                    return;
                }

                const nextId = (latestCredId.data ?? 0) + 1;

                const uploadResult = await uploadPhoto.mutateAsync({
                    id: nextId,
                    image,
                    tipo: "cred",
                });

                await createCred.mutateAsync({
                    name,
                    acronym,
                    role,
                    email,
                    order: order ?? ((maxOrder ?? 0) + 1),
                    imageLink: uploadResult.imageUrl,
                });
            } catch (error) {
                console.error("Error creating CRED:", error);
                alert("Falha em criar esse CRED. Por favor tente novamente.");
            }
        }
    };

    const isLoading = createCred.isPending || uploadPhoto.isPending || updateFile.isPending || updateCred.isPending;

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="container mx-auto px-6 py-12">
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="flex items-center space-x-4">
                        <Button
                            variant="outline"
                            onClick={() => router.push("/cred")}
                            className="hover:bg-gray-50"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar
                        </Button>
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                                    {isEditMode ? "Editar CRED" : "Criar novo CRED"}
                                </h1>
                                <p className="text-gray-600">
                                    {isEditMode ? "Atualize as informações do CRED" : "Adicione um novo CRED"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Users className="w-5 h-5 text-blue-600" />
                                <span>Informações do CRED</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nome Completo</Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Digite o nome completo"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="acronym">Sigla</Label>
                                        <Input
                                            id="acronym"
                                            type="text"
                                            value={acronym}
                                            onChange={(e) => setAcronym(e.target.value)}
                                            placeholder="Ex: CRED Paulista"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="role">Cargo/Função</Label>
                                        <Input
                                            id="role"
                                            type="text"
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            placeholder="Descreva o cargo"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">E-mail</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="email@ifmsa.org.br"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label>Foto do CRED</Label>
                                    <div
                                        className="mt-2 border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                        onClick={handleButtonClick}
                                    >
                                        <input
                                            type="file"
                                            onChange={handleFileInputChange}
                                            className="hidden"
                                            ref={fileInputRef}
                                            accept="image/*"
                                        />

                                        {imageSrc ? (
                                            <div className="relative">
                                                <img
                                                    src={imageSrc}
                                                    alt="Pré-visualização da imagem"
                                                    className="mx-auto rounded-xl shadow-lg max-h-64 object-cover"
                                                />
                                                <p className="text-sm text-gray-500 mt-4">
                                                    Clique ou arraste uma nova imagem para substituir
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center space-y-3">
                                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <Upload className="w-6 h-6 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        Clique para selecionar ou arraste uma imagem
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        PNG, JPG até 10MB
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-6">
                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
                                        size="lg"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                {isEditMode ? "Atualizando..." : "Criando..."}
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-5 h-5 mr-2" />
                                                {isEditMode ? "Atualizar CRED" : "Criar CRED"}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
};

const readFile = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();

        const cleanup = () => {
            reader.removeEventListener("load", onLoad);
            reader.removeEventListener("error", onError);
            reader.removeEventListener("abort", onAbort);
        };

        const onLoad = () => {
            cleanup();
            resolve(reader.result as string);
        };

        const onError = () => {
            cleanup();
            reject(reader.error ?? new Error("FileReader error while reading file"));
        };

        const onAbort = () => {
            cleanup();
            reject(new Error("FileReader was aborted while reading file"));
        };

        reader.addEventListener("load", onLoad);
        reader.addEventListener("error", onError);
        reader.addEventListener("abort", onAbort);
        reader.readAsDataURL(file);
    });

const RESIZE_TIMEOUT_MS = 10_000;

const resizeImage = (imageSrc: string): Promise<string> =>
    new Promise((resolve, reject) => {
        const image = new Image();

        const timeout = setTimeout(() => {
            reject(new Error("resizeImage timed out: image never loaded"));
        }, RESIZE_TIMEOUT_MS);

        const settle = (fn: () => void) => {
            clearTimeout(timeout);
            fn();
        };

        image.onerror = () => {
            settle(() => reject(new Error("resizeImage: failed to load image")));
        };

        image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 400;
            canvas.height = 400;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                settle(() => reject(new Error("resizeImage: canvas 2d context unavailable")));
                return;
            }
            ctx.drawImage(image, 0, 0, 400, 400);
            pica.resize(canvas, canvas, { quality: 3 })
                .then((result: HTMLCanvasElement) => {
                    settle(() => resolve(result.toDataURL("image/png")));
                })
                .catch((err: unknown) => {
                    settle(() => reject(err instanceof Error ? err : new Error(String(err))));
                });
        };

        image.src = imageSrc;
    });

export default CreateOrEditCred;
