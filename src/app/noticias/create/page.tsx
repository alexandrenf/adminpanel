"use client"

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import "react-datepicker/dist/react-datepicker.css";
import DatePicker from "react-datepicker";
import { api } from "~/trpc/react";
import { authorOptions } from "~/app/constants/authorOptions";

// Dynamic import for MDEditor
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

const CreateNoticia = () => {
    const [title, setTitle] = useState("");
    const [date, setDate] = useState<Date | null>(null);
    const [markdown, setMarkdown] = useState("");
    const [resumo, setResumo] = useState("");
    const [author, setAuthor] = useState(authorOptions[0]); // Default to the first author option
    const [otherAuthor, setOtherAuthor] = useState("");
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
    const createNoticia = api.noticias.create.useMutation({
        onSuccess: () => {
            router.push("/noticias");
        },
    });
    const updateNoticia = api.noticias.update.useMutation({
        onSuccess: () => {
            router.push("/noticias");
        },
    });
    const { data: noticiaData } = api.noticias.getOne.useQuery(
        { id: noticiaId ?? -1 },
        {
            enabled: isEditMode && noticiaId !== null,
        }
    );

    useEffect(() => {
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
            setAuthor(noticiaData.author);
            setImageSrc(noticiaData.imageLink);
            setForcarPaginaInicial(noticiaData.forceHomePage);
        }
    }, [noticiaData]);

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

        if (isEditMode && noticiaId !== null) {
            try {
                await updateNoticia.mutateAsync({
                    id: noticiaId,
                    date: date ? new Date(date) : new Date(),
                    author: author === "Outros" ? otherAuthor : author,
                    title,
                    summary: resumo,
                    link: markdown,
                    imageLink: imageSrc,
                    forceHomePage: forcarPaginaInicial,
                });
            } catch (error) {
                console.error("Error updating noticia:", error);
                alert("Failed to update noticia. Please try again.");
            }
        } else {
            if (latestBlogId.isLoading || !latestBlogId.data) {
                alert("Loading latest blog ID, please wait.");
                return;
            }

            const nextId = latestBlogId.data + 1;

            try {
                const finalAuthor = author === "Outros" ? otherAuthor : author;

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

    return (
        <div className="container mx-auto p-6">
            <div className="bg-white shadow-md rounded-lg p-8 mt-8">
                <h1 className="text-3xl font-bold text-center text-blue-900 mb-8">
                    {isEditMode ? "Editar Notícia" : "Criar nova notícia"}
                </h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Autor</label>
                        <select
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        >
                            {authorOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                        {author === "Outros" && (
                            <input
                                type="text"
                                value={otherAuthor}
                                onChange={(e) => setOtherAuthor(e.target.value)}
                                placeholder="Especifique o Autor"
                                className="mt-2 block w-full p-2 border border-gray-300 rounded-md"
                            />
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Data</label>
                        <DatePicker
                            selected={date}
                            onChange={(newDate) => setDate(newDate)}
                            dateFormat="dd/MM/yyyy"
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                            placeholderText="Selecione uma data"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Resumo</label>
                        <textarea
                            value={resumo}
                            onChange={(e) => setResumo(e.target.value)}
                            maxLength={150}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Conteúdo</label>
                        <MDEditor value={markdown} onChange={(value) => setMarkdown(value || "")} />
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
                                Upload or Drag & Drop Image
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            checked={forcarPaginaInicial}
                            onChange={(e) => setForcarPaginaInicial(e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-900">Forçar Página Inicial</label>
                    </div>
                    <div>
                        <button
                            type="submit"
                            className="w-full bg-blue-900 text-white p-3 rounded-md hover:bg-blue-700"
                            disabled={createNoticia.isPending || uploadFile.isPending || updateNoticia.isPending}
                        >
                            {isEditMode
                                ? updateNoticia.isPending
                                    ? "Atualizando..."
                                    : "Atualizar Notícia"
                                : createNoticia.isPending || uploadFile.isPending
                                    ? "Criando..."
                                    : "Criar Notícia"}
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

export default CreateNoticia;
