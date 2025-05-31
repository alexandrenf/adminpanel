"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../components/ui/card";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import { Checkbox } from "../../../../../components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "../../../../../components/ui/alert";
import { 
    FileText, 
    ArrowLeft, 
    CheckCircle, 
    Calendar, 
    Users, 
    MapPin,
    AlertTriangle,
    Download,
    PenTool,
    ArrowRight,
    RefreshCw
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { useToast } from "~/components/ui/use-toast";
import { api as convexApi } from "../../../../../../convex/_generated/api";
import { isIfmsaEmailSession } from "~/server/lib/authcheck";
import PrecisaLogin from "~/app/_components/PrecisaLogin";

// Registration form data type (from step 1)
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
    autorizacaoCompartilhamento: boolean;
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

// Step 3 form data
type Step3FormData = {
    nomeCompleto: string;
    cidade: string;
    dataAssinatura: string;
    aceitoCodigo: boolean;
};

const initialStep3FormData: Step3FormData = {
    nomeCompleto: "",
    cidade: "",
    dataAssinatura: new Date().toLocaleDateString('pt-BR'),
    aceitoCodigo: false,
};

// Utility function to format dates without timezone conversion
const formatDateWithoutTimezone = (timestamp: number): string => {
    const date = new Date(timestamp);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
};

export default function AGRegistrationStep3Page() {
    const { data: session } = useSession();
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    
    const assemblyId = params?.id;
    
    const [step1Data, setStep1Data] = useState<Step1FormData | null>(null);
    const [step2Data, setStep2Data] = useState<Step2FormData | null>(null);
    const [formData, setFormData] = useState<Step3FormData>(initialStep3FormData);
    
    // Check if this is a resubmission
    const [isResubmission, setIsResubmission] = useState(false);
    const [resubmitRegistrationId, setResubmitRegistrationId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState<string>("");
    
    // Fetch assembly data
    const assembly = useQuery(convexApi.assemblies?.getById, assemblyId ? { id: assemblyId as any } : "skip");

    // Fetch existing registration data for resubmission
    const existingRegistrationData = useQuery(
        convexApi.agRegistrations?.getById,
        resubmitRegistrationId ? { id: resubmitRegistrationId as any } : "skip"
    );

    // Add AG config query to check global registration settings
    const agConfig = useQuery(convexApi.agConfig?.get);

    // Handle input changes
    const handleInputChange = useCallback((field: keyof Step3FormData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    // Validate form
    const validateForm = useCallback(() => {
        if (!formData.nomeCompleto.trim()) {
            toast({
                title: "❌ Erro",
                description: "O nome completo é obrigatório.",
                variant: "destructive",
            });
            return false;
        }

        if (!formData.cidade.trim()) {
            toast({
                title: "❌ Erro",
                description: "A cidade é obrigatória.",
                variant: "destructive",
            });
            return false;
        }

        if (!formData.aceitoCodigo) {
            toast({
                title: "❌ Erro",
                description: "É necessário aceitar o Código de Conduta.",
                variant: "destructive",
            });
            return false;
        }

        return true;
    }, [formData, toast]);

    // Handle form submission
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm() || !step1Data || !step2Data) return;
        
        // Save step3 data to session storage
        sessionStorage.setItem('agRegistrationStep3', JSON.stringify({
            nomeCompleto: formData.nomeCompleto,
            cidade: formData.cidade,
            dataAssinatura: formData.dataAssinatura,
            aceitoCodigo: formData.aceitoCodigo,
        }));
        
        // Navigate to step 4 (payment)
        router.push(`/ag/${assemblyId}/register/step4`);
        
    }, [validateForm, step1Data, step2Data, formData, assemblyId, router]);

    // Load previous steps data from session storage
    useEffect(() => {
        const savedStep1Data = sessionStorage.getItem('agRegistrationStep1');
        const savedStep2Data = sessionStorage.getItem('agRegistrationStep2');
        
        if (savedStep1Data && savedStep2Data) {
            try {
                const parsedStep1Data = JSON.parse(savedStep1Data) as Step1FormData;
                const parsedStep2Data = JSON.parse(savedStep2Data) as Step2FormData;
                setStep1Data(parsedStep1Data);
                setStep2Data(parsedStep2Data);
                
                // Check if this is a resubmission
                if (parsedStep1Data.isResubmission && parsedStep1Data.resubmitRegistrationId) {
                    setIsResubmission(true);
                    setResubmitRegistrationId(parsedStep1Data.resubmitRegistrationId);
                }
                
                // Pre-populate form with user data
                setFormData(prev => ({
                    ...prev,
                    nomeCompleto: parsedStep1Data.nome,
                    cidade: parsedStep1Data.cidade,
                }));
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
        if (isResubmission && existingRegistrationData) {
            setRejectionReason(existingRegistrationData.reviewNotes || "Não especificado");
            
            // Get today's date as string
            const today = new Date().toISOString().split('T')[0] || '';
            
            // Pre-populate form with existing data
            setFormData(prev => ({
                ...prev,
                nomeCompleto: existingRegistrationData.participantName || prev.nomeCompleto,
                cidade: existingRegistrationData.cidade || prev.cidade,
                dataAssinatura: today,
                aceitoCodigo: false, // Always require re-acceptance
            }));
        }
    }, [isResubmission, existingRegistrationData]);

    // Show error if assemblyId is missing
    if (!assemblyId) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600">Erro</h1>
                    <p className="mt-2">ID da assembleia não encontrado.</p>
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

    if (!assembly || !step1Data || !step2Data) {
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

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="container mx-auto px-6 py-12">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                                <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                                    Inscrição - {assembly.name}
                                </h1>
                                <p className="text-gray-600">Etapa 3 de 4: Código de Conduta</p>
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

                    {/* Resubmission Alert */}
                    {isResubmission && (
                        <Alert className="border-orange-200 bg-orange-50">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            <AlertTitle className="text-orange-800">Reenvio de Inscrição</AlertTitle>
                            <AlertDescription className="text-orange-700">
                                <div className="space-y-2">
                                    <p><strong>Motivo da rejeição:</strong> {rejectionReason}</p>
                                    <p>Você pode alterar qualquer informação abaixo antes de reenviar sua inscrição.</p>
                                    <div className="flex items-center gap-2 text-sm mt-2">
                                        <RefreshCw className="h-3 w-3" />
                                        <span>Reenvio da Inscrição #{resubmitRegistrationId?.slice(-8)}</span>
                                    </div>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Code of Conduct */}
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center">
                                <FileText className="w-5 h-5 text-purple-600 mr-2" />
                                Código de Conduta
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {/* PDF Download Section */}
                                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold text-purple-900">Código de Conduta IFMSA Brazil</h3>
                                            <p className="text-sm text-purple-700">
                                                Baixe e leia o código de conduta antes de prosseguir com a assinatura.
                                            </p>
                                        </div>
                                        {agConfig?.codeOfConductUrl ? (
                                            <Button 
                                                variant="outline" 
                                                className="border-purple-300 text-purple-700 hover:bg-purple-50"
                                                onClick={() => window.open(agConfig.codeOfConductUrl, '_blank')}
                                                type="button"
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                Baixar PDF
                                            </Button>
                                        ) : (
                                            <Button 
                                                variant="outline" 
                                                className="border-gray-300 text-gray-500"
                                                disabled
                                                type="button"
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                PDF não disponível
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Signature Form */}
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold">Assinatura Digital</h3>
                                        <p className="text-sm text-gray-600">
                                            Para confirmar que você leu e aceita o Código de Conduta, preencha os campos abaixo:
                                        </p>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="nomeCompleto">Nome Completo *</Label>
                                                <Input
                                                    id="nomeCompleto"
                                                    value={formData.nomeCompleto}
                                                    onChange={(e) => handleInputChange('nomeCompleto', e.target.value)}
                                                    placeholder="Digite seu nome completo"
                                                />
                                            </div>
                                            
                                            <div>
                                                <Label htmlFor="cidade">Cidade *</Label>
                                                <Input
                                                    id="cidade"
                                                    value={formData.cidade}
                                                    onChange={(e) => handleInputChange('cidade', e.target.value)}
                                                    placeholder="Digite sua cidade"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <Label htmlFor="dataAssinatura">Data da Assinatura</Label>
                                            <Input
                                                id="dataAssinatura"
                                                value={formData.dataAssinatura}
                                                readOnly
                                                className="bg-gray-50"
                                            />
                                        </div>
                                    </div>

                                    {/* Acceptance Checkbox */}
                                    <div className="space-y-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                        <div className="flex items-start space-x-3">
                                            <Checkbox
                                                id="aceitoCodigo"
                                                checked={formData.aceitoCodigo}
                                                onCheckedChange={(checked) => 
                                                    handleInputChange('aceitoCodigo', checked === true)
                                                }
                                            />
                                            <div className="grid gap-1.5 leading-none">
                                                <Label htmlFor="aceitoCodigo" className="text-sm font-medium leading-relaxed">
                                                    Declaro que li e aceito integralmente o Código de Conduta da IFMSA Brazil e me comprometo a seguir todas as diretrizes estabelecidas durante o evento. *
                                                </Label>
                                                <p className="text-xs text-gray-600">
                                                    Ao aceitar, você concorda em seguir as regras de convivência e conduta profissional durante toda a assembleia.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Navigation Buttons */}
                                    <div className="flex justify-between">
                                        <Button 
                                            type="button"
                                            variant="outline"
                                            onClick={() => router.push(`/ag/${assemblyId}/register/step2`)}
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Voltar
                                        </Button>
                                        
                                        <Button 
                                            type="submit" 
                                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                                        >
                                            Assinar e Continuar
                                            <PenTool className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
} 