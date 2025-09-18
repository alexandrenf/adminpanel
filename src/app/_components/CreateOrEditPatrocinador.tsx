"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import {
    Handshake,
    Upload,
    Save,
    Loader2,
    ArrowLeft
} from "lucide-react";
import { api } from "~/trpc/react";
import Pica from "pica";

const pica = new Pica();

type PatrocinadorType = "marca" | "colaborador";

const patrocinadorTypeOptions: Array<{ value: PatrocinadorType; label: string }> = [
    { value: "marca", label: "Apoiador à marca" },
    { value: "colaborador", label: "Colaborador" },
];

const CreateOrEditPatrocinador = () => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState<string | undefined>(undefined);
    const [website, setWebsite] = useState<string | undefined>(undefined);
    const [order, setOrder] = useState<number | null>(null);
    const [image, setImage] = useState<string | null>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [patrocinadorId, setPatrocinadorId] = useState<number | null>(null);
    const [tryCount, setTryCount] = useState<number>(0);
    const [type, setType] = useState<PatrocinadorType>("marca");
    const [initialType, setInitialType] = useState<PatrocinadorType>("marca");
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchParams = useSearchParams();

    const latestPatrocinadorId = api.patrocinador.latestPatrocinadorId.useQuery();
    const uploadPhoto = api.patrocinadorPhoto.uploadPhoto.useMutation();
    const updateFile = api.patrocinadorPhoto.updateFile.useMutation();
    const createPatrocinador = api.patrocinador.create.useMutation({
        onError: (error) => {
            console.error("Error creating patrocinador", error);
            alert("Falha em criar patrocinador. Por favor tente novamente.");
        },
        onSuccess: () => {
            router.push("/patrocinadores");
        },
    });
    const updatePatrocinador = api.patrocinador.update.useMutation({
        onError: (error) => {
            console.error("Error updating patrocinador", error);
            alert("Falha em atualizar patrocinador. Por favor tente novamente.");
        },
        onSuccess: () => {
            router.push("/patrocinadores");
        },
    });
    const { data: patrocinadorData } = api.patrocinador.getOne.useQuery(
        { id: patrocinadorId ?? -1 },
        {
            enabled: isEditMode && patrocinadorId !== null,
        }
    );
    const { data: maxOrderForType } = api.patrocinador.getMaxOrder.useQuery({ type });

    useEffect(() => {
        if (!searchParams) return;

        const idParam = searchParams.get("id");
        if (idParam) {
            setIsEditMode(true);
            setPatrocinadorId(parseInt(idParam, 10));
            return;
        }

        const typeParam = searchParams.get("type");
        if (typeParam === "marca" || typeParam === "colaborador") {
            setType(typeParam);
        }
    }, [searchParams]);

    useEffect(() => {
        if (!patrocinadorData) return;

        const normalizedType = (patrocinadorData.type ?? "marca") as PatrocinadorType;
        setName(patrocinadorData.name ?? "");
        setDescription(patrocinadorData.description ?? "");
        setWebsite(patrocinadorData.website ?? "");
        setOrder(patrocinadorData.order);
        setImageSrc(patrocinadorData.imageLink ?? null);
        setType(normalizedType);
        setInitialType(normalizedType);
    }, [patrocinadorData]);

    useEffect(() => {
        if (isEditMode) return;
        setOrder(((maxOrderForType ?? 0)) + 1);
    }, [isEditMode, maxOrderForType, type]);

    useEffect(() => {
        if (!isEditMode || !patrocinadorData) return;

        if (type === initialType) {
            setOrder(patrocinadorData.order);
        } else {
            setOrder(((maxOrderForType ?? 0)) + 1);
        }
    }, [type, isEditMode, patrocinadorData, initialType, maxOrderForType]);

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

        const normalizedDescription = description ?? "";
        const normalizedWebsite = website ?? "";
        const targetOrder = order ?? 0;

        if (isEditMode && patrocinadorId !== null) {
            try {
                let imageUrl = patrocinadorData?.imageLink ?? null;

                if (patrocinadorData?.imageLink) {
                    const uploadResult = await updateFile.mutateAsync({
                        id: patrocinadorId,
                        image,
                        imageLink: patrocinadorData.imageLink,
                    });
                    imageUrl = uploadResult.imageUrl;
                } else {
                    const uploadResult = await uploadPhoto.mutateAsync({
                        id: patrocinadorId,
                        image,
                    });
                    imageUrl = uploadResult.imageUrl;
                }

                await updatePatrocinador.mutateAsync({
                    id: patrocinadorId,
                    name,
                    description: normalizedDescription,
                    website: normalizedWebsite,
                    order: targetOrder,
                    imageLink: imageUrl ?? undefined,
                    type,
                });
            } catch (error) {
                console.error("Erro atualizando patrocinador", error);
                alert("Falha em atualizar patrocinador. Por favor tente novamente.");
            }
        } else {
            try {
                if (latestPatrocinadorId.isLoading || latestPatrocinadorId.data === undefined) {
                    alert("Carregando último ID de patrocinador, por favor aguarde 10 segundos e tente novamente.");
                    setTryCount((count) => count + 1);
                    if (tryCount < 1) {
                        return;
                    }
                }

                const nextId = (latestPatrocinadorId.data ?? 0) + 1;

                const uploadResult = await uploadPhoto.mutateAsync({
                    id: nextId,
                    image,
                });

                await createPatrocinador.mutateAsync({
                    name,
                    description: normalizedDescription,
                    website: normalizedWebsite,
                    order: targetOrder,
                    imageLink: uploadResult.imageUrl,
                    type,
                });
            } catch (error) {
                console.error("Error creating patrocinador:", error);
                alert("Falha em criar patrocinador. Por favor tente novamente.");
            }
        }
    };

    const isLoading = createPatrocinador.isPending || uploadPhoto.isPending || updateFile.isPending || updatePatrocinador.isPending;

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="container mx-auto px-6 py-12">
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="flex items-center space-x-4">
                        <Button
                            variant="outline"
                            onClick={() => router.push("/patrocinadores")}
                            className="hover:bg-gray-50"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar
                        </Button>
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
                                <Handshake className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-amber-700 bg-clip-text text-transparent">
                                    {isEditMode ? "Editar patrocinador" : "Criar novo patrocinador"}
                                </h1>
                                <p className="text-gray-600">
                                    {isEditMode ? "Atualize as informações do patrocinador" : "Adicione um novo patrocinador"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Handshake className="w-5 h-5 text-amber-500" />
                                <span>Informações do Patrocinador</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nome</Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Digite o nome do patrocinador"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="type">Tipo</Label>
                                        <Select value={type} onValueChange={(value: PatrocinadorType) => setType(value)}>
                                            <SelectTrigger id="type">
                                                <SelectValue placeholder="Selecione o tipo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {patrocinadorTypeOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Descrição</Label>
                                    <Textarea
                                        id="description"
                                        value={description ?? ""}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Descreva o patrocinador (opcional)"
                                        rows={4}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="website">Website</Label>
                                    <Input
                                        id="website"
                                        type="url"
                                        value={website ?? ""}
                                        onChange={(e) => setWebsite(e.target.value)}
                                        placeholder="https://exemplo.com (opcional)"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <Label>Logo do Patrocinador</Label>
                                    <div className="flex items-start space-x-6">
                                        {imageSrc && (
                                            <div className="w-32 h-32 bg-gray-100 border-2 border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                                <img
                                                    src={imageSrc}
                                                    alt="Preview da imagem"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <div
                                                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-amber-400 transition-colors cursor-pointer"
                                                onDrop={handleDrop}
                                                onDragOver={handleDragOver}
                                                onClick={handleButtonClick}
                                            >
                                                <input
                                                    type="file"
                                                    onChange={handleFileInputChange}
                                                    className="hidden"
                                                    ref={fileInputRef}
                                                    accept="image/*"
                                                />
                                                <div className="flex flex-col items-center space-y-3">
                                                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                                                        <Upload className="w-6 h-6 text-amber-600" />
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
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6">
                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg hover:shadow-xl transition-all duration-300"
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
                                                {isEditMode ? "Atualizar patrocinador" : "Criar patrocinador"}
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
                    resolve(result.toDataURL("image/png"));
                });
            }
        };
    });

export default CreateOrEditPatrocinador;
