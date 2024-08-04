"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import Pica from "pica";
import { allowedTimes } from "~/app/_components/allowedTimes";

const pica = new Pica();

const CreateOrEditMembroTime = () => {
    const [name, setName] = useState("");
    const [role, setRole] = useState("");
    const [image, setImage] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [membroId, setMembroId] = useState<number | null>(null);
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchParams = useSearchParams();
    const { tipo = "" } = useParams<{ tipo: string }>();

    const typeObject = allowedTimes.find(type => type.href === tipo);
    const label = typeObject ? typeObject.label : "";

    useEffect(() => {
        if (!typeObject) {
            router.push("/404");
        }
    }, [typeObject, router]);

    const latestMembroId = api.times.latestTimeMembroId.useQuery();
    const uploadPhoto = api.photo.uploadPhoto.useMutation();
    const updatePhoto = api.photo.updatePhoto.useMutation();
    const timeType = api.times.getByType.useQuery({ type: tipo });
    const createMembro = api.times.createTimeMembro.useMutation({
        onError: (error: any) => {
            console.error("Error creating Membro", error);
            alert("Falha em criar esse Membro. Por favor tente novamente.");
        },
        onSuccess: () => {
            router.push(`/times/${tipo}`);
        },
    });
    const updateMembro = api.times.updateTimeMembro.useMutation({
        onError: (error: any) => {
            console.error("Error updating Membro", error);
            alert("Falha em atualizar Membro. Por favor tente novamente.");
        },
        onSuccess: () => {
            router.push(`/times/${tipo}`);
        },
    });
    const { data: membroData } = api.times.getOneTimeMembro.useQuery(
        { id: membroId ?? -1 },
        {
            enabled: isEditMode && membroId !== null,
        }
    );

    useEffect(() => {
        const id = searchParams.get("id");
        if (id) {
            setIsEditMode(true);
            setMembroId(parseInt(id, 10));
        }
    }, [searchParams]);

    useEffect(() => {
        if (membroData) {
            setName(membroData.name);
            setRole(membroData.role);
            setImage(membroData.imageLink ?? null);
        }
    }, [membroData]);

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

        if (isEditMode && membroId !== null) {
            try {
                let imageUrl = membroData?.imageLink ?? "";

                if (image && !image.startsWith("http")) {
                    const uploadResult = await updatePhoto.mutateAsync({
                        id: membroId ?? 0,
                        image: image ?? "", // Ensure image is provided
                        tipo,
                        imageLink: membroData?.imageLink ?? "",
                    });
                    imageUrl = uploadResult.imageUrl ?? membroData?.imageLink;
                }

                await updateMembro.mutateAsync({
                    id: membroId ?? 0,
                    name,
                    role,
                    imageLink: imageUrl,
                });
            } catch (error) {
                console.error("Erro atualizando Membro", error);
                alert("Falha em atualizar Membro. Por favor tente novamente.");
            }
        } else {
            try {
                if (latestMembroId.isLoading || latestMembroId.data === null) {
                    alert("Carregando último ID de Membro, por favor aguarde 10 segundos e tente novamente.");
                }

                const nextId = (latestMembroId.data ?? 0) + 1;

                const uploadResult = await uploadPhoto.mutateAsync({
                    id: nextId, // Generate a unique ID
                    image: image ?? "", // Ensure image is provided
                    tipo,
                });

                await createMembro.mutateAsync({
                    name,
                    role,
                    imageLink: uploadResult.imageUrl,
                    timeID: timeType.data?.[0]?.id ?? 0,
                });
            } catch (error) {
                console.error("Error creating Membro:", error);
                alert("Falha em criar esse Membro. Por favor tente novamente.");
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
                        <label className="block text-sm font-medium text-gray-700">Nome</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Cargo</label>
                        <input
                            type="text"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
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
                            disabled={createMembro.isPending || uploadPhoto.isPending || updatePhoto.isPending || updateMembro.isPending}
                        >
                            {isEditMode
                                ? (updatePhoto.isPending || updateMembro.isPending)
                                    ? "Atualizando..."
                                    : `Atualizar ${label}`
                                : (createMembro.isPending || uploadPhoto.isPending)
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

export default CreateOrEditMembroTime;
