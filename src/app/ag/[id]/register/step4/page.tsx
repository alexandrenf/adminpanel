"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../components/ui/card";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import { Badge } from "../../../../../components/ui/badge";
import { Textarea } from "../../../../../components/ui/textarea";
import { Checkbox } from "../../../../../components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "../../../../../components/ui/alert";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../../../../components/ui/select";
import { 
    CreditCard, 
    Upload, 
    FileText, 
    CheckCircle, 
    Calendar, 
    Users, 
    MapPin,
    AlertTriangle,
    Image,
    X,
    Loader2,
    ArrowLeft,
    Copy,
    Package,
    RefreshCw
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { useToast } from "~/components/ui/use-toast";
import { api as convexApi } from "../../../../../../convex/_generated/api";
import { isIfmsaEmailSession } from "~/server/lib/authcheck";
import PrecisaLogin from "~/app/_components/PrecisaLogin";
import { handleNewRegistration, handleRegistrationApproval } from "~/app/actions/emailExamples";

// Registration form data types (from previous steps)
type Step1FormData = {
    nome: string;
    email: string;
    emailSolar: string;
    dataNascimento: string;
    cpf: string;
    nomeCracha: string;
    celular: string;
    uf: string;
    cidade: string;
    role: string;
    comiteLocal?: string;
    comiteAspirante?: string;
    selectedEBId?: string;
    selectedCRId?: string;
    autorizacaoCompartilhamento: boolean;
    selectedModalityId?: string;
    isResubmission?: boolean;
    resubmitRegistrationId?: string;
};

type Step2FormData = {
    dietaRestricoes: string;
    alergias: string;
    medicamentos: string;
    necessidadesEspeciais: string;
    restricaoQuarto: string;
    pronomes: string;
    contatoEmergenciaNome: string;
    contatoEmergenciaTelefone: string;
    outrasObservacoes: string;
    aceitaTermos: boolean;
};

type Step3FormData = {
    nomeCompleto: string;
    cidade: string;
    dataAssinatura: string;
    aceitoCodigo: boolean;
};

// Utility function to format dates without timezone conversion
const formatDateWithoutTimezone = (timestamp: number): string => {
    const date = new Date(timestamp);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
};

export default function AGRegistrationStep4Page() {
    const { data: session } = useSession();
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    
    const assemblyId = params?.id;
    
    const [step1Data, setStep1Data] = useState<Step1FormData | null>(null);
    const [step2Data, setStep2Data] = useState<Step2FormData | null>(null);
    const [step3Data, setStep3Data] = useState<Step3FormData | null>(null);
    const [isPaymentExempt, setIsPaymentExempt] = useState(false);
    const [exemptionReason, setExemptionReason] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Payment states
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    
    // Resubmission states
    const [isResubmitting, setIsResubmitting] = useState(false);
    const [resubmissionReason, setResubmissionReason] = useState("");
    const [resubmitRegistrationId, setResubmitRegistrationId] = useState<string | null>(null);
    
    // Fetch existing registration data for resubmission
    const existingRegistrationData = useQuery(
        convexApi.agRegistrations?.getById,
        resubmitRegistrationId ? { id: resubmitRegistrationId as any } : "skip"
    );
    
    // Fetch assembly data
    const assembly = useQuery(convexApi.assemblies?.getById, assemblyId ? { id: assemblyId as any } : "skip");
    
    // Add AG config query to check global registration settings
    const agConfig = useQuery(convexApi.agConfig?.get);
    
    // Get modalities for this assembly
    const modalities = useQuery(convexApi.registrationModalities?.getByAssembly, { assemblyId: assemblyId as any });
    
    // Get the selected modality
    const selectedModalityData = modalities?.find(m => m._id === step1Data?.selectedModalityId);
    
    // File upload URL mutation
    const generateUploadUrl = useMutation(convexApi.files?.generateUploadUrl);
    
    // Registration mutations
    const createRegistration = useMutation(convexApi.agRegistrations?.createFromForm);
    const resubmitRegistration = useMutation(convexApi.agRegistrations?.resubmit);
    const updateRegistrationReceipt = useMutation(convexApi.agRegistrations?.updatePaymentReceipt);

    // Copy to clipboard function
    const copyToClipboard = useCallback(async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast({
                title: "✅ Copiado!",
                description: "Texto copiado para a área de transferência.",
            });
        } catch (err) {
            toast({
                title: "❌ Erro",
                description: "Não foi possível copiar o texto.",
                variant: "destructive",
            });
        }
    }, [toast]);

    // Format price
    const formatPrice = useCallback((price: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(price / 100);
    }, []);

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

    // Validate form
    const validateForm = useCallback(() => {
        if (!step1Data || !step2Data || !step3Data) {
            toast({
                title: "❌ Erro",
                description: "Dados das etapas anteriores não encontrados.",
                variant: "destructive",
            });
            return false;
        }

        if (!selectedModalityData) {
            toast({
                title: "❌ Erro",
                description: "Modalidade não encontrada.",
                variant: "destructive",
            });
            return false;
        }

        // If payment is required and not exempt, need file
        if (selectedModalityData.price > 0 && !isPaymentExempt && !selectedFile) {
            toast({
                title: "❌ Comprovante obrigatório",
                description: "Por favor, envie o comprovante de pagamento.",
                variant: "destructive",
            });
            return false;
        }

        // If requesting exemption, need reason
        if (isPaymentExempt && !exemptionReason.trim()) {
            toast({
                title: "❌ Motivo obrigatório",
                description: "Por favor, informe o motivo da solicitação de isenção.",
                variant: "destructive",
            });
            return false;
        }

        return true;
    }, [step1Data, step2Data, step3Data, selectedModalityData, isPaymentExempt, selectedFile, exemptionReason, toast]);

    // Handle form submission
    const handleSubmit = useCallback(async () => {
        if (!validateForm()) return;
        
        setIsSubmitting(true);
        try {
            let result;
            let actualRegistrationId;

            if (isResubmitting && resubmitRegistrationId) {
                // Handle resubmission
                console.log('🔍 Handling resubmission for:', resubmitRegistrationId);
                
                result = await resubmitRegistration({
                    registrationId: resubmitRegistrationId as any,
                    updatedPersonalInfo: {
                        nome: step1Data!.nome,
                        email: step1Data!.email,
                        emailSolar: step1Data!.emailSolar,
                        dataNascimento: step1Data!.dataNascimento,
                        cpf: step1Data!.cpf,
                        nomeCracha: step1Data!.nomeCracha,
                        celular: step1Data!.celular,
                        uf: step1Data!.uf,
                        cidade: step1Data!.cidade,
                        role: step1Data!.role,
                        comiteLocal: step1Data!.comiteLocal,
                        comiteAspirante: step1Data!.comiteAspirante,
                        selectedEBId: step1Data!.selectedEBId,
                        selectedCRId: step1Data!.selectedCRId,
                        autorizacaoCompartilhamento: step1Data!.autorizacaoCompartilhamento,
                    },
                    updatedAdditionalInfo: {
                        experienciaAnterior: "", // Empty since removed
                        motivacao: "Não especificado", // Default value since removed but still required by API
                        expectativas: "", // Empty since removed
                        dietaRestricoes: step2Data!.dietaRestricoes,
                        alergias: step2Data!.alergias,
                        medicamentos: step2Data!.medicamentos,
                        necessidadesEspeciais: step2Data!.necessidadesEspeciais,
                        restricaoQuarto: step2Data!.restricaoQuarto,
                        pronomes: step2Data!.pronomes,
                        contatoEmergenciaNome: step2Data!.contatoEmergenciaNome,
                        contatoEmergenciaTelefone: step2Data!.contatoEmergenciaTelefone,
                        outrasObservacoes: step2Data!.outrasObservacoes,
                        participacaoComites: [], // Empty array since removed
                        interesseVoluntariado: false, // Default since removed
                    },
                    resubmissionNote: "Resubmissão com dados atualizados via formulário completo",
                });

                actualRegistrationId = typeof result === 'string' ? result : result.registrationId;
                console.log('✅ Resubmission completed:', actualRegistrationId);
            } else {
                // Handle new registration
            const registrationData = {
                assemblyId: assemblyId as any,
                modalityId: step1Data!.selectedModalityId as any,
                    userId: session!.user!.id,
                personalInfo: {
                    nome: step1Data!.nome,
                    email: step1Data!.email,
                    emailSolar: step1Data!.emailSolar,
                    dataNascimento: step1Data!.dataNascimento,
                    cpf: step1Data!.cpf,
                    nomeCracha: step1Data!.nomeCracha,
                    celular: step1Data!.celular,
                    uf: step1Data!.uf,
                    cidade: step1Data!.cidade,
                    role: step1Data!.role,
                    comiteLocal: step1Data!.comiteLocal,
                    comiteAspirante: step1Data!.comiteAspirante,
                    selectedEBId: step1Data!.selectedEBId,
                    selectedCRId: step1Data!.selectedCRId,
                    autorizacaoCompartilhamento: step1Data!.autorizacaoCompartilhamento,
                },
                additionalInfo: {
                    experienciaAnterior: "", // Empty since removed
                    motivacao: "Não especificado", // Default value since removed but still required by API
                    expectativas: "", // Empty since removed
                    dietaRestricoes: step2Data!.dietaRestricoes,
                    alergias: step2Data!.alergias,
                    medicamentos: step2Data!.medicamentos,
                    necessidadesEspeciais: step2Data!.necessidadesEspeciais,
                    restricaoQuarto: step2Data!.restricaoQuarto,
                    pronomes: step2Data!.pronomes,
                    contatoEmergenciaNome: step2Data!.contatoEmergenciaNome,
                    contatoEmergenciaTelefone: step2Data!.contatoEmergenciaTelefone,
                    outrasObservacoes: step2Data!.outrasObservacoes,
                    participacaoComites: [], // Empty array since removed
                    interesseVoluntariado: false, // Default since removed
                },
                paymentInfo: isPaymentExempt ? {
                    isPaymentExempt: true,
                    paymentExemptReason: exemptionReason,
                } : undefined,
                status: "pending" as const,
            };

                result = await createRegistration(registrationData);
                actualRegistrationId = typeof result === 'string' ? result : result.registrationId;
            }

            // Send appropriate email based on whether it was auto-approved
            try {
                // Add null checks for safety
                if (!assembly || !selectedModalityData) {
                    console.warn('⚠️ Cannot send email: missing assembly or modality data');
                    return;
                }

                // Check if registration was auto-approved
                const isAutoApproved = typeof result === 'object' && result.isAutoApproved;
                
                if (isAutoApproved) {
                    // Send approval email for auto-approved registrations/resubmissions
                    await handleRegistrationApproval({
                        registrationId: actualRegistrationId as string,
                        assemblyId: assemblyId as string,
                        participantName: step1Data!.nome,
                        participantEmail: step1Data!.email,
                        assemblyName: assembly.name,
                        assemblyLocation: assembly.location,
                        assemblyStartDate: new Date(assembly.startDate),
                        assemblyEndDate: new Date(assembly.endDate),
                        modalityName: selectedModalityData.name,
                        additionalInstructions: isResubmitting ? 
                            "Sua resubmissão foi aprovada automaticamente. Bem-vindo(a)!" : 
                            "Sua inscrição foi aprovada automaticamente. Bem-vindo(a)!",
                        paymentAmount: selectedModalityData.price > 0 ? 
                            selectedModalityData.price / 100 : undefined,
                        isPaymentExempt: isPaymentExempt || selectedModalityData.price === 0,
                        paymentExemptReason: exemptionReason
                    });
                    console.log('✅ Auto-approval email sent successfully');
                } else {
                    // Send confirmation email for regular registrations/resubmissions
                await handleNewRegistration({
                        registrationId: actualRegistrationId as string,
                    participantName: step1Data!.nome,
                    participantEmail: step1Data!.email,
                    assemblyName: assembly.name,
                    assemblyLocation: assembly.location,
                    assemblyStartDate: new Date(assembly.startDate),
                    assemblyEndDate: new Date(assembly.endDate),
                    modalityName: selectedModalityData.name,
                    paymentRequired: selectedModalityData.price > 0,
                    paymentAmount: selectedModalityData.price > 0 ? selectedModalityData.price / 100 : undefined,
                    isPaymentExempt: isPaymentExempt,
                    paymentExemptReason: exemptionReason
                });
                console.log('✅ Confirmation email sent successfully');
                }
            } catch (emailError) {
                console.error('⚠️ Failed to send email:', emailError);
                // Don't fail the registration if email fails
            }

            // If payment receipt was uploaded, attach it to the registration
            if (selectedFile && !isPaymentExempt) {
                setIsUploading(true);
                
                // Generate upload URL
                const uploadUrl = await generateUploadUrl();
                
                // Upload file to Convex
                const uploadResult = await fetch(uploadUrl, {
                    method: "POST",
                    headers: { "Content-Type": selectedFile.type },
                    body: selectedFile,
                });
                
                if (!uploadResult.ok) {
                    throw new Error("Failed to upload file");
                }
                
                const { storageId } = await uploadResult.json();
                
                // Update registration with receipt
                await updateRegistrationReceipt({
                    registrationId: actualRegistrationId as any,
                    receiptStorageId: storageId,
                    receiptFileName: selectedFile.name,
                    receiptFileType: selectedFile.type,
                    receiptFileSize: selectedFile.size,
                    uploadedBy: session!.user!.id,
                });
            }
            
            toast({
                title: "✅ Sucesso!",
                description: isResubmitting ? 
                    "Inscrição resubmetida com sucesso!" : 
                    "Inscrição realizada com sucesso!",
            });
            
            // Clear session storage
            sessionStorage.removeItem('agRegistrationStep1');
            sessionStorage.removeItem('agRegistrationStep2');
            sessionStorage.removeItem('agRegistrationStep3');
            
            // Navigate to success page
            router.push(`/ag/${assemblyId}/register/success/${actualRegistrationId}`);
            
        } catch (error) {
            console.error("Error with registration:", error);
            toast({
                title: "❌ Erro",
                description: isResubmitting ? 
                    "Erro ao reenviar inscrição. Tente novamente." : 
                    "Erro ao finalizar inscrição. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
            setIsUploading(false);
        }
    }, [validateForm, session?.user?.id, assemblyId, step1Data, step2Data, step3Data, isPaymentExempt, exemptionReason, selectedFile, isResubmitting, resubmitRegistrationId, createRegistration, resubmitRegistration, generateUploadUrl, updateRegistrationReceipt, toast, router, assembly, selectedModalityData]);

    // Load previous steps data from session storage
    useEffect(() => {
        const savedStep1Data = sessionStorage.getItem('agRegistrationStep1');
        const savedStep2Data = sessionStorage.getItem('agRegistrationStep2');
        const savedStep3Data = sessionStorage.getItem('agRegistrationStep3');
        
        if (savedStep1Data && savedStep2Data && savedStep3Data) {
            try {
                const parsedStep1Data = JSON.parse(savedStep1Data) as Step1FormData;
                const parsedStep2Data = JSON.parse(savedStep2Data) as Step2FormData;
                const parsedStep3Data = JSON.parse(savedStep3Data) as Step3FormData;
                setStep1Data(parsedStep1Data);
                setStep2Data(parsedStep2Data);
                setStep3Data(parsedStep3Data);
                
                // Check if this is a resubmission
                if (parsedStep1Data.isResubmission && parsedStep1Data.resubmitRegistrationId) {
                    setIsResubmitting(true);
                    setResubmitRegistrationId(parsedStep1Data.resubmitRegistrationId);
                }
            } catch (error) {
                console.error("Error parsing saved data:", error);
                toast({
                    title: "❌ Erro",
                    description: "Dados das etapas anteriores não encontrados. Redirecionando...",
                    variant: "destructive",
                });
                router.push(`/ag/${assemblyId}/register`);
            }
        } else {
            toast({
                title: "❌ Erro",
                description: "Dados das etapas anteriores não encontrados. Redirecionando...",
                variant: "destructive",
            });
            router.push(`/ag/${assemblyId}/register`);
        }
    }, [assemblyId, router, toast]);

    // Load existing registration data for resubmission
    useEffect(() => {
        if (isResubmitting && existingRegistrationData) {
            setResubmissionReason(existingRegistrationData.reviewNotes || "Não especificado");
            
            // Pre-populate payment exemption if it was previously set
            if (existingRegistrationData.isPaymentExempt) {
                setIsPaymentExempt(true);
                setExemptionReason(existingRegistrationData.paymentExemptReason || "");
            }
        }
    }, [isResubmitting, existingRegistrationData]);

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

    if (!assembly || !step1Data || !step2Data || !step3Data || !modalities || !selectedModalityData) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando...</p>
                </div>
            </main>
        );
    }

    // Check if registrations are globally disabled
    if (agConfig && !agConfig.registrationEnabled) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Inscrições Desabilitadas</h1>
                    <p className="text-gray-600 mb-4">
                        As inscrições para assembleias gerais estão temporariamente desabilitadas.
                    </p>
                    <Button onClick={() => router.push("/ag")}>
                        Voltar às Assembleias
                    </Button>
                </div>
            </main>
        );
    }

    // Check if registration is closed for this assembly
    if (!assembly.registrationOpen) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Inscrições Fechadas</h1>
                    <p className="text-gray-600 mb-4">
                        As inscrições para esta assembleia estão fechadas.
                    </p>
                    <Button onClick={() => router.push("/ag")}>
                        Voltar às Assembleias
                    </Button>
                </div>
            </main>
        );
    }

    // Check if payment is needed
    const needsPayment = selectedModalityData.price > 0;

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="container mx-auto px-6 py-12">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center space-x-4">
                            <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                                <CreditCard className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                                    Inscrição - {assembly.name}
                                </h1>
                                <p className="text-gray-600">Etapa 4 de 4: Pagamento e Finalização</p>
                            </div>
                        </div>
                        
                        {/* Assembly Info */}
                        <Card className="bg-blue-50 border-blue-200">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-center space-x-6 text-sm">
                                    <div className="flex items-center space-x-2">
                                        <Calendar className="w-4 h-4 text-blue-600" />
                                        <span>
                                            {formatDateWithoutTimezone(assembly.startDate)} - {" "}
                                            {formatDateWithoutTimezone(assembly.endDate)}
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

                    {/* Back Button */}
                    <div>
                        <Button 
                            variant="outline" 
                            onClick={() => router.push(`/ag/${assemblyId}/register/step3`)}
                            className="flex items-center space-x-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Voltar</span>
                        </Button>
                    </div>

                    {/* Resubmission Alert */}
                    {isResubmitting && (
                        <Alert className="border-orange-200 bg-orange-50">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            <AlertTitle className="text-orange-800">Reenvio de Inscrição</AlertTitle>
                            <AlertDescription className="text-orange-700">
                                <div className="space-y-2">
                                    <p><strong>Motivo da rejeição:</strong> {resubmissionReason || "Não especificado"}</p>
                                    <p>Você pode revisar e alterar qualquer informação antes de reenviar sua inscrição.</p>
                                    <div className="flex items-center gap-2 text-sm mt-2">
                                        <RefreshCw className="h-3 w-3" />
                                        <span>Reenvio da Inscrição #{resubmitRegistrationId?.slice(-8)}</span>
                                    </div>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Modality Info */}
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Package className="w-5 h-5 text-purple-600" />
                                <span>Modalidade Selecionada</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div>
                                    <Label className="font-semibold text-gray-700">Modalidade:</Label>
                                    <p>{selectedModalityData.name}</p>
                                </div>
                                <div>
                                    <Label className="font-semibold text-gray-700">Descrição:</Label>
                                    <p className="text-sm text-gray-600">{selectedModalityData.description}</p>
                                </div>
                                <div>
                                    <Label className="font-semibold text-gray-700">Valor:</Label>
                                    <div className="flex items-center space-x-2">
                                        <Badge variant={selectedModalityData.price === 0 ? "secondary" : "default"} className="text-lg">
                                            {selectedModalityData.price === 0 ? "GRATUITO" : formatPrice(selectedModalityData.price)}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {needsPayment ? (
                        <>
                            {/* Payment Information */}
                            <Card className="shadow-lg border-0">
                                <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                                        <CreditCard className="w-5 h-5 text-green-600" />
                                        <span>Informações de Pagamento</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-6">
                                        {/* General Payment Info */}
                                        {agConfig?.paymentInfo && (
                                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                <h3 className="font-semibold text-blue-900 mb-3">ℹ️ Informações Gerais</h3>
                                                <div className="whitespace-pre-line text-sm text-blue-800">
                                                    {agConfig.paymentInfo}
                                                </div>
                                            </div>
                                        )}

                                        {/* PIX Payment */}
                                        {agConfig?.pixKey && (
                                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                                <h3 className="font-semibold text-green-900 mb-3">💳 Pagamento via PIX (Recomendado)</h3>
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
                                                                {formatPrice(selectedModalityData.price)}
                                                            </code>
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline"
                                                                onClick={() => copyToClipboard(formatPrice(selectedModalityData.price))}
                                                            >
                                                                <Copy className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Bank Transfer Details */}
                                        {agConfig?.bankDetails && (
                                            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                                <h3 className="font-semibold text-purple-900 mb-3">🏦 Dados Bancários</h3>
                                                <div className="whitespace-pre-line text-sm text-purple-800">
                                                    {agConfig.bankDetails}
                                                </div>
                                            </div>
                                        )}

                                        {/* Payment Instructions */}
                                        {agConfig?.paymentInstructions && (
                                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                                <h3 className="font-semibold text-amber-900 mb-3">📋 Instruções Detalhadas</h3>
                                                <div className="whitespace-pre-line text-sm text-amber-800">
                                                    {agConfig.paymentInstructions}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Payment Exemption Option */}
                                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                            <div className="flex items-start space-x-3">
                                                <Checkbox
                                                    id="isPaymentExempt"
                                                    checked={isPaymentExempt}
                                                    onCheckedChange={(checked) => setIsPaymentExempt(checked === true)}
                                                />
                                                <div className="flex-1">
                                                    <Label htmlFor="isPaymentExempt" className="font-medium">
                                                        Solicitar Isenção de Pagamento
                                                    </Label>
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        Marque esta opção se você possui direito à isenção de pagamento.
                                                    </p>
                                                    {isPaymentExempt && (
                                                        <div className="mt-3">
                                                            <Label htmlFor="exemptionReason">Motivo da Isenção *</Label>
                                                            <Select value={exemptionReason} onValueChange={setExemptionReason}>
                                                                <SelectTrigger className="mt-1">
                                                                    <SelectValue placeholder="Selecione o motivo da isenção..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="diretoria_executiva">
                                                                        Faço parte da diretoria executiva em um cargo nacional (EB)
                                                                    </SelectItem>
                                                                    <SelectItem value="coordenador_regional">
                                                                        Sou um Coordenador Regional
                                                                    </SelectItem>
                                                                    <SelectItem value="edital_vulnerabilidade">
                                                                        Fui selecionado pelo edital de vulnerabilidade
                                                                    </SelectItem>
                                                                    <SelectItem value="CRED">
                                                                        Sou Co-Presidente da CRED
                                                                    </SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* File Upload - Only show if not requesting exemption */}
                            {!isPaymentExempt && (
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
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    ) : (
                        /* Free Registration */
                        <Card className="bg-green-50 border-green-200">
                            <CardContent className="pt-6">
                                <div className="flex items-center space-x-3">
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                    <div>
                                        <h3 className="font-semibold text-green-900">Modalidade Gratuita!</h3>
                                        <p className="text-sm text-green-700">
                                            Esta modalidade não requer pagamento. Clique em finalizar para completar sua inscrição.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Final Submit Button */}
                    <div className="flex justify-center">
                        <Button 
                            onClick={handleSubmit}
                            disabled={isSubmitting || isUploading}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                            size="lg"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Finalizando Inscrição...
                                </>
                            ) : (
                                <>
                                    Finalizar Inscrição
                                    <CheckCircle className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Help Section */}
                    <Card className="bg-gray-50 border-gray-200">
                        <CardContent className="pt-6">
                            <div className="text-center space-y-2">
                                <h3 className="font-semibold text-gray-900">Precisa de Ajuda?</h3>
                                <p className="text-sm text-gray-600">
                                    Se você estiver com dificuldades para finalizar sua inscrição, 
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