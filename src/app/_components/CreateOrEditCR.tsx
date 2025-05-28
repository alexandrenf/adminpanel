"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import { 
    Users, 
    Upload, 
    Save, 
    Loader2,
    ArrowLeft,
    MapPin
} from "lucide-react";
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
            alert("Falha em criar esse CR. Por favor tente novamente.");
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
            setRegionalID(crData.regionalID);
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

    const isLoading = createCr.isPending || uploadPhoto.isPending || updateFile.isPending || updateCr.isPending;

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="container mx-auto px-6 py-12">
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center space-x-4">
                        <Button
                            variant="outline"
                            onClick={() => router.push("/cr")}
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
                                    {isEditMode ? "Editar CR" : "Criar novo CR"}
                                </h1>
                                <p className="text-gray-600">
                                    {isEditMode ? "Atualize as informações do CR" : "Adicione um novo coordenador regional"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Users className="w-5 h-5 text-blue-600" />
                                <span>Informações do CR</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="regional">Regional</Label>
                                    <Select value={regionalID.toString()} onValueChange={(value) => setRegionalID(parseInt(value, 10))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione uma regional" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {regionais.data?.map((regional) => (
                                                <SelectItem key={regional.id} value={regional.id.toString()}>
                                                    <div className="flex items-center space-x-2">
                                                        <MapPin className="w-4 h-4 text-gray-400" />
                                                        <span>{regional.name}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

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
                                            placeholder="Ex: CR Paulista ou CR N1"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="role">Cargo por Extenso</Label>
                                        <Input
                                            id="role"
                                            type="text"
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            placeholder="Digite o cargo completo"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Digite o email"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Image Upload */}
                                <div className="space-y-4">
                                    <Label>Imagem do Perfil</Label>
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
                                                {isEditMode ? "Atualizar CR" : "Criar CR"}
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
                    resolve(result.toDataURL("image/png")); // Convert to PNG
                });
            }
        };
    });

export default CreateOrEditCR;
