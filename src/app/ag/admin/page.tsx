"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Switch } from "../../../components/ui/switch";
import { Badge } from "../../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../../components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../../components/ui/dialog";
import { Checkbox } from "../../../components/ui/checkbox";
import { 
    Settings, 
    FileText, 
    CreditCard, 
    Users, 
    CheckCircle, 
    XCircle, 
    Clock,
    Eye,
    UserCheck,
    UserX,
    Save,
    Loader2,
    Download,
    AlertTriangle,
    Info,
    ExternalLink,
    ImageIcon,
    Plus,
    Edit,
    Trash2,
    Package,
    ClipboardCheck
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { useToast } from "~/components/ui/use-toast";
import { api as convexApi } from "../../../../convex/_generated/api";
import { isIfmsaEmailSession } from "~/server/lib/authcheck";
import PrecisaLogin from "~/app/_components/PrecisaLogin";
import { handleRegistrationApproval, handleRegistrationRejection } from "~/app/actions/emailExamples";

// Helper functions for participant type and room restriction labels
const getParticipantTypeLabel = (type: string) => {
    switch (type?.toLowerCase()) {
        case "eb": return "Executive Board";
        case "cr": return "Coordenador Regional";
        case "comite_local": return "Comitê Local";
        case "comite_aspirante": return "Comitê Aspirante";
        case "supco": return "Conselho Supervisor";
        case "observador_externo": return "Observador Externo";
        case "alumni": return "Alumni";
        default: return type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || "N/A";
    }
};

const getRoomRestrictionLabel = (restriction: string) => {
    switch (restriction?.toLowerCase()) {
        case "nao": return "Sem restrições";
        case "mesmo_sexo": return "Somente com pessoas do mesmo sexo";
        default: return restriction || "N/A";
    }
};

type AGConfig = {
    _id: string;
    codeOfConductUrl?: string;
    paymentInfo?: string;
    paymentInstructions?: string;
    bankDetails?: string;
    pixKey?: string;
    registrationEnabled: boolean;
    autoApproval: boolean;
    createdAt: number;
    updatedAt: number;
    updatedBy: string;
};

type Registration = {
    _id: string;
    _creationTime: number;
    assemblyId: string;
    modalityId?: string;
    participantType: string;
    participantId: string;
    participantName: string;
    participantRole?: string;
    participantStatus?: string;
    registeredAt: number;
    registeredBy: string;
    status: string;
    email?: string;
    phone?: string;
    specialNeeds?: string;
    reviewedAt?: number;
    reviewedBy?: string;
    reviewNotes?: string;
    cidade?: string;
    uf?: string;
    escola?: string;
    regional?: string;
    agFiliacao?: string;
    
    // Detailed personal information from registration form
    emailSolar?: string;
    dataNascimento?: string;
    cpf?: string;
    nomeCracha?: string;
    celular?: string;
    comiteLocal?: string;
    comiteAspirante?: string;
    autorizacaoCompartilhamento?: boolean;
    
    // Additional information from registration form
    experienciaAnterior?: string;
    motivacao?: string;
    expectativas?: string;
    dietaRestricoes?: string;
    alergias?: string;
    medicamentos?: string;
    necessidadesEspeciais?: string;
    restricaoQuarto?: string;
    pronomes?: string;
    contatoEmergenciaNome?: string;
    contatoEmergenciaTelefone?: string;
    outrasObservacoes?: string;
    participacaoComites?: string[];
    interesseVoluntariado?: boolean;
    
    // Payment information
    isPaymentExempt?: boolean;
    paymentExemptReason?: string;
    
    // Payment receipt fields
    receiptStorageId?: string;
    receiptFileName?: string;
    receiptFileType?: string;
    receiptFileSize?: number;
    receiptUploadedAt?: number;
    receiptUploadedBy?: string;
};

// Payment Receipt Viewer Component
function PaymentReceiptViewer({ storageId }: { storageId: string }) {
    const fileUrl = useQuery(convexApi.files?.getFileUrl, { storageId });
    
    if (!fileUrl) {
        return (
            <Button size="sm" disabled>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Carregando...
            </Button>
        );
    }
    
    return (
        <Button 
            size="sm" 
            variant="outline"
            onClick={() => window.open(fileUrl, '_blank')}
            className="text-blue-600 hover:text-blue-700"
        >
            <ExternalLink className="w-3 h-3 mr-1" />
            Ver Comprovante
        </Button>
    );
}

// ModalityRegistrationsView Component
function ModalityRegistrationsView({ modality, onReviewRegistration }: {
    modality: any;
    onReviewRegistration: (registration: Registration) => void;
}) {
    const registrations = useQuery(convexApi.registrationModalities?.getRegistrations, { modalityId: modality._id });
    const modalityStats = useQuery(convexApi.registrationModalities?.getModalityStats, { modalityId: modality._id });

    const formatPrice = (priceInCents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(priceInCents / 100);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "pending_review": return "bg-orange-100 text-orange-800 border-orange-200";
            case "approved": return "bg-green-100 text-green-800 border-green-200";
            case "rejected": return "bg-red-100 text-red-800 border-red-200";
            case "cancelled": return "bg-gray-100 text-gray-800 border-gray-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "pending": return "Pendente";
            case "pending_review": return "Aguardando Análise";
            case "approved": return "Aprovado";
            case "rejected": return "Rejeitado";
            case "cancelled": return "Cancelado";
            default: return status;
        }
    };

    // Format participant type with polished labels
    const getParticipantTypeLabel = (type: string) => {
        switch (type?.toLowerCase()) {
            case "eb": return "Executive Board";
            case "cr": return "Coordenador Regional";
            case "comite_local": return "Comitê Local";
            case "comite_aspirante": return "Comitê Aspirante";
            case "supco": return "Conselho Supervisor";
            case "observador_externo": return "Observador Externo";
            case "alumni": return "Alumni";
            default: return type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || "N/A";
        }
    };

    // Format room restrictions with polished labels
    const getRoomRestrictionLabel = (restriction: string) => {
        switch (restriction?.toLowerCase()) {
            case "nao": return "Sem restrições";
            case "mesmo_sexo": return "Somente com pessoas do mesmo sexo";
            default: return restriction || "N/A";
        }
    };

    return (
        <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center space-x-2">
                            <Package className="w-4 h-4 text-purple-600" />
                            <span>{modality.name}</span>
                        </CardTitle>
                        {modality.description && (
                            <p className="text-sm text-gray-600 mt-1">{modality.description}</p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-bold text-purple-600">
                            {modality.price === 0 ? "Gratuito" : formatPrice(modality.price)}
                        </p>
                        <p className="text-sm text-gray-600">
                            {modalityStats?.currentRegistrations || 0}
                            {modality.maxParticipants ? ` / ${modality.maxParticipants}` : " / ∞"} inscrições
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {registrations && registrations.length > 0 ? (
                    <div className="space-y-4">
                        {/* Status Summary */}
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(modalityStats?.byStatus || {}).map(([status, count]) => (
                                <Badge key={status} className={getStatusColor(status)}>
                                    {getStatusLabel(status)}: {count as number}
                                </Badge>
                            ))}
                        </div>

                        {/* Registrations Table */}
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {registrations.map((registration) => (
                                        <TableRow key={registration._id}>
                                            <TableCell className="font-medium">
                                                {registration.participantName}
                                            </TableCell>
                                            <TableCell>{registration.email}</TableCell>
                                            <TableCell>
                                                <Badge className={getStatusColor(registration.status)}>
                                                    {getStatusLabel(registration.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(registration.registeredAt).toLocaleDateString('pt-BR')}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => onReviewRegistration(registration)}
                                                >
                                                    <Eye className="w-3 h-3 mr-1" />
                                                    Ver
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">Nenhuma inscrição nesta modalidade</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ModalityDisplayInfo Component
function ModalityDisplayInfo({ modalityId }: { modalityId: string }) {
    const modality = useQuery(convexApi.registrationModalities?.getById, { id: modalityId as any });
    const modalityStats = useQuery(convexApi.registrationModalities?.getModalityStats, { modalityId: modalityId as any });
    
    const formatPrice = (priceInCents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(priceInCents / 100);
    };

    if (!modality) {
        return <div className="text-sm text-gray-500">Carregando modalidade...</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <Label className="font-semibold text-purple-700">Nome:</Label>
                <p className="text-sm">{modality.name}</p>
            </div>
            <div>
                <Label className="font-semibold text-purple-700">Preço:</Label>
                <p className="text-sm font-medium">
                    {modality.price === 0 ? "Gratuito" : formatPrice(modality.price)}
                </p>
            </div>
            <div>
                <Label className="font-semibold text-purple-700">Capacidade:</Label>
                <p className="text-sm">
                    {modalityStats?.currentRegistrations || 0}
                    {modality.maxParticipants ? ` / ${modality.maxParticipants}` : " / ∞"}
                    {modalityStats?.isFull && " (Lotado)"}
                    {modalityStats?.isNearFull && !modalityStats?.isFull && " (Quase lotado)"}
                </p>
            </div>
            {modality.description && (
                <div className="col-span-1 md:col-span-3">
                    <Label className="font-semibold text-purple-700">Descrição:</Label>
                    <p className="text-sm p-2 bg-purple-50 rounded">{modality.description}</p>
                </div>
            )}
        </div>
    );
}

export default function AGAdminPage() {
    const { data: userSession } = useSession();
    const { toast } = useToast();
    
    const [isIfmsaEmail, setIsIfmsaEmail] = useState<boolean | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // AG Configuration state
    const [configData, setConfigData] = useState({
        codeOfConductUrl: "",
        paymentInfo: "",
        paymentInstructions: "",
        bankDetails: "",
        pixKey: "",
        registrationEnabled: true,
        autoApproval: false,
    });

    // Registration management state
    const [selectedAssemblyId, setSelectedAssemblyId] = useState<string>("");
    const [selectedRegistrations, setSelectedRegistrations] = useState<string[]>([]);
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
    const [reviewNotes, setReviewNotes] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [registrationToDelete, setRegistrationToDelete] = useState<Registration | null>(null);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

    // Modality management state
    const [modalityDialogOpen, setModalityDialogOpen] = useState(false);
    const [editModalityId, setEditModalityId] = useState<string | null>(null);
    const [selectedModalityId, setSelectedModalityId] = useState<string | null>(null);
    const [modalityFormData, setModalityFormData] = useState({
        name: "",
        description: "",
        price: "",
        maxParticipants: "",
    });

    // Convex queries and mutations
    const agConfig = useQuery(convexApi.agConfig?.get);
    const assemblies = useQuery(convexApi.assemblies?.getAll);
    const allRegistrations = useQuery(
        convexApi.agRegistrations?.getAllForAdmin,
        selectedAssemblyId ? { assemblyId: selectedAssemblyId as any } : "skip"
    );
    const pendingRegistrations = useQuery(
        convexApi.agRegistrations?.getPendingRegistrations,
        selectedAssemblyId ? { assemblyId: selectedAssemblyId as any } : "skip"
    );
    const modalities = useQuery(
        convexApi.registrationModalities?.getByAssembly,
        selectedAssemblyId ? { assemblyId: selectedAssemblyId as any } : "skip"
    );

    // Session-related queries
    const allSessions = useQuery(
        convexApi.agSessions?.getAllSessions,
        selectedAssemblyId ? { assemblyId: selectedAssemblyId as any } : "skip"
    );

    // Add queries for EB and CR data to lookup specific roles
    const ebs = useQuery(convexApi.assemblies?.getEBs) || [];
    const crs = useQuery(convexApi.assemblies?.getCRs) || [];

    // Get modality stats for each modality
    const modalityStats = useQuery(
        convexApi.registrationModalities?.getModalityStats,
        selectedModalityId ? { modalityId: selectedModalityId as any } : "skip"
    );

    const upsertConfig = useMutation(convexApi.agConfig?.upsert);
    const approveRegistration = useMutation(convexApi.agRegistrations?.approve);
    const rejectRegistration = useMutation(convexApi.agRegistrations?.reject);
    const bulkApprove = useMutation(convexApi.agRegistrations?.bulkApprove);
    const bulkReject = useMutation(convexApi.agRegistrations?.bulkReject);
    const createModality = useMutation(convexApi.registrationModalities?.create);
    const updateModality = useMutation(convexApi.registrationModalities?.update);
    const removeModality = useMutation(convexApi.registrationModalities?.remove);
    const deleteRegistration = useMutation(convexApi.agRegistrations?.deleteRegistration);
    const bulkDeleteRegistrations = useMutation(convexApi.agRegistrations?.bulkDelete);

    // Session mutations
    const deleteSession = useMutation(convexApi.agSessions?.deleteSession);
    const reopenSession = useMutation(convexApi.agSessions?.reopenSession);
    const archiveSession = useMutation(convexApi.agSessions?.archiveSession);
    const createSessionMutation = useMutation(convexApi.agSessions?.createSession);

    // Download session report functionality
    const handleDownloadSessionReport = useCallback(async (sessionId: string, sessionName: string, sessionType: string) => {
        try {
            // Import XLSX dynamically
            const XLSX = await import('xlsx');
            
            toast({
                title: "⏳ Gerando relatório...",
                description: "Por favor, aguarde enquanto o relatório é gerado.",
            });
            
            // For now, create a basic report structure
            // This will generate an Excel file showing the session information
            const workbook = XLSX.utils.book_new();
            
            // Create basic session info sheet
            const sessionInfo = [
                [`Relatório de Presença - ${sessionName}`],
                [''],
                [`Tipo de sessão: ${sessionType === 'plenaria' ? 'Plenária' : sessionType === 'sessao' ? 'Sessão' : 'Avulsa'}`],
                [`ID da sessão: ${sessionId}`],
                [`Gerado em: ${new Date().toLocaleString('pt-BR')}`],
                [''],
                ['📋 INSTRUÇÕES:'],
                ['1. Este relatório foi gerado automaticamente'],
                ['2. Para obter dados de presença em tempo real, acesse a Chamada AG'],
                ['3. Use este relatório como base para análises de participação'],
                [''],
                ['ℹ️ NOTA:'],
                ['Para relatórios detalhados com dados de presença em tempo real,'],
                ['utilize a funcionalidade de download na interface da Chamada AG'],
                ['após finalizar a sessão.']
            ];
            
            const infoSheet = XLSX.utils.aoa_to_sheet(sessionInfo);
            XLSX.utils.book_append_sheet(workbook, infoSheet, 'Informações da Sessão');
            
            // Create template sheets based on session type
            if (sessionType === 'plenaria') {
                // Template for plenária participants
                const plenTemplate = [
                    ['Template - Diretoria Executiva'],
                    [''],
                    ['Nome', 'Cargo', 'Status de Presença', 'Observações'],
                    ['[Nome do EB]', '[Cargo]', '[Presente/Ausente/Excluído]', '[Obs]'],
                    [''],
                    ['💡 DICA: Utilize a Chamada AG para marcar presenças em tempo real']
                ];
                const ebSheet = XLSX.utils.aoa_to_sheet(plenTemplate);
                XLSX.utils.book_append_sheet(workbook, ebSheet, 'Template EBs');
                
                const crTemplate = [
                    ['Template - Coordenadores Regionais'],
                    [''],
                    ['Nome', 'Regional', 'Status de Presença', 'Observações'],
                    ['[Nome do CR]', '[Regional]', '[Presente/Ausente/Excluído]', '[Obs]'],
                    [''],
                    ['💡 DICA: Utilize a Chamada AG para marcar presenças em tempo real']
                ];
                const crSheet = XLSX.utils.aoa_to_sheet(crTemplate);
                XLSX.utils.book_append_sheet(workbook, crSheet, 'Template CRs');
                
                const comiteTemplate = [
                    ['Template - Comitês Locais'],
                    [''],
                    ['Comitê', 'Status', 'Status de Presença', 'Observações'],
                    ['[Nome do Comitê]', '[Pleno/Não-pleno]', '[Presente/Ausente/Excluído]', '[Obs]'],
                    [''],
                    ['💡 DICA: Utilize a Chamada AG para marcar presenças em tempo real']
                ];
                const comiteSheet = XLSX.utils.aoa_to_sheet(comiteTemplate);
                XLSX.utils.book_append_sheet(workbook, comiteSheet, 'Template Comitês');
                
            } else if (sessionType === 'sessao') {
                // Template for sessão participants
                const participantTemplate = [
                    ['Template - Participantes da Sessão'],
                    [''],
                    ['Nome', 'Comitê/Organização', 'Status de Presença', 'Observações'],
                    ['[Nome do Participante]', '[Comitê/Org]', '[Presente/Ausente/Excluído]', '[Obs]'],
                    [''],
                    ['💡 DICA: Utilize a Chamada AG para marcar presenças em tempo real']
                ];
                const participantSheet = XLSX.utils.aoa_to_sheet(participantTemplate);
                XLSX.utils.book_append_sheet(workbook, participantSheet, 'Template Participantes');
            }

            // Generate and download file
            const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            const fileName = `relatorio-presenca-${sessionType}-${sessionName.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.xlsx`;
            link.download = fileName;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast({
                title: "✅ Relatório baixado",
                description: `Relatório de presença da ${sessionType === 'plenaria' ? 'plenária' : 'sessão'} "${sessionName}" foi baixado com sucesso.`,
            });
            
        } catch (error) {
            console.error("Error downloading session report:", error);
            toast({
                title: "❌ Erro",
                description: "Erro ao baixar relatório. Tente novamente.",
                variant: "destructive",
            });
        }
    }, [toast]);

    // Session creation state
    const [sessionCreationDialogOpen, setSessionCreationDialogOpen] = useState(false);
    const [newSessionData, setNewSessionData] = useState({
        name: "",
        type: "plenaria" as "plenaria" | "sessao",
    });
    const [isCreatingSession, setIsCreatingSession] = useState(false);

    // Check IFMSA email on session change
    useEffect(() => {
        const checkEmail = async () => {
            if (userSession) {
                const result = await isIfmsaEmailSession(userSession);
                setIsIfmsaEmail(result);
            } else {
                setIsIfmsaEmail(false);
            }
        };
        checkEmail();
    }, [userSession]);

    // Load config data when available
    useEffect(() => {
        if (agConfig) {
            setConfigData({
                codeOfConductUrl: agConfig.codeOfConductUrl || "",
                paymentInfo: agConfig.paymentInfo || "",
                paymentInstructions: agConfig.paymentInstructions || "",
                bankDetails: agConfig.bankDetails || "",
                pixKey: agConfig.pixKey || "",
                registrationEnabled: agConfig.registrationEnabled,
                autoApproval: agConfig.autoApproval,
            });
        }
    }, [agConfig]);

    // Auto-select first assembly if available
    useEffect(() => {
        if (assemblies && assemblies.length > 0 && !selectedAssemblyId) {
            setSelectedAssemblyId(assemblies[0]!._id);
        }
    }, [assemblies, selectedAssemblyId]);

    const handleConfigInputChange = useCallback((field: string, value: string | boolean) => {
        setConfigData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleSaveConfig = useCallback(async () => {
        if (!userSession?.user?.id) return;

        setIsSaving(true);
        try {
            await upsertConfig({
                ...configData,
                updatedBy: userSession.user.id,
            });
            
            toast({
                title: "✅ Configuração Salva",
                description: "As configurações de AG foram atualizadas com sucesso.",
            });
        } catch (error) {
            console.error("Error saving AG config:", error);
            toast({
                title: "❌ Erro",
                description: "Erro ao salvar configurações. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    }, [configData, userSession?.user?.id, upsertConfig, toast]);

    const handleApproveRegistration = useCallback(async (registrationId: string, notes?: string) => {
        if (!userSession?.user?.id) return;

        try {
            await approveRegistration({
                registrationId: registrationId as any,
                approvedBy: userSession.user.id,
                notes,
            });
            
            // Send approval email
            if (selectedRegistration && assemblies) {
                try {
                    const assembly = assemblies.find(a => a._id === selectedRegistration.assemblyId);
                    let modalityName = "N/A";
                    
                    if (selectedRegistration.modalityId && modalities) {
                        const modality = modalities.find(m => m._id === selectedRegistration.modalityId);
                        modalityName = modality?.name || "N/A";
                    }
                    
                    if (assembly) {
                        await handleRegistrationApproval({
                            registrationId: selectedRegistration._id,
                            assemblyId: selectedRegistration.assemblyId,
                            participantName: selectedRegistration.participantName,
                            participantEmail: selectedRegistration.email || '',
                            assemblyName: assembly.name,
                            assemblyLocation: assembly.location,
                            assemblyStartDate: new Date(assembly.startDate),
                            assemblyEndDate: new Date(assembly.endDate),
                            modalityName: modalityName,
                            additionalInstructions: notes || "Sua inscrição foi aprovada pela equipe da IFMSA Brazil.",
                            paymentAmount: selectedRegistration.modalityId && modalities ? 
                                (() => {
                                    const modality = modalities.find(m => m._id === selectedRegistration.modalityId);
                                    return modality?.price ? modality.price / 100 : undefined;
                                })() : undefined,
                            isPaymentExempt: selectedRegistration.isPaymentExempt,
                            paymentExemptReason: selectedRegistration.paymentExemptReason
                        });
                        console.log('✅ Approval email sent successfully');
                    }
                } catch (emailError) {
                    console.error('⚠️ Failed to send approval email:', emailError);
                    // Don't fail the approval if email fails, just log the error
                }
            }
            
            toast({
                title: "✅ Inscrição Aprovada",
                description: "A inscrição foi aprovada com sucesso e o participante foi notificado por email.",
            });
            
            setReviewDialogOpen(false);
            setSelectedRegistration(null);
            setReviewNotes("");
        } catch (error) {
            toast({
                title: "❌ Erro",
                description: "Erro ao aprovar inscrição. Tente novamente.",
                variant: "destructive",
            });
        }
    }, [userSession?.user?.id, approveRegistration, toast, selectedRegistration, assemblies, modalities]);

    const handleRejectRegistration = useCallback(async (registrationId: string, notes?: string) => {
        if (!userSession?.user?.id) return;

        // Require notes for rejection
        if (!notes || notes.trim() === "") {
            toast({
                title: "❌ Erro",
                description: "É obrigatório fornecer uma justificativa para rejeitar a inscrição.",
                variant: "destructive",
            });
            return;
        }

        try {
            await rejectRegistration({
                registrationId: registrationId as any,
                rejectedBy: userSession.user.id,
                notes,
            });
            
            // Send rejection email
            if (selectedRegistration && assemblies) {
                try {
                    const assembly = assemblies.find(a => a._id === selectedRegistration.assemblyId);
                    
                    if (assembly) {
                        await handleRegistrationRejection({
                            registrationId: selectedRegistration._id,
                            participantName: selectedRegistration.participantName,
                            participantEmail: selectedRegistration.email || '',
                            assemblyName: assembly.name,
                            rejectionReason: notes,
                            canResubmit: true,
                        });
                        console.log('✅ Rejection email sent successfully');
                    }
                } catch (emailError) {
                    console.error('⚠️ Failed to send rejection email:', emailError);
                    // Don't fail the rejection if email fails, just log the error
                }
            }
            
            toast({
                title: "✅ Inscrição Rejeitada",
                description: "A inscrição foi rejeitada com sucesso e o participante foi notificado por email.",
            });
            
            setReviewDialogOpen(false);
            setSelectedRegistration(null);
            setReviewNotes("");
        } catch (error) {
            toast({
                title: "❌ Erro",
                description: "Erro ao rejeitar inscrição. Tente novamente.",
                variant: "destructive",
            });
        }
    }, [userSession?.user?.id, rejectRegistration, toast, selectedRegistration, assemblies]);

    const handleBulkApprove = useCallback(async () => {
        if (!userSession?.user?.id || selectedRegistrations.length === 0) return;

        try {
            await bulkApprove({
                registrationIds: selectedRegistrations as any,
                approvedBy: userSession.user.id,
                notes: "Aprovação em lote",
            });
            
            toast({
                title: "✅ Inscrições Aprovadas",
                description: `${selectedRegistrations.length} inscrições foram aprovadas.`,
            });
            
            setSelectedRegistrations([]);
        } catch (error) {
            toast({
                title: "❌ Erro",
                description: "Erro ao aprovar inscrições em lote. Tente novamente.",
                variant: "destructive",
            });
        }
    }, [userSession?.user?.id, selectedRegistrations, bulkApprove, toast]);

    const handleBulkReject = useCallback(async () => {
        if (!userSession?.user?.id || selectedRegistrations.length === 0) return;

        try {
            await bulkReject({
                registrationIds: selectedRegistrations as any,
                rejectedBy: userSession.user.id,
                notes: "Rejeição em lote",
            });
            
            toast({
                title: "❌ Inscrições Rejeitadas",
                description: `${selectedRegistrations.length} inscrições foram rejeitadas.`,
            });
            
            setSelectedRegistrations([]);
        } catch (error) {
            toast({
                title: "❌ Erro",
                description: "Erro ao rejeitar inscrições em lote. Tente novamente.",
                variant: "destructive",
            });
        }
    }, [userSession?.user?.id, selectedRegistrations, bulkReject, toast]);

    // Handle single registration deletion
    const handleDeleteRegistration = useCallback(async (registrationId: string) => {
        if (!userSession?.user?.id) return;

        try {
            const result = await deleteRegistration({
                registrationId: registrationId as any,
                deletedBy: userSession.user.id,
            });
            
            toast({
                title: "✅ Inscrição Deletada",
                description: result.message,
            });
            
            setDeleteDialogOpen(false);
            setRegistrationToDelete(null);
        } catch (error) {
            toast({
                title: "❌ Erro",
                description: "Erro ao deletar inscrição. Tente novamente.",
                variant: "destructive",
            });
        }
    }, [userSession?.user?.id, deleteRegistration, toast]);

    // Handle bulk deletion
    const handleBulkDelete = useCallback(async () => {
        if (!userSession?.user?.id || selectedRegistrations.length === 0) return;

        try {
            const result = await bulkDeleteRegistrations({
                registrationIds: selectedRegistrations as any,
                deletedBy: userSession.user.id,
            });
            
            toast({
                title: "✅ Inscrições Deletadas",
                description: result.message,
            });
            
            setSelectedRegistrations([]);
            setBulkDeleteDialogOpen(false);
        } catch (error) {
            toast({
                title: "❌ Erro",
                description: "Erro ao deletar inscrições em lote. Tente novamente.",
                variant: "destructive",
            });
        }
    }, [userSession?.user?.id, selectedRegistrations, bulkDeleteRegistrations, toast]);

    // Modality management handlers
    const handleCreateModality = useCallback(async () => {
        if (!userSession?.user?.id || !selectedAssemblyId) return;

        try {
            await createModality({
                assemblyId: selectedAssemblyId as any,
                name: modalityFormData.name,
                description: modalityFormData.description || undefined,
                price: Math.round(parseFloat(modalityFormData.price) * 100), // Convert to cents
                maxParticipants: modalityFormData.maxParticipants ? parseInt(modalityFormData.maxParticipants) : undefined,
                createdBy: userSession.user.id,
            });
            
            toast({
                title: "✅ Modalidade Criada",
                description: "Nova modalidade de inscrição criada com sucesso.",
            });
            
            setModalityDialogOpen(false);
            setModalityFormData({ name: "", description: "", price: "", maxParticipants: "" });
        } catch (error) {
            toast({
                title: "❌ Erro",
                description: "Erro ao criar modalidade. Tente novamente.",
                variant: "destructive",
            });
        }
    }, [userSession?.user?.id, selectedAssemblyId, modalityFormData, createModality, toast]);

    const handleUpdateModality = useCallback(async () => {
        if (!editModalityId) return;

        try {
            await updateModality({
                id: editModalityId as any,
                name: modalityFormData.name,
                description: modalityFormData.description || undefined,
                price: Math.round(parseFloat(modalityFormData.price) * 100), // Convert to cents
                maxParticipants: modalityFormData.maxParticipants ? parseInt(modalityFormData.maxParticipants) : undefined,
            });
            
            toast({
                title: "✅ Modalidade Atualizada",
                description: "Modalidade atualizada com sucesso.",
            });
            
            setModalityDialogOpen(false);
            setEditModalityId(null);
            setModalityFormData({ name: "", description: "", price: "", maxParticipants: "" });
        } catch (error) {
            toast({
                title: "❌ Erro",
                description: "Erro ao atualizar modalidade. Tente novamente.",
                variant: "destructive",
            });
        }
    }, [editModalityId, modalityFormData, updateModality, toast]);

    const handleDeleteModality = useCallback(async (modalityId: string) => {
        try {
            await removeModality({ id: modalityId as any });
            
            toast({
                title: "✅ Modalidade Removida",
                description: "Modalidade removida com sucesso.",
            });
        } catch (error) {
            toast({
                title: "❌ Erro",
                description: "Não é possível remover modalidade com inscrições existentes.",
                variant: "destructive",
            });
        }
    }, [removeModality, toast]);

    const openModalityDialog = useCallback((modality?: any) => {
        if (modality) {
            setEditModalityId(modality._id);
            setModalityFormData({
                name: modality.name,
                description: modality.description || "",
                price: (modality.price / 100).toFixed(2), // Convert from cents
                maxParticipants: modality.maxParticipants?.toString() || "",
            });
        } else {
            setEditModalityId(null);
            setModalityFormData({ name: "", description: "", price: "", maxParticipants: "" });
        }
        setModalityDialogOpen(true);
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "pending_review": return "bg-orange-100 text-orange-800 border-orange-200";
            case "approved": return "bg-green-100 text-green-800 border-green-200";
            case "rejected": return "bg-red-100 text-red-800 border-red-200";
            case "cancelled": return "bg-gray-100 text-gray-800 border-gray-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "pending": return <Clock className="w-4 h-4" />;
            case "pending_review": return <FileText className="w-4 h-4" />;
            case "approved": return <CheckCircle className="w-4 h-4" />;
            case "rejected": return <XCircle className="w-4 h-4" />;
            case "cancelled": return <AlertTriangle className="w-4 h-4" />;
            default: return <Info className="w-4 h-4" />;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "pending": return "Pendente";
            case "pending_review": return "Aguardando Análise";
            case "approved": return "Aprovado";
            case "rejected": return "Rejeitado";
            case "cancelled": return "Cancelado";
            default: return status;
        }
    };

    // Enhanced function that includes role information for EB and CR
    const getDetailedParticipantTypeLabel = (registration: Registration) => {
        const baseType = getParticipantTypeLabel(registration.participantType);
        
        // For EB, look up the specific role from the EBs data
        if (registration.participantType?.toLowerCase() === "eb" && registration.participantId) {
            const ebData = ebs.find((eb: any) => eb.participantId === registration.participantId);
            if (ebData) {
                return `${baseType} - ${ebData.name}`;
            }
        } 
        // For CR, look up the specific role from the CRs data
        else if (registration.participantType?.toLowerCase() === "cr" && registration.participantId) {
            const crData = crs.find((cr: any) => cr.participantId === registration.participantId);
            if (crData) {
                return `${baseType} - ${crData.name}`;
            }
        }
        
        return baseType;
    };

    // Session management handlers
    const handleCreateSession = useCallback(async () => {
        if (!userSession?.user?.id || !selectedAssemblyId || !newSessionData.name.trim()) {
            toast({
                title: "❌ Erro",
                description: "Preencha todos os campos obrigatórios.",
                variant: "destructive",
            });
            return;
        }

        setIsCreatingSession(true);
        try {
            await createSessionMutation({
                assemblyId: selectedAssemblyId as any,
                name: newSessionData.name.trim(),
                type: newSessionData.type,
                createdBy: userSession.user.id,
            });
            
            toast({
                title: "✅ Sessão Criada",
                description: `${newSessionData.type === "plenaria" ? "Plenária" : "Sessão"} "${newSessionData.name}" criada com sucesso.`,
            });
            
            setSessionCreationDialogOpen(false);
            setNewSessionData({ name: "", type: "plenaria" });
        } catch (error) {
            console.error("Error creating session:", error);
            toast({
                title: "❌ Erro",
                description: "Erro ao criar sessão. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setIsCreatingSession(false);
        }
    }, [userSession?.user?.id, selectedAssemblyId, newSessionData, createSessionMutation, toast]);

    if (!userSession) {
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

    if (isIfmsaEmail === false) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
                <Card className="w-96">
                    <CardContent className="text-center py-12">
                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Acesso Restrito
                        </h3>
                        <p className="text-gray-600">
                            Esta página é restrita a administradores da IFMSA Brazil.
                        </p>
                    </CardContent>
                </Card>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="container mx-auto px-6 py-12">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                            <Settings className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                                Administração de AGs
                            </h1>
                            <p className="text-gray-600">
                                Configure e gerencie assembleias gerais
                            </p>
                        </div>
                    </div>

                    <Tabs defaultValue="config" className="space-y-6">
                        <TabsList className="grid w-full grid-cols-6">
                            <TabsTrigger value="config" className="flex items-center space-x-2">
                                <Settings className="w-4 h-4" />
                                <span>Configurações</span>
                            </TabsTrigger>
                            <TabsTrigger value="modalities" className="flex items-center space-x-2">
                                <Package className="w-4 h-4" />
                                <span>Modalidades</span>
                            </TabsTrigger>
                            <TabsTrigger value="sessions" className="flex items-center space-x-2">
                                <ClipboardCheck className="w-4 h-4" />
                                <span>Sessões</span>
                            </TabsTrigger>
                            <TabsTrigger value="by-modality" className="flex items-center space-x-2">
                                <Users className="w-4 h-4" />
                                <span>Por Modalidade</span>
                            </TabsTrigger>
                            <TabsTrigger value="registrations" className="flex items-center space-x-2">
                                <Users className="w-4 h-4" />
                                <span>Inscrições</span>
                            </TabsTrigger>
                            <TabsTrigger value="pending" className="flex items-center space-x-2">
                                <Clock className="w-4 h-4" />
                                <span>Aguardando Revisão</span>
                            </TabsTrigger>
                        </TabsList>

                        {/* Configuration Tab */}
                        <TabsContent value="config">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Code of Conduct Configuration */}
                                <Card className="shadow-lg border-0">
                                    <CardHeader>
                                        <CardTitle className="flex items-center space-x-2">
                                            <FileText className="w-5 h-5 text-blue-600" />
                                            <span>Código de Conduta</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <Label htmlFor="codeOfConductUrl">URL do PDF do Código de Conduta</Label>
                                            <Input
                                                id="codeOfConductUrl"
                                                value={configData.codeOfConductUrl}
                                                onChange={(e) => handleConfigInputChange('codeOfConductUrl', e.target.value)}
                                                placeholder="https://exemplo.com/codigo-de-conduta.pdf"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Link direto para o PDF do código de conduta que será usado nas inscrições
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Payment Configuration */}
                                <Card className="shadow-lg border-0">
                                    <CardHeader>
                                        <CardTitle className="flex items-center space-x-2">
                                            <CreditCard className="w-5 h-5 text-green-600" />
                                            <span>Informações de Pagamento</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <Label htmlFor="paymentInfo">Informações Gerais</Label>
                                            <Textarea
                                                id="paymentInfo"
                                                value={configData.paymentInfo}
                                                onChange={(e) => handleConfigInputChange('paymentInfo', e.target.value)}
                                                placeholder="Informações gerais sobre pagamento..."
                                                rows={3}
                                            />
                                        </div>
                                        
                                        <div>
                                            <Label htmlFor="pixKey">Chave PIX</Label>
                                            <Input
                                                id="pixKey"
                                                value={configData.pixKey}
                                                onChange={(e) => handleConfigInputChange('pixKey', e.target.value)}
                                                placeholder="exemplo@ifmsabrazil.org"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Payment Details */}
                                <Card className="shadow-lg border-0">
                                    <CardHeader>
                                        <CardTitle>Instruções de Pagamento</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <Label htmlFor="paymentInstructions">Instruções Detalhadas</Label>
                                            <Textarea
                                                id="paymentInstructions"
                                                value={configData.paymentInstructions}
                                                onChange={(e) => handleConfigInputChange('paymentInstructions', e.target.value)}
                                                placeholder="Instruções passo a passo para pagamento..."
                                                rows={4}
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="bankDetails">Dados Bancários</Label>
                                            <Textarea
                                                id="bankDetails"
                                                value={configData.bankDetails}
                                                onChange={(e) => handleConfigInputChange('bankDetails', e.target.value)}
                                                placeholder="Banco, agência, conta..."
                                                rows={3}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Registration Settings */}
                                <Card className="shadow-lg border-0">
                                    <CardHeader>
                                        <CardTitle className="flex items-center space-x-2">
                                            <UserCheck className="w-5 h-5 text-purple-600" />
                                            <span>Configurações de Inscrição</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <Users className="w-5 h-5 text-blue-600" />
                                                <div>
                                                    <Label className="text-base font-semibold">Inscrições Habilitadas</Label>
                                                    <p className="text-sm text-gray-600">Permite inscrições nas AGs</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={configData.registrationEnabled}
                                                onCheckedChange={(checked) => handleConfigInputChange('registrationEnabled', checked)}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <CheckCircle className="w-5 h-5 text-green-600" />
                                                <div>
                                                    <Label className="text-base font-semibold">Aprovação Automática</Label>
                                                    <p className="text-sm text-gray-600">Aprovar inscrições automaticamente</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={configData.autoApproval}
                                                onCheckedChange={(checked) => handleConfigInputChange('autoApproval', checked)}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Save Button */}
                            <div className="flex justify-end">
                                <Button 
                                    onClick={handleSaveConfig} 
                                    disabled={isSaving}
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Salvar Configurações
                                        </>
                                    )}
                                </Button>
                            </div>
                        </TabsContent>

                        {/* Modalities Tab */}
                        <TabsContent value="modalities">
                            <div className="space-y-6">
                                {/* Assembly Selection */}
                                <Card className="shadow-lg border-0">
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            <span className="flex items-center space-x-2">
                                                <Package className="w-5 h-5 text-purple-600" />
                                                <span>Modalidades de Inscrição</span>
                                            </span>
                                            <div className="flex items-center space-x-4">
                                                <Label htmlFor="modality-assembly-select">Assembleia:</Label>
                                                <select
                                                    id="modality-assembly-select"
                                                    value={selectedAssemblyId}
                                                    onChange={(e) => setSelectedAssemblyId(e.target.value)}
                                                    className="px-3 py-2 border border-gray-300 rounded-md"
                                                >
                                                    {assemblies?.map((assembly) => (
                                                        <option key={assembly._id} value={assembly._id}>
                                                            {assembly.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <Button 
                                                    onClick={() => openModalityDialog()}
                                                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Nova Modalidade
                                                </Button>
                                            </div>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {selectedAssemblyId && modalities && modalities.length > 0 ? (
                                            <div className="grid gap-4">
                                                {modalities.map((modality) => (
                                                    <ModalityCard 
                                                        key={modality._id} 
                                                        modality={modality}
                                                        onEdit={() => openModalityDialog(modality)}
                                                        onDelete={() => handleDeleteModality(modality._id)}
                                                    />
                                                ))}
                                            </div>
                                        ) : selectedAssemblyId ? (
                                            <div className="text-center py-12">
                                                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                                    Nenhuma modalidade criada
                                                </h3>
                                                <p className="text-gray-600 mb-4">
                                                    Crie modalidades de inscrição para esta assembleia.
                                                </p>
                                                <Button 
                                                    onClick={() => openModalityDialog()}
                                                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Criar Primeira Modalidade
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="text-center py-12">
                                                <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                                    Selecione uma assembleia
                                                </h3>
                                                <p className="text-gray-600">
                                                    Escolha uma assembleia para gerenciar suas modalidades.
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        {/* Sessions Tab */}
                        <TabsContent value="sessions">
                            <Card className="shadow-lg border-0">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center space-x-2">
                                            <ClipboardCheck className="w-5 h-5 text-blue-600" />
                                            <span>Sessões e Plenárias</span>
                                        </CardTitle>
                                        <div className="flex items-center space-x-4">
                                            <Label htmlFor="sessions-assembly-select">Assembleia:</Label>
                                            <select
                                                id="sessions-assembly-select"
                                                value={selectedAssemblyId}
                                                onChange={(e) => setSelectedAssemblyId(e.target.value)}
                                                className="px-3 py-2 border border-gray-300 rounded-md"
                                            >
                                                <option value="">Selecione uma assembleia...</option>
                                                {assemblies?.map((assembly) => (
                                                    <option key={assembly._id} value={assembly._id}>
                                                        {assembly.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {selectedAssemblyId && (
                                                <Button 
                                                    onClick={() => setSessionCreationDialogOpen(true)}
                                                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Nova Sessão
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {selectedAssemblyId && allSessions && allSessions.length > 0 ? (
                                        <div className="space-y-4">
                                            {allSessions.map((session) => (
                                                <SessionCard 
                                                    key={session._id} 
                                                    session={session}
                                                    onDownloadReport={handleDownloadSessionReport}
                                                    onDelete={async (sessionId: string) => {
                                                        if (window.confirm("Tem certeza que deseja deletar esta sessão? Esta ação não pode ser desfeita.")) {
                                                            try {
                                                                await deleteSession({
                                                                    sessionId: sessionId as any,
                                                                    deletedBy: userSession?.user?.id || "admin",
                                                                });
                                                                toast({
                                                                    title: "✅ Sessão deletada",
                                                                    description: "A sessão foi deletada com sucesso.",
                                                                });
                                                            } catch (error) {
                                                                toast({
                                                                    title: "❌ Erro",
                                                                    description: "Erro ao deletar sessão.",
                                                                    variant: "destructive",
                                                                });
                                                            }
                                                        }
                                                    }}
                                                    onReopen={async (sessionId: string) => {
                                                        try {
                                                            await reopenSession({
                                                                sessionId: sessionId as any,
                                                                reopenedBy: userSession?.user?.id || "admin",
                                                            });
                                                            toast({
                                                                title: "✅ Sessão reaberta",
                                                                description: "A sessão foi reaberta com sucesso.",
                                                            });
                                                        } catch (error) {
                                                            toast({
                                                                title: "❌ Erro",
                                                                description: "Erro ao reabrir sessão.",
                                                                variant: "destructive",
                                                            });
                                                        }
                                                    }}
                                                    onArchive={async (sessionId: string) => {
                                                        try {
                                                            await archiveSession({
                                                                sessionId: sessionId as any,
                                                                archivedBy: userSession?.user?.id || "admin",
                                                            });
                                                            toast({
                                                                title: "✅ Sessão arquivada",
                                                                description: "A sessão foi arquivada com sucesso.",
                                                            });
                                                        } catch (error) {
                                                            toast({
                                                                title: "❌ Erro",
                                                                description: "Erro ao arquivar sessão.",
                                                                variant: "destructive",
                                                            });
                                                        }
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    ) : selectedAssemblyId ? (
                                        <div className="text-center py-12">
                                            <ClipboardCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                                Nenhuma sessão encontrada
                                            </h3>
                                            <p className="text-gray-600">
                                                As sessões criadas na Chamada AG aparecerão aqui.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                                Selecione uma assembleia
                                            </h3>
                                            <p className="text-gray-600">
                                                Escolha uma assembleia para ver suas sessões.
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* By Modality Tab */}
                        <TabsContent value="by-modality">
                            <div className="space-y-6">
                                {/* Assembly Selection */}
                                <Card className="shadow-lg border-0">
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            <span className="flex items-center space-x-2">
                                                <Users className="w-5 h-5 text-blue-600" />
                                                <span>Inscrições por Modalidade</span>
                                            </span>
                                            <div className="flex items-center space-x-4">
                                                <Label htmlFor="modality-view-assembly-select">Assembleia:</Label>
                                                <select
                                                    id="modality-view-assembly-select"
                                                    value={selectedAssemblyId}
                                                    onChange={(e) => setSelectedAssemblyId(e.target.value)}
                                                    className="px-3 py-2 border border-gray-300 rounded-md"
                                                >
                                                    {assemblies?.map((assembly) => (
                                                        <option key={assembly._id} value={assembly._id}>
                                                            {assembly.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {selectedAssemblyId && modalities && modalities.length > 0 ? (
                                            <div className="space-y-6">
                                                {modalities.map((modality) => (
                                                    <ModalityRegistrationsView 
                                                        key={modality._id} 
                                                        modality={modality}
                                                        onReviewRegistration={(registration) => {
                                                            setSelectedRegistration(registration);
                                                            setReviewDialogOpen(true);
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        ) : selectedAssemblyId ? (
                                            <div className="text-center py-12">
                                                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                                    Nenhuma modalidade encontrada
                                                </h3>
                                                <p className="text-gray-600">
                                                    Crie modalidades para esta assembleia na aba &quot;Modalidades&quot;.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="text-center py-12">
                                                <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                                    Selecione uma assembleia
                                                </h3>
                                                <p className="text-gray-600">
                                                    Escolha uma assembleia para ver as inscrições por modalidade.
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        {/* All Registrations Tab */}
                        <TabsContent value="registrations">
                            <Card className="shadow-lg border-0">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle>Todas as Inscrições</CardTitle>
                                        <div className="flex items-center space-x-4">
                                            <Label htmlFor="assembly-select">Assembleia:</Label>
                                            <select
                                                id="assembly-select"
                                                value={selectedAssemblyId}
                                                onChange={(e) => setSelectedAssemblyId(e.target.value)}
                                                className="px-3 py-2 border border-gray-300 rounded-md"
                                            >
                                                {assemblies?.map((assembly) => (
                                                    <option key={assembly._id} value={assembly._id}>
                                                        {assembly.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {allRegistrations && allRegistrations.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Nome</TableHead>
                                                        <TableHead>Tipo</TableHead>
                                                        <TableHead>Email</TableHead>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead>Data</TableHead>
                                                        <TableHead>Ações</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {allRegistrations.map((registration) => (
                                                        <TableRow key={registration._id}>
                                                            <TableCell className="font-medium">
                                                                {registration.participantName}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline">
                                                                    {getDetailedParticipantTypeLabel(registration)}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>{registration.email}</TableCell>
                                                            <TableCell>
                                                                <Badge className={getStatusColor(registration.status)}>
                                                                    <div className="flex items-center space-x-1">
                                                                        {getStatusIcon(registration.status)}
                                                                        <span>{getStatusLabel(registration.status)}</span>
                                                                    </div>
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                {new Date(registration.registeredAt).toLocaleDateString('pt-BR')}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center space-x-1">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => {
                                                                            setSelectedRegistration(registration);
                                                                            setReviewDialogOpen(true);
                                                                        }}
                                                                    >
                                                                        <Eye className="w-3 h-3 mr-1" />
                                                                        Ver
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="destructive"
                                                                        onClick={() => {
                                                                            setRegistrationToDelete(registration);
                                                                            setDeleteDialogOpen(true);
                                                                        }}
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                                Nenhuma inscrição encontrada
                                            </h3>
                                            <p className="text-gray-600">
                                                Não há inscrições para esta assembleia.
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Pending Registrations Tab */}
                        <TabsContent value="pending">
                            <Card className="shadow-lg border-0">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center space-x-2">
                                            <Clock className="w-5 h-5 text-yellow-600" />
                                            <span>Aguardando Revisão</span>
                                        </CardTitle>
                                        <div className="flex items-center space-x-2">
                                            {selectedRegistrations.length > 0 && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        onClick={handleBulkApprove}
                                                        className="bg-green-600 hover:bg-green-700"
                                                    >
                                                        <UserCheck className="w-3 h-3 mr-1" />
                                                        Aprovar Selecionadas ({selectedRegistrations.length})
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={handleBulkReject}
                                                    >
                                                        <UserX className="w-3 h-3 mr-1" />
                                                        Rejeitar Selecionadas ({selectedRegistrations.length})
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => setBulkDeleteDialogOpen(true)}
                                                        className="bg-red-700 hover:bg-red-800"
                                                    >
                                                        <Trash2 className="w-3 h-3 mr-1" />
                                                        Deletar Selecionadas ({selectedRegistrations.length})
                                                    </Button>
                                                </>
                                            )}
                                            <div className="flex items-center space-x-2">
                                                <Label htmlFor="assembly-select-pending">Assembleia:</Label>
                                                <select
                                                    id="assembly-select-pending"
                                                    value={selectedAssemblyId}
                                                    onChange={(e) => setSelectedAssemblyId(e.target.value)}
                                                    className="px-3 py-2 border border-gray-300 rounded-md"
                                                >
                                                    {assemblies?.map((assembly) => (
                                                        <option key={assembly._id} value={assembly._id}>
                                                            {assembly.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {pendingRegistrations && pendingRegistrations.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-12">
                                                            <Checkbox
                                                                checked={selectedRegistrations.length === pendingRegistrations.length}
                                                                onCheckedChange={(checked) => {
                                                                    if (checked) {
                                                                        setSelectedRegistrations(pendingRegistrations.map(r => r._id));
                                                                    } else {
                                                                        setSelectedRegistrations([]);
                                                                    }
                                                                }}
                                                            />
                                                        </TableHead>
                                                        <TableHead>Nome</TableHead>
                                                        <TableHead>Tipo</TableHead>
                                                        <TableHead>Email</TableHead>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead>Cidade/UF</TableHead>
                                                        <TableHead>Data</TableHead>
                                                        <TableHead>Ações</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {pendingRegistrations.map((registration) => (
                                                        <TableRow key={registration._id}>
                                                            <TableCell>
                                                                <Checkbox
                                                                    checked={selectedRegistrations.includes(registration._id)}
                                                                    onCheckedChange={(checked) => {
                                                                        if (checked) {
                                                                            setSelectedRegistrations(prev => [...prev, registration._id]);
                                                                        } else {
                                                                            setSelectedRegistrations(prev => prev.filter(id => id !== registration._id));
                                                                        }
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="font-medium">
                                                                {registration.participantName}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline">
                                                                    {getDetailedParticipantTypeLabel(registration)}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>{registration.email}</TableCell>
                                                            <TableCell>
                                                                <Badge className={getStatusColor(registration.status)}>
                                                                    {getStatusLabel(registration.status)}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                {registration.cidade && registration.uf ? 
                                                                    `${registration.cidade}, ${registration.uf}` : 
                                                                    "N/A"
                                                                }
                                                            </TableCell>
                                                            <TableCell>
                                                                {new Date(registration.registeredAt).toLocaleDateString('pt-BR')}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center space-x-1">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => {
                                                                            setSelectedRegistration(registration);
                                                                            setReviewDialogOpen(true);
                                                                        }}
                                                                    >
                                                                        <Eye className="w-3 h-3 mr-1" />
                                                                        Ver
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="destructive"
                                                                        onClick={() => handleRejectRegistration(registration._id)}
                                                                    >
                                                                        <UserX className="w-3 h-3" />
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="destructive"
                                                                        onClick={() => {
                                                                            setRegistrationToDelete(registration);
                                                                            setDeleteDialogOpen(true);
                                                                        }}
                                                                        className="bg-red-700 hover:bg-red-800"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                                Nenhuma inscrição pendente
                                            </h3>
                                            <p className="text-gray-600">
                                                Todas as inscrições foram revisadas.
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                    {/* Registration Review Dialog */}
                    <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="flex items-center space-x-2">
                                    <Eye className="w-5 h-5" />
                                    <span>Detalhes Completos da Inscrição</span>
                                </DialogTitle>
                                <DialogDescription>
                                    Revise todos os detalhes da inscrição e aprove ou rejeite.
                                </DialogDescription>
                            </DialogHeader>
                            
                            {selectedRegistration && (
                                <div className="space-y-6">
                                    {/* Basic Information */}
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-lg flex items-center space-x-2">
                                                <Users className="w-4 h-4" />
                                                <span>Informações Básicas</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="font-semibold text-blue-700">Nome Completo:</Label>
                                                    <p className="text-sm">{selectedRegistration.participantName}</p>
                                                </div>
                                                <div>
                                                    <Label className="font-semibold text-blue-700">Nome no Crachá:</Label>
                                                    <p className="text-sm">{selectedRegistration.nomeCracha || "N/A"}</p>
                                                </div>
                                                <div>
                                                    <Label className="font-semibold text-blue-700">Tipo de Participante:</Label>
                                                    <Badge variant="outline" className="text-xs">
                                                        {getDetailedParticipantTypeLabel(selectedRegistration)}
                                                    </Badge>
                                                </div>
                                                <div>
                                                    <Label className="font-semibold text-blue-700">Pronomes:</Label>
                                                    <p className="text-sm">{selectedRegistration.pronomes || "N/A"}</p>
                                                </div>
                                                <div>
                                                    <Label className="font-semibold text-blue-700">Data de Nascimento:</Label>
                                                    <p className="text-sm">{selectedRegistration.dataNascimento || "N/A"}</p>
                                                </div>
                                                <div>
                                                    <Label className="font-semibold text-blue-700">CPF:</Label>
                                                    <p className="text-sm">{selectedRegistration.cpf || "N/A"}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Modality Information */}
                                    {selectedRegistration.modalityId && (
                                        <Card>
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-lg flex items-center space-x-2">
                                                    <Package className="w-4 h-4" />
                                                    <span>Modalidade de Inscrição</span>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <ModalityDisplayInfo modalityId={selectedRegistration.modalityId} />
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Contact Information */}
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-lg flex items-center space-x-2">
                                                <Info className="w-4 h-4" />
                                                <span>Contato e Localização</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="font-semibold text-green-700">Email Principal:</Label>
                                                    <p className="text-sm">{selectedRegistration.email}</p>
                                                </div>
                                                <div>
                                                    <Label className="font-semibold text-green-700">Email Solar:</Label>
                                                    <p className="text-sm">{selectedRegistration.emailSolar || "N/A"}</p>
                                                </div>
                                                <div>
                                                    <Label className="font-semibold text-green-700">Celular:</Label>
                                                    <p className="text-sm">{selectedRegistration.celular || selectedRegistration.phone || "N/A"}</p>
                                                </div>
                                                <div>
                                                    <Label className="font-semibold text-green-700">Cidade/UF:</Label>
                                                    <p className="text-sm">
                                                        {selectedRegistration.cidade && selectedRegistration.uf ? 
                                                            `${selectedRegistration.cidade}, ${selectedRegistration.uf}` : 
                                                            "N/A"
                                                        }
                                                    </p>
                                                </div>
                                                <div>
                                                    <Label className="font-semibold text-green-700">Comitê Local:</Label>
                                                    <p className="text-sm">{selectedRegistration.comiteLocal || "N/A"}</p>
                                                </div>
                                                <div>
                                                    <Label className="font-semibold text-green-700">Comitê Aspirante:</Label>
                                                    <p className="text-sm">{selectedRegistration.comiteAspirante || "N/A"}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Emergency Contact */}
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-lg flex items-center space-x-2">
                                                <AlertTriangle className="w-4 h-4" />
                                                <span>Contato de Emergência</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="font-semibold text-red-700">Nome:</Label>
                                                    <p className="text-sm">{selectedRegistration.contatoEmergenciaNome || "N/A"}</p>
                                                </div>
                                                <div>
                                                    <Label className="font-semibold text-red-700">Telefone:</Label>
                                                    <p className="text-sm">{selectedRegistration.contatoEmergenciaTelefone || "N/A"}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Medical and Dietary Information */}
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-lg flex items-center space-x-2">
                                                <FileText className="w-4 h-4" />
                                                <span>Informações Médicas e Dietéticas</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="space-y-3">
                                                {selectedRegistration.dietaRestricoes && (
                                                    <div>
                                                        <Label className="font-semibold text-purple-700">Restrições Alimentares:</Label>
                                                        <p className="text-sm p-2 bg-purple-50 rounded">{selectedRegistration.dietaRestricoes}</p>
                                                    </div>
                                                )}
                                                {selectedRegistration.alergias && (
                                                    <div>
                                                        <Label className="font-semibold text-purple-700">Alergias:</Label>
                                                        <p className="text-sm p-2 bg-purple-50 rounded">{selectedRegistration.alergias}</p>
                                                    </div>
                                                )}
                                                {selectedRegistration.medicamentos && (
                                                    <div>
                                                        <Label className="font-semibold text-purple-700">Medicamentos:</Label>
                                                        <p className="text-sm p-2 bg-purple-50 rounded">{selectedRegistration.medicamentos}</p>
                                                    </div>
                                                )}
                                                {selectedRegistration.necessidadesEspeciais && (
                                                    <div>
                                                        <Label className="font-semibold text-purple-700">Necessidades Especiais:</Label>
                                                        <p className="text-sm p-2 bg-purple-50 rounded">{selectedRegistration.necessidadesEspeciais}</p>
                                                    </div>
                                                )}
                                                {selectedRegistration.restricaoQuarto && (
                                                    <div>
                                                        <Label className="font-semibold text-purple-700">Restrições de Quarto:</Label>
                                                        <p className="text-sm p-2 bg-purple-50 rounded">{getRoomRestrictionLabel(selectedRegistration.restricaoQuarto)}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Payment Information */}
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-lg flex items-center space-x-2">
                                                <CreditCard className="w-4 h-4" />
                                                <span>Informações de Pagamento</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="font-semibold text-orange-700">Status de Pagamento:</Label>
                                                    <div className="flex items-center space-x-2 mt-1">
                                                        {selectedRegistration.isPaymentExempt ? (
                                                            <Badge className="bg-green-100 text-green-800">Isento de Pagamento</Badge>
                                                        ) : (
                                                            <Badge variant="outline">Pagamento Necessário</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                {selectedRegistration.isPaymentExempt && selectedRegistration.paymentExemptReason && (
                                                    <div>
                                                        <Label className="font-semibold text-orange-700">Motivo da Isenção:</Label>
                                                        <p className="text-sm p-2 bg-green-50 rounded">{selectedRegistration.paymentExemptReason}</p>
                                                    </div>
                                                )}
                                                {selectedRegistration.receiptStorageId && (
                                                    <div className="col-span-2">
                                                        <Label className="font-semibold text-orange-700">Comprovante de Pagamento:</Label>
                                                        <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="text-sm font-medium">{selectedRegistration.receiptFileName}</p>
                                                                    <p className="text-xs text-gray-500">
                                                                        Enviado em {selectedRegistration.receiptUploadedAt ? 
                                                                            new Date(selectedRegistration.receiptUploadedAt).toLocaleString('pt-BR') : 
                                                                            "N/A"
                                                                        }
                                                                    </p>
                                                                </div>
                                                                <PaymentReceiptViewer storageId={selectedRegistration.receiptStorageId} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Additional Information */}
                                    {(selectedRegistration.outrasObservacoes || selectedRegistration.autorizacaoCompartilhamento !== undefined) && (
                                        <Card>
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-lg flex items-center space-x-2">
                                                    <FileText className="w-4 h-4" />
                                                    <span>Informações Adicionais</span>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                {selectedRegistration.outrasObservacoes && (
                                                    <div>
                                                        <Label className="font-semibold text-gray-700">Outras Observações:</Label>
                                                        <p className="text-sm p-2 bg-gray-50 rounded">{selectedRegistration.outrasObservacoes}</p>
                                                    </div>
                                                )}
                                                {selectedRegistration.autorizacaoCompartilhamento !== undefined && (
                                                    <div>
                                                        <Label className="font-semibold text-gray-700">Autorização de Compartilhamento de Dados:</Label>
                                                        <Badge variant={selectedRegistration.autorizacaoCompartilhamento ? "default" : "destructive"} className="ml-2">
                                                            {selectedRegistration.autorizacaoCompartilhamento ? "Autorizado" : "Não Autorizado"}
                                                        </Badge>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Registration Metadata */}
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-lg flex items-center space-x-2">
                                                <Clock className="w-4 h-4" />
                                                <span>Informações da Inscrição</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="font-semibold text-gray-700">Data da Inscrição:</Label>
                                                    <p className="text-sm">{new Date(selectedRegistration.registeredAt).toLocaleString('pt-BR')}</p>
                                                </div>
                                                <div>
                                                    <Label className="font-semibold text-gray-700">Status Atual:</Label>
                                                    <Badge className={getStatusColor(selectedRegistration.status)}>
                                                        {getStatusIcon(selectedRegistration.status)}
                                                        <span className="ml-1">{getStatusLabel(selectedRegistration.status)}</span>
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    
                                    {/* Review Notes */}
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-lg flex items-center space-x-2">
                                                <FileText className="w-4 h-4" />
                                                <span>Notas da Revisão</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <Label htmlFor="review-notes">
                                                Comentários sobre a revisão{" "}
                                                <span className="text-red-500">*obrigatório para rejeição</span>
                                            </Label>
                                            <Textarea
                                                id="review-notes"
                                                value={reviewNotes}
                                                onChange={(e) => setReviewNotes(e.target.value)}
                                                placeholder="Adicione notas sobre a revisão..."
                                                rows={3}
                                                className="w-full"
                                            />
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                            
                            <DialogFooter className="flex space-x-2">
                                <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                                    Fechar
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => selectedRegistration && handleRejectRegistration(selectedRegistration._id, reviewNotes)}
                                    disabled={!reviewNotes.trim()}
                                    title={!reviewNotes.trim() ? "Digite uma justificativa para rejeitar" : ""}
                                >
                                    <UserX className="w-4 h-4 mr-2" />
                                    Rejeitar
                                </Button>
                                <Button
                                    onClick={() => selectedRegistration && handleApproveRegistration(selectedRegistration._id, reviewNotes)}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    <UserCheck className="w-4 h-4 mr-2" />
                                    Aprovar
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Modality Dialog */}
                    <Dialog open={modalityDialogOpen} onOpenChange={setModalityDialogOpen}>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center space-x-2">
                                    <Package className="w-5 h-5" />
                                    <span>{editModalityId ? "Editar" : "Nova"} Modalidade</span>
                                </DialogTitle>
                                <DialogDescription>
                                    {editModalityId ? "Edite os detalhes da modalidade." : "Crie uma nova modalidade de inscrição."}
                                </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-6">
                                <div>
                                    <Label htmlFor="modality-name">Nome da Modalidade</Label>
                                    <Input
                                        id="modality-name"
                                        value={modalityFormData.name}
                                        onChange={(e) => setModalityFormData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Ex: Participante, Estudante, Convidado"
                                    />
                                </div>
                                
                                <div>
                                    <Label htmlFor="modality-description">Descrição (opcional)</Label>
                                    <Textarea
                                        id="modality-description"
                                        value={modalityFormData.description}
                                        onChange={(e) => setModalityFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Descrição da modalidade"
                                        rows={3}
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="modality-price">Preço (R$)</Label>
                                        <Input
                                            id="modality-price"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={modalityFormData.price}
                                            onChange={(e) => setModalityFormData(prev => ({ ...prev, price: e.target.value }))}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    
                                    <div>
                                        <Label htmlFor="modality-capacity">Capacidade (opcional)</Label>
                                        <Input
                                            id="modality-capacity"
                                            type="number"
                                            min="1"
                                            value={modalityFormData.maxParticipants}
                                            onChange={(e) => setModalityFormData(prev => ({ ...prev, maxParticipants: e.target.value }))}
                                            placeholder="Sem limite"
                                        />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button 
                                    variant="outline" 
                                    onClick={() => setModalityDialogOpen(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button 
                                    onClick={editModalityId ? handleUpdateModality : handleCreateModality}
                                    disabled={!modalityFormData.name || !modalityFormData.price}
                                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                >
                                    {editModalityId ? "Atualizar" : "Criar"} Modalidade
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    
                    {/* Delete Registration Confirmation Dialog */}
                    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Confirmar Exclusão</DialogTitle>
                                <DialogDescription>
                                    Tem certeza que deseja deletar permanentemente a inscrição de{" "}
                                    <strong>{registrationToDelete?.participantName}</strong>?
                                    Esta ação não pode ser desfeita.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button 
                                    variant="destructive" 
                                    onClick={() => registrationToDelete && handleDeleteRegistration(registrationToDelete._id)}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Deletar Permanentemente
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Bulk Delete Confirmation Dialog */}
                    <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Confirmar Exclusão em Lote</DialogTitle>
                                <DialogDescription>
                                    Tem certeza que deseja deletar permanentemente{" "}
                                    <strong>{selectedRegistrations.length} inscrições</strong>?
                                    Esta ação não pode ser desfeita e todos os dados serão permanentemente removidos.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button 
                                    variant="destructive" 
                                    onClick={handleBulkDelete}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Deletar {selectedRegistrations.length} Inscrições
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    
                    {/* Session Creation Dialog */}
                    <Dialog open={sessionCreationDialogOpen} onOpenChange={setSessionCreationDialogOpen}>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center space-x-2">
                                    <ClipboardCheck className="w-5 h-5 text-blue-600" />
                                    <span>Nova Sessão</span>
                                </DialogTitle>
                                <DialogDescription>
                                    Crie uma nova sessão ou plenária para esta assembleia.
                                </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-6">
                                <div>
                                    <Label className="text-base font-semibold">Tipo de Sessão</Label>
                                    <div className="grid grid-cols-1 gap-3 mt-3">
                                        <div 
                                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                                newSessionData.type === "plenaria" 
                                                    ? "border-purple-500 bg-purple-50" 
                                                    : "border-gray-200 hover:border-gray-300"
                                            }`}
                                            onClick={() => setNewSessionData(prev => ({ ...prev, type: "plenaria" }))}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <Users className="w-5 h-5 text-purple-600" />
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">Plenária</h3>
                                                    <p className="text-sm text-gray-600">Sessão plenária oficial com EBs, CRs e Comitês</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div 
                                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                                newSessionData.type === "sessao" 
                                                    ? "border-blue-500 bg-blue-50" 
                                                    : "border-gray-200 hover:border-gray-300"
                                            }`}
                                            onClick={() => setNewSessionData(prev => ({ ...prev, type: "sessao" }))}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <ClipboardCheck className="w-5 h-5 text-blue-600" />
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">Sessão</h3>
                                                    <p className="text-sm text-gray-600">Sessão específica com participantes inscritos</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <Label htmlFor="session-name">Nome da {newSessionData.type === "plenaria" ? "Plenária" : "Sessão"}</Label>
                                    <Input
                                        id="session-name"
                                        value={newSessionData.name}
                                        onChange={(e) => setNewSessionData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder={
                                            newSessionData.type === "plenaria" 
                                                ? "Ex: Plenária de Abertura" 
                                                : "Ex: Sessão Administrativa"
                                        }
                                        className="mt-2"
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button 
                                    variant="outline" 
                                    onClick={() => {
                                        setSessionCreationDialogOpen(false);
                                        setNewSessionData({ name: "", type: "plenaria" });
                                    }}
                                >
                                    Cancelar
                                </Button>
                                <Button 
                                    onClick={handleCreateSession}
                                    disabled={!newSessionData.name.trim() || isCreatingSession}
                                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                >
                                    {isCreatingSession ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Criando...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Criar {newSessionData.type === "plenaria" ? "Plenária" : "Sessão"}
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </main>
    );
}

// ModalityCard Component
function ModalityCard({ modality, onEdit, onDelete }: { 
    modality: any; 
    onEdit: () => void; 
    onDelete: () => void; 
}) {
    const modalityStats = useQuery(convexApi.registrationModalities?.getModalityStats, { modalityId: modality._id });

    const formatPrice = (priceInCents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(priceInCents / 100);
    };

    const getCapacityColor = (current: number, max?: number) => {
        if (!max) return "text-gray-600";
        const percentage = (current / max) * 100;
        if (percentage >= 90) return "text-red-600";
        if (percentage >= 75) return "text-yellow-600";
        return "text-green-600";
    };

    const getCapacityWarning = (current: number, max?: number) => {
        if (!max) return null;
        const percentage = (current / max) * 100;
        if (percentage >= 100) {
            return { type: "error", message: "Modalidade lotada!" };
        }
        if (percentage >= 90) {
            return { type: "warning", message: "Quase lotada (90%+)" };
        }
        if (percentage >= 75) {
            return { type: "info", message: "Capacidade alta (75%+)" };
        }
        return null;
    };

    // Use real statistics from the query
    const currentRegistrations = modalityStats?.currentRegistrations || 0;
    const capacityWarning = getCapacityWarning(currentRegistrations, modality.maxParticipants);

    return (
        <Card className={`border-l-4 ${
            capacityWarning?.type === "error" ? "border-l-red-500" :
            capacityWarning?.type === "warning" ? "border-l-yellow-500" :
            capacityWarning?.type === "info" ? "border-l-orange-500" :
            "border-l-blue-500"
        }`}>
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold">{modality.name}</h3>
                            <Badge variant={modality.isActive ? "default" : "secondary"}>
                                {modality.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                            {capacityWarning && (
                                <Badge variant={
                                    capacityWarning.type === "error" ? "destructive" :
                                    capacityWarning.type === "warning" ? "secondary" :
                                    "outline"
                                }>
                                    {capacityWarning.message}
                                </Badge>
                            )}
                        </div>
                        
                        {modality.description && (
                            <p className="text-gray-600 mb-3">{modality.description}</p>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label className="text-sm font-medium text-gray-700">Preço</Label>
                                <p className="text-xl font-bold text-green-600">
                                    {modality.price === 0 ? "Gratuito" : formatPrice(modality.price)}
                                </p>
                            </div>
                            
                            <div>
                                <Label className="text-sm font-medium text-gray-700">Capacidade</Label>
                                <p className={`text-xl font-bold ${getCapacityColor(currentRegistrations, modality.maxParticipants)}`}>
                                    {currentRegistrations}{modality.maxParticipants ? ` / ${modality.maxParticipants}` : " / ∞"}
                                </p>
                            </div>
                            
                            <div>
                                <Label className="text-sm font-medium text-gray-700">Status</Label>
                                <p className="text-lg font-medium">
                                    {modality.maxParticipants && currentRegistrations >= modality.maxParticipants ? (
                                        <span className="text-red-600">Lotado</span>
                                    ) : modality.isActive ? (
                                        <span className="text-green-600">Disponível</span>
                                    ) : (
                                        <span className="text-gray-600">Inativo</span>
                                    )}
                                </p>
                            </div>
                        </div>
                        
                        {/* Show registrations count by status */}
                        {modalityStats && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                <Label className="text-sm font-medium text-gray-700">Inscrições por Status</Label>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {Object.entries(modalityStats.byStatus || {}).map(([status, count]) => (
                                        <Badge key={status} variant="outline" className="text-xs">
                                            {status}: {count as number}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onEdit}
                        >
                            <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onDelete}
                            className="hover:bg-red-50 text-red-600"
                        >
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card> 
    );
} 

// SessionCard Component
function SessionCard({ session, onDelete, onReopen, onArchive, onDownloadReport }: { 
    session: any; 
    onDelete: (sessionId: string) => void; 
    onReopen: (sessionId: string) => void; 
    onArchive: (sessionId: string) => void; 
    onDownloadReport: (sessionId: string, sessionName: string, sessionType: string) => void;
}) {
    const getSessionTypeIcon = (type: string) => {
        switch (type) {
            case "plenaria": return <Users className="w-4 h-4 text-purple-600" />;
            case "sessao": return <ClipboardCheck className="w-4 h-4 text-blue-600" />;
            case "avulsa": return <Clock className="w-4 h-4 text-gray-600" />;
            default: return <ClipboardCheck className="w-4 h-4 text-gray-600" />;
        }
    };

    const getSessionTypeLabel = (type: string) => {
        switch (type) {
            case "plenaria": return "Plenária";
            case "sessao": return "Sessão";
            case "avulsa": return "Avulsa";
            default: return type;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "active": return "bg-green-100 text-green-800 border-green-200";
            case "archived": return "bg-gray-100 text-gray-800 border-gray-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    return (
        <Card className={`border-l-4 ${session.status === "active" ? "border-l-green-500" : "border-l-gray-500"}`}>
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                            {getSessionTypeIcon(session.type)}
                            <h3 className="text-lg font-semibold">{session.name}</h3>
                            <Badge className={getStatusColor(session.status)}>
                                {session.status === "active" ? "Ativa" : "Arquivada"}
                            </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <Label className="text-gray-700">Tipo</Label>
                                <p className="font-medium">{getSessionTypeLabel(session.type)}</p>
                            </div>
                            
                            <div>
                                <Label className="text-gray-700">Criada em</Label>
                                <p className="font-medium">{new Date(session.createdAt).toLocaleString('pt-BR')}</p>
                            </div>
                            
                            {session.archivedAt && (
                                <div>
                                    <Label className="text-gray-700">Arquivada em</Label>
                                    <p className="font-medium">{new Date(session.archivedAt).toLocaleString('pt-BR')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDownloadReport(session._id, session.name, session.type)}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            title="Baixar Relatório de Presença"
                        >
                            <Download className="w-3 h-3 mr-1" />
                            Relatório
                        </Button>
                        {session.status === "active" ? (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onArchive(session._id)}
                                className="text-orange-600 border-orange-200 hover:bg-orange-50"
                            >
                                <Package className="w-3 h-3 mr-1" />
                                Arquivar
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onReopen(session._id)}
                                className="text-green-600 border-green-200 hover:bg-green-50"
                            >
                                <Eye className="w-3 h-3 mr-1" />
                                Reabrir
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDelete(session._id)}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card> 
    );
} 