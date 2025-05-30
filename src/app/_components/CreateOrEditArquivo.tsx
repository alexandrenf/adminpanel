"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { 
    FileText, 
    Upload, 
    Save, 
    Loader2,
    ArrowLeft,
    Link as LinkIcon
} from "lucide-react";
import { api } from "~/trpc/react";
import Pica from "pica";
import { allowedTypes } from "~/app/_components/allowedTypes";

const pica = new Pica();

const CreateOrEditArquivo = () => {
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [date, setDate] = useState<string>(""); // Provide a default value for date
    const [image, setImage] = useState<string | null>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [fileLink, setFileLink] = useState<string>("");
    const [isEditMode, setIsEditMode] = useState(false);
    const [arquivoId, setArquivoId] = useState<number | null>(null);
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchParams = useSearchParams();
    const params = useParams<{ tipo: string }>();
    const tipo = params?.tipo ?? "";

    const typeObject = allowedTypes.find(type => type.href === tipo);
    const label = typeObject ? typeObject.label : "";

    useEffect(() => {
        if (!typeObject) {
            router.push("/404");
        }
    }, [typeObject, router]);

    const latestArquivoId = api.arquivo.latestArquivoId.useQuery();
    const uploadPhoto = api.arquivo.uploadPhoto.useMutation();
    const updatePhoto = api.arquivo.updatePhoto.useMutation();
    const createArquivo = api.arquivo.create.useMutation({
        onError: (error: any) => {
            console.error("Error creating Arquivo", error);
            alert("Falha em criar esse Arquivo. Por favor tente novamente.");
        },
        onSuccess: () => {
            router.push(`/documentos/${tipo}`);
        },
    });
    const updateArquivo = api.arquivo.update.useMutation({
        onError: (error: any) => {
            console.error("Error updating Arquivo", error);
            alert("Falha em atualizar Arquivo. Por favor tente novamente.");
        },
        onSuccess: () => {
            router.push(`/documentos/${tipo}`);
        },
    });
    const { data: arquivoData } = api.arquivo.getOne.useQuery(
        { id: arquivoId ?? -1 },
        {
            enabled: isEditMode && arquivoId !== null,
        }
    );

    useEffect(() => {
        if (!searchParams) return;
        
        const id = searchParams.get("id");
        if (id) {
            setIsEditMode(true);
            setArquivoId(parseInt(id, 10));
        }
    }, [searchParams]);

    useEffect(() => {
        if (arquivoData) {
            setTitle(arquivoData.title);
            setAuthor(arquivoData.author);
            setDate(arquivoData.date?.toISOString().split('T')[0] || "");
            setImageSrc(arquivoData.imageLink);
            setImage(arquivoData.imageLink ?? null);
            setFileLink(arquivoData.fileLink ?? "");
        }
    }, [arquivoData]);

    const onFileChange = async (file: File) => {
        const imageDataUrl = await readFile(file);
        const resizedImageDataUrl = await resizeAndCropImage(imageDataUrl);
        setImageSrc(resizedImageDataUrl);
        setImage(resizedImageDataUrl ? resizedImageDataUrl.split(",")[1] || "" : null); // Store only the base64 part
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

        if (isEditMode && arquivoId !== null) {
            try {
                let imageUrl = arquivoData?.imageLink ?? "";

                if (image && !image.startsWith("http")) {
                    console.log(image)
                    const uploadResult = await updatePhoto.mutateAsync({
                        id: arquivoId ?? 0,
                        image: image ?? "", // Ensure image is provided
                        tipo,
                        imageLink: arquivoData?.imageLink ?? "",
                    });
                    imageUrl = uploadResult.imageUrl ?? arquivoData?.imageLink;
                }

                await updateArquivo.mutateAsync({
                    id: arquivoId ?? 0,
                    title,
                    author,
                    date,
                    fileLink,
                    tipo,
                    imageLink: imageUrl,
                });
            } catch (error) {
                console.error("Erro atualizando Arquivo", error);
                alert("Falha em atualizar Arquivo. Por favor tente novamente.");
            }
        } else {
            try {
                if (latestArquivoId.isLoading || latestArquivoId.data === null) {
                    alert("Carregando último ID de Arquivo, por favor aguarde 10 segundos e tente novamente.");
                }

                const nextId = (latestArquivoId.data ?? 0) + 1;

                const uploadResult = await uploadPhoto.mutateAsync({
                    id: nextId, // Generate a unique ID
                    image: image ?? "", // Ensure image is provided
                    tipo,
                });

                await createArquivo.mutateAsync({
                    title,
                    author,
                    date,
                    imageLink: uploadResult.imageUrl,
                    fileLink,
                    tipo: tipo ?? "",
                });
            } catch (error) {
                console.error("Error creating Arquivo:", error);
                alert("Falha em criar esse Arquivo. Por favor tente novamente.");
            }
        }
    };

    const isLoading = createArquivo.isPending || uploadPhoto.isPending || updatePhoto.isPending || updateArquivo.isPending;

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="container mx-auto px-6 py-12">
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center space-x-4">
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/documentos/${tipo}`)}
                            className="hover:bg-gray-50"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar
                        </Button>
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                                <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                                    {isEditMode ? `Editar ${label}` : `Criar novo(a) ${label}`}
                                </h1>
                                <p className="text-gray-600">
                                    {isEditMode ? "Atualize as informações do arquivo" : `Adicione um novo arquivo de ${label.toLowerCase()}`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <FileText className="w-5 h-5 text-blue-600" />
                                <span>Informações do Arquivo</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Título</Label>
                                        <Input
                                            id="title"
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Digite o título do arquivo"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="author">Autor</Label>
                                        <Input
                                            id="author"
                                            type="text"
                                            value={author}
                                            onChange={(e) => setAuthor(e.target.value)}
                                            placeholder="Digite o nome do autor"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="date">Data</Label>
                                        <Input
                                            id="date"
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="fileLink">Link do Arquivo</Label>
                                        <div className="relative">
                                            <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <Input
                                                id="fileLink"
                                                type="url"
                                                value={fileLink}
                                                onChange={(e) => setFileLink(e.target.value)}
                                                placeholder="https://exemplo.com/arquivo.pdf"
                                                className="pl-10"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Image Upload */}
                                <div className="space-y-4">
                                    <Label>Imagem de Capa</Label>
                                    <div className="flex items-start space-x-6">
                                        {imageSrc && (
                                            <div className="w-32 h-32 bg-gray-100 border-2 border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                                <img 
                                                    src={imageSrc.startsWith("http") ? imageSrc : `data:image/png;base64,${image}`} 
                                                    alt="Preview da imagem" 
                                                    className="w-full h-full object-cover" 
                                                />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <div
                                                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
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
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Submit Button */}
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
                                                {isEditMode ? `Atualizar ${label}` : `Criar ${label}`}
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

const resizeAndCropImage = (imageSrc: string): Promise<string> =>
    new Promise((resolve) => {
        const image = new Image();
        image.src = imageSrc;
        image.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const targetSize = 400;

            let sourceX = 0;
            let sourceY = 0;
            let sourceWidth = image.width;
            let sourceHeight = image.height;

            // Calculate cropping dimensions
            if (image.width > image.height) {
                sourceX = (image.width - image.height) / 2;
                sourceWidth = image.height;
            } else if (image.height > image.width) {
                sourceY = (image.height - image.width) / 2;
                sourceHeight = image.width;
            }

            canvas.width = targetSize;
            canvas.height = targetSize;

            if (ctx) {
                ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetSize, targetSize);
                pica.resize(canvas, canvas, { quality: 3 }).then((result: HTMLCanvasElement) => {
                    resolve(result.toDataURL("image/png")); // Convert to PNG
                });
            }
        };
    });

export default CreateOrEditArquivo;