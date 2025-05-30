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
    ImageIcon
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { useToast } from "~/components/ui/use-toast";
import { api as convexApi } from "../../../../convex/_generated/api";
import { isIfmsaEmailSession } from "~/server/lib/authcheck";
import PrecisaLogin from "~/app/_components/PrecisaLogin";

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

export default function AGAdminPage() {
    const { data: session } = useSession();
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

    const upsertConfig = useMutation(convexApi.agConfig?.upsert);
    const approveRegistration = useMutation(convexApi.agRegistrations?.approve);
    const rejectRegistration = useMutation(convexApi.agRegistrations?.reject);
    const bulkApprove = useMutation(convexApi.agRegistrations?.bulkApprove);
    const bulkReject = useMutation(convexApi.agRegistrations?.bulkReject);

    // Check IFMSA email on session change
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
        if (!session?.user?.id) return;

        setIsSaving(true);
        try {
            await upsertConfig({
                ...configData,
                updatedBy: session.user.id,
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
    }, [configData, session?.user?.id, upsertConfig, toast]);

    const handleApproveRegistration = useCallback(async (registrationId: string, notes?: string) => {
        if (!session?.user?.id) return;

        try {
            await approveRegistration({
                registrationId: registrationId as any,
                approvedBy: session.user.id,
                notes,
            });
            
            toast({
                title: "✅ Inscrição Aprovada",
                description: "A inscrição foi aprovada com sucesso.",
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
    }, [session?.user?.id, approveRegistration, toast]);

    const handleRejectRegistration = useCallback(async (registrationId: string, notes?: string) => {
        if (!session?.user?.id) return;

        try {
            await rejectRegistration({
                registrationId: registrationId as any,
                rejectedBy: session.user.id,
                notes,
            });
            
            toast({
                title: "❌ Inscrição Rejeitada",
                description: "A inscrição foi rejeitada.",
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
    }, [session?.user?.id, rejectRegistration, toast]);

    const handleBulkApprove = useCallback(async () => {
        if (!session?.user?.id || selectedRegistrations.length === 0) return;

        try {
            await bulkApprove({
                registrationIds: selectedRegistrations as any,
                approvedBy: session.user.id,
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
    }, [session?.user?.id, selectedRegistrations, bulkApprove, toast]);

    const handleBulkReject = useCallback(async () => {
        if (!session?.user?.id || selectedRegistrations.length === 0) return;

        try {
            await bulkReject({
                registrationIds: selectedRegistrations as any,
                rejectedBy: session.user.id,
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
    }, [session?.user?.id, selectedRegistrations, bulkReject, toast]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "approved": return "bg-green-100 text-green-800 border-green-200";
            case "rejected": return "bg-red-100 text-red-800 border-red-200";
            case "cancelled": return "bg-gray-100 text-gray-800 border-gray-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "pending": return <Clock className="w-4 h-4" />;
            case "approved": return <CheckCircle className="w-4 h-4" />;
            case "rejected": return <XCircle className="w-4 h-4" />;
            case "cancelled": return <AlertTriangle className="w-4 h-4" />;
            default: return <Info className="w-4 h-4" />;
        }
    };

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
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="config" className="flex items-center space-x-2">
                                <Settings className="w-4 h-4" />
                                <span>Configurações</span>
                            </TabsTrigger>
                            <TabsTrigger value="registrations" className="flex items-center space-x-2">
                                <Users className="w-4 h-4" />
                                <span>Inscrições</span>
                            </TabsTrigger>
                            <TabsTrigger value="pending" className="flex items-center space-x-2">
                                <Clock className="w-4 h-4" />
                                <span>Pendentes</span>
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
                                                                    {registration.participantType.toUpperCase()}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>{registration.email}</TableCell>
                                                            <TableCell>
                                                                <Badge className={getStatusColor(registration.status)}>
                                                                    <div className="flex items-center space-x-1">
                                                                        {getStatusIcon(registration.status)}
                                                                        <span>{registration.status}</span>
                                                                    </div>
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                {new Date(registration.registeredAt).toLocaleDateString('pt-BR')}
                                                            </TableCell>
                                                            <TableCell>
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
                                            <span>Inscrições Pendentes</span>
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
                                                                    {registration.participantType.toUpperCase()}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>{registration.email}</TableCell>
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
                                                                        <Eye className="w-3 h-3" />
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleApproveRegistration(registration._id)}
                                                                        className="bg-green-600 hover:bg-green-700"
                                                                    >
                                                                        <UserCheck className="w-3 h-3" />
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="destructive"
                                                                        onClick={() => handleRejectRegistration(registration._id)}
                                                                    >
                                                                        <UserX className="w-3 h-3" />
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
                                                        {selectedRegistration.participantType.toUpperCase()}
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
                                                        <p className="text-sm p-2 bg-purple-50 rounded">{selectedRegistration.restricaoQuarto}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Experience and Motivation */}
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-lg flex items-center space-x-2">
                                                <CheckCircle className="w-4 h-4" />
                                                <span>Experiência e Motivação</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {selectedRegistration.experienciaAnterior && (
                                                <div>
                                                    <Label className="font-semibold text-indigo-700">Experiência Anterior:</Label>
                                                    <p className="text-sm p-2 bg-indigo-50 rounded">{selectedRegistration.experienciaAnterior}</p>
                                                </div>
                                            )}
                                            {selectedRegistration.motivacao && (
                                                <div>
                                                    <Label className="font-semibold text-indigo-700">Motivação:</Label>
                                                    <p className="text-sm p-2 bg-indigo-50 rounded">{selectedRegistration.motivacao}</p>
                                                </div>
                                            )}
                                            {selectedRegistration.expectativas && (
                                                <div>
                                                    <Label className="font-semibold text-indigo-700">Expectativas:</Label>
                                                    <p className="text-sm p-2 bg-indigo-50 rounded">{selectedRegistration.expectativas}</p>
                                                </div>
                                            )}
                                            {selectedRegistration.participacaoComites && selectedRegistration.participacaoComites.length > 0 && (
                                                <div>
                                                    <Label className="font-semibold text-indigo-700">Comitês de Interesse:</Label>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {selectedRegistration.participacaoComites.map((comite, idx) => (
                                                            <Badge key={idx} variant="outline" className="text-xs">
                                                                {comite}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {selectedRegistration.interesseVoluntariado !== undefined && (
                                                <div>
                                                    <Label className="font-semibold text-indigo-700">Interesse em Voluntariado:</Label>
                                                    <Badge variant={selectedRegistration.interesseVoluntariado ? "default" : "outline"} className="ml-2">
                                                        {selectedRegistration.interesseVoluntariado ? "Sim" : "Não"}
                                                    </Badge>
                                                </div>
                                            )}
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
                                                        <span className="ml-1">{selectedRegistration.status}</span>
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
                                            <Textarea
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
                </div>
            </div>
        </main>
    );
} 