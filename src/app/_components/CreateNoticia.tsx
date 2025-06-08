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
import { Checkbox } from "../../components/ui/checkbox";
import { 
    Newspaper, 
    Upload, 
    Save, 
    Loader2,
    ArrowLeft,
    Calendar,
    User,
    UserPlus,
    X,
    Edit3
} from "lucide-react";
import dynamic from "next/dynamic";
import "react-datepicker/dist/react-datepicker.css";
import DatePicker from "react-datepicker";
import { api } from "~/trpc/react";
import { authorOptions } from "~/app/constants/authorOptions";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../../components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import AuthorSelector from "./AuthorSelector";

// Dynamic import for MDEditor
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

// Author interface for extended author information
interface ExtendedAuthor {
    id: number;
    name: string;
    bio?: string | null;
    photoLink?: string | null;
}

// Type for authors from the database
type DBAuthor = {
    id: number;
    name: string;
    bio: string | null;
    photoLink: string | null;
    createdAt: Date;
    updatedAt: Date;
};

const CreateNoticia = () => {
    const [title, setTitle] = useState("");
    const [date, setDate] = useState<Date | null>(null);
    const [markdown, setMarkdown] = useState("");
    const [resumo, setResumo] = useState("");
    const [author, setAuthor] = useState<string>(authorOptions[0] ?? ""); // Legacy author field
    const [otherAuthor, setOtherAuthor] = useState("");
    
    // Extended author information
    const [useExtendedAuthors, setUseExtendedAuthors] = useState(false);
    const [selectedAuthors, setSelectedAuthors] = useState<ExtendedAuthor[]>([]);
    
    const [image, setImage] = useState<string | null>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [forcarPaginaInicial, setForcarPaginaInicial] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [noticiaId, setNoticiaId] = useState<number | null>(null);
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchParams = useSearchParams();

    const latestBlogId = api.noticias.latestBlogId.useQuery();
    const uploadFile = api.file.uploadFile.useMutation();
    const updateFile = api.file.updateFile.useMutation();
    
    // Author-related queries
    const associateAuthors = api.authors.associateWithBlog.useMutation();
    
    const createNoticia = api.noticias.create.useMutation({
        onSuccess: async (newBlog) => {
            // If using extended authors, associate them with the blog
            if (useExtendedAuthors && selectedAuthors.length > 0) {
                await associateAuthors.mutateAsync({
                    blogId: newBlog.id,
                    authorIds: selectedAuthors.map(a => a.id),
                });
            }
            router.push("/noticias");
        },
    });
    const updateNoticia = api.noticias.update.useMutation({
        onSuccess: async (updatedBlog) => {
            // If using extended authors, update associations
            if (useExtendedAuthors) {
                await associateAuthors.mutateAsync({
                    blogId: updatedBlog.id,
                    authorIds: selectedAuthors.map(a => a.id),
                });
            }
            router.push("/noticias");
        },
    });
    
    const { data: noticiaData } = api.noticias.getOne.useQuery(
        { id: noticiaId ?? -1 },
        {
            enabled: isEditMode && noticiaId !== null,
        }
    );
    
    // Get extended author info for editing
    const { data: extendedAuthorInfo } = api.authors.getByBlogId.useQuery(
        { blogId: noticiaId ?? -1 },
        {
            enabled: isEditMode && noticiaId !== null,
        }
    );

    useEffect(() => {
        if (!searchParams) return;
        
        const id = searchParams.get("id");
        if (id) {
            setIsEditMode(true);
            setNoticiaId(parseInt(id, 10));
        }
    }, [searchParams]);

    useEffect(() => {
        if (noticiaData) {
            setTitle(noticiaData.title);
            setDate(new Date(noticiaData.date));
            fetchMarkdownFile(noticiaData.link);
            setResumo(noticiaData.summary);
            
            // Handle legacy author format
            const isPredefinedAuthor = authorOptions.includes(noticiaData.author);
            if (isPredefinedAuthor) {
                setAuthor(noticiaData.author);
            } else {
                setAuthor("Outros");
                setOtherAuthor(noticiaData.author);
            }
            setImageSrc(noticiaData.imageLink);
            setForcarPaginaInicial(noticiaData.forceHomePage);
        }
    }, [noticiaData]);

    useEffect(() => {
        if (extendedAuthorInfo && extendedAuthorInfo.hasExtendedInfo && extendedAuthorInfo.authors) {
            setUseExtendedAuthors(true);
            setSelectedAuthors(extendedAuthorInfo.authors.map(author => ({
                id: author.id,
                name: author.name,
                bio: author.bio || undefined,
                photoLink: author.photo || undefined,
            })));
        }
    }, [extendedAuthorInfo]);

    const fetchMarkdownFile = async (url: string) => {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const markdownContent = await response.text();
                setMarkdown(markdownContent);
            } else {
                console.error("Failed to fetch markdown file:", response.statusText);
            }
        } catch (error) {
            console.error("Error fetching markdown file:", error);
        }
    };

    const onFileChange = async (file: File) => {
        const imageDataUrl = await readFile(file);
        const croppedImageDataUrl = await cropAndConvertImage(imageDataUrl);
        setImageSrc(croppedImageDataUrl);
        setImage(croppedImageDataUrl?.split(",")[1] ?? null); // Extract the base64 string
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
        e.stopPropagation();

        if (isEditMode && noticiaId !== null) {
            try {
                // First update the file on GitHub
                const uploadResult = await updateFile.mutateAsync({
                    id: noticiaId.toString(),
                    markdown,
                    image,
                    contentLink: noticiaData?.link ?? "",
                    imageLink: noticiaData?.imageLink ?? "",
                });

                // Determine the author for the legacy field
                const finalAuthor = useExtendedAuthors 
                    ? selectedAuthors.map(a => a.name).join(", ")
                    : (author === "Outros" ? otherAuthor : author);

                // Then update the database with the new links
                await updateNoticia.mutateAsync({
                    id: noticiaId,
                    date: date ? new Date(date) : new Date(),
                    author: finalAuthor,
                    title,
                    summary: resumo,
                    link: uploadResult.markdownUrl,
                    imageLink: uploadResult.imageUrl,
                    forceHomePage: forcarPaginaInicial,
                });
            } catch (error) {
                console.error("Error updating noticia:", error);
                alert("Failed to update noticia. Please try again.");
            }
        } else {
            if (latestBlogId.isLoading || !latestBlogId.data === null) {
                alert("Loading latest blog ID, please wait.");
                return;
            }

            const nextId = (latestBlogId.data ?? 0) + 1;

            try {
                // Determine the author for the legacy field
                const finalAuthor = useExtendedAuthors 
                    ? selectedAuthors.map(a => a.name).join(", ")
                    : (author === "Outros" ? otherAuthor : author);

                const uploadResult = await uploadFile.mutateAsync({
                    id: nextId.toString(),
                    markdown,
                    image,
                });

                createNoticia.mutate({
                    date: date ? new Date(date) : new Date(),
                    author: finalAuthor ?? "",
                    title,
                    summary: resumo,
                    link: uploadResult.markdownUrl,
                    imageLink: uploadResult.imageUrl,
                    forceHomePage: forcarPaginaInicial,
                });
            } catch (error) {
                console.error("Error creating noticia:", error);
                alert("Failed to create noticia. Please try again.");
            }
        }
    };

    const isLoading = createNoticia.isPending || uploadFile.isPending || updateFile.isPending || updateNoticia.isPending;

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="container mx-auto px-6 py-12">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center space-x-4">
                        <Button
                            variant="outline"
                            onClick={() => router.push("/noticias")}
                            className="hover:bg-gray-50"
                            type="button"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar
                        </Button>
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                                <Newspaper className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                                    {isEditMode ? "Editar Notícia" : "Criar nova notícia"}
                                </h1>
                                <p className="text-gray-600">
                                    {isEditMode ? "Atualize as informações da notícia" : "Adicione uma nova notícia ao portal"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Newspaper className="w-5 h-5 text-blue-600" />
                                <span>Informações da Notícia</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Título</Label>
                                    <Input
                                        id="title"
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Digite o título da notícia"
                                        required
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                            }
                                        }}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <Label>Autores</Label>
                                        
                                        {/* Toggle between legacy and extended author info */}
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="useExtendedAuthors"
                                                checked={useExtendedAuthors}
                                                onCheckedChange={(checked) => {
                                                    setUseExtendedAuthors(checked === true);
                                                    if (!checked) {
                                                        setSelectedAuthors([]);
                                                    }
                                                }}
                                            />
                                            <Label htmlFor="useExtendedAuthors" className="text-sm">
                                                Usar informações estendidas de autor (com foto e bio)
                                            </Label>
                                        </div>

                                        {!useExtendedAuthors ? (
                                            /* Legacy author selection */
                                            <div className="space-y-2">
                                                <Select value={author} onValueChange={setAuthor}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione um autor" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {authorOptions.map((option) => (
                                                            <SelectItem key={option} value={option}>
                                                                <div className="flex items-center space-x-2">
                                                                    <User className="w-4 h-4 text-gray-400" />
                                                                    <span>{option}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {author === "Outros" && (
                                                    <Input
                                                        type="text"
                                                        value={otherAuthor}
                                                        onChange={(e) => setOtherAuthor(e.target.value)}
                                                        placeholder="Especifique o Autor"
                                                        className="mt-2"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                            }
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        ) : (
                                            /* Extended author selection with new AuthorSelector */
                                            <AuthorSelector
                                                selectedAuthors={selectedAuthors}
                                                onAuthorsChange={setSelectedAuthors}
                                                disabled={isLoading}
                                            />
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="date">Data</Label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                                            <DatePicker
                                                selected={date}
                                                onChange={(newDate) => setDate(newDate)}
                                                dateFormat="dd/MM/yyyy"
                                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholderText="Selecione uma data"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="resumo">Resumo</Label>
                                    <Textarea
                                        id="resumo"
                                        value={resumo}
                                        onChange={(e) => setResumo(e.target.value)}
                                        maxLength={150}
                                        placeholder="Digite um resumo da notícia (máximo 150 caracteres)"
                                        className="min-h-[80px]"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                            }
                                        }}
                                    />
                                    <p className="text-xs text-gray-500">{resumo.length}/150 caracteres</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="content">Conteúdo</Label>
                                    <div className="border rounded-md overflow-hidden">
                                        <MDEditor value={markdown} onChange={(value) => setMarkdown(value || "")} />
                                    </div>
                                </div>

                                {/* Image Upload */}
                                <div className="space-y-4">
                                    <Label>Imagem de Capa</Label>
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

                                {/* Checkbox */}
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="forcarPaginaInicial"
                                        checked={forcarPaginaInicial}
                                        onCheckedChange={(checked) => setForcarPaginaInicial(checked === true)}
                                    />
                                    <Label htmlFor="forcarPaginaInicial" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        Forçar Página Inicial
                                    </Label>
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
                                                {isEditMode ? "Atualizar Notícia" : "Criar Notícia"}
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

const cropAndConvertImage = (imageSrc: string): Promise<string> =>
    new Promise((resolve) => {
        const image = new Image();
        image.src = imageSrc;
        image.onload = () => {
            const canvas = document.createElement("canvas");
            const size = Math.min(image.width, image.height);
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(
                    image,
                    (image.width - size) / 2,
                    (image.height - size) / 2,
                    size,
                    size,
                    0,
                    0,
                    size,
                    size
                );
                resolve(canvas.toDataURL("image/png")); // Convert to PNG
            }
        };
    });

const resizeAuthorPhoto = (imageSrc: string): Promise<string> =>
    new Promise((resolve) => {
        const image = new Image();
        image.src = imageSrc;
        image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 150;
            canvas.height = 150;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                // Calculate dimensions to maintain aspect ratio while filling 150x150
                const size = Math.min(image.width, image.height);
                const startX = (image.width - size) / 2;
                const startY = (image.height - size) / 2;
                
                ctx.drawImage(
                    image,
                    startX,
                    startY,
                    size,
                    size,
                    0,
                    0,
                    150,
                    150
                );
                resolve(canvas.toDataURL("image/png"));
            }
        };
    });

export default CreateNoticia;
