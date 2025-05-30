"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { 
    Calendar, 
    MapPin, 
    Users, 
    Settings, 
    Plus,
    Trash2,
    Edit,
    Eye,
    EyeOff,
    Globe,
    Building,
    Clock,
    CheckCircle,
    XCircle,
    UserPlus,
    BarChart3,
    Download,
    AlertTriangle,
    RefreshCw,
    CreditCard,
    Package,
    FileText,
    UserCheck
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { useToast } from "~/components/ui/use-toast";
import { api as convexApi } from "../../../convex/_generated/api";
import { api } from "~/trpc/react";
import { isIfmsaEmailSession } from "~/server/lib/authcheck";
import PrecisaLogin from "~/app/_components/PrecisaLogin";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import React from "react";

// Assembly type definition
type Assembly = {
    _id: string;
    name: string;
    type: string;
    location: string;
    startDate: number;
    endDate: number;
    status: string;
    createdAt: number;
    createdBy: string;
    lastUpdated: number;
    lastUpdatedBy: string;
    registrationOpen: boolean;
    registrationDeadline?: number;
    maxParticipants?: number;
    description?: string;
};

// Form data type for the dialog's internal state and submission
export type DialogFormData = {
    name: string;
    type: "AG" | "AGE";
    location: string;
    startDate: string;
    endDate: string;
    description: string;
    maxParticipants: string;
    registrationDeadline: string;
};

// Additional participant types
export type ParticipantType = "eb" | "cr" | "comite" | "cred" | "supco" | "alumni" | "observador" | "aspirante";

const initialDialogFormData: DialogFormData = {
    name: "",
    type: "AG",
    location: "",
    startDate: "",
    endDate: "",
    description: "",
    maxParticipants: "",
    registrationDeadline: "",
};

// Create AG Dialog Component - Manages its own form state
const CreateAGDialog = ({ 
    isOpen, 
    onOpenChange, 
    onSubmit 
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: DialogFormData) => void;
}) => {
    const [formData, setFormData] = useState<DialogFormData>(initialDialogFormData);

    const handleInputChange = useCallback((field: keyof DialogFormData, value: string | "AG" | "AGE") => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleSubmit = () => {
        onSubmit(formData);
    };

    // Reset form when dialog opens
    useEffect(() => {
        if (isOpen) {
            setFormData(initialDialogFormData);
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                        <Plus className="w-5 h-5 text-green-600" />
                        <span>Criar Nova Assembleia Geral</span>
                    </DialogTitle>
                    <DialogDescription>
                        Preencha as informações para criar uma nova AG.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                    {/* Name Input */}
                    <div>
                        <Label htmlFor="dialog-name">Nome da AG *</Label>
                        <Input
                            id="dialog-name"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            placeholder="Ex: AG IFMSA Brazil 2024"
                        />
                    </div>
                    {/* Type Select */}
                    <div>
                        <Label htmlFor="dialog-type">Tipo *</Label>
                        <Select value={formData.type} onValueChange={(value: "AG" | "AGE") => 
                            handleInputChange('type', value)
                        }>
                            <SelectTrigger id="dialog-type">
                                <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="AG">AG (Presencial)</SelectItem>
                                <SelectItem value="AGE">AGE (Online)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {/* Location Input */}
                    <div>
                        <Label htmlFor="dialog-location">Local *</Label>
                        <Input
                            id="dialog-location"
                            value={formData.location}
                            onChange={(e) => handleInputChange('location', e.target.value)}
                            placeholder={formData.type === "AGE" ? "Online" : "Ex: São Paulo, SP"}
                        />
                    </div>
                    {/* Start Date Input */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="dialog-startDate">Data de Início *</Label>
                            <Input
                                id="dialog-startDate"
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => handleInputChange('startDate', e.target.value)}
                            />
                        </div>
                        {/* End Date Input */}
                        <div>
                            <Label htmlFor="dialog-endDate">Data de Fim *</Label>
                            <Input
                                id="dialog-endDate"
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => handleInputChange('endDate', e.target.value)}
                            />
                        </div>
                    </div>
                    {/* Max Participants Input */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="dialog-maxParticipants">Máx. Participantes</Label>
                            <Input
                                id="dialog-maxParticipants"
                                type="number"
                                value={formData.maxParticipants}
                                onChange={(e) => handleInputChange('maxParticipants', e.target.value)}
                                placeholder="Deixe vazio para ilimitado"
                            />
                        </div>
                        {/* Registration Deadline Input */}
                        <div>
                            <Label htmlFor="dialog-registrationDeadline">Prazo de Inscrição</Label>
                            <Input
                                id="dialog-registrationDeadline"
                                type="date"
                                value={formData.registrationDeadline}
                                onChange={(e) => handleInputChange('registrationDeadline', e.target.value)}
                            />
                        </div>
                    </div>
                    {/* Description Textarea */}
                    <div>
                        <Label htmlFor="dialog-description">Descrição</Label>
                        <Textarea
                            id="dialog-description"
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            placeholder="Descrição opcional da assembleia..."
                            rows={3}
                        />
                    </div>
                </div>
                
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Criar AG
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

CreateAGDialog.displayName = 'CreateAGDialog';

// Edit AG Dialog Component
const EditAGDialog = ({ 
    isOpen, 
    onOpenChange, 
    initialData,
    onSubmit 
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    initialData: DialogFormData;
    onSubmit: (data: DialogFormData) => void;
}) => {
    const [formData, setFormData] = useState<DialogFormData>(initialData);

    const handleInputChange = useCallback((field: keyof DialogFormData, value: string | "AG" | "AGE") => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleSubmit = () => {
        onSubmit(formData);
    };

    // Update form when initialData changes
    useEffect(() => {
        setFormData(initialData);
    }, [initialData]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                        <Edit className="w-5 h-5 text-blue-600" />
                        <span>Editar Assembleia Geral</span>
                    </DialogTitle>
                    <DialogDescription>
                        Modifique as informações da AG.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                    {/* Same form fields as CreateAGDialog */}
                    <div>
                        <Label htmlFor="edit-name">Nome da AG *</Label>
                        <Input
                            id="edit-name"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            placeholder="Ex: AG IFMSA Brazil 2024"
                        />
                    </div>
                    <div>
                        <Label htmlFor="edit-type">Tipo *</Label>
                        <Select value={formData.type} onValueChange={(value: "AG" | "AGE") => 
                            handleInputChange('type', value)
                        }>
                            <SelectTrigger id="edit-type">
                                <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="AG">AG (Presencial)</SelectItem>
                                <SelectItem value="AGE">AGE (Online)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="edit-location">Local *</Label>
                        <Input
                            id="edit-location"
                            value={formData.location}
                            onChange={(e) => handleInputChange('location', e.target.value)}
                            placeholder={formData.type === "AGE" ? "Online" : "Ex: São Paulo, SP"}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="edit-startDate">Data de Início *</Label>
                            <Input
                                id="edit-startDate"
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => handleInputChange('startDate', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-endDate">Data de Fim *</Label>
                            <Input
                                id="edit-endDate"
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => handleInputChange('endDate', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="edit-maxParticipants">Máx. Participantes</Label>
                            <Input
                                id="edit-maxParticipants"
                                type="number"
                                value={formData.maxParticipants}
                                onChange={(e) => handleInputChange('maxParticipants', e.target.value)}
                                placeholder="Deixe vazio para ilimitado"
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-registrationDeadline">Prazo de Inscrição</Label>
                            <Input
                                id="edit-registrationDeadline"
                                type="date"
                                value={formData.registrationDeadline}
                                onChange={(e) => handleInputChange('registrationDeadline', e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="edit-description">Descrição</Label>
                        <Textarea
                            id="edit-description"
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            placeholder="Descrição opcional da assembleia..."
                            rows={3}
                        />
                    </div>
                </div>
                
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
                        <Edit className="w-4 h-4 mr-2" />
                        Salvar Alterações
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

EditAGDialog.displayName = 'EditAGDialog';

// Delete AG Dialog Component
const DeleteAGDialog = ({ 
    isOpen, 
    onOpenChange, 
    assembly,
    onConfirm 
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    assembly: Assembly | null;
    onConfirm: (assemblyId: string, confirmationText: string) => void;
}) => {
    const [confirmationText, setConfirmationText] = useState("");

    const handleConfirm = () => {
        if (assembly) {
            onConfirm(assembly._id, confirmationText);
        }
    };

    // Reset confirmation text when dialog opens
    useEffect(() => {
        if (isOpen) {
            setConfirmationText("");
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <span>Deletar Assembleia Geral</span>
                    </DialogTitle>
                    <DialogDescription>
                        Esta ação é irreversível. A AG e todos os dados relacionados (participantes e inscrições) serão permanentemente removidos.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="py-4">
                    <div className="space-y-4">
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800">
                                <strong>⚠️ Atenção:</strong> Você está prestes a deletar permanentemente:
                            </p>
                            <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                                <li>A assembleia &quot;{assembly?.name}&quot;</li>
                                <li>Todos os participantes pré-carregados</li>
                                <li>Todas as inscrições de usuários</li>
                                <li>Todos os dados relacionados</li>
                            </ul>
                            <p className="mt-2 text-sm text-red-800 font-medium">
                                Esta ação não pode ser desfeita!
                            </p>
                        </div>
                        
                        <div>
                            <Label htmlFor="delete-confirmation">
                                Para confirmar, digite o nome da AG: <strong>{assembly?.name}</strong>
                            </Label>
                            <Input
                                id="delete-confirmation"
                                value={confirmationText}
                                onChange={(e) => setConfirmationText(e.target.value)}
                                placeholder="Digite o nome da AG"
                            />
                        </div>
                    </div>
                </div>
                
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleConfirm} 
                        variant="destructive"
                        disabled={confirmationText !== assembly?.name}
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Deletar AG
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

DeleteAGDialog.displayName = 'DeleteAGDialog';

// Creation Progress Dialog - Fixed to prevent flickering
const CreationProgressDialog = React.memo(({ 
    isOpen, 
    creationProgress 
}: { 
    isOpen: boolean; 
    creationProgress: string[] 
}) => {
    // Memoize the progress items to prevent unnecessary re-renders
    const progressItems = useMemo(() => 
        creationProgress.map((step, index) => (
            <div key={`progress-${index}-${step.substring(0, 10)}`} className="flex items-center space-x-2">
                {step.startsWith("✅") ? (
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                ) : step.startsWith("❌") ? (
                    <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                ) : (
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                )}
                <span className="text-sm">{step}</span>
            </div>
        )), 
        [creationProgress]
    );

    return (
        <Dialog open={isOpen} onOpenChange={() => {}}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                        <span>Criando Assembleia Geral</span>
                    </DialogTitle>
                    <DialogDescription>
                        Por favor, aguarde enquanto criamos a assembleia e carregamos os dados...
                    </DialogDescription>
                </DialogHeader>
                
                <div className="py-4">
                    <div className="space-y-3">
                        {progressItems}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
});

CreationProgressDialog.displayName = 'CreationProgressDialog';

// Utility function to format dates without timezone conversion
const formatDateWithoutTimezone = (timestamp: number): string => {
    const date = new Date(timestamp);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
};

export default function AGPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const { toast } = useToast();
    
    const [isAdminView, setIsAdminView] = useState(false);
    const [isIfmsaEmail, setIsIfmsaEmail] = useState<boolean | null>(null);
    
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedAssembly, setSelectedAssembly] = useState<Assembly | null>(null);
    
    // formData for EDITING an existing assembly
    const [editFormData, setEditFormData] = useState<DialogFormData>(initialDialogFormData); 

    const [isCreating, setIsCreating] = useState(false);
    const [creationProgress, setCreationProgress] = useState<string[]>([]);
    
    const assemblies = useQuery(convexApi.assemblies?.getAll);
    const activeAssemblies = useQuery(convexApi.assemblies?.getActive);
    
    // Add AG config query to check global registration settings
    const agConfig = useQuery(convexApi.agConfig?.get);
    
    const createAssembly = useMutation(convexApi.assemblies?.create);
    const updateAssembly = useMutation(convexApi.assemblies?.update);
    const deleteAssembly = useMutation(convexApi.assemblies?.deleteWithRelatedData);
    const bulkInsertParticipants = useMutation(convexApi.assemblies?.bulkInsertParticipants);
    
    const { data: registrosData } = api.registros.get.useQuery();
    const { data: ebData } = api.eb.getAll.useQuery();
    const { data: crData } = api.cr.getAll.useQuery();

    const handleDialogOpenChange = useCallback((open: boolean) => {
        setIsCreateDialogOpen(open);
    }, []);

    const handleEditDialogOpenChange = useCallback((open: boolean) => {
        setIsEditDialogOpen(open);
    }, []);

    const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
        setIsDeleteDialogOpen(open);
    }, []);

    // Function to get display names for participant types
    const getParticipantTypeName = useCallback((type: ParticipantType): string => {
        const typeNames = {
            eb: "EB",
            cr: "CR", 
            comite: "Comitê Local",
            cred: "CRED",
            supco: "SupCo",
            alumni: "Alumni",
            observador: "Observador Externo",
            aspirante: "Comitê Aspirante"
        };
        return typeNames[type] || type;
    }, []);

    // This function now receives data from the dialog and includes all participant types
    const handleCreateAGSubmit = useCallback(async (dialogData: DialogFormData) => {
        if (!session?.user?.id || !createAssembly || !bulkInsertParticipants) return;

        if (!dialogData.name || !dialogData.location || !dialogData.startDate || !dialogData.endDate) {
            toast({ title: "❌ Erro", description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
            return;
        }
        const startDate = new Date(dialogData.startDate);
        const endDate = new Date(dialogData.endDate);
        if (endDate < startDate) {
            toast({ title: "❌ Erro", description: "A data de fim deve ser posterior ou igual à data de início.", variant: "destructive" });
            return;
        }
        setIsCreateDialogOpen(false);
        setIsCreating(true);
        setCreationProgress([]);

        try {
            setCreationProgress(prev => [...prev, "Criando assembleia..."]);
            const assemblyId = await createAssembly({
                name: dialogData.name,
                type: dialogData.type,
                location: dialogData.location,
                startDate: startDate.getTime(),
                endDate: endDate.getTime(),
                createdBy: session.user.id,
                description: dialogData.description || undefined,
                maxParticipants: dialogData.maxParticipants ? parseInt(dialogData.maxParticipants) : undefined,
                registrationDeadline: dialogData.registrationDeadline ? new Date(dialogData.registrationDeadline).getTime() : undefined,
            });

            setCreationProgress(prev => [...prev, "Carregando dados do CSV..."]);
            if (!registrosData?.url) throw new Error("URL do CSV não configurada");
            const response = await fetch(registrosData.url, { redirect: 'follow' });
            if (!response.ok) throw new Error(`Erro ao buscar dados do CSV: ${response.status}`);
            const csvText = await response.text();
            const cleanText = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
            const lines = cleanText.split('\n').filter(line => line.trim());
            const dataLines = lines.slice(1);

            setCreationProgress(prev => [...prev, "Processando comitês locais..."]);
            const comites = dataLines.map((line) => {
                const columns = line.split(',').map(col => {
                    const trimmed = col.trim();
                    return trimmed.startsWith('"') && trimmed.endsWith('"') ? trimmed.slice(1, -1).trim() : trimmed;
                });
                const statusText = (columns[5] || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').trim();
                const isNaoPleno = statusText.includes('naopleno') || statusText.includes('nao pleno') || statusText.includes('nao-pleno');
                const isPleno = !isNaoPleno && statusText.includes('pleno');
                return { type: "comite", participantId: columns[0] || '', name: columns[0] || '', status: isNaoPleno ? 'Não-pleno' : (isPleno ? 'Pleno' : 'Não-pleno'), escola: columns[1] || '', regional: columns[2] || '', cidade: columns[3] || '', uf: columns[4] || '', agFiliacao: columns[6] || '' };
            }).filter(comite => comite.name !== '');

            setCreationProgress(prev => [...prev, "Preparando participantes..."]);
            const allParticipants: any[] = [];
            
            // Add EBs
            if (ebData) ebData.forEach(eb => allParticipants.push({ type: "eb", participantId: eb.id.toString(), name: eb.name, role: eb.role }));
            
            // Add CRs
            if (crData) crData.forEach(cr => allParticipants.push({ type: "cr", participantId: cr.id.toString(), name: cr.name, role: cr.role }));
            
            // Add comites locais
            allParticipants.push(...comites);

            // Add placeholders for other participant types that will be registered manually
            // These are not pre-loaded but will be available for registration
            const additionalParticipantTypes: ParticipantType[] = ["cred", "supco", "alumni", "observador", "aspirante"];
            
            setCreationProgress(prev => [...prev, "Configurando tipos de participantes adicionais..."]);
            
            // We don't pre-populate these, they will be available for manual registration
            // but we could add them to a configuration table if needed

            setCreationProgress(prev => [...prev, "Inserindo participantes na base de dados..."]);
            const insertedCount = await bulkInsertParticipants({ assemblyId: assemblyId, participants: allParticipants });

            setCreationProgress(prev => [...prev, `✅ AG criada com sucesso! ${insertedCount} participantes pré-carregados. Tipos adicionais disponíveis para registro: ${additionalParticipantTypes.map(getParticipantTypeName).join(', ')}.`]);
            toast({ title: "✅ AG Criada com Sucesso", description: `${dialogData.name} foi criada com ${insertedCount} participantes pré-carregados.` });
            setTimeout(() => { setIsCreating(false); setCreationProgress([]); }, 3000);
        } catch (error) {
            console.error("Error creating AG:", error);
            setCreationProgress(prev => [...prev, `❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]);
            toast({ title: "❌ Erro ao Criar AG", description: "Erro ao criar assembleia. Tente novamente.", variant: "destructive" });
            setTimeout(() => { setIsCreating(false); setCreationProgress([]); }, 3000);
        }
    }, [session?.user?.id, createAssembly, bulkInsertParticipants, toast, registrosData?.url, ebData, crData, getParticipantTypeName]);

    // Handle edit AG submission
    const handleEditAGSubmit = useCallback(async (dialogData: DialogFormData) => {
        if (!session?.user?.id || !updateAssembly || !selectedAssembly) return;

        if (!dialogData.name || !dialogData.location || !dialogData.startDate || !dialogData.endDate) {
            toast({ title: "❌ Erro", description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
            return;
        }

        const startDate = new Date(dialogData.startDate);
        const endDate = new Date(dialogData.endDate);
        if (endDate < startDate) {
            toast({ title: "❌ Erro", description: "A data de fim deve ser posterior ou igual à data de início.", variant: "destructive" });
            return;
        }

        try {
            await updateAssembly({
                id: selectedAssembly._id as any,
                name: dialogData.name,
                type: dialogData.type,
                location: dialogData.location,
                startDate: startDate.getTime(),
                endDate: endDate.getTime(),
                lastUpdatedBy: session.user.id,
                description: dialogData.description || undefined,
                maxParticipants: dialogData.maxParticipants ? parseInt(dialogData.maxParticipants) : undefined,
                registrationDeadline: dialogData.registrationDeadline ? new Date(dialogData.registrationDeadline).getTime() : undefined,
            });

            toast({ title: "✅ AG Atualizada", description: `${dialogData.name} foi atualizada com sucesso.` });
            setIsEditDialogOpen(false);
            setSelectedAssembly(null);
        } catch (error) {
            toast({ title: "❌ Erro", description: "Erro ao atualizar AG. Tente novamente.", variant: "destructive" });
        }
    }, [session?.user?.id, updateAssembly, selectedAssembly, toast]);

    // Handle delete AG confirmation
    const handleDeleteAGConfirm = useCallback(async (assemblyId: string, confirmationText: string) => {
        if (!session?.user?.id || !deleteAssembly || !selectedAssembly) return;

        if (confirmationText !== selectedAssembly.name) {
            toast({ title: "❌ Erro", description: "Nome de confirmação incorreto.", variant: "destructive" });
            return;
        }

        try {
            const result = await deleteAssembly({
                id: assemblyId as any,
                deletedBy: session.user.id,
                confirmationText,
            });

            toast({ 
                title: "✅ AG Deletada Permanentemente", 
                description: result?.message || `${selectedAssembly.name} e todos os dados relacionados foram deletados permanentemente.`,
            });

            setIsDeleteDialogOpen(false);
            setSelectedAssembly(null);
        } catch (error) {
            console.error("Error deleting assembly:", error);
            toast({ 
                title: "❌ Erro", 
                description: "Erro ao deletar AG. Tente novamente.", 
                variant: "destructive" 
            });
        }
    }, [session?.user?.id, deleteAssembly, selectedAssembly, toast]);

    // Handle download report
    const handleDownloadReport = useCallback(async (assembly: Assembly) => {
        try {
            toast({ 
                title: "📊 Gerando Relatório", 
                description: "Preparando arquivo com todos os dados da AG...",
            });

            const response = await fetch('/api/download-ag-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    assemblyId: assembly._id,
                }),
            });

            if (!response.ok) {
                throw new Error('Erro ao gerar relatório');
            }

            // Create download link
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `relatorio_completo_${assembly.name.replace(/[^a-zA-Z0-9]/g, '_')}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({ 
                title: "✅ Relatório Baixado", 
                description: "Arquivo ZIP com dados da AG e comprovantes foi baixado com sucesso.",
            });
        } catch (error) {
            console.error("Error downloading report:", error);
            toast({ 
                title: "❌ Erro", 
                description: "Erro ao baixar relatório. Tente novamente.", 
                variant: "destructive" 
            });
        }
    }, [toast]);

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

    // Assembly Admin Card Component
    function AssemblyAdminCard({ assembly }: { assembly: Assembly }) {
        const getStatusColor = (status: string) => {
            switch (status) {
                case "active": return "bg-green-100 text-green-800 border-green-200";
                case "archived": return "bg-yellow-100 text-yellow-800 border-yellow-200";
                default: return "bg-gray-100 text-gray-800 border-gray-200";
            }
        };

        const handleDownload = () => {
            handleDownloadReport(assembly);
        };

        const handleEdit = () => {
            setSelectedAssembly(assembly);
            setEditFormData({
                name: assembly.name,
                type: assembly.type as "AG" | "AGE",
                location: assembly.location,
                startDate: new Date(assembly.startDate).toISOString().split('T')[0] || "",
                endDate: new Date(assembly.endDate).toISOString().split('T')[0] || "",
                description: assembly.description || "",
                maxParticipants: assembly.maxParticipants?.toString() || "",
                registrationDeadline: assembly.registrationDeadline ? 
                    (new Date(assembly.registrationDeadline).toISOString().split('T')[0] || "") : "",
            });
            setIsEditDialogOpen(true);
        };

        const handleDelete = () => {
            setSelectedAssembly(assembly);
            setIsDeleteDialogOpen(true);
        };

        return (
            <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300">
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="text-lg">{assembly.name}</CardTitle>
                            <div className="flex items-center space-x-2 mt-2">
                                <Badge className={getStatusColor(assembly.status)}>
                                    {assembly.status === "active" ? "Ativa" : 
                                     assembly.status === "archived" ? "Arquivada" : ""}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                    {assembly.type === "AG" ? "Presencial" : "Online"}
                                </Badge>
                            </div>
                        </div>
                        <div className="flex space-x-1">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleDownload}
                                title="Baixar Relatório Completo"
                            >
                                <Download className="w-3 h-3" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleEdit}
                            >
                                <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleDelete}
                                className="hover:bg-red-50 text-red-600"
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                            {assembly.type === "AG" ? (
                                <Building className="w-4 h-4" />
                            ) : (
                                <Globe className="w-4 h-4" />
                            )}
                            <span>{assembly.location}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>
                                {formatDateWithoutTimezone(assembly.startDate)} - {" "}
                                {formatDateWithoutTimezone(assembly.endDate)}
                            </span>
                        </div>
                        {assembly.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">
                                {assembly.description}
                            </p>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t">
                            <div className="text-xs text-gray-500">
                                Criada em {formatDateWithoutTimezone(assembly.createdAt)}
                            </div>
                            <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => router.push(`/ag/${assembly._id}`)}
                            >
                                <BarChart3 className="w-3 h-3 mr-1" />
                                Ver Detalhes
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Assembly User Card Component
    function AssemblyUserCard({ assembly, agConfig }: { assembly: Assembly; agConfig: any }) {
        // Get user registration status for this assembly
        const registrationStatus = useQuery(
            convexApi.agRegistrations?.getUserRegistrationStatus,
            session?.user?.id ? { assemblyId: assembly._id as any, userId: session.user.id } : "skip"
        );

        // Get the user's registration details if they have one
        const userRegistration = useQuery(
            convexApi.agRegistrations?.getById,
            registrationStatus?.registrationId ? { id: registrationStatus.registrationId } : "skip"
        );

        // Get the modality for the user's registration to check if payment is needed
        const userModality = useQuery(
            convexApi.registrationModalities?.getById,
            userRegistration?.modalityId ? { id: userRegistration.modalityId } : "skip"
        );

        // Get file URL for receipt download
        const receiptFileUrl = useQuery(
            convexApi.files?.getFileUrl,
            userRegistration?.receiptStorageId ? { storageId: userRegistration.receiptStorageId } : "skip"
        );

        const router = useRouter();

        const getRegistrationButton = () => {
            // Check if registrations are globally disabled
            if (agConfig && !agConfig.registrationEnabled) {
                return (
                    <Button 
                        className="w-full"
                        disabled
                        variant="outline"
                    >
                        <XCircle className="w-4 h-4 mr-2" />
                        Inscrições Desabilitadas Globalmente
                    </Button>
                );
            }

            // Check if registration is closed for this assembly
            if (!assembly.registrationOpen) {
                return (
                    <Button 
                        className="w-full"
                        disabled
                        variant="outline"
                    >
                        <XCircle className="w-4 h-4 mr-2" />
                        Inscrições Fechadas
                    </Button>
                );
            }

            if (!registrationStatus) {
                // No registration found - show register button
                return (
                    <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => router.push(`/ag/${assembly._id}/register`)}
                    >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Inscrever-se
                    </Button>
                );
            }

            // User has a registration
            switch (registrationStatus.status) {
                case "pending":
                    // Check if this is a free modality or payment exempt
                    const needsPayment = userModality && userModality.price > 0 && !userRegistration?.isPaymentExempt;
                    
                    if (needsPayment && !registrationStatus.hasReceipt) {
                        return (
                            <Button 
                                className="w-full bg-orange-500 hover:bg-orange-600"
                                onClick={() => router.push(`/ag/${assembly._id}/register/payment-info/${registrationStatus.registrationId}`)}
                            >
                                <CreditCard className="w-4 h-4 mr-2" />
                                Esperando Pagamento
                            </Button>
                        );
                    } else {
                        return (
                            <Button 
                                className="w-full bg-amber-500 hover:bg-amber-600"
                                disabled
                            >
                                <Clock className="w-4 h-4 mr-2" />
                                Em Análise
                            </Button>
                        );
                    }
                case "pending_review":
                    return (
                        <Button 
                            className="w-full bg-amber-500 hover:bg-amber-600"
                            disabled
                        >
                            <Clock className="w-4 h-4 mr-2" />
                            Em Análise
                        </Button>
                    );
                case "approved":
                    return (
                        <div className="space-y-2">
                            <Button 
                                className="w-full bg-green-500 hover:bg-green-600"
                                onClick={() => router.push(`/ag/${assembly._id}/register/success/${registrationStatus.registrationId}`)}
                            >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Ver Comprovante
                            </Button>
                            {userRegistration?.receiptStorageId && receiptFileUrl && (
                                <Button 
                                    className="w-full bg-blue-500 hover:bg-blue-600"
                                    onClick={() => window.open(receiptFileUrl, '_blank')}
                                    variant="outline"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Baixar Comprovante de Pagamento
                                </Button>
                            )}
                        </div>
                    );
                case "rejected":
                    return (
                        <div className="space-y-2">
                            <Button 
                                className="w-full bg-red-500 hover:bg-red-600"
                                onClick={() => router.push(`/ag/${assembly._id}/register/resubmit/${registrationStatus.registrationId}`)}
                            >
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                Inscrição Rejeitada - Reenviar
                            </Button>
                            {registrationStatus.rejectionReason && (
                                <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                    <strong>Motivo:</strong> {registrationStatus.rejectionReason}
                                </p>
                            )}
                        </div>
                    );
                default:
                    return (
                        <Button 
                            className="w-full bg-gray-500 hover:bg-gray-600"
                            disabled
                        >
                            Status Desconhecido
                        </Button>
                    );
            }
        };

        return (
            <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300">
                <CardHeader>
                    <CardTitle className="text-lg">{assembly.name}</CardTitle>
                    <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                            {assembly.type === "AG" ? "Presencial" : "Online"}
                        </Badge>
                        {assembly.registrationOpen ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                                Inscrições Abertas
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-red-600 border-red-200 text-xs">
                                Inscrições Fechadas
                            </Badge>
                        )}
                        {registrationStatus && (
                            <Badge variant="outline" className="text-xs">
                                {registrationStatus.status === "pending" && !registrationStatus.hasReceipt && "Pag. Pendente"}
                                {registrationStatus.status === "pending" && registrationStatus.hasReceipt && "Em Análise"}
                                {registrationStatus.status === "pending_review" && "Em Análise"}
                                {registrationStatus.status === "approved" && "Aprovado"}
                                {registrationStatus.status === "rejected" && "Rejeitado"}
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                            {assembly.type === "AG" ? (
                                <Building className="w-4 h-4" />
                            ) : (
                                <Globe className="w-4 h-4" />
                            )}
                            <span>{assembly.location}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>
                                {formatDateWithoutTimezone(assembly.startDate)} - {" "}
                                {formatDateWithoutTimezone(assembly.endDate)}
                            </span>
                        </div>
                        {assembly.description && (
                            <p className="text-sm text-gray-600 line-clamp-3">
                                {assembly.description}
                            </p>
                        )}
                        <div className="pt-3 border-t">
                            {getRegistrationButton()}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Continue with component logic...
    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="container mx-auto px-6 py-12">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                                <Calendar className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                                    Assembleias Gerais
                                </h1>
                                <p className="text-gray-600">
                                    {isAdminView ? "Gerenciar assembleias" : "Inscrever-se nas assembleias"}
                                </p>
                            </div>
                        </div>
                        
                        {/* Admin toggle */}
                        {isIfmsaEmail && (
                            <div className="flex items-center space-x-3">
                                <Button
                                    variant={isAdminView ? "default" : "outline"}
                                    onClick={() => setIsAdminView(!isAdminView)}
                                    className={isAdminView ? 
                                        "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" :
                                        "hover:bg-gray-50"
                                    }
                                >
                                    {isAdminView ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                                    {isAdminView ? "Sair do Admin" : "Admin"}
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Content based on view */}
                    {isAdminView ? (
                        <AdminView />
                    ) : (
                        <UserView />
                    )}
                </div>
            </div>

            {/* Dialogs */}
            <CreateAGDialog 
                isOpen={isCreateDialogOpen} 
                onOpenChange={handleDialogOpenChange} 
                onSubmit={handleCreateAGSubmit} 
            />

            <EditAGDialog
                isOpen={isEditDialogOpen}
                onOpenChange={handleEditDialogOpenChange}
                initialData={editFormData}
                onSubmit={handleEditAGSubmit}
            />

            <DeleteAGDialog
                isOpen={isDeleteDialogOpen}
                onOpenChange={handleDeleteDialogOpenChange}
                assembly={selectedAssembly}
                onConfirm={handleDeleteAGConfirm}
            />

            <CreationProgressDialog 
                isOpen={isCreating}
                creationProgress={creationProgress}
            />
        </main>
    );

    // Admin View Component
    function AdminView() {
        return (
            <div className="space-y-6">
                {/* Admin Actions */}
                <Card className="shadow-lg border-0">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Settings className="w-5 h-5 text-indigo-600" />
                            <span>Ações Administrativas</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-4">
                            <Button 
                                onClick={() => setIsCreateDialogOpen(true)}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Nova Assembleia
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Assemblies List for Admin */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {assemblies?.map((assembly) => (
                        <AssemblyAdminCard key={assembly._id} assembly={assembly as Assembly} />
                    ))}
                </div>

                {assemblies?.length === 0 && (
                    <Card className="shadow-lg border-0">
                        <CardContent className="text-center py-12">
                            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Nenhuma AG criada
                            </h3>
                            <p className="text-gray-600">
                                Clique em &quot;Nova AG&quot; para criar sua primeira assembleia geral.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    }

    // User View Component  
    function UserView() {
        return (
            <div className="space-y-6">
                {/* Available Assemblies */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {activeAssemblies?.map((assembly) => (
                        <AssemblyUserCard key={assembly._id} assembly={assembly as Assembly} agConfig={agConfig} />
                    ))}
                </div>

                {activeAssemblies?.length === 0 && (
                    <Card className="shadow-lg border-0">
                        <CardContent className="text-center py-12">
                            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Nenhuma AG disponível
                            </h3>
                            <p className="text-gray-600">
                                Não há assembleias abertas para inscrição no momento.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    }
} 