"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import Pica from "pica";
import { allowedTypes } from "~/app/_components/allowedTypes";

const pica = new Pica();

const CreateOrEditArquivo = () => {
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [date, setDate] = useState<string>(""); // Provide a default value for date
    const [image, setImage] = useState<string | null>(null);
    const [fileLink, setFileLink] = useState<string>("");
    const [isEditMode, setIsEditMode] = useState(false);
    const [arquivoId, setArquivoId] = useState<number | null>(null);
    const [tryCount, setTryCount] = useState<number>(0);
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchParams = useSearchParams();
    const { tipo = "" } = useParams<{ tipo: string }>();

    const typeObject = allowedTypes.find(type => type.href === tipo);
    const label = typeObject ? typeObject.label : "";

    const latestArquivoId = api.arquivo.latestArquivoId.useQuery();
    const uploadPhoto = api.arquivo.uploadPhoto.useMutation();
    const updatePhoto = api.arquivo.updatePhoto.useMutation();
    const createArquivo = api.arquivo.create.useMutation({
        onError: (error: any) => {
            console.error("Error creating Arquivo", error);
            alert("Falha em criar esse Arquivo. Por favor tente novamente.");
        },
        onSuccess: () => {
            router.push(`/arquivos/${tipo}`);
        },
    });
    const updateArquivo = api.arquivo.update.useMutation({
        onError: (error: any) => {
            console.error("Error updating Arquivo", error);
            alert("Falha em atualizar Arquivo. Por favor tente novamente.");
        },
        onSuccess: () => {
            router.push(`/arquivos/${tipo}`);
        },
    });
    const { data: arquivoData } = api.arquivo.getOne.useQuery(
        { id: arquivoId ?? -1 },
        {
            enabled: isEditMode && arquivoId !== null,
        }
    );

    useEffect(() => {
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
            setImage(arquivoData.imageLink ?? null);
            setFileLink(arquivoData.fileLink ?? "");
        }
    }, [arquivoData]);

    if (!typeObject) {
        useEffect(() => {
            router.push("/404");
        }, []);
        return null;
    }

    const onFileChange = async (file: File) => {
        const imageDataUrl = await readFile(file);
        const resizedImageDataUrl = await resizeAndCropImage(imageDataUrl);
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
                const uploadResult = await updatePhoto.mutateAsync({
                    id: arquivoId ?? 0,
                    image: image ?? "", // Ensure image is provided
                    tipo,
                    imageLink: arquivoData?.imageLink ?? "",
                });

                await updateArquivo.mutateAsync({
                    id: arquivoId ?? 0,
                    title,
                    author,
                    date,
                    fileLink,
                    tipo,
                    imageLink: uploadResult.imageUrl ?? arquivoData?.imageLink,
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

    return (
        <div className="container mx-auto p-6">
            <div className="bg-white shadow-md rounded-lg p-8 mt-8">
                <h2 className="text-3xl font-bold text-center text-blue-900 mb-8">
                    {isEditMode ? `Editar ${label}` : `Criar novo(a) ${label}`}
                </h2>
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
                        <input
                            type="text"
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Data</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Link do Arquivo</label>
                        <input
                            type="url"
                            value={fileLink || ""}
                            onChange={(e) => setFileLink(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div className="flex items-start space-x-4">
                        {image && (
                            <div className="w-32 h-32 bg-gray-100 border border-gray-300 flex items-center justify-center">
                                {image.startsWith("http") ? (
                                    <img src={image} alt="Image preview" className="max-w-full h-auto" />
                                ) : (
                                    <img src={`data:image/png;base64,${image}`} alt="Image preview" className="max-w-full h-auto" />
                                )}
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
                            disabled={createArquivo.isPending || uploadPhoto.isPending || updatePhoto.isPending || updateArquivo.isPending}
                        >
                            {isEditMode
                                ? (updatePhoto.isPending || updateArquivo.isPending)
                                    ? "Atualizando..."
                                    : `Atualizar ${label}`
                                : (createArquivo.isPending || uploadPhoto.isPending)
                                    ? "Criando..."
                                    : `Criar ${label}`}
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

            // Calculate cropping dimensions!
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
