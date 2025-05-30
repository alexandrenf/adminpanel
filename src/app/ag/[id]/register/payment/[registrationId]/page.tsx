"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "../../../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../../components/ui/card";
import { Input } from "../../../../../../components/ui/input";
import { Label } from "../../../../../../components/ui/label";
import { Badge } from "../../../../../../components/ui/badge";
import { 
    Upload, 
    FileText, 
    CheckCircle, 
    Calendar, 
    Users, 
    MapPin,
    AlertTriangle,
    Image,
    X,
    Loader2
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { useToast } from "~/components/ui/use-toast";
import { api as convexApi } from "../../../../../../../convex/_generated/api";
import PrecisaLogin from "~/app/_components/PrecisaLogin";

export default function PaymentUploadPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    
    // Get IDs with type safety
    const assemblyId = params?.id;
    const registrationId = params?.registrationId;
    
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    
    // Fetch assembly data
    const assembly = useQuery(convexApi.assemblies?.getById, { id: assemblyId as any });
    
    // Get AG configuration for payment info
    const agConfig = useQuery(convexApi.agConfig?.get);
    
    // File upload URL mutation
    const generateUploadUrl = useMutation(convexApi.files?.generateUploadUrl);
    
    // Update registration with receipt
    const updateRegistrationReceipt = useMutation(convexApi.agRegistrations?.updatePaymentReceipt);

    // File validation
    const validateFile = useCallback((file: File) => {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
        const maxSize = 2 * 1024 * 1024; // 2MB
        
        if (!allowedTypes.includes(file.type)) {
            toast({
                title: "❌ Tipo de arquivo inválido",
                description: "Apenas arquivos PNG, JPEG ou PDF são permitidos.",
                variant: "destructive",
            });
            return false;
        }
        
        if (file.size > maxSize) {
            toast({
                title: "❌ Arquivo muito grande",
                description: "O arquivo deve ter no máximo 2MB.",
                variant: "destructive",
            });
            return false;
        }
        
        return true;
    }, [toast]);

    // Handle file selection
    const handleFileSelect = useCallback((file: File) => {
        if (validateFile(file)) {
            setSelectedFile(file);
        }
    }, [validateFile]);

    // Handle drag and drop
    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    }, [handleFileSelect]);

    // Handle file input change
    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    }, [handleFileSelect]);

    // Upload file
    const handleUpload = useCallback(async () => {
        if (!selectedFile || !session?.user?.id) return;
        
        setIsUploading(true);
        setUploadProgress(0);
        
        try {
            // Generate upload URL
            const uploadUrl = await generateUploadUrl();
            
            // Upload file to Convex
            const result = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": selectedFile.type },
                body: selectedFile,
            });
            
            if (!result.ok) {
                throw new Error("Failed to upload file");
            }
            
            const { storageId } = await result.json();
            
            // Update registration with receipt
            await updateRegistrationReceipt({
                registrationId: registrationId as any,
                receiptStorageId: storageId,
                receiptFileName: selectedFile.name,
                receiptFileType: selectedFile.type,
                receiptFileSize: selectedFile.size,
                uploadedBy: session.user.id,
            });
            
            toast({
                title: "✅ Comprovante Enviado!",
                description: "Seu comprovante foi enviado e está sendo analisado.",
            });
            
            // Navigate to completion page
            router.push(`/ag/${assemblyId}/register/complete/${registrationId}`);
            
        } catch (error) {
            console.error("Error uploading file:", error);
            toast({
                title: "❌ Erro no Upload",
                description: "Erro ao enviar comprovante. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    }, [selectedFile, session?.user?.id, generateUploadUrl, updateRegistrationReceipt, registrationId, toast, router, assemblyId]);

    // Remove selected file
    const removeFile = useCallback(() => {
        setSelectedFile(null);
    }, []);

    // Get file icon based on type
    const getFileIcon = (fileType: string) => {
        if (fileType.startsWith('image/')) {
            return <Image className="w-8 h-8 text-blue-600" />;
        }
        return <FileText className="w-8 h-8 text-red-600" />;
    };

    // Format file size
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Check if user has IFMSA email
    useEffect(() => {
        // Remove the auth check - general participants should be able to upload payment receipts
    }, [session]);

    // Show error if IDs are missing
    if (!assemblyId || !registrationId) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600">Erro</h1>
                    <p className="mt-2">Parâmetros inválidos.</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                    <div className="w-full h-full" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                    }}></div>
                </div>
                <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="relative z-10 flex-grow flex items-center justify-center">
                    <PrecisaLogin />
                </div>
            </main>
        );
    }

    if (!assembly) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="container mx-auto px-6 py-12">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                                <Upload className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                                    Enviar Comprovante
                                </h1>
                                <p className="text-gray-600">Finalize sua inscrição - {assembly.name}</p>
                            </div>
                        </div>
                        
                        {/* Assembly Info */}
                        <Card className="bg-blue-50 border-blue-200">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-center space-x-6 text-sm">
                                    <div className="flex items-center space-x-2">
                                        <Calendar className="w-4 h-4 text-blue-600" />
                                        <span>
                                            {new Date(assembly.startDate).toLocaleDateString('pt-BR')} - {" "}
                                            {new Date(assembly.endDate).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <MapPin className="w-4 h-4 text-blue-600" />
                                        <span>{assembly.location}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Users className="w-4 h-4 text-blue-600" />
                                        <span>{assembly.type === "AG" ? "Presencial" : "Online"}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Upload Instructions */}
                    <Card className="bg-green-50 border-green-200">
                        <CardContent className="pt-6">
                            <div className="flex items-center space-x-3">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                                <div>
                                    <h3 className="font-semibold text-green-900">Pagamento Realizado!</h3>
                                    <p className="text-sm text-green-700">
                                        Agora envie o comprovante do pagamento para finalizar sua inscrição.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* File Upload */}
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center">
                                <Upload className="w-5 h-5 text-blue-600 mr-2" />
                                Enviar Comprovante de Pagamento
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {/* File Upload Area */}
                                <div
                                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                                        dragActive 
                                            ? 'border-blue-500 bg-blue-50' 
                                            : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                >
                                    {!selectedFile ? (
                                        <div className="space-y-4">
                                            <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    Envie seu comprovante
                                                </h3>
                                                <p className="text-gray-600">
                                                    Arraste e solte o arquivo aqui ou clique para selecionar
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-sm text-gray-500">
                                                    Formatos aceitos: PNG, JPEG, PDF
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    Tamanho máximo: 2MB
                                                </p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                onClick={() => document.getElementById('file-input')?.click()}
                                            >
                                                Selecionar Arquivo
                                            </Button>
                                            <Input
                                                id="file-input"
                                                type="file"
                                                accept=".png,.jpg,.jpeg,.pdf"
                                                onChange={handleFileInputChange}
                                                className="hidden"
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-center space-x-3 p-4 bg-gray-50 rounded-lg">
                                                {getFileIcon(selectedFile.type)}
                                                <div className="flex-1 text-left">
                                                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {formatFileSize(selectedFile.size)} • {selectedFile.type}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={removeFile}
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Upload Progress */}
                                {isUploading && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">Enviando...</span>
                                            <span className="text-sm text-gray-500">{uploadProgress}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div 
                                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${uploadProgress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}

                                {/* Important Notice */}
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div className="flex items-start space-x-3">
                                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-medium text-amber-900">Importante:</h4>
                                            <p className="text-sm text-amber-700 mt-1">
                                                • Certifique-se de que o comprovante está legível<br/>
                                                • Deve conter informações de data, valor e destinatário<br/>
                                                • Sua inscrição será analisada após o envio
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Upload Button */}
                                <div className="flex justify-end">
                                    <Button 
                                        onClick={handleUpload}
                                        disabled={!selectedFile || isUploading}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                        size="lg"
                                    >
                                        {isUploading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Enviando...
                                            </>
                                        ) : (
                                            <>
                                                Enviar Comprovante
                                                <Upload className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Help Section */}
                    <Card className="bg-gray-50 border-gray-200">
                        <CardContent className="pt-6">
                            <div className="text-center space-y-2">
                                <h3 className="font-semibold text-gray-900">Problemas com o Upload?</h3>
                                <p className="text-sm text-gray-600">
                                    Se você estiver com dificuldades para enviar o comprovante, 
                                    entre em contato com a administração da IFMSA Brazil.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
} 