"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../components/ui/card";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import { Textarea } from "../../../../../components/ui/textarea";
import { Checkbox } from "../../../../../components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../../../../components/ui/select";
import { 
    UserCheck, 
    ArrowLeft, 
    CheckCircle, 
    Calendar, 
    Users, 
    MapPin,
    AlertTriangle,
    FileText,
    ArrowRight
} from "lucide-react";
import { useQuery } from "convex/react";
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
};

// Step 2 form data
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

const initialStep2FormData: Step2FormData = {
    dietaRestricoes: "",
    alergias: "",
    medicamentos: "",
    necessidadesEspeciais: "",
    restricaoQuarto: "",
    pronomes: "",
    contatoEmergenciaNome: "",
    contatoEmergenciaTelefone: "",
    outrasObservacoes: "",
    aceitaTermos: false,
};

export default function AGRegistrationStep2Page() {
    const { data: session } = useSession();
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    
    const assemblyId = params.id as string;
    
    const [step1Data, setStep1Data] = useState<Step1FormData | null>(null);
    const [formData, setFormData] = useState<Step2FormData>(initialStep2FormData);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isIfmsaEmail, setIsIfmsaEmail] = useState<boolean | null>(null);
    
    // Fetch assembly data
    const assembly = useQuery(convexApi.assemblies?.getById, { id: assemblyId as any });
    
    // Add AG config query to check global registration settings
    const agConfig = useQuery(convexApi.agConfig?.get);
    
    // Handle input changes
    const handleInputChange = useCallback((field: keyof Step2FormData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    // Validate form
    const validateForm = useCallback(() => {
        if (!formData.aceitaTermos) {
            toast({
                title: "❌ Erro",
                description: "É necessário aceitar os termos e condições.",
                variant: "destructive",
            });
            return false;
        }

        return true;
    }, [formData, toast]);

    // Handle form submission
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm() || !step1Data || !session?.user?.id) return;
        
        setIsSubmitting(true);
        
        try {
            // Save step 2 data and navigate to step 3
            sessionStorage.setItem('agRegistrationStep2', JSON.stringify(formData));
            
            toast({
                title: "✅ Dados Salvos",
                description: "Informações salvas com sucesso. Prosseguindo para a próxima etapa.",
            });
            
            // Navigate to step 3 (Code of Conduct signature)
            router.push(`/ag/${assemblyId}/register/step3`);
            
        } catch (error) {
            console.error("Error saving step 2 data:", error);
            toast({
                title: "❌ Erro",
                description: "Erro ao salvar dados. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    }, [validateForm, step1Data, session?.user?.id, assemblyId, formData, toast, router]);

    // Check if user has IFMSA email
    useEffect(() => {
        const checkEmail = async () => {
            if (session) {
                const result = await isIfmsaEmailSession(session);
                setIsIfmsaEmail(result);
            } else {
                setIsIfmsaEmail(false);
            }
        };
        checkEmail();
    }, [session]);

    // Load step 1 data from session storage
    useEffect(() => {
        const savedData = sessionStorage.getItem('agRegistrationStep1');
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData) as Step1FormData;
                setStep1Data(parsedData);
            } catch (error) {
                console.error("Error parsing step 1 data:", error);
                toast({
                    title: "❌ Erro",
                    description: "Dados da etapa anterior não encontrados. Redirecionando...",
                    variant: "destructive",
                });
                router.push(`/ag/${assemblyId}/register`);
            }
        } else {
            toast({
                title: "❌ Erro",
                description: "Dados da etapa anterior não encontrados. Redirecionando...",
                variant: "destructive",
            });
            router.push(`/ag/${assemblyId}/register`);
        }

        // Load step 2 data if it exists
        const savedStep2Data = sessionStorage.getItem('agRegistrationStep2');
        if (savedStep2Data) {
            try {
                const parsedStep2Data = JSON.parse(savedStep2Data) as Step2FormData;
                setFormData(parsedStep2Data);
            } catch (error) {
                console.error("Error parsing step 2 data:", error);
            }
        }
    }, [assemblyId, router, toast]);

    // Save step 2 data whenever form changes
    useEffect(() => {
        sessionStorage.setItem('agRegistrationStep2', JSON.stringify(formData));
    }, [formData]);

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

    if (!assembly || !step1Data) {
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
                            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                                <UserCheck className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                                    Inscrição - {assembly.name}
                                </h1>
                                <p className="text-gray-600">Etapa 2 de 4: Informações de Saúde e Acessibilidade</p>
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

                    {/* Personal Info Summary */}
                    <Card className="bg-green-50 border-green-200">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center">
                                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                                Dados Pessoais Confirmados
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div><strong>Nome:</strong> {step1Data.nome}</div>
                                <div><strong>Email:</strong> {step1Data.email}</div>
                                <div><strong>CPF:</strong> {step1Data.cpf}</div>
                                <div><strong>Celular:</strong> {step1Data.celular}</div>
                                <div><strong>Cidade/UF:</strong> {step1Data.cidade}, {step1Data.uf}</div>
                                <div><strong>Categoria:</strong> {step1Data.role}</div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Additional Information Form */}
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="text-xl">Informações Adicionais</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Health Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Informações de Saúde</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="dietaRestricoes">Restrições Alimentares</Label>
                                            <Input
                                                id="dietaRestricoes"
                                                value={formData.dietaRestricoes}
                                                onChange={(e) => handleInputChange('dietaRestricoes', e.target.value)}
                                                placeholder="Ex: vegetariano, intolerância à lactose"
                                            />
                                        </div>
                                        
                                        <div>
                                            <Label htmlFor="alergias">Alergias</Label>
                                            <Input
                                                id="alergias"
                                                value={formData.alergias}
                                                onChange={(e) => handleInputChange('alergias', e.target.value)}
                                                placeholder="Informe alergias conhecidas"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <Label htmlFor="medicamentos">Medicamentos em Uso</Label>
                                        <Input
                                            id="medicamentos"
                                            value={formData.medicamentos}
                                            onChange={(e) => handleInputChange('medicamentos', e.target.value)}
                                            placeholder="Medicamentos de uso contínuo"
                                        />
                                    </div>
                                    
                                    <div>
                                        <Label htmlFor="necessidadesEspeciais">Necessidades Especiais</Label>
                                        <Textarea
                                            id="necessidadesEspeciais"
                                            value={formData.necessidadesEspeciais}
                                            onChange={(e) => handleInputChange('necessidadesEspeciais', e.target.value)}
                                            placeholder="Informe qualquer necessidade especial para acessibilidade"
                                            rows={2}
                                        />
                                    </div>
                                </div>

                                {/* Additional Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Informações Adicionais</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="restricaoQuarto">Restrição de Quarto</Label>
                                            <Select value={formData.restricaoQuarto} onValueChange={(value) => handleInputChange('restricaoQuarto', value)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione uma opção" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="nao">Não</SelectItem>
                                                    <SelectItem value="mesmo_sexo">Somente pessoas do mesmo sexo</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        
                                        <div>
                                            <Label htmlFor="pronomes">Pronomes de Preferência</Label>
                                            <Input
                                                id="pronomes"
                                                value={formData.pronomes}
                                                onChange={(e) => handleInputChange('pronomes', e.target.value)}
                                                placeholder="Ex: ele/dele, ela/dela, elu/delu"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="contatoEmergenciaNome">Contato de Emergência - Nome</Label>
                                            <Input
                                                id="contatoEmergenciaNome"
                                                value={formData.contatoEmergenciaNome}
                                                onChange={(e) => handleInputChange('contatoEmergenciaNome', e.target.value)}
                                                placeholder="Nome completo do contato"
                                            />
                                        </div>
                                        
                                        <div>
                                            <Label htmlFor="contatoEmergenciaTelefone">Contato de Emergência - Telefone</Label>
                                            <Input
                                                id="contatoEmergenciaTelefone"
                                                value={formData.contatoEmergenciaTelefone}
                                                onChange={(e) => handleInputChange('contatoEmergenciaTelefone', e.target.value)}
                                                placeholder="(11) 99999-9999"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <Label htmlFor="outrasObservacoes">Outras Observações</Label>
                                        <Textarea
                                            id="outrasObservacoes"
                                            value={formData.outrasObservacoes}
                                            onChange={(e) => handleInputChange('outrasObservacoes', e.target.value)}
                                            placeholder="Qualquer informação adicional que considere importante"
                                            rows={3}
                                        />
                                    </div>
                                </div>

                                {/* Terms and Conditions */}
                                <div className="space-y-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="flex items-start space-x-3">
                                        <Checkbox
                                            id="aceitaTermos"
                                            checked={formData.aceitaTermos}
                                            onCheckedChange={(checked) => 
                                                handleInputChange('aceitaTermos', checked === true)
                                            }
                                        />
                                        <div className="grid gap-1.5 leading-none">
                                            <Label htmlFor="aceitaTermos" className="text-sm font-medium leading-relaxed">
                                                Aceito os termos e condições do evento e confirmo que todas as informações fornecidas são verdadeiras. *
                                            </Label>
                                            <p className="text-xs text-gray-600">
                                                Ao aceitar, você concorda em seguir o código de conduta da IFMSA Brazil durante o evento.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Navigation Buttons */}
                                <div className="flex justify-between">
                                    <Button 
                                        type="button"
                                        variant="outline"
                                        onClick={() => router.push(`/ag/${assemblyId}/register`)}
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Voltar
                                    </Button>
                                    
                                    <Button 
                                        type="submit" 
                                        disabled={isSubmitting}
                                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Continuar
                                            </>
                                        ) : (
                                            <>
                                                Continuar
                                                <ArrowRight className="w-4 h-4 ml-2" />
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
} 