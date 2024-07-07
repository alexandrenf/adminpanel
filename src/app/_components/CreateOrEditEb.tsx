"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import Pica from "pica";

const pica = new Pica();

const CreateOrEditEb = () => {
    const [name, setName] = useState("");
    const [acronym, setAcronym] = useState("");
    const [role, setRole] = useState("");
    const [email, setEmail] = useState("");
    const [order, setOrder] = useState<number | null>(null);
    const [image, setImage] = useState<string | null>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [ebId, setEbId] = useState<number | null>(null);
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchParams = useSearchParams();

    const latestEBId = api.eb.latestEbId.useQuery();
    const uploadPhoto = api.ebPhoto.uploadPhoto.useMutation();
    const updateFile = api.ebPhoto.updateFile.useMutation();
    const createEb = api.eb.create.useMutation({
        onError: (error) => {
            console.error("Error creating EB:", error);
            alert("Failed to create EB. Please check the console for more details.");
        },
        onSuccess: () => {
            router.push("/eb");
        },
    });
    const updateEb = api.eb.update.useMutation({
        onError: (error) => {
            console.error("Error updating EB:", error);
            alert("Failed to update EB. Please check the console for more details.");
        },
        onSuccess: () => {
            router.push("/eb");
        },
    });
    const { data: ebData } = api.eb.getOne.useQuery(
        { id: ebId ?? -1 },
        {
            enabled: isEditMode && ebId !== null,
        }
    );
    const { data: maxOrder } = api.eb.getMaxOrder.useQuery();

    useEffect(() => {
        const id = searchParams.get("id");
        if (id) {
            setIsEditMode(true);
            setEbId(parseInt(id, 10));
        } else {
            setOrder((maxOrder ?? 0) + 1);
        }
    }, [searchParams, maxOrder]);

    useEffect(() => {
        if (ebData) {
            setName(ebData.name);
            setAcronym(ebData.acronym);
            setRole(ebData.role);
            setEmail(ebData.email);
            setOrder(ebData.order);
            setImageSrc(ebData.imageLink);
        }
    }, [ebData]);

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

        if (isEditMode && ebId !== null) {
            try {
                const uploadResult = await updateFile.mutateAsync({
                    id: ebId ?? 0,
                    image,
                    imageLink: ebData?.imageLink ?? "",
                });

                await updateEb.mutateAsync({
                    id: ebId ?? 0,
                    name,
                    acronym,
                    role,
                    email,
                    order: ebData?.order ?? 0,
                    imageLink: uploadResult.imageUrl,
                });
            } catch (error) {
                console.error("Error updating EB:", error);
                alert("Failed to update EB. Please try again.");
            }
        } else {
            try {

                if (latestEBId.isLoading || !latestEBId.data) {
                    alert("Loading latest blog ID, please wait.");
                    return;
                }

                const nextId = latestEBId.data + 1;

                const uploadResult = await uploadPhoto.mutateAsync({
                    id: nextId, // Generate a unique ID
                    image,
                });

                await createEb.mutateAsync({
                    name,
                    acronym,
                    role,
                    email,
                    order: order ?? 0,
                    imageLink: uploadResult.imageUrl,
                });
            } catch (error) {
                console.error("Error creating EB:", error);
                alert("Failed to create EB. Please try again.");
            }
        }
    };

    return (
        <div className="container mx-auto p-6">
            <div className="bg-white shadow-md rounded-lg p-8 mt-8">
                <h1 className="text-3xl font-bold text-center text-blue-900 mb-8">
                    {isEditMode ? "Editar EB" : "Criar novo EB"}
                </h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Acronym</label>
                        <input
                            type="text"
                            value={acronym}
                            onChange={(e) => setAcronym(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Role</label>
                        <input
                            type="text"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    {!isEditMode && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Order</label>
                            <input
                                type="number"
                                value={order ?? ""}
                                onChange={(e) => setOrder(e.target.valueAsNumber)}
                                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                            />
                        </div>
                    )}
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
                    <div>
                        <button
                            type="submit"
                            className="w-full bg-blue-900 text-white p-3 rounded-md hover:bg-blue-700"
                            disabled={createEb.isPending || uploadPhoto.isPending || updateFile.isPending || updateEb.isPending}
                        >
                            {isEditMode
                                ? (updateFile.isPending || updateEb.isPending)
                                    ? "Atualizando..."
                                    : "Atualizar EB"
                                : (createEb.isPending || uploadPhoto.isPending)
                                    ? "Criando..."
                                    : "Criar EB"}
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

export default CreateOrEditEb;
