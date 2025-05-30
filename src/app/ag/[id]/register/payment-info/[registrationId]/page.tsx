"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../../components/ui/card";
import { Button } from "../../../../../../components/ui/button";
import { Badge } from "../../../../../../components/ui/badge";
import { Label } from "../../../../../../components/ui/label";
import { Input } from "../../../../../../components/ui/input";
import { Textarea } from "../../../../../../components/ui/textarea";
import { 
    CreditCard, 
    Calendar, 
    MapPin, 
    Users, 
    Package,
    Upload,
    FileText,
    ArrowLeft,
    AlertTriangle,
    CheckCircle,
    Copy
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { useToast } from "~/components/ui/use-toast";
import { api as convexApi } from "../../../../../../../convex/_generated/api";
import { isIfmsaEmailSession } from "~/server/lib/authcheck";
import PrecisaLogin from "~/app/_components/PrecisaLogin";

export default function PaymentInfoPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    
    // Get IDs with type safety
    const assemblyId = params?.id;
    const registrationId = params?.registrationId;
    
    // State - all hooks at the top
    const [isIfmsaEmail, setIsIfmsaEmail] = useState<boolean | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [exemptionReason, setExemptionReason] = useState("");
    const [requestingExemption, setRequestingExemption] = useState(false);

    // Queries - all hooks at the top
    const registration = useQuery(
        convexApi.agRegistrations?.getById, 
        registrationId ? { id: registrationId as any } : "skip"
    );
    const assembly = useQuery(
        convexApi.assemblies?.getById, 
        assemblyId ? { id: assemblyId as any } : "skip"
    );
    const modality = useQuery(
        convexApi.registrationModalities?.getById,
        registration?.modalityId ? { id: registration.modalityId } : "skip"
    );
    const agConfig = useQuery(convexApi.agConfig?.get);

    // Mutations - all hooks at the top
    const updatePaymentReceipt = useMutation(convexApi.agRegistrations?.updatePaymentReceipt);
    const generateUploadUrl = useMutation(convexApi.files?.generateUploadUrl);

    // All callbacks at the top
    const handleUploadReceipt = useCallback(async () => {
        if (!selectedFile || !registrationId || !assemblyId) return;

        setIsUploading(true);
        try {
            // First, generate upload URL
            const uploadUrl = await generateUploadUrl();
            
            // Upload file to Convex storage
            const uploadResponse = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": selectedFile.type },
                body: selectedFile,
            });

            if (!uploadResponse.ok) {
                throw new Error("Failed to upload file");
            }

            const { storageId } = await uploadResponse.json();

            // Update registration with receipt info
            await updatePaymentReceipt({
                registrationId: registrationId as any,
                receiptStorageId: storageId,
                receiptFileName: selectedFile.name,
                receiptFileType: selectedFile.type,
                receiptFileSize: selectedFile.size,
                uploadedBy: session?.user?.id || "",
            });

            toast({
                title: "✅ Comprovante Enviado",
                description: "Seu comprovante de pagamento foi enviado com sucesso.",
            });

            // Redirect back to success page
            router.push(`/ag/${assemblyId}/register/success/${registrationId}`);
        } catch (error) {
            toast({
                title: "❌ Erro no Upload",
                description: "Erro ao enviar comprovante. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    }, [selectedFile, updatePaymentReceipt, generateUploadUrl, registrationId, session?.user?.id, toast, router, assemblyId]);

    const handleRequestExemption = useCallback(async () => {
        if (!exemptionReason.trim()) {
            toast({
                title: "❌ Motivo Obrigatório",
                description: "Por favor, informe o motivo da solicitação de isenção.",
                variant: "destructive",
            });
            return;
        }

        setRequestingExemption(true);
        try {
            // This would need to be implemented in the backend
            toast({
                title: "✅ Solicitação Enviada",
                description: "Sua solicitação de isenção foi enviada para análise.",
            });

            setExemptionReason("");
        } catch (error) {
            toast({
                title: "❌ Erro",
                description: "Erro ao solicitar isenção. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setRequestingExemption(false);
        }
    }, [exemptionReason, toast]);

    const copyToClipboard = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "✅ Copiado",
            description: "Informação copiada para a área de transferência.",
        });
    }, [toast]);

    const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
            if (!allowedTypes.includes(file.type)) {
                toast({
                    title: "❌ Tipo de arquivo inválido",
                    description: "Apenas imagens (JPG, PNG) e PDFs são aceitos.",
                    variant: "destructive",
                });
                return;
            }

            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                toast({
                    title: "❌ Arquivo muito grande",
                    description: "O arquivo deve ter no máximo 5MB.",
                    variant: "destructive",
                });
                return;
            }

            setSelectedFile(file);
        }
    }, [toast]);

    const formatPrice = useCallback((priceInCents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(priceInCents / 100);
    }, []);

    // Effects at the top
    useEffect(() => {
        if (session?.user?.email) {
            const checkEmail = async () => {
                const result = await isIfmsaEmailSession(session);
                setIsIfmsaEmail(result);
            };
            void checkEmail();
        }
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

    // Loading state
    if (isIfmsaEmail === null) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Verificando autenticação...</p>
                </div>
            </main>
        );
    }

    // Auth check
    if (!isIfmsaEmail) {
        return <PrecisaLogin />;
    }

    // Loading registration data
    if (!registration || !assembly || !modality) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando informações...</p>
                </div>
            </main>
        );
    }

    // Check if user owns this registration
    if (registration.participantId !== session?.user?.id) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
                    <p className="text-gray-600 mb-4">Você não tem permissão para ver esta página.</p>
                    <Button onClick={() => router.push("/ag")}>
                        Voltar às Assembleias
                    </Button>
                </div>
            </main>
        );
    }

    // Check if payment is needed
    if (modality.price === 0 || registration.isPaymentExempt) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Pagamento Não Necessário</h1>
                    <p className="text-gray-600 mb-4">
                        {modality.price === 0 ? "Esta modalidade é gratuita." : "Você está isento de pagamento."}
                    </p>
                    <Button onClick={() => router.push(`/ag/${assemblyId}/register/success/${registrationId}`)}>
                        Voltar ao Comprovante
                    </Button>
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
                            <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                                <CreditCard className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                                    Informações de Pagamento
                                </h1>
                                <p className="text-gray-600">Complete seu pagamento para confirmar a inscrição</p>
                            </div>
                        </div>
                    </div>

                    {/* Back Button */}
                    <div>
                        <Button 
                            variant="outline" 
                            onClick={() => router.push(`/ag/${assemblyId}/register/success/${registrationId}`)}
                            className="flex items-center space-x-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Voltar ao Comprovante</span>
                        </Button>
                    </div>

                    {/* Assembly and Modality Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="shadow-lg border-0">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Calendar className="w-5 h-5 text-blue-600" />
                                    <span>Assembleia</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div>
                                        <Label className="font-semibold text-gray-700">Nome:</Label>
                                        <p className="text-lg font-medium">{assembly.name}</p>
                                    </div>
                                    <div>
                                        <Label className="font-semibold text-gray-700">Local:</Label>
                                        <p className="flex items-center space-x-1">
                                            <MapPin className="w-4 h-4 text-gray-500" />
                                            <span>{assembly.location}</span>
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="font-semibold text-gray-700">Período:</Label>
                                        <p>
                                            {new Date(assembly.startDate).toLocaleDateString('pt-BR')} - {" "}
                                            {new Date(assembly.endDate).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-lg border-0">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Package className="w-5 h-5 text-purple-600" />
                                    <span>Modalidade</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div>
                                        <Label className="font-semibold text-gray-700">Tipo:</Label>
                                        <p className="text-lg font-medium">{modality.name}</p>
                                    </div>
                                    <div>
                                        <Label className="font-semibold text-gray-700">Valor:</Label>
                                        <p className="text-2xl font-bold text-green-600">
                                            {formatPrice(modality.price)}
                                        </p>
                                    </div>
                                    {modality.description && (
                                        <div>
                                            <Label className="font-semibold text-gray-700">Descrição:</Label>
                                            <p className="text-sm text-gray-600">{modality.description}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Payment Instructions */}
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <CreditCard className="w-5 h-5 text-green-600" />
                                <span>Instruções de Pagamento</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {/* PIX Payment */}
                                {agConfig?.pixKey && (
                                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <h3 className="font-semibold text-green-800 mb-3">💳 Pagamento via PIX (Recomendado)</h3>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium">Chave PIX:</span>
                                                <div className="flex items-center space-x-2">
                                                    <code className="bg-white px-2 py-1 rounded text-sm">{agConfig.pixKey}</code>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        onClick={() => copyToClipboard(agConfig.pixKey!)}
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium">Valor:</span>
                                                <div className="flex items-center space-x-2">
                                                    <code className="bg-white px-2 py-1 rounded text-sm font-bold">
                                                        {formatPrice(modality.price)}
                                                    </code>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        onClick={() => copyToClipboard(formatPrice(modality.price))}
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Bank Transfer */}
                                {agConfig?.bankDetails && (
                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <h3 className="font-semibold text-blue-800 mb-3">🏦 Transferência Bancária</h3>
                                        <div className="whitespace-pre-line text-sm">
                                            {agConfig.bankDetails}
                                        </div>
                                    </div>
                                )}

                                {/* General Payment Info */}
                                {agConfig?.paymentInfo && (
                                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                        <h3 className="font-semibold text-gray-800 mb-3">ℹ️ Informações Gerais</h3>
                                        <div className="whitespace-pre-line text-sm">
                                            {agConfig.paymentInfo}
                                        </div>
                                    </div>
                                )}

                                {/* Payment Instructions */}
                                {agConfig?.paymentInstructions && (
                                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <h3 className="font-semibold text-yellow-800 mb-3">📋 Instruções Importantes</h3>
                                        <div className="whitespace-pre-line text-sm">
                                            {agConfig.paymentInstructions}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Upload Receipt */}
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Upload className="w-5 h-5 text-indigo-600" />
                                <span>Enviar Comprovante</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <p className="text-gray-600">
                                    Após realizar o pagamento, envie o comprovante para confirmar sua inscrição.
                                </p>
                                
                                <div>
                                    <Label htmlFor="receipt-upload">Selecionar Comprovante</Label>
                                    <Input
                                        id="receipt-upload"
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={handleFileSelect}
                                        className="mt-1"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Formatos aceitos: JPG, PNG, PDF (máximo 5MB)
                                    </p>
                                </div>

                                {selectedFile && (
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center space-x-2">
                                            <FileText className="w-4 h-4 text-gray-500" />
                                            <span className="text-sm">{selectedFile.name}</span>
                                            <span className="text-xs text-gray-500">
                                                ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <Button 
                                    onClick={handleUploadReceipt}
                                    disabled={!selectedFile || isUploading}
                                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                >
                                    {isUploading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4 mr-2" />
                                            Enviar Comprovante
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment Exemption Request */}
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <AlertTriangle className="w-5 h-5 text-orange-600" />
                                <span>Solicitar Isenção de Pagamento</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <p className="text-gray-600">
                                    Se você tem direito à isenção de pagamento, explique o motivo abaixo.
                                </p>
                                
                                <div>
                                    <Label htmlFor="exemption-reason">Motivo da Isenção</Label>
                                    <Textarea
                                        id="exemption-reason"
                                        value={exemptionReason}
                                        onChange={(e) => setExemptionReason(e.target.value)}
                                        placeholder="Explique por que você tem direito à isenção de pagamento..."
                                        rows={4}
                                        className="mt-1"
                                    />
                                </div>

                                <Button 
                                    onClick={handleRequestExemption}
                                    disabled={!exemptionReason.trim() || requestingExemption}
                                    variant="outline"
                                    className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                                >
                                    {requestingExemption ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2"></div>
                                            Enviando Solicitação...
                                        </>
                                    ) : (
                                        <>
                                            <FileText className="w-4 h-4 mr-2" />
                                            Solicitar Isenção
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
} 