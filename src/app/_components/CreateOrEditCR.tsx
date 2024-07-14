"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import Pica from "pica";

const pica = new Pica();

const CreateOrEditCR = () => {
    const [name, setName] = useState("");
    const [acronym, setAcronym] = useState("");
    const [regionalID, setRegionalID] = useState<number>(1);
    const [role, setRole] = useState("");
    const [email, setEmail] = useState("");
    const [order, setOrder] = useState<number | null>(null);
    const [image, setImage] = useState<string | null>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [crId, setCrId] = useState<number | null>(null);
    const [tryCount, setTryCount] = useState<number>(0);
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchParams = useSearchParams();

    const latestCRId = api.cr.latestCrId.useQuery();
    const uploadPhoto = api.photo.uploadPhoto.useMutation();
    const updateFile = api.photo.updatePhoto.useMutation();
    const regionais = api.regional.getAll.useQuery();
    const createCr = api.cr.create.useMutation({
        onError: (error) => {
            console.error("Error creating CR", error);
            alert("Falha em criar esse EB. Por favor tente novamente.");
        },
        onSuccess: () => {
            router.push("/cr");
        },
    });
    const updateCr = api.cr.update.useMutation({
        onError: (error) => {
            console.error("Error updating CR", error);
            alert("Falha em atualizar CR. Por favor tente novamente.");
        },
        onSuccess: () => {
            router.push("/cr");
        },
    });
    const { data: crData } = api.cr.getOne.useQuery(
        { id: crId ?? -1 },
        {
            enabled: isEditMode && crId !== null,
        }
    );
    const { data: maxOrder } = api.cr.getMaxOrder.useQuery();

    useEffect(() => {
        const id = searchParams.get("id");
        if (id) {
            setIsEditMode(true);
            setCrId(parseInt(id, 10));
        } else {
            setOrder((maxOrder ?? 0) + 1);
        }
    }, [searchParams, maxOrder]);

    useEffect(() => {
        if (crData) {
            setName(crData.name);
            setAcronym(crData.acronym);
            setRole(crData.role);
            setEmail(crData.email);
            setOrder(crData.order);
            setImageSrc(crData.imageLink);
        }
    }, [crData]);

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

        if (isEditMode && crId !== null) {
            try {
                const uploadResult = await updateFile.mutateAsync({
                    id: crId ?? 0,
                    image,
                    imageLink: crData?.imageLink ?? "",
                    tipo: "cr",
                });

                await updateCr.mutateAsync({
                    id: crId ?? 0,
                    name,
                    acronym,
                    role,
                    email,
                    order: crData?.order ?? 0,
                    imageLink: uploadResult.imageUrl,
                    regionalID,
                });
            } catch (error) {
                console.error("Erro atualizando CR", error);
                alert("Falha em atualizar CR. Por favor tente novamente.");
            }
        } else {
            try {

                if (latestCRId.isLoading || !latestCRId.data === null) {
                    alert("Carregando último ID de CR, por favor aguarde 10 segundos e tente novamente.");
                    if (tryCount === 1) {
                        latestCRId.data = 30;
                    } else {
                        return;
                    }
                }

                const nextId = (latestCRId.data ?? 0) + 1;

                const uploadResult = await uploadPhoto.mutateAsync({
                    id: nextId, // Generate a unique ID
                    image,
                    tipo: "cr",
                });

                await createCr.mutateAsync({
                    name,
                    acronym,
                    role,
                    email,
                    order: order ?? 0,
                    imageLink: uploadResult.imageUrl,
                    regionalID,
                });
            } catch (error) {
                console.error("Error creating CR:", error);
                alert("Falha em criar esse CR. Por favor tente novamente.");
            }
        }
    };

    return (
        <div className="container mx-auto p-6">
            <div className="bg-white shadow-md rounded-lg p-8 mt-8">
                <h1 className="text-3xl font-bold text-center text-blue-900 mb-8">
                    {isEditMode ? "Editar CR" : "Criar novo CR"}
                </h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Regional</label>
                        <select
                            value={regionalID ?? 1}
                            onChange={(e) => setRegionalID(parseInt(e.target.value, 10))}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        >
                            {regionais.data?.map((regional) => (
                                <option key={regional.id} value={regional.id}>
                                    {regional.name}
                                </option>
                            ))}
                        </select>
                        <label className="block text-sm font-medium text-gray-700">Nome</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Sigla (ex: CR Paulista ou CR N1)</label>
                        <input
                            type="text"
                            value={acronym}
                            onChange={(e) => setAcronym(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Cargo por extenso</label>
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
                            disabled={createCr.isPending || uploadPhoto.isPending || updateFile.isPending || updateCr.isPending}
                        >
                            {isEditMode
                                ? (updateFile.isPending || updateCr.isPending)
                                    ? "Atualizando..."
                                    : "Atualizar CR"
                                : (createCr.isPending || uploadPhoto.isPending)
                                    ? "Criando..."
                                    : "Criar CR"}
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

export default CreateOrEditCR;
