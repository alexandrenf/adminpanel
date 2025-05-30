"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Checkbox } from "../../../../components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../../../components/ui/select";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "../../../../components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../../../../components/ui/popover";
import { Check, ChevronsUpDown, UserPlus, ArrowRight, Calendar, Users, MapPin } from "lucide-react";
import { cn } from "~/lib/utils";
import { useQuery } from "convex/react";
import { useToast } from "~/components/ui/use-toast";
import { api as convexApi } from "../../../../../convex/_generated/api";
import { api } from "~/trpc/react";
import { isIfmsaEmailSession } from "~/server/lib/authcheck";
import PrecisaLogin from "~/app/_components/PrecisaLogin";

// Brazilian states
const BRAZILIAN_STATES = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", 
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", 
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

// Registration form data type
type RegistrationFormData = {
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

// Local committee type
type ComiteLocal = {
    id: string;
    name: string;
    sigla?: string;
    cidade?: string;
    uf?: string;
};

const initialFormData: RegistrationFormData = {
    nome: "",
    email: "",
    emailSolar: "",
    dataNascimento: "",
    cpf: "",
    nomeCracha: "",
    celular: "",
    uf: "",
    cidade: "",
    role: "",
    autorizacaoCompartilhamento: false,
};

export default function AGRegistrationPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    
    const assemblyId = params.id as string;
    
    const [formData, setFormData] = useState<RegistrationFormData>(initialFormData);
    const [isIfmsaEmail, setIsIfmsaEmail] = useState<boolean | null>(null);
    const [comiteLocalOpen, setComiteLocalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Fetch assembly data
    const assembly = useQuery(convexApi.assemblies?.getById, { id: assemblyId as any });
    
    // Fetch local committees for dropdown
    const { data: registrosData } = api.registros.get.useQuery();
    const { data: ebData } = api.eb.getAll.useQuery();
    const { data: crData } = api.cr.getAll.useQuery();
    
    // Process committees data
    const comitesLocais = useMemo<ComiteLocal[]>(() => {
        if (!registrosData?.url) return [];
        
        // For now, we'll create a more comprehensive placeholder structure
        // In a real implementation, you'd fetch and process the CSV data here
        return [
            { id: "1", name: "ACEM - Associação dos Estudantes de Medicina de São Paulo", sigla: "ACEM", cidade: "São Paulo", uf: "SP" },
            { id: "2", name: "ACEP - Associação dos Estudantes de Medicina de Pelotas", sigla: "ACEP", cidade: "Pelotas", uf: "RS" },
            { id: "3", name: "ACERP - Associação dos Estudantes de Medicina de Ribeirão Preto", sigla: "ACERP", cidade: "Ribeirão Preto", uf: "SP" },
            { id: "4", name: "ACESM - Associação dos Estudantes de Medicina de Santa Maria", sigla: "ACESM", cidade: "Santa Maria", uf: "RS" },
            { id: "5", name: "AEMS - Associação dos Estudantes de Medicina de Salvador", sigla: "AEMS", cidade: "Salvador", uf: "BA" },
            { id: "6", name: "CAEM-UnB - Centro Acadêmico de Medicina da UnB", sigla: "CAEM-UnB", cidade: "Brasília", uf: "DF" },
            { id: "7", name: "CAEMFM - Centro Acadêmico de Medicina da UFMG", sigla: "CAEMFM", cidade: "Belo Horizonte", uf: "MG" },
            { id: "8", name: "CAME - Centro Acadêmico de Medicina de Fortaleza", sigla: "CAME", cidade: "Fortaleza", uf: "CE" },
            { id: "9", name: "CAMEC - Centro Acadêmico de Medicina de Campina Grande", sigla: "CAMEC", cidade: "Campina Grande", uf: "PB" },
            { id: "10", name: "CAMED - Centro Acadêmico de Medicina de Recife", sigla: "CAMED", cidade: "Recife", uf: "PE" },
            // Add more committees as needed - this should come from your CSV processing
        ];
    }, [registrosData]);

    // Handle input changes
    const handleInputChange = useCallback((field: keyof RegistrationFormData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    // Format CPF input
    const formatCPF = useCallback((value: string) => {
        const cleanValue = value.replace(/\D/g, '');
        return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }, []);

    // Format phone input
    const formatPhone = useCallback((value: string) => {
        const cleanValue = value.replace(/\D/g, '');
        if (cleanValue.length <= 11) {
            return cleanValue.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
        return value;
    }, []);

    // Role options based on user type
    const getRoleOptions = useCallback(() => {
        if (isIfmsaEmail) {
            return [
                { value: "eb", label: "EB (Executive Board)" },
                { value: "cr", label: "CR (Country Representative)" },
                { value: "supco", label: "SupCo (Support Committee)" },
            ];
        } else {
            return [
                { value: "comite_aspirante", label: "Comitê Aspirante" },
                { value: "observador_externo", label: "Observador Externo" },
                { value: "comite_local", label: "Comitê Local" },
                { value: "alumni", label: "Alumni" },
                { value: "supco", label: "SupCo (Support Committee)" },
            ];
        }
    }, [isIfmsaEmail]);

    // Validate form
    const validateForm = useCallback(() => {
        const requiredFields = [
            'nome', 'email', 'emailSolar', 'dataNascimento', 
            'cpf', 'nomeCracha', 'celular', 'uf', 'cidade', 'role'
        ];
        
        for (const field of requiredFields) {
            if (!formData[field as keyof RegistrationFormData]) {
                toast({
                    title: "❌ Erro",
                    description: `O campo ${field} é obrigatório.`,
                    variant: "destructive",
                });
                return false;
            }
        }

        if (formData.role === 'comite_local' && !formData.comiteLocal) {
            toast({
                title: "❌ Erro",
                description: "Selecione um comitê local.",
                variant: "destructive",
            });
            return false;
        }

        if (formData.role === 'comite_aspirante' && !formData.comiteAspirante) {
            toast({
                title: "❌ Erro",
                description: "Informe o nome do comitê aspirante.",
                variant: "destructive",
            });
            return false;
        }

        if (!formData.autorizacaoCompartilhamento) {
            toast({
                title: "❌ Erro",
                description: "É necessário autorizar o compartilhamento de dados.",
                variant: "destructive",
            });
            return false;
        }

        return true;
    }, [formData, toast]);

    // Handle form submission
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        setIsSubmitting(true);
        
        try {
            // Here you would submit to your backend/Convex
            // For now, we'll just simulate the submission and move to step 2
            
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
            
            toast({
                title: "✅ Dados Salvos",
                description: "Informações básicas salvas com sucesso. Prosseguindo para a próxima etapa.",
            });
            
            // Navigate to step 2 with form data
            // You might want to store this in session storage or pass it via state
            sessionStorage.setItem('agRegistrationStep1', JSON.stringify(formData));
            router.push(`/ag/${assemblyId}/register/step2`);
            
        } catch (error) {
            toast({
                title: "❌ Erro",
                description: "Erro ao salvar dados. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    }, [validateForm, toast, assemblyId, router, formData]);

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

    // Pre-populate email when session loads
    useEffect(() => {
        if (session?.user?.email && !formData.email) {
            // Check if there's saved data from session storage first
            const savedData = sessionStorage.getItem('agRegistrationStep1');
            if (savedData) {
                try {
                    const parsedData = JSON.parse(savedData) as RegistrationFormData;
                    setFormData(parsedData);
                } catch (error) {
                    console.error("Error parsing saved step 1 data:", error);
                    // Fallback to session data
                    setFormData(prev => ({
                        ...prev,
                        email: session.user.email!,
                        nome: session.user.name || "",
                    }));
                }
            } else {
                // No saved data, use session data
                setFormData(prev => ({
                    ...prev,
                    email: session.user.email!,
                    nome: session.user.name || "",
                }));
            }
        }
    }, [session, formData.email]);

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
                    <p className="text-gray-600">Carregando assembleia...</p>
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
                                <UserPlus className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                                    Inscrição - {assembly.name}
                                </h1>
                                <p className="text-gray-600">Etapa 1 de 3: Informações Pessoais</p>
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

                    {/* Registration Form */}
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="text-xl">Dados Pessoais</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Basic Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <Label htmlFor="nome">Nome Completo *</Label>
                                        <Input
                                            id="nome"
                                            value={formData.nome}
                                            onChange={(e) => handleInputChange('nome', e.target.value)}
                                            placeholder="Seu nome completo"
                                        />
                                    </div>
                                    
                                    <div>
                                        <Label htmlFor="nomeCracha">Nome para o Crachá *</Label>
                                        <Input
                                            id="nomeCracha"
                                            value={formData.nomeCracha}
                                            onChange={(e) => handleInputChange('nomeCracha', e.target.value)}
                                            placeholder="Como quer que apareça no crachá"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <Label htmlFor="email">Email *</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                            placeholder="seu@email.com"
                                        />
                                    </div>
                                    
                                    <div>
                                        <Label htmlFor="emailSolar">Email como consta no Solar *</Label>
                                        <Input
                                            id="emailSolar"
                                            type="email"
                                            value={formData.emailSolar}
                                            onChange={(e) => handleInputChange('emailSolar', e.target.value)}
                                            placeholder="Email usado no sistema Solar"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <Label htmlFor="dataNascimento">Data de Nascimento *</Label>
                                        <Input
                                            id="dataNascimento"
                                            type="date"
                                            value={formData.dataNascimento}
                                            onChange={(e) => handleInputChange('dataNascimento', e.target.value)}
                                        />
                                    </div>
                                    
                                    <div>
                                        <Label htmlFor="cpf">CPF *</Label>
                                        <Input
                                            id="cpf"
                                            value={formData.cpf}
                                            onChange={(e) => handleInputChange('cpf', formatCPF(e.target.value))}
                                            placeholder="000.000.000-00"
                                            maxLength={14}
                                        />
                                    </div>
                                    
                                    <div>
                                        <Label htmlFor="celular">Celular *</Label>
                                        <Input
                                            id="celular"
                                            value={formData.celular}
                                            onChange={(e) => handleInputChange('celular', formatPhone(e.target.value))}
                                            placeholder="(11) 99999-9999"
                                            maxLength={15}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <Label htmlFor="uf">UF *</Label>
                                        <Select value={formData.uf} onValueChange={(value) => handleInputChange('uf', value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o estado" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {BRAZILIAN_STATES.map((state) => (
                                                    <SelectItem key={state} value={state}>{state}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    
                                    <div>
                                        <Label htmlFor="cidade">Cidade *</Label>
                                        <Input
                                            id="cidade"
                                            value={formData.cidade}
                                            onChange={(e) => handleInputChange('cidade', e.target.value)}
                                            placeholder="Sua cidade"
                                        />
                                    </div>
                                </div>

                                {/* Role Selection */}
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="role">
                                            {isIfmsaEmail ? "Cargo/Função *" : "Categoria de Participação *"}
                                        </Label>
                                        <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione sua categoria" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {getRoleOptions().map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Comitê Aspirante Text Field */}
                                    {formData.role === 'comite_aspirante' && (
                                        <div>
                                            <Label htmlFor="comiteAspirante">Nome do Comitê Aspirante *</Label>
                                            <Input
                                                id="comiteAspirante"
                                                value={formData.comiteAspirante || ''}
                                                onChange={(e) => handleInputChange('comiteAspirante', e.target.value)}
                                                placeholder="Nome do seu comitê aspirante"
                                            />
                                        </div>
                                    )}

                                    {/* Comitê Local Searchable Dropdown */}
                                    {formData.role === 'comite_local' && (
                                        <div>
                                            <Label htmlFor="comiteLocal">Comitê Local *</Label>
                                            <Popover open={comiteLocalOpen} onOpenChange={setComiteLocalOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={comiteLocalOpen}
                                                        className="w-full justify-between"
                                                    >
                                                        {formData.comiteLocal
                                                            ? comitesLocais.find((comite) => comite.id === formData.comiteLocal)?.name
                                                            : "Selecione um comitê local..."}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-full p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Buscar comitê..." />
                                                        <CommandEmpty>Nenhum comitê encontrado.</CommandEmpty>
                                                        <CommandGroup>
                                                            {comitesLocais.map((comite) => (
                                                                <CommandItem
                                                                    key={comite.id}
                                                                    value={`${comite.name} ${comite.sigla} ${comite.cidade}`}
                                                                    onSelect={() => {
                                                                        handleInputChange('comiteLocal', comite.id);
                                                                        setComiteLocalOpen(false);
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            formData.comiteLocal === comite.id ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    <div>
                                                                        <div className="font-medium">{comite.name}</div>
                                                                        {comite.sigla && (
                                                                            <div className="text-sm text-gray-500">
                                                                                {comite.sigla} - {comite.cidade}, {comite.uf}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    )}
                                </div>

                                {/* Data Sharing Authorization */}
                                <div className="space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div className="flex items-start space-x-3">
                                        <Checkbox
                                            id="autorizacao"
                                            checked={formData.autorizacaoCompartilhamento}
                                            onCheckedChange={(checked) => 
                                                handleInputChange('autorizacaoCompartilhamento', checked === true)
                                            }
                                        />
                                        <div className="grid gap-1.5 leading-none">
                                            <Label htmlFor="autorizacao" className="text-sm font-medium leading-relaxed">
                                                Autorizo o compartilhamento de meus dados (nome completo e email) para os patrocinadores do evento. *
                                            </Label>
                                            <p className="text-xs text-gray-600">
                                                Esta autorização é necessária para a participação no evento.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <div className="flex justify-end">
                                    <Button 
                                        type="submit" 
                                        disabled={isSubmitting}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Salvando...
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