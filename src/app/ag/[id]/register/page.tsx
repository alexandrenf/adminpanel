"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Checkbox } from "../../../../components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "../../../../components/ui/alert";
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
import { Check, ChevronsUpDown, UserPlus, ArrowRight, Calendar, Users, MapPin, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "~/lib/utils";
import { useQuery, useMutation } from "convex/react";
import { useToast } from "~/components/ui/use-toast";
import { api as convexApi } from "../../../../../convex/_generated/api";
import { api } from "~/trpc/react";
import { isIfmsaEmailSession } from "~/server/lib/authcheck";
import PrecisaLogin from "~/app/_components/PrecisaLogin";
import { handleNewRegistration, handleRegistrationApproval } from "~/app/actions/emailExamples";

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
    selectedEBId?: string;
    selectedCRId?: string;
    autorizacaoCompartilhamento: boolean;
    selectedModalityId?: string;
};

// Local committee type
type ComiteLocal = {
    id: string;
    name: string;
    participantId: string;
    escola: string;
    cidade?: string;
    uf?: string;
    agFiliacao?: string;
};

// Utility function to format dates without timezone conversion
const formatDateWithoutTimezone = (timestamp: number): string => {
    const date = new Date(timestamp);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
};

export default function AGRegistrationPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    // Get assemblyId with type safety
    const assemblyId = params?.id;
    
    // Check if this is a resubmission
    const resubmitRegistrationId = searchParams?.get('resubmit');
    const isResubmission = !!resubmitRegistrationId;
    
    // Convex queries
    const assembly = useQuery(convexApi.assemblies?.getById, assemblyId ? { id: assemblyId as any } : "skip");
    const registrationStatus = useQuery(
        convexApi.agRegistrations?.getUserRegistrationStatus,
        session?.user?.id && assemblyId && !isResubmission ? { assemblyId: assemblyId as any, userId: session.user.id } : "skip"
    );
    const activeModalities = useQuery(
        convexApi.registrationModalities?.getActiveByAssembly,
        assemblyId ? { assemblyId: assemblyId as any } : "skip"
    );
    
    // Add AG config query to check global registration settings
    const agConfig = useQuery(convexApi.agConfig?.get);
    
    // Fetch comitês locais from agParticipants
    const comitesLocais = useQuery(convexApi.assemblies?.getComitesLocais) || [];
    
    // Fetch EBs and CRs from agParticipants
    const ebs = useQuery(convexApi.assemblies?.getEBs) || [];
    const crs = useQuery(convexApi.assemblies?.getCRs) || [];
    
    // Debug EB data loading
    useEffect(() => {
        console.log('🔍 Frontend: EBs data loaded:', ebs);
        console.log('🔍 Frontend: EBs length:', ebs?.length);
        if (ebs?.length > 0) {
            console.log('🔍 Frontend: First EB example:', ebs[0]);
        }
    }, [ebs]);
    
    // Fetch existing registration data for resubmission
    const existingRegistrationData = useQuery(
        convexApi.agRegistrations?.getById,
        resubmitRegistrationId ? { id: resubmitRegistrationId as any } : "skip"
    );
    
    // Initial form data
    const initialFormData: RegistrationFormData = useMemo(() => {
        if (isResubmission && existingRegistrationData) {
            return {
                nome: existingRegistrationData.participantName || "",
                email: existingRegistrationData.email || session?.user?.email || "",
                emailSolar: existingRegistrationData.emailSolar || "",
                dataNascimento: existingRegistrationData.dataNascimento || "",
                cpf: existingRegistrationData.cpf || "",
                nomeCracha: existingRegistrationData.nomeCracha || "",
                celular: existingRegistrationData.celular || "",
                uf: existingRegistrationData.uf || "",
                cidade: existingRegistrationData.cidade || "",
                role: existingRegistrationData.participantRole || "",
                comiteLocal: existingRegistrationData.comiteLocal || "",
                comiteAspirante: existingRegistrationData.comiteAspirante || "",
                selectedEBId: existingRegistrationData.participantType === "eb" ? existingRegistrationData.participantId : "",
                selectedCRId: existingRegistrationData.participantType === "cr" ? existingRegistrationData.participantId : "",
                autorizacaoCompartilhamento: existingRegistrationData.autorizacaoCompartilhamento || false,
                selectedModalityId: existingRegistrationData.modalityId || "",
            };
        }
        
        return {
            nome: "",
            email: session?.user?.email || "",
            emailSolar: "",
            dataNascimento: "",
            cpf: "",
            nomeCracha: "",
            celular: "",
            uf: "",
            cidade: "",
            role: "",
            comiteLocal: "",
            comiteAspirante: "",
            selectedEBId: "",
            selectedCRId: "",
            autorizacaoCompartilhamento: false,
            selectedModalityId: "",
        };
    }, [session?.user?.email, isResubmission, existingRegistrationData]);

    const [formData, setFormData] = useState<RegistrationFormData>(() => {
        console.log('🔍 Frontend: Initializing form data:', initialFormData);
        return initialFormData;
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingRegistration, setExistingRegistration] = useState<any>(null);
    const [comiteLocalOpen, setComiteLocalOpen] = useState(false);
    const [ebOpen, setEbOpen] = useState(false);
    const [crOpen, setCrOpen] = useState(false);
    const [isIfmsaEmail, setIsIfmsaEmail] = useState<boolean>(false);
    
    // Convex mutations
    const createRegistration = useMutation(convexApi.agRegistrations?.createFromForm);
    const resubmitRegistration = useMutation(convexApi.agRegistrations?.resubmit);

    // Handle input changes
    const handleInputChange = useCallback((field: keyof RegistrationFormData, value: string | boolean) => {
        try {
            // Debug all field changes that matter for EB selection
            if (['role', 'selectedEBId', 'selectedCRId', 'comiteLocal', 'uf'].includes(field)) {
                console.log(`🔍 Frontend: Changing ${field} to:`, value, 'type:', typeof value);
            }
            
            // Clear related fields when role changes
            if (field === 'role') {
                console.log('🔍 Frontend: Role changing to:', value, '- clearing related fields');
                setFormData(prev => {
                    const newData = {
                        ...prev,
                        role: value as string,
                        comiteLocal: undefined,
                        comiteAspirante: undefined,
                        selectedEBId: undefined,
                        selectedCRId: undefined,
                    };
                    console.log('🔍 Frontend: Form data after role change:', newData);
                    return newData;
                });
                return;
            }
            
            // Special handling for UF field to ensure it's a valid string
            if (field === 'uf') {
                const ufValue = typeof value === 'string' ? value : String(value);
                console.log(`🔍 Frontend: Setting UF to: "${ufValue}"`);
                
                setFormData(prev => {
                    const newData = { ...prev, uf: ufValue };
                    console.log(`🔍 Frontend: Form data after UF change:`, newData);
                    return newData;
                });
                return;
            }
            
            setFormData(prev => {
                const newData = { ...prev, [field]: value };
                
                // Debug the complete form data when important fields change
                if (['selectedEBId', 'selectedCRId', 'comiteLocal'].includes(field)) {
                    console.log(`🔍 Frontend: Complete form data after ${field} change:`, newData);
                }
                
                return newData;
            });
        } catch (error) {
            console.error(`🚨 Frontend: Error in handleInputChange for field ${field}:`, error);
            toast({
                title: "❌ Erro",
                description: `Erro ao atualizar campo ${field}. Tente novamente.`,
                variant: "destructive",
            });
        }
    }, [toast]);

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
                { value: "cr", label: "CR (Coordenador Regional)" },
                { value: "supco", label: "SupCo (Conselho Supervisor)" },
            ];
        } else {
            return [
                { value: "comite_aspirante", label: "Comitê Aspirante" },
                { value: "observador_externo", label: "Observador Externo" },
                { value: "comite_local", label: "Comitê Local" },
                { value: "cr", label: "CR (Coordenador Regional)" },
                { value: "alumni", label: "Alumni" },
                { value: "supco", label: "SupCo (Conselho Supervisor)" },
            ];
        }
    }, [isIfmsaEmail]);
    
    // Validate form
    const validateForm = useCallback(() => {
        const requiredFields = [
            'nome', 'email', 'dataNascimento', 
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

        if (formData.role === 'eb' && !formData.selectedEBId) {
            console.log('🔍 Frontend: EB validation failed! selectedEBId:', formData.selectedEBId, 'type:', typeof formData.selectedEBId);
            console.log('🔍 Frontend: Complete formData during validation:', formData);
            toast({
                title: "❌ Erro",
                description: "Selecione sua posição no Executive Board.",
                variant: "destructive",
            });
            return false;
        }

        if (formData.role === 'cr' && !formData.selectedCRId) {
            toast({
                title: "❌ Erro",
                description: "Selecione sua posição de Coordenador Regional.",
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

        // Validate modality selection if modalities are available
        if (activeModalities && activeModalities.length > 0 && !formData.selectedModalityId) {
            toast({
                title: "❌ Erro",
                description: "Selecione uma modalidade de inscrição.",
                variant: "destructive",
            });
            return false;
        }

        return true;
    }, [formData, toast, activeModalities]);

    // Handle form submission
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        // Comprehensive debugging of form state before submission
        console.log('🔍 Frontend: Full form submission debug:');
        console.log('🔍 Frontend: formData.role:', formData.role);
        console.log('🔍 Frontend: formData.selectedEBId:', formData.selectedEBId, 'type:', typeof formData.selectedEBId);
        console.log('🔍 Frontend: formData.selectedCRId:', formData.selectedCRId, 'type:', typeof formData.selectedCRId);
        console.log('🔍 Frontend: formData.comiteLocal:', formData.comiteLocal, 'type:', typeof formData.comiteLocal);
        console.log('🔍 Frontend: Complete formData object:', JSON.stringify(formData, null, 2));
        console.log('🔍 Frontend: EBs data available:', ebs?.length, 'items');
        if (ebs?.length > 0) {
            console.log('🔍 Frontend: First EB example:', ebs[0]);
        }
        
        // Check if EB role but no selectedEBId
        if (formData.role === 'eb' && !formData.selectedEBId) {
            console.error('🚨 Frontend: EB role selected but selectedEBId is missing!');
            console.log('🔍 Frontend: Available EBs:', ebs);
            toast({
                title: "❌ Erro de Depuração",
                description: "EB selecionado mas selectedEBId está indefinido. Verifique o console.",
                variant: "destructive",
            });
            return;
        }
        
        // Debug the complete form data before submission
        console.log('🔍 Frontend: Form data before submission:', formData);
        console.log('🔍 Frontend: selectedEBId value:', formData.selectedEBId, 'type:', typeof formData.selectedEBId);
        console.log('🔍 Frontend: role value:', formData.role);
        
        // Check if this is an AGE (online assembly) - skip steps 2 and 3
        if (assembly?.type === "AGE") {
            // For AGE, create registration directly with auto-approval
            try {
                if (isResubmission) {
                    // Handle AGE resubmission
                    const result = await resubmitRegistration({
                        registrationId: resubmitRegistrationId as any,
                        updatedPersonalInfo: {
                            nome: formData.nome,
                            email: formData.email,
                            emailSolar: formData.emailSolar,
                            dataNascimento: formData.dataNascimento,
                            cpf: formData.cpf,
                            nomeCracha: formData.nomeCracha,
                            celular: formData.celular,
                            uf: formData.uf,
                            cidade: formData.cidade,
                            role: formData.role,
                            comiteLocal: formData.comiteLocal,
                            comiteAspirante: formData.comiteAspirante,
                            selectedEBId: formData.selectedEBId,
                            selectedCRId: formData.selectedCRId,
                            autorizacaoCompartilhamento: formData.autorizacaoCompartilhamento,
                        },
                        updatedAdditionalInfo: {
                            experienciaAnterior: "", // Empty for AGE
                            motivacao: "AGE Resubmissão - Não especificado", // Default for AGE
                            expectativas: "", // Empty for AGE
                            dietaRestricoes: "", // Empty for AGE
                            alergias: "", // Empty for AGE
                            medicamentos: "", // Empty for AGE
                            necessidadesEspeciais: "", // Empty for AGE
                            restricaoQuarto: "", // Empty for AGE
                            pronomes: "", // Empty for AGE
                            contatoEmergenciaNome: "", // Empty for AGE
                            contatoEmergenciaTelefone: "", // Empty for AGE
                            outrasObservacoes: "", // Empty for AGE
                            participacaoComites: [], // Empty for AGE
                            interesseVoluntariado: false, // Default for AGE
                        },
                        resubmissionNote: "Resubmissão AGE com dados atualizados",
                    });
                    
                    // Handle the new response format for resubmission
                    const actualRegistrationId = typeof result === 'string' ? result : result.registrationId;
                    
                    // Send appropriate email based on auto-approval status
                    try {
                        const selectedModality = activeModalities?.find(m => m._id === formData.selectedModalityId);
                        const isAutoApproved = typeof result === 'object' && result.isAutoApproved;
                        
                        if (!assembly || !selectedModality) {
                            console.warn('⚠️ Cannot send resubmission email: missing assembly or modality data');
                        } else if (isAutoApproved) {
                            // Send approval email for auto-approved resubmissions
                            await handleRegistrationApproval({
                                registrationId: actualRegistrationId as string,
                                assemblyId: assemblyId as string,
                                participantName: formData.nome,
                                participantEmail: formData.email,
                                assemblyName: assembly.name,
                                assemblyLocation: assembly.location,
                                assemblyStartDate: new Date(assembly.startDate),
                                assemblyEndDate: new Date(assembly.endDate),
                                modalityName: selectedModality.name,
                                additionalInstructions: "Sua resubmissão foi aprovada automaticamente. Bem-vindo(a)!",
                                paymentAmount: selectedModality.price && selectedModality.price > 0 ? 
                                    new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                    }).format(selectedModality.price / 100) : undefined,
                                isPaymentExempt: selectedModality.price === 0,
                            });
                            console.log('✅ Auto-approval resubmission email sent successfully');
                        } else {
                            // Send confirmation email for regular resubmissions
                            await handleNewRegistration({
                                registrationId: actualRegistrationId as string,
                                participantName: formData.nome,
                                participantEmail: formData.email,
                                assemblyName: assembly.name,
                                assemblyLocation: assembly.location,
                                assemblyStartDate: new Date(assembly.startDate),
                                assemblyEndDate: new Date(assembly.endDate),
                                modalityName: selectedModality.name,
                                paymentRequired: selectedModality.price ? selectedModality.price > 0 : false,
                                paymentAmount: selectedModality.price && selectedModality.price > 0 ? selectedModality.price : undefined,
                            });
                            console.log('✅ Resubmission confirmation email sent successfully');
                        }
                    } catch (emailError) {
                        console.error('⚠️ Failed to send resubmission email:', emailError);
                        // Don't fail the registration if email fails
                    }
                    
                    toast({
                        title: "✅ Sucesso",
                        description: "Inscrição resubmetida com sucesso!",
                    });
                    
                    // Navigate to success page
                    router.push(`/ag/${assemblyId}/register/success/${actualRegistrationId}`);
                } else {
                    // Handle new AGE registration (existing logic)
                    const registrationData = {
                        assemblyId: assemblyId as any,
                        modalityId: formData.selectedModalityId as any,
                        userId: session!.user!.id,
                        personalInfo: {
                            nome: formData.nome,
                            email: formData.email,
                            emailSolar: formData.emailSolar,
                            dataNascimento: formData.dataNascimento,
                            cpf: formData.cpf,
                            nomeCracha: formData.nomeCracha,
                            celular: formData.celular,
                            uf: formData.uf,
                            cidade: formData.cidade,
                            role: formData.role,
                            comiteLocal: formData.comiteLocal,
                            comiteAspirante: formData.comiteAspirante,
                            selectedEBId: formData.selectedEBId,
                            selectedCRId: formData.selectedCRId,
                            autorizacaoCompartilhamento: formData.autorizacaoCompartilhamento,
                        },
                        additionalInfo: {
                            experienciaAnterior: "", // Empty for AGE
                            motivacao: "AGE - Não especificado", // Default for AGE
                            expectativas: "", // Empty for AGE
                            dietaRestricoes: "", // Empty for AGE
                            alergias: "", // Empty for AGE
                            medicamentos: "", // Empty for AGE
                            necessidadesEspeciais: "", // Empty for AGE
                            restricaoQuarto: "", // Empty for AGE
                            pronomes: "", // Empty for AGE
                            contatoEmergenciaNome: "", // Empty for AGE
                            contatoEmergenciaTelefone: "", // Empty for AGE
                            outrasObservacoes: "", // Empty for AGE
                            participacaoComites: [], // Empty for AGE
                            interesseVoluntariado: false, // Default for AGE
                        },
                        status: "approved" as const, // Auto-approve AGE registrations
                    };

                    const result = await createRegistration(registrationData);
                    
                    // Handle the new response format
                    const actualRegistrationId = typeof result === 'string' ? result : result.registrationId;
                    
                    // For AGE registrations that are auto-approved, send approval email directly
                    try {
                        const selectedModality = activeModalities?.find(m => m._id === formData.selectedModalityId);
                        
                        // Add null checks for safety
                        if (!assembly || !selectedModality) {
                            console.warn('⚠️ Cannot send AGE approval email: missing assembly or modality data');
                        } else {
                            // Send approval email directly for auto-approved AGE registration
                            await handleRegistrationApproval({
                                registrationId: actualRegistrationId as string,
                                assemblyId: assemblyId as string,
                                participantName: formData.nome,
                                participantEmail: formData.email,
                                assemblyName: assembly.name,
                                assemblyLocation: assembly.location,
                                assemblyStartDate: new Date(assembly.startDate),
                                assemblyEndDate: new Date(assembly.endDate),
                                modalityName: selectedModality.name,
                                additionalInstructions: "Sua inscrição na AGE foi aprovada automaticamente. Bem-vindo(a)!",
                                paymentAmount: selectedModality.price && selectedModality.price > 0 ? 
                                    new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                    }).format(selectedModality.price / 100) : undefined,
                                isPaymentExempt: selectedModality.price === 0,
                            });
                            console.log('✅ AGE approval email sent successfully');
                        }
                    } catch (emailError) {
                        console.error('⚠️ Failed to send AGE approval email:', emailError);
                        // Don't fail the registration if email fails
                    }
                    
                    toast({
                        title: "✅ Inscrição Realizada com Sucesso!",
                        description: "Sua inscrição AGE foi aprovada automaticamente.",
                    });
                    
                    // Navigate to success page
                    router.push(`/ag/${assemblyId}/register/success/${actualRegistrationId}`);
                }
                
            } catch (error) {
                console.error("Error with AGE registration:", error);
                toast({
                    title: "❌ Erro",
                    description: "Erro ao finalizar inscrição AGE. Tente novamente.",
                    variant: "destructive",
                });
            }
        } else {
            // For regular AG, save form data and continue to step 2
            const dataToSave = {
                nome: formData.nome,
                email: formData.email,
                emailSolar: formData.emailSolar,
                dataNascimento: formData.dataNascimento,
                cpf: formData.cpf,
                nomeCracha: formData.nomeCracha,
                celular: formData.celular,
                uf: formData.uf,
                cidade: formData.cidade,
                role: formData.role,
                comiteLocal: formData.comiteLocal,
                comiteAspirante: formData.comiteAspirante,
                selectedEBId: formData.selectedEBId,
                selectedCRId: formData.selectedCRId,
                autorizacaoCompartilhamento: formData.autorizacaoCompartilhamento,
                selectedModalityId: formData.selectedModalityId,
                // Add resubmission info if applicable
                ...(isResubmission && {
                    resubmitRegistrationId: resubmitRegistrationId,
                    isResubmission: true,
                })
            };

            sessionStorage.setItem('agRegistrationStep1', JSON.stringify(dataToSave));

            // Navigate to step 2
            router.push(`/ag/${assemblyId}/register/step2`);
        }
    }, [validateForm, formData, assemblyId, assembly?.type, session, createRegistration, toast, router, isResubmission, resubmitRegistration]);

    // Check email domain
    useEffect(() => {
        const checkIfmsaEmail = async () => {
            if (session) {
                const hasIfmsaEmail = await isIfmsaEmailSession(session);
                setIsIfmsaEmail(hasIfmsaEmail);
            } else {
                setIsIfmsaEmail(false);
            }
        };
        
        checkIfmsaEmail();
    }, [session]);

    // Track formData changes for debugging
    useEffect(() => {
        console.log('🔍 Frontend: FormData changed:');
        console.log('🔍 Frontend: role:', formData.role);
        console.log('🔍 Frontend: uf:', formData.uf, 'type:', typeof formData.uf);
        console.log('🔍 Frontend: selectedEBId:', formData.selectedEBId, 'type:', typeof formData.selectedEBId);
        console.log('🔍 Frontend: selectedCRId:', formData.selectedCRId, 'type:', typeof formData.selectedCRId);
        console.log('🔍 Frontend: comiteLocal:', formData.comiteLocal, 'type:', typeof formData.comiteLocal);
    }, [formData.role, formData.uf, formData.selectedEBId, formData.selectedCRId, formData.comiteLocal]);

    // Update form data when existing registration data loads
    useEffect(() => {
        if (isResubmission && existingRegistrationData) {
            console.log('🔍 Frontend: useEffect updating form data for resubmission');
            console.log('🔍 Frontend: existingRegistrationData.participantType:', existingRegistrationData.participantType);
            console.log('🔍 Frontend: existingRegistrationData.participantId:', existingRegistrationData.participantId);
            
            const newFormData = {
                nome: existingRegistrationData.participantName || "",
                email: existingRegistrationData.email || session?.user?.email || "",
                emailSolar: existingRegistrationData.emailSolar || "",
                dataNascimento: existingRegistrationData.dataNascimento || "",
                cpf: existingRegistrationData.cpf || "",
                nomeCracha: existingRegistrationData.nomeCracha || "",
                celular: existingRegistrationData.celular || "",
                uf: existingRegistrationData.uf || "",
                cidade: existingRegistrationData.cidade || "",
                role: existingRegistrationData.participantRole || "",
                comiteLocal: existingRegistrationData.comiteLocal || "",
                comiteAspirante: existingRegistrationData.comiteAspirante || "",
                selectedEBId: existingRegistrationData.participantType === "eb" ? existingRegistrationData.participantId : "",
                selectedCRId: existingRegistrationData.participantType === "cr" ? existingRegistrationData.participantId : "",
                autorizacaoCompartilhamento: existingRegistrationData.autorizacaoCompartilhamento || false,
                selectedModalityId: existingRegistrationData.modalityId || "",
            };
            
            console.log('🔍 Frontend: Setting form data from resubmission:', newFormData);
            setFormData(newFormData);
        }
    }, [isResubmission, existingRegistrationData, session?.user?.email]);

    // Check if user is authorized to resubmit this registration
    useEffect(() => {
        if (isResubmission && existingRegistrationData && session?.user?.id) {
            if (existingRegistrationData.registeredBy !== session.user.id) {
                toast({
                    title: "❌ Acesso Negado",
                    description: "Você não tem permissão para reenviar esta inscrição.",
                    variant: "destructive",
                });
                router.push(`/ag/${assemblyId}`);
                return;
            }
            
            if (existingRegistrationData.status !== "rejected") {
                toast({
                    title: "❌ Erro",
                    description: "Apenas inscrições rejeitadas podem ser reenviadas.",
                    variant: "destructive",
                });
                router.push(`/ag/${assemblyId}`);
                return;
            }
        }
    }, [isResubmission, existingRegistrationData, session?.user?.id, assemblyId, router, toast]);

    // Redirect if already registered
    useEffect(() => {
        if (registrationStatus?.status === "approved") {
            router.push(`/ag/${assemblyId}/register/complete/${registrationStatus.registrationId}`);
        }
    }, [registrationStatus, router, assemblyId]);

    // If no assemblyId, show error
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

    // Check if registrations are globally disabled
    if (agConfig && !agConfig.registrationEnabled) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
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
                    <XCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
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
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                                <UserPlus className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                                    Inscrição - {assembly.name}
                                </h1>
                                <p className="text-gray-600">
                                    {assembly.type === "AGE" 
                                        ? "Etapa 1 de 1: Informações Pessoais" 
                                        : "Etapa 1 de 4: Informações Pessoais"
                                    }
                                </p>
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
                    {isResubmission && existingRegistrationData && (
                        <Alert className="border-orange-200 bg-orange-50">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            <AlertTitle className="text-orange-800">Reenvio de Inscrição</AlertTitle>
                            <AlertDescription className="text-orange-700">
                                <div className="space-y-2">
                                    <p><strong>Motivo da rejeição:</strong> {existingRegistrationData.reviewNotes || "Não especificado"}</p>
                                    <p>Você pode alterar qualquer informação abaixo antes de reenviar sua inscrição.</p>
                                    <div className="flex items-center gap-2 text-sm mt-2">
                                        <RefreshCw className="h-3 w-3" />
                                        <span>Reenvio da Inscrição #{existingRegistrationData._id.slice(-8)}</span>
                                    </div>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Modality Selection */}
                    {activeModalities && activeModalities.length > 0 && (
                        <Card className="shadow-lg border-0">
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center space-x-2">
                                    <Users className="w-5 h-5 text-purple-600" />
                                    <span>Modalidade de Inscrição</span>
                                </CardTitle>
                                <p className="text-gray-600">Selecione a modalidade que melhor se adequa ao seu perfil</p>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4">
                                    {activeModalities.map((modality) => (
                                        <ModalityOption
                                            key={modality._id}
                                            modality={modality}
                                            isSelected={formData.selectedModalityId === modality._id}
                                            onSelect={() => handleInputChange('selectedModalityId', modality._id)}
                                        />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

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
                                        <Label htmlFor="emailSolar">Email como consta no Solar (opcional)</Label>
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
                                        <div className="relative">
                                            <Select 
                                                value={formData.uf || ""} 
                                                onValueChange={(value) => {
                                                    try {
                                                        console.log(`🔍 Frontend: UF Select onValueChange called with:`, value);
                                                        if (typeof value === 'string' && BRAZILIAN_STATES.includes(value)) {
                                                            handleInputChange('uf', value);
                                                        } else {
                                                            console.error(`🚨 Frontend: Invalid UF value:`, value);
                                                            toast({
                                                                title: "❌ Erro",
                                                                description: "Estado inválido selecionado.",
                                                                variant: "destructive",
                                                            });
                                                        }
                                                    } catch (error) {
                                                        console.error(`🚨 Frontend: Error in UF Select onValueChange:`, error);
                                                        toast({
                                                            title: "❌ Erro",
                                                            description: "Erro ao selecionar estado. Tente novamente.",
                                                            variant: "destructive",
                                                        });
                                                    }
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o estado" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {BRAZILIAN_STATES.map((state) => {
                                                        try {
                                                            return (
                                                                <SelectItem key={state} value={state}>
                                                                    {state}
                                                                </SelectItem>
                                                            );
                                                        } catch (error) {
                                                            console.error(`🚨 Frontend: Error rendering state ${state}:`, error);
                                                            return null;
                                                        }
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        </div>
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

                                    {/* EB Selection Dropdown */}
                                    {formData.role === 'eb' && (
                                        <div>
                                            <Label htmlFor="selectedEB">Posição no Executive Board *</Label>
                                            <Popover open={ebOpen} onOpenChange={setEbOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={ebOpen}
                                                        className="w-full justify-between"
                                                        disabled={ebs === undefined}
                                                    >
                                                        {ebs === undefined ? (
                                                            "Carregando posições..."
                                                        ) : formData.selectedEBId ? (
                                                            ebs.find((eb) => eb.participantId === formData.selectedEBId)?.name || formData.selectedEBId
                                                        ) : (
                                                            "Selecione sua posição no EB..."
                                                        )}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-full p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Buscar por posição..." />
                                                        <CommandEmpty>
                                                            {ebs?.length === 0 
                                                                ? "Nenhuma posição EB encontrada no sistema."
                                                                : "Nenhuma posição encontrada."
                                                            }
                                                        </CommandEmpty>
                                                        <CommandGroup className="max-h-64 overflow-y-auto">
                                                            {ebs?.map((eb) => (
                                                                <CommandItem
                                                                    key={eb.id}
                                                                    value={eb.participantId}
                                                                    onSelect={() => {
                                                                        console.log('🔍 Frontend: EB selected!', eb);
                                                                        console.log('🔍 Frontend: EB participantId:', eb.participantId, 'type:', typeof eb.participantId);
                                                                        handleInputChange('selectedEBId', eb.participantId);
                                                                        setEbOpen(false);
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            formData.selectedEBId === eb.participantId ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    <div>
                                                                        <div className="font-medium">{eb.name}</div>
                                                                        <div className="text-sm text-gray-500">{eb.participantName}</div>
                                                                    </div>
                                                                </CommandItem>
                                                            )) || []}
                                                        </CommandGroup>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    )}

                                    {/* CR Selection Dropdown */}
                                    {formData.role === 'cr' && (
                                        <div>
                                            <Label htmlFor="selectedCR">Posição de Coordenador Regional *</Label>
                                            <Popover open={crOpen} onOpenChange={setCrOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={crOpen}
                                                        className="w-full justify-between"
                                                        disabled={crs === undefined}
                                                    >
                                                        {crs === undefined ? (
                                                            "Carregando posições..."
                                                        ) : formData.selectedCRId ? (
                                                            crs.find((cr) => cr.participantId === formData.selectedCRId)?.name || formData.selectedCRId
                                                        ) : (
                                                            "Selecione sua posição de CR..."
                                                        )}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-full p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Buscar por posição..." />
                                                        <CommandEmpty>
                                                            {crs?.length === 0 
                                                                ? "Nenhuma posição CR encontrada no sistema."
                                                                : "Nenhuma posição encontrada."
                                                            }
                                                        </CommandEmpty>
                                                        <CommandGroup className="max-h-64 overflow-y-auto">
                                                            {crs?.map((cr) => (
                                                                <CommandItem
                                                                    key={cr.id}
                                                                    value={cr.participantId}
                                                                    onSelect={() => {
                                                                        handleInputChange('selectedCRId', cr.participantId);
                                                                        setCrOpen(false);
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            formData.selectedCRId === cr.participantId ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    <div>
                                                                        <div className="font-medium">{cr.name}</div>
                                                                        <div className="text-sm text-gray-500">{cr.participantName}</div>
                                                                    </div>
                                                                </CommandItem>
                                                            )) || []}
                                                        </CommandGroup>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
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
                                                        disabled={comitesLocais === undefined}
                                                    >
                                                        {comitesLocais === undefined ? (
                                                            "Carregando comitês..."
                                                        ) : formData.comiteLocal ? (
                                                            comitesLocais.find((comite) => comite.participantId === formData.comiteLocal)?.name || formData.comiteLocal
                                                        ) : (
                                                            "Selecione um comitê local..."
                                                        )}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-full p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Buscar por nome do comitê..." />
                                                        <CommandEmpty>
                                                            {comitesLocais?.length === 0 
                                                                ? "Nenhum comitê encontrado no sistema."
                                                                : "Nenhum comitê encontrado."
                                                            }
                                                        </CommandEmpty>
                                                        <CommandGroup className="max-h-64 overflow-y-auto">
                                                            {comitesLocais?.map((comite) => (
                                                                <CommandItem
                                                                    key={comite.id}
                                                                    value={comite.participantId}
                                                                    onSelect={() => {
                                                                        handleInputChange('comiteLocal', comite.participantId);
                                                                        setComiteLocalOpen(false);
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            formData.comiteLocal === comite.participantId ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    <div>
                                                                        <div className="font-medium">{comite.name}</div>
                                                                        {(comite.cidade || comite.uf) && (
                                                                            <div className="text-sm text-gray-500">
                                                                                {comite.cidade}{comite.cidade && comite.uf ? ', ' : ''}{comite.uf}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </CommandItem>
                                                            )) || []}
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
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                    >
                                        {assembly.type === "AGE" ? "Finalizar Inscrição" : "Continuar"}
                                        <ArrowRight className="w-4 h-4 ml-2" />
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

// ModalityOption Component
function ModalityOption({ modality, isSelected, onSelect }: {
    modality: any;
    isSelected: boolean;
    onSelect: () => void;
}) {
    const formatPrice = (priceInCents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(priceInCents / 100);
    };

    return (
        <div 
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                isSelected 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            onClick={onSelect}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                            isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}>
                            {isSelected && (
                                <div className="w-full h-full rounded-full bg-white scale-50"></div>
                            )}
                        </div>
                        <h3 className="text-lg font-semibold">{modality.name}</h3>
                    </div>
                    
                    {modality.description && (
                        <p className="text-gray-600 mt-2 ml-7">{modality.description}</p>
                    )}
                    
                    <div className="flex items-center space-x-4 mt-3 ml-7">
                        <div>
                            <span className="text-sm text-gray-500">Preço: </span>
                            <span className="font-semibold text-green-600">
                                {modality.price === 0 ? "Gratuito" : formatPrice(modality.price)}
                            </span>
                        </div>
                        
                        {modality.maxParticipants && (
                            <div>
                                <span className="text-sm text-gray-500">Vagas: </span>
                                <span className="font-semibold">
                                    {modality.maxParticipants}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
} 