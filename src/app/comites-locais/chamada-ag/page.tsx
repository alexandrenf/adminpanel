"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { 
    ClipboardCheck, 
    Users, 
    CheckCircle,
    XCircle,
    Minus,
    ArrowLeft, 
    UserCheck,
    UserX,
    Eye,
    EyeOff,
    Search,
    Download,
    QrCode,
    ExternalLink,
    Settings,
    Plus,
    Trash2,
    Copy,
    AlertTriangle,
    Building,
    Building2,
    ChevronDown,
    Smartphone,
    RotateCcw,
    BarChart3,
    Clock
} from "lucide-react";
import { api } from "~/trpc/react";
import { useQuery, useMutation } from "convex/react";
import { useToast } from "~/components/ui/use-toast";
import { useSession } from "next-auth/react";
import { api as convexApi } from "../../../../convex/_generated/api";
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';
import JSZip from 'jszip';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { isIfmsaEmailSession } from "~/server/lib/authcheck";
import SessionAttendanceManager from "~/app/_components/SessionAttendanceManager";

type AttendanceState = "present" | "absent" | "not-counting" | "excluded";

type ComiteLocal = {
    name: string;
    escola: string;
    regional: string;
    cidade: string;
    uf: string;
    status: "Pleno" | "Não-pleno";
    agFiliacao: string;
    attendance: AttendanceState;
};

type EbMember = {
    id: number;
    role: string;
    name: string;
    attendance: AttendanceState;
};

type CrMember = {
    id: number;
    role: string;
    name: string;
    attendance: AttendanceState;
};

type Member = {
    id: string;
    name: string;
    role?: string;
    attendance: AttendanceState;
};

type Comite = {
    id: string;
    name: string;
    status: string;
    attendance: AttendanceState;
};

// Add quorum requirements
const QUORUM_REQUIREMENTS = {
    eb: 0.5, // 50% of EB members
    cr: 0.5, // 50% of CR members
    comitesPlenos: 0.5, // 50% of Pleno committees
    comitesNaoPlenos: 0.5, // 50% of Não-pleno committees
} as const;

const getNextAttendanceState = (currentState: AttendanceState): AttendanceState => {
    switch (currentState) {
        case "not-counting":
            return "present";
        case "present":
            return "absent";
        case "absent":
            return "excluded";
        case "excluded":
            return "not-counting";
        default:
            return "not-counting";
    }
};

const getAttendanceLabel = (state: AttendanceState): string => {
    switch (state) {
        case "present":
            return "Presente";
        case "absent":
            return "Ausente";
        case "excluded":
            return "Excluído";
        default:
            return "Não contando";
    }
};

export default function ChamadaAGPage() {
    const router = useRouter();
    const [comitesLocais, setComitesLocais] = useState<ComiteLocal[]>([]);
    const [ebMembers, setEbMembers] = useState<EbMember[]>([]);
    const [crMembers, setCrMembers] = useState<CrMember[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchEb, setSearchEb] = useState("");
    const [searchCr, setSearchCr] = useState("");
    const [searchPlenos, setSearchPlenos] = useState("");
    const [searchNaoPlenos, setSearchNaoPlenos] = useState("");
    const [isResetting, setIsResetting] = useState(false);
    const { data: session } = useSession();
    const { toast } = useToast();

    // QR Readers state
    const [isQrReadersDialogOpen, setIsQrReadersDialogOpen] = useState(false);
    const [newReaderName, setNewReaderName] = useState("");
    const [isCreatingReader, setIsCreatingReader] = useState(false);

    // Chamada type state
    const [chamadaType, setChamadaType] = useState<"avulsa" | "plenaria" | "sessao">("avulsa");

    // Session management state
    const [selectedAssemblyId, setSelectedAssemblyId] = useState<string>("");
    const [sessionName, setSessionName] = useState("");
    const [isSessionDialogOpen, setIsSessionDialogOpen] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [currentSessionType, setCurrentSessionType] = useState<"avulsa" | "plenaria" | "sessao">("avulsa");

    // Convex queries - handle cases where table might be empty or queries fail
    const ebsAttendance = useQuery(convexApi.attendance.getByType, { type: "eb" });
    const crsAttendance = useQuery(convexApi.attendance.getByType, { type: "cr" });
    const comitesAttendance = useQuery(convexApi.attendance.getByType, { type: "comite" });
    const qrReaders = useQuery(convexApi.qrReaders.getAll);

    // Check if Convex data is loading
    const isConvexLoading = ebsAttendance === undefined || crsAttendance === undefined || comitesAttendance === undefined;

    // Convex mutations
    const updateAttendance = useMutation(convexApi.attendance.updateAttendance);
    const resetAllAttendance = useMutation(convexApi.attendance.resetAll);
    const clearAllAttendance = useMutation(convexApi.attendance.clearAll);
    const bulkInsertAttendance = useMutation(convexApi.attendance.bulkInsert);
    const resetAttendanceOnly = useMutation(convexApi.attendance.resetAttendanceOnly);

    // QR Readers mutations
    const createQrReader = useMutation(convexApi.qrReaders.create);
    const createSessionQrReader = useMutation(convexApi.qrReaders.createForSession);
    const removeQrReader = useMutation(convexApi.qrReaders.remove);
    const clearQrReaders = useMutation(convexApi.qrReaders.clearAll);

    // Get session-specific QR readers
    const sessionQrReaders = useQuery(
        convexApi.qrReaders?.getBySession,
        currentSessionId ? { sessionId: currentSessionId as any } : "skip"
    );

    // Fetch data
    const { data: registrosData, isLoading: registrosLoading } = api.registros.get.useQuery();
    const { data: ebData } = api.eb.getAll.useQuery();
    const { data: crData } = api.cr.getAll.useQuery();

    // State for tracking if data is loaded
    const [isLoadingNovaAG, setIsLoadingNovaAG] = useState(false);

    // Convex queries and mutations
    const assemblies = useQuery(convexApi.assemblies?.getAll);
    const activeSessions = useQuery(
        convexApi.agSessions?.getActiveSessions,
        selectedAssemblyId ? { assemblyId: selectedAssemblyId as any } : "skip"
    );
    const currentSessionData = useQuery(
        convexApi.agSessions?.getSessionWithStats,
        currentSessionId ? { sessionId: currentSessionId as any } : "skip"
    );
    const sessionAttendance = useQuery(
        convexApi.agSessions?.getSessionAttendance,
        currentSessionId ? { sessionId: currentSessionId as any } : "skip"
    );
    
    // Session mutations
    const createSession = useMutation(convexApi.agSessions?.createSession);
    const markSessionAttendance = useMutation(convexApi.agSessions?.markAttendance);
    const archiveSession = useMutation(convexApi.agSessions?.archiveSession);
    const reopenSession = useMutation(convexApi.agSessions?.reopenSession);

    // Modal states
    const [novaChamadaModalOpen, setNovaChamadaModalOpen] = useState(false);
    const [novaChamadaType, setNovaChamadaType] = useState<"plenaria" | "sessao" | "avulsa" | null>(null);
    const [novaChamadaName, setNovaChamadaName] = useState("");
    const [novaChamadaAssemblyId, setNovaChamadaAssemblyId] = useState<string>("");

    useEffect(() => {
        if (ebData) {
            setEbMembers(ebData.map(eb => ({
                id: eb.id,
                role: eb.role,
                name: eb.name,
                attendance: "not-counting" as AttendanceState
            })));
        }
    }, [ebData]);

    useEffect(() => {
        if (crData) {
            setCrMembers(crData.map(cr => ({
                id: cr.id,
                role: cr.role,
                name: cr.name,
                attendance: "not-counting" as AttendanceState
            })));
        }
    }, [crData]);

    // Convex is always the source of truth - rebuild UI from Convex data
    useEffect(() => {
        if (ebsAttendance !== undefined && ebData) {
            const updatedEbMembers = ebData.map(eb => ({
                id: eb.id,
                role: eb.role,
                name: eb.name,
                attendance: (ebsAttendance.find(a => a.memberId === eb.id.toString())?.attendance || "not-counting") as AttendanceState
            }));
            setEbMembers(updatedEbMembers);
        }
    }, [ebsAttendance, ebData]);

    useEffect(() => {
        if (crsAttendance !== undefined && crData) {
            const updatedCrMembers = crData.map(cr => ({
                id: cr.id,
                role: cr.role,
                name: cr.name,
                attendance: (crsAttendance.find(a => a.memberId === cr.id.toString())?.attendance || "not-counting") as AttendanceState
            }));
            setCrMembers(updatedCrMembers);
        }
    }, [crsAttendance, crData]);

    useEffect(() => {
        if (comitesAttendance !== undefined) {
            // Always rebuild comites from Convex data with complete CSV information
            const comitesFromConvex = comitesAttendance
                .filter(record => record.type === "comite")
                .map(record => ({
                    name: record.name,
                    escola: record.escola || "",
                    regional: record.regional || "",
                    cidade: record.cidade || "",
                    uf: record.uf || "",
                    status: (record.status || "Não-pleno") as "Pleno" | "Não-pleno",
                    agFiliacao: record.agFiliacao || "",
                    attendance: record.attendance as AttendanceState
                }));
            
            setComitesLocais(comitesFromConvex);
        }
    }, [comitesAttendance]);

    // Check if user is authenticated - moved after all hooks
    if (!session) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
                {/* Background decorative elements */}
                <div className="absolute inset-0 opacity-20">
                    <div className="w-full h-full" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                    }}></div>
                </div>
                
                {/* Floating orbs */}
                <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                
                <div className="relative z-10 flex-grow flex items-center justify-center">
                    <PrecisaLogin />
                </div>
            </main>
        );
    }

    // Nova Chamada functions
    const handleNovaChamadaAvulsa = async () => {
        if (!session?.user?.id) {
            toast({
                title: "Erro",
                description: "Você precisa estar logado para criar uma nova chamada.",
                variant: "destructive",
            });
            return;
        }

        if (isLoadingNovaAG) return;

        if (window.confirm("NOVA CHAMADA AVULSA: Deseja carregar todos os dados e criar uma nova sessão?\n\nEsta ação irá:\n• Carregar dados do CSV, EBs e CRs\n• Limpar completamente a tabela de presença\n• Limpar todos os leitores QR\n• Criar novos registros para todos os membros\n\nDeseja continuar?")) {
            setIsLoadingNovaAG(true);
            setLoading(true);
            
            try {
                // First, clear all existing attendance records and QR readers
                await clearAllAttendance();
                await clearQrReaders();
                
                // Load CSV data
                if (!registrosData?.url) {
                    throw new Error("URL do CSV não configurada");
                }

                const response = await fetch(registrosData.url, { redirect: 'follow' });
                if (!response.ok) {
                    throw new Error(`Erro ao buscar dados do CSV: ${response.status} ${response.statusText}`);
                }
                
                const csvText = await response.text();
                if (!csvText.trim()) {
                    throw new Error("O arquivo CSV está vazio");
                }

                // Process CSV data
                const cleanText = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
                const lines = cleanText.split('\n').filter(line => line.trim());
                
                if (lines.length < 2) {
                    throw new Error("O arquivo CSV não contém dados");
                }
                
                const dataLines = lines.slice(1);
                const comites: ComiteLocal[] = dataLines.map((line) => {
                    try {
                        const columns = line.split(',').map(col => {
                            const trimmed = col.trim();
                            return trimmed.startsWith('"') && trimmed.endsWith('"') 
                                ? trimmed.slice(1, -1).trim() 
                                : trimmed;
                        });
                        
                        const statusText = (columns[5] || '').toLowerCase()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/[^a-z0-9]/g, '')
                            .trim();
                        
                        const isNaoPleno = statusText.includes('naopleno') || 
                                          statusText.includes('nao pleno') || 
                                          statusText.includes('nao-pleno');
                        const isPleno = !isNaoPleno && statusText.includes('pleno');
                        
                        return {
                            name: columns[0] || '',
                            escola: columns[1] || '',
                            regional: columns[2] || '',
                            cidade: columns[3] || '',
                            uf: columns[4] || '',
                            status: isNaoPleno ? 'Não-pleno' : (isPleno ? 'Pleno' : 'Não-pleno') as "Pleno" | "Não-pleno",
                            agFiliacao: columns[6] || '',
                            attendance: "not-counting" as AttendanceState
                        };
                    } catch (err) {
                        return null;
                    }
                }).filter((comite): comite is ComiteLocal => comite !== null && comite.name !== '');

                comites.sort((a, b) => a.name.localeCompare(b.name));
                
                // Prepare all records for bulk insert
                const allRecords = [];
                
                // Add EB records
                if (ebData) {
                    for (const eb of ebData) {
                        allRecords.push({
                            type: "eb",
                            memberId: eb.id.toString(),
                            name: eb.name,
                            role: eb.role,
                            status: "not-counting",
                            attendance: "not-counting",
                            lastUpdatedBy: session.user.id
                        });
                    }
                }
                
                // Add CR records
                if (crData) {
                    for (const cr of crData) {
                        allRecords.push({
                            type: "cr",
                            memberId: cr.id.toString(),
                            name: cr.name,
                            role: cr.role,
                            status: "not-counting",
                            attendance: "not-counting",
                            lastUpdatedBy: session.user.id
                        });
                    }
                }
                
                // Add Comite records with full data
                for (const comite of comites) {
                    allRecords.push({
                        type: "comite",
                        memberId: comite.name,
                        name: comite.name,
                        status: comite.status,
                        attendance: "not-counting",
                        lastUpdatedBy: session.user.id,
                        // Store complete CSV data
                        escola: comite.escola,
                        regional: comite.regional,
                        cidade: comite.cidade,
                        uf: comite.uf,
                        agFiliacao: comite.agFiliacao
                    });
                }
                
                // Bulk insert all records to Convex
                await bulkInsertAttendance({ records: allRecords });
                
                setLoading(false);
                
                toast({
                    title: "✅ Nova chamada avulsa criada com sucesso",
                    description: `${allRecords.length} registros foram carregados na nova sessão.`,
                });
                
            } catch (error) {
                console.error("Error creating new chamada:", error);
                setError(error instanceof Error ? error.message : "Erro ao carregar dados");
                setLoading(false);
                toast({
                    title: "❌ Erro ao criar nova chamada",
                    description: "Erro ao carregar dados. Tente novamente.",
                    variant: "destructive",
                });
            } finally {
                setIsLoadingNovaAG(false);
            }
        }
    };

    const handleNovaChamadaPlenaria = async () => {
        if (!selectedAssemblyId) {
            toast({
                title: "❌ Erro",
                description: "Selecione uma AG primeiro.",
                variant: "destructive",
            });
            return;
        }
        
        setIsSessionDialogOpen(true);
        setChamadaType("plenaria");
    };

    const handleNovaChamadaSessao = async () => {
        if (!selectedAssemblyId) {
            toast({
                title: "❌ Erro", 
                description: "Selecione uma AG primeiro.",
                variant: "destructive",
            });
            return;
        }
        
        setIsSessionDialogOpen(true);
        setChamadaType("sessao");
    };

    const handleNovaChamada = () => {
        setNovaChamadaModalOpen(true);
        setNovaChamadaType(null);
        setNovaChamadaName("");
        setNovaChamadaAssemblyId(selectedAssemblyId || "");
    };

    const handleCreateNewSessionFromModal = async () => {
        // For avulsa, we don't need assembly selection
        const needsAssembly = novaChamadaType === "plenaria" || novaChamadaType === "sessao";
        
        if (!session?.user?.id || !novaChamadaType || !novaChamadaName.trim() || (needsAssembly && !novaChamadaAssemblyId)) {
            toast({
                title: "Erro",
                description: needsAssembly 
                    ? "Selecione a assembleia, tipo de sessão e digite um nome."
                    : "Selecione o tipo de sessão e digite um nome.",
                variant: "destructive"
            });
            return;
        }

        try {
            const result = await createSession({
                assemblyId: needsAssembly ? (novaChamadaAssemblyId as any) : null,
                name: novaChamadaName.trim(),
                type: novaChamadaType,
                createdBy: session.user.id
            });
            
            if (result) {
                setCurrentSessionId(result as string);
                setCurrentSessionType(novaChamadaType);
                if (needsAssembly && novaChamadaAssemblyId) {
                    setSelectedAssemblyId(novaChamadaAssemblyId);
                }
                toast({
                    title: "✅ Sessão criada",
                    description: `${getChamadaTypeLabel(novaChamadaType)} "${novaChamadaName}" foi criada com sucesso!`
                });
                setNovaChamadaModalOpen(false);
                setNovaChamadaName("");
                setNovaChamadaType(null);
                setNovaChamadaAssemblyId("");
            }
        } catch (error) {
            toast({
                title: "❌ Erro",
                description: "Erro ao criar sessão. Tente novamente.",
                variant: "destructive"
            });
        }
    };

    const getChamadaTypeLabel = (type: "avulsa" | "plenaria" | "sessao") => {
        switch (type) {
            case "avulsa":
                return "Avulsa";
            case "plenaria":
                return "Plenária";
            case "sessao":
                return "Sessão";
        }
    };

    const getAttendanceIcon = (state: AttendanceState) => {
        switch (state) {
            case "present":
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case "absent":
                return <XCircle className="w-5 h-5 text-red-600" />;
            case "excluded":
                return <XCircle className="w-5 h-5 text-orange-600" />;
            case "not-counting":
                return <Minus className="w-5 h-5 text-gray-400" />;
        }
    };

    const getAttendanceColor = (state: AttendanceState) => {
        switch (state) {
            case "present":
                return "bg-green-50 border-green-200 hover:bg-green-100";
            case "absent":
                return "bg-red-50 border-red-200 hover:bg-red-100";
            case "excluded":
                return "bg-orange-50 border-orange-200 hover:bg-orange-100";
            case "not-counting":
                return "bg-gray-50 border-gray-200 hover:bg-gray-100";
        }
    };

    const getStats = (members: { attendance: AttendanceState }[]) => {
        const present = members.filter(m => m.attendance === "present").length;
        const absent = members.filter(m => m.attendance === "absent").length;
        const excluded = members.filter(m => m.attendance === "excluded").length;
        const notCounting = members.filter(m => m.attendance === "not-counting").length;
        const total = members.length;
        const eligibleForQuorum = total - excluded; // Exclude "excluded" members from quorum calculation
        const quorumPercentage = eligibleForQuorum > 0 ? (present / eligibleForQuorum) * 100 : 0;
        return { present, absent, excluded, notCounting, total, eligibleForQuorum, quorumPercentage };
    };

    const comitesPlenos = comitesLocais.filter(c => c.status === "Pleno");
    const comitesNaoPlenos = comitesLocais.filter(c => c.status === "Não-pleno");

    // Search filtering functions
    const filterBySearch = <T extends { name: string; role?: string }>(items: T[], searchTerm: string): T[] => {
        if (!searchTerm.trim()) return items;
        
        const searchLower = searchTerm.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, ''); // Remove accents for search
        
        return items.filter(item => {
            const nameMatch = item.name.toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .includes(searchLower);
            
            // If item has a role property, also search in it
            if (item.role) {
                const roleMatch = item.role.toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .includes(searchLower);
                return nameMatch || roleMatch;
            }
            
            return nameMatch;
        });
    };

    const filteredEbMembers = filterBySearch(ebMembers, searchEb);
    const filteredCrMembers = filterBySearch(crMembers, searchCr);
    const filteredComitesPlenos = filterBySearch(comitesPlenos, searchPlenos);
    const filteredComitesNaoPlenos = filterBySearch(comitesNaoPlenos, searchNaoPlenos);

    const handleAttendanceChange = async (type: string, id: string, name: string, role?: string) => {
        if (!session?.user?.id) {
            toast({
                title: "Erro",
                description: "Você precisa estar logado para alterar a presença.",
                variant: "destructive",
            });
            return;
        }

        // Get current state from Convex data
        let currentState: AttendanceState = "not-counting";
        
        if (type === "eb") {
            const record = ebsAttendance?.find(a => a.memberId === id);
            currentState = (record?.attendance || "not-counting") as AttendanceState;
        } else if (type === "cr") {
            const record = crsAttendance?.find(a => a.memberId === id);
            currentState = (record?.attendance || "not-counting") as AttendanceState;
        } else if (type === "comite") {
            const record = comitesAttendance?.find(a => a.memberId === id);
            currentState = (record?.attendance || "not-counting") as AttendanceState;
        }

        const nextState = getNextAttendanceState(currentState);

        try {
            await updateAttendance({
                type,
                memberId: id,
                name,
                role,
                status: nextState,
                attendance: nextState,
                lastUpdatedBy: session.user.id
            });

            // No local state updates - Convex will trigger UI updates via useEffect

            toast({
                title: "Presença atualizada",
                description: `${name} marcado como ${getAttendanceLabel(nextState)}`,
            });
        } catch (error) {
            toast({
                title: "Erro",
                description: "Erro ao atualizar presença. Tente novamente.",
                variant: "destructive",
            });
        }
    };

    const handleDirectAttendanceSet = async (type: string, id: string, name: string, newState: AttendanceState, role?: string) => {
        if (!session?.user?.id) {
            toast({
                title: "Erro",
                description: "Você precisa estar logado para alterar a presença.",
                variant: "destructive",
            });
            return;
        }

        try {
            await updateAttendance({
                type,
                memberId: id,
                name,
                role,
                status: newState,
                attendance: newState,
                lastUpdatedBy: session.user.id
            });

            // No local state updates - Convex will trigger UI updates via useEffect

            toast({
                title: "Presença atualizada",
                description: `${name} marcado como ${getAttendanceLabel(newState)}`,
            });
        } catch (error) {
            toast({
                title: "Erro",
                description: "Erro ao atualizar presença. Tente novamente.",
                variant: "destructive",
            });
        }
    };

    const resetAttendanceState = async () => {
        if (!session?.user?.id) {
            toast({
                title: "Erro",
                description: "Você precisa estar logado para resetar a presença.",
                variant: "destructive",
            });
            return;
        }

        if (isResetting) return; // Prevent multiple clicks

        if (window.confirm("⚠️ ATENÇÃO: Tem certeza que deseja resetar todas as presenças?\n\nEsta ação irá:\n• Resetar todos os status de presença para 'Não contabilizado'\n• Manter todos os registros na tabela\n\nDeseja continuar?")) {
            setIsResetting(true);
            try {
                // Reset all attendance status to "not-counting" (without deleting records)
                const updatedCount = await resetAttendanceOnly({ lastUpdatedBy: session.user.id });
                
                // No local state updates - Convex will trigger UI updates via useEffect
                
                toast({
                    title: "✅ Presenças resetadas com sucesso",
                    description: `${updatedCount} registros foram resetados para 'Não contabilizado'.`,
                });
            } catch (error) {
                console.error("Error resetting attendance:", error);
                toast({
                    title: "❌ Erro ao resetar",
                    description: "Erro ao resetar presenças. Tente novamente.",
                    variant: "destructive",
                });
            } finally {
                setIsResetting(false);
            }
        }
    };

    const downloadExcelReport = () => {
        // Create workbook
        const wb = XLSX.utils.book_new();
        
        // Helper function to create worksheet from data
        const createWorksheet = (data: any[], title: string) => {
            const ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, title);
        };

        // Prepare EB members data
        const ebData = ebMembers.map(member => ({
            'Tipo': 'EB',
            'Nome': member.name,
            'Cargo': member.role,
            'Status': member.attendance === "present" ? "Presente" : 
                     member.attendance === "absent" ? "Ausente" : 
                     member.attendance === "excluded" ? "Excluído do quórum" : "Não contabilizado"
        }));

        // Prepare CR members data
        const crData = crMembers.map(member => ({
            'Tipo': 'CR',
            'Nome': member.name,
            'Cargo': member.role,
            'Status': member.attendance === "present" ? "Presente" : 
                     member.attendance === "absent" ? "Ausente" : 
                     member.attendance === "excluded" ? "Excluído do quórum" : "Não contabilizado"
        }));

        // Prepare Comitês data
        const comitesData = comitesLocais.map(comite => ({
            'Tipo': comite.status,
            'Nome': comite.name,
            'Localização': `${comite.cidade}, ${comite.uf}`,
            'Status': comite.attendance === "present" ? "Presente" : 
                     comite.attendance === "absent" ? "Ausente" : 
                     comite.attendance === "excluded" ? "Excluído do quórum" : "Não contabilizado"
        }));

        // Create worksheets
        createWorksheet(ebData, 'Diretoria Executiva');
        createWorksheet(crData, 'Coordenadores Regionais');
        createWorksheet(comitesData, 'Comitês');

        // Generate Excel file
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // Create download link
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio-presenca-ag-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const downloadQRCodes = async () => {
        if (!session?.user?.id) {
            toast({
                title: "Erro",
                description: "Você precisa estar logado para gerar os QR Codes.",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        
        try {
            const zip = new JSZip();
            const qrFolder = zip.folder("QR_Codes_AG");
            
            if (!qrFolder) {
                throw new Error("Erro ao criar pasta no ZIP");
            }

            // Generate QR codes for EB members
            for (const member of ebMembers) {
                const qrData = JSON.stringify({
                    type: "eb",
                    id: member.id.toString(),
                    name: member.name,
                    role: member.role
                });

                const qrCodeDataURL = await QRCode.toDataURL(qrData, {
                    width: 300,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });

                // Convert data URL to base64
                const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, "");
                const fileName = `EB - ${member.name} - ${member.role}.png`.replace(/[<>:"/\\|?*]/g, '_');
                qrFolder.file(fileName, base64Data, { base64: true });
            }

            // Generate QR codes for CR members
            for (const member of crMembers) {
                const qrData = JSON.stringify({
                    type: "cr",
                    id: member.id.toString(),
                    name: member.name,
                    role: member.role
                });

                const qrCodeDataURL = await QRCode.toDataURL(qrData, {
                    width: 300,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });

                const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, "");
                const fileName = `CR - ${member.name} - ${member.role}.png`.replace(/[<>:"/\\|?*]/g, '_');
                qrFolder.file(fileName, base64Data, { base64: true });
            }

            // Generate QR codes for Comitês
            for (const comite of comitesLocais) {
                const qrData = JSON.stringify({
                    type: "comite",
                    id: comite.name,
                    name: comite.name,
                    status: comite.status,
                    uf: comite.uf
                });

                const qrCodeDataURL = await QRCode.toDataURL(qrData, {
                    width: 300,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });

                const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, "");
                const fileName = `${comite.status} - ${comite.name}.png`.replace(/[<>:"/\\|?*]/g, '_');
                qrFolder.file(fileName, base64Data, { base64: true });
            }

            // Generate ZIP file
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            
            // Create download link
            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `QR_Codes_AG_${new Date().toISOString().split('T')[0]}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({
                title: "✅ QR Codes gerados com sucesso",
                description: `${ebMembers.length + crMembers.length + comitesLocais.length} QR Codes foram baixados.`,
            });

        } catch (error) {
            console.error("Error generating QR Codes:", error);
            toast({
                title: "❌ Erro ao gerar QR Codes",
                description: "Erro ao gerar os QR Codes. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateQrReader = async () => {
        if (!session?.user?.id) {
            toast({
                title: "Erro",
                description: "Você precisa estar logado para criar um leitor QR.",
                variant: "destructive",
            });
            return;
        }

        if (!newReaderName.trim()) {
            toast({
                title: "Erro",
                description: "Digite um nome para o leitor QR.",
                variant: "destructive",
            });
            return;
        }

        setIsCreatingReader(true);
        try {
            const result = await createQrReader({
                name: newReaderName.trim(),
                createdBy: session.user.id,
            });

            setNewReaderName("");
            toast({
                title: "✅ Leitor QR criado",
                description: `Leitor "${newReaderName}" criado com sucesso!`,
            });
        } catch (error) {
            toast({
                title: "❌ Erro",
                description: "Erro ao criar leitor QR. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setIsCreatingReader(false);
        }
    };

    const handleDeleteQrReader = async (id: string, name: string) => {
        if (window.confirm(`Deseja realmente excluir o leitor "${name}"?`)) {
            try {
                await removeQrReader({ id: id as any });
                toast({
                    title: "✅ Leitor excluído",
                    description: `Leitor "${name}" foi excluído.`,
                });
            } catch (error) {
                toast({
                    title: "❌ Erro",
                    description: "Erro ao excluir leitor. Tente novamente.",
                    variant: "destructive",
                });
            }
        }
    };

    const handleCopyReaderLink = (token: string, name: string) => {
        const baseUrl = window.location.origin;
        const readerUrl = `${baseUrl}/leitor-qr/${token}`;
        
        navigator.clipboard.writeText(readerUrl).then(() => {
            toast({
                title: "✅ Link copiado",
                description: `Link do leitor "${name}" copiado para a área de transferência!`,
            });
        }).catch(() => {
            toast({
                title: "❌ Erro",
                description: "Erro ao copiar link. Tente novamente.",
                variant: "destructive",
            });
        });
    };

    const handleSessionAttendanceToggle = async (participantId: string, currentAttendance: string) => {
        if (!currentSessionId || !session?.user?.id) return;

        const newAttendance = currentAttendance === "present" ? "absent" : "present";

        try {
            await markSessionAttendance({
                sessionId: currentSessionId as any,
                participantId,
                participantType: "session_participant", // Generic type for session-based attendance
                participantName: participantId, // Use ID as name for now
                attendance: newAttendance,
                markedBy: session.user.id,
            });

            toast({
                title: "✅ Presença atualizada",
                description: `Participante marcado como ${newAttendance === "present" ? "presente" : "ausente"}.`,
            });
        } catch (error) {
            console.error("Error updating attendance:", error);
            toast({
                title: "❌ Erro",
                description: "Erro ao atualizar presença. Tente novamente.",
                variant: "destructive",
            });
        }
    };

    const handleFinalizeSession = async () => {
        if (!currentSessionId || !session?.user?.id) return;

        const confirmMessage = currentSessionType === "avulsa" 
            ? "ATENÇÃO: Esta é uma chamada avulsa. Os dados NÃO serão salvos permanentemente. Deseja continuar?"
            : "Deseja finalizar esta sessão? Ela será arquivada mas pode ser reaberta posteriormente.";

        if (!window.confirm(confirmMessage)) return;

        try {
            if (currentSessionType === "avulsa") {
                // For avulsa, just clear the current data without saving
                setCurrentSessionId(null);
                setCurrentSessionType("avulsa");
                
                toast({
                    title: "✅ Chamada avulsa finalizada",
                    description: "Os dados foram descartados conforme esperado.",
                });
            } else {
                // For plenária/sessão, archive the session
                await archiveSession({
                    sessionId: currentSessionId as any,
                    archivedBy: session.user.id,
                });

                setCurrentSessionId(null);
                setCurrentSessionType("avulsa");

                toast({
                    title: "✅ Sessão finalizada",
                    description: "A sessão foi arquivada com sucesso.",
                });
            }
        } catch (error) {
            console.error("Error finalizing session:", error);
            toast({
                title: "❌ Erro",
                description: "Erro ao finalizar sessão. Tente novamente.",
                variant: "destructive",
            });
        }
    };

    const handleCreateSessionQrReader = async () => {
        if (!session?.user?.id || !currentSessionId) {
            toast({
                title: "Erro",
                description: "Você precisa estar logado e ter uma sessão ativa.",
                variant: "destructive",
            });
            return;
        }

        if (!newReaderName.trim()) {
            toast({
                title: "Erro",
                description: "Digite um nome para o leitor QR.",
                variant: "destructive",
            });
            return;
        }

        setIsCreatingReader(true);
        try {
            const result = await createSessionQrReader({
                name: newReaderName.trim(),
                sessionId: currentSessionId as any,
                createdBy: session.user.id,
            });

            const readerUrl = `${window.location.origin}/leitor-qr/${result.token}`;
            
            toast({
                title: "✅ Leitor QR criado",
                description: `Leitor "${newReaderName}" criado para esta sessão.`,
            });

            // Copy URL to clipboard
            try {
                await navigator.clipboard.writeText(readerUrl);
                toast({
                    title: "🔗 Link copiado",
                    description: "Link do leitor QR copiado para a área de transferência.",
                });
            } catch (error) {
                console.log("Link do leitor:", readerUrl);
            }

            setNewReaderName("");
        } catch (error) {
            console.error("Error creating session QR reader:", error);
            toast({
                title: "❌ Erro",
                description: "Erro ao criar leitor QR para a sessão. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setIsCreatingReader(false);
        }
    };

    const handleCopySessionReaderLink = (token: string, name: string) => {
        const readerUrl = `${window.location.origin}/leitor-qr/${token}`;
        
        navigator.clipboard.writeText(readerUrl).then(() => {
            toast({
                title: "🔗 Link copiado",
                description: `Link do leitor "${name}" copiado.`,
            });
        }).catch(() => {
            toast({
                title: "Erro",
                description: "Não foi possível copiar o link.",
                variant: "destructive",
            });
        });
    };

    const handleDeleteSessionQrReader = async (id: string, name: string) => {
        if (!session?.user?.id) return;

        const confirmed = window.confirm(`Tem certeza que deseja deletar o leitor "${name}"?`);
        if (!confirmed) return;

        try {
            await removeQrReader({ id: id as any });
            toast({
                title: "✅ Leitor deletado",
                description: `Leitor "${name}" foi removido.`,
            });
        } catch (error) {
            toast({
                title: "❌ Erro",
                description: "Erro ao deletar leitor QR.",
                variant: "destructive",
            });
        }
    };

    if (loading || isLoadingNovaAG) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
                <div className="container mx-auto px-6 py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">
                            {isLoadingNovaAG ? "Carregando nova AG..." : "Carregando dados..."}
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
                <div className="container mx-auto px-6 py-12">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <XCircle className="w-8 h-8 text-red-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro ao carregar dados</h3>
                        <p className="text-red-600 mb-4">{error}</p>
                        <div className="space-y-2">
                            <Button onClick={() => router.push("/comites-locais")} variant="outline">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Voltar
                            </Button>
                            <Button onClick={() => { setError(null); handleNovaChamada(); }} className="bg-blue-600 hover:bg-blue-700">
                                <ClipboardCheck className="w-4 h-4 mr-2" />
                                Tentar Carregar Nova Chamada
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    // If no data is loaded and Convex is not loading, show the Nova AG starter screen
    if (!isConvexLoading && ebMembers.length === 0 && crMembers.length === 0 && comitesLocais.length === 0) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
                <div className="container mx-auto px-6 py-12">
                    <div className="max-w-2xl mx-auto text-center">
                        <div className="flex items-center justify-center space-x-4 mb-8">
                            <Button
                                variant="outline"
                                onClick={() => router.push("/comites-locais")}
                                className="hover:bg-gray-50"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Voltar
                            </Button>
                        </div>
                        
                        <div className="p-12 bg-white rounded-xl shadow-lg border">
                            <div className="p-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg mb-6 mx-auto w-fit">
                                <ClipboardCheck className="w-12 h-12 text-white" />
                            </div>
                            
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-4">
                                Chamada de AG
                            </h1>
                            
                            <p className="text-gray-600 mb-8 text-lg">
                                Clique no botão abaixo para carregar todos os dados e iniciar uma nova sessão de Assembleia Geral
                            </p>
                            
                            <Button
                                onClick={handleNovaChamada}
                                disabled={isLoadingNovaAG}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                                {isLoadingNovaAG ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Carregando...
                                    </>
                                ) : (
                                    <>
                                        <ClipboardCheck className="w-4 h-4 mr-2" />
                                        Nova Chamada
                                    </>
                                )}
                            </Button>
                            
                            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-blue-800 text-sm">
                                    <strong>O que acontecerá:</strong><br/>
                                    • Carregamento de dados do CSV, EBs e CRs<br/>
                                    • Limpeza completa da tabela de presença<br/>
                                    • Limpeza completa dos leitores QR<br/>
                                    • Criação de novos registros para todos os membros
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="container mx-auto px-6 py-12">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex items-center space-x-4">
                        <Button
                            variant="outline"
                            onClick={() => router.push("/comites-locais")}
                            className="hover:bg-gray-50"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar
                        </Button>
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                                <ClipboardCheck className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-green-800 bg-clip-text text-transparent">
                                    Chamada de AG
                                </h1>
                                <p className="text-gray-600">
                                    Controle de presença para Assembleia Geral
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <Card className="shadow-lg border-0">
                        <CardContent className="p-6">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <Button
                                        onClick={handleNovaChamada}
                                        disabled={isLoadingNovaAG}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
                                    >
                                        {isLoadingNovaAG ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Carregando...
                                            </>
                                        ) : (
                                            <>
                                                <ClipboardCheck className="w-4 h-4 mr-2" />
                                                Nova Chamada
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        onClick={downloadExcelReport}
                                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Baixar Relatório
                                    </Button>
                                    <Button
                                        onClick={downloadQRCodes}
                                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
                                    >
                                        <QrCode className="w-4 h-4 mr-2" />
                                        Baixar QR Codes
                                    </Button>
                                    <Dialog open={isQrReadersDialogOpen} onOpenChange={setIsQrReadersDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300">
                                                <Smartphone className="w-4 h-4 mr-2" />
                                                Leitores de QRs
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[600px]">
                                            <DialogHeader>
                                                <DialogTitle className="flex items-center space-x-2">
                                                    <Smartphone className="w-5 h-5 text-cyan-600" />
                                                    <span>Gerenciar Leitores QR</span>
                                                </DialogTitle>
                                                <DialogDescription>
                                                    Crie links únicos para dispositivos móveis lerem QR codes e marcarem presença.
                                                </DialogDescription>
                                            </DialogHeader>
                                            
                                            <div className="space-y-4">
                                                {/* Create new reader section */}
                                                <div className="p-4 bg-gray-50 rounded-lg border">
                                                    <h4 className="font-semibold mb-3 flex items-center space-x-2">
                                                        <Plus className="w-4 h-4 text-green-600" />
                                                        <span>Novo Leitor QR</span>
                                                    </h4>
                                                    <div className="flex space-x-2">
                                                        <div className="flex-1">
                                                            <Label htmlFor="reader-name">Nome do leitor</Label>
                                                            <Input
                                                                id="reader-name"
                                                                placeholder="Ex: João da Silva"
                                                                value={newReaderName}
                                                                onChange={(e) => setNewReaderName(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        handleCreateQrReader();
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                        <Button 
                                                            onClick={handleCreateQrReader}
                                                            disabled={isCreatingReader || !newReaderName.trim()}
                                                            className="mt-6 bg-green-600 hover:bg-green-700"
                                                        >
                                                            {isCreatingReader ? (
                                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                                            ) : (
                                                                <>
                                                                    <Plus className="w-4 h-4 mr-1" />
                                                                    Criar
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Existing readers list */}
                                                <div>
                                                    <h4 className="font-semibold mb-3 flex items-center justify-between">
                                                        <span>Leitores Ativos</span>
                                                        <Badge variant="outline" className="text-cyan-600 border-cyan-200">
                                                            {qrReaders?.length || 0} leitores
                                                        </Badge>
                                                    </h4>
                                                    
                                                    {qrReaders && qrReaders.length > 0 ? (
                                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                                            {qrReaders.map((reader) => (
                                                                <div 
                                                                    key={reader._id} 
                                                                    className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
                                                                >
                                                                    <div>
                                                                        <p className="font-medium text-sm">{reader.name}</p>
                                                                        <p className="text-xs text-gray-500">
                                                                            Criado em {new Date(reader.createdAt).toLocaleString('pt-BR')}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center space-x-1">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => handleCopyReaderLink(reader.token, reader.name)}
                                                                            className="text-cyan-600 border-cyan-200 hover:bg-cyan-50"
                                                                        >
                                                                            <Copy className="w-3 h-3 mr-1" />
                                                                            Copiar Link
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => {
                                                                                const baseUrl = window.location.origin;
                                                                                const readerUrl = `${baseUrl}/leitor-qr/${reader.token}`;
                                                                                window.open(readerUrl, '_blank');
                                                                            }}
                                                                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                                                        >
                                                                            <ExternalLink className="w-3 h-3 mr-1" />
                                                                            Abrir
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => handleDeleteQrReader(reader._id, reader.name)}
                                                                            className="text-red-600 border-red-200 hover:bg-red-50"
                                                                        >
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-8 text-gray-500">
                                                            <Smartphone className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                                            <p>Nenhum leitor QR criado ainda.</p>
                                                            <p className="text-sm">Crie um leitor para começar!</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                    <Button
                                        onClick={resetAttendanceState}
                                        variant="outline"
                                        disabled={isResetting}
                                        className="hover:bg-red-50 hover:border-red-200 border-red-300 text-red-700"
                                    >
                                        <RotateCcw className={`w-4 h-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
                                        {isResetting ? 'Resetando...' : 'Resetar Presenças'}
                                    </Button>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-sm text-gray-600">
                                        <p>Use os botões para gerenciar a sessão da AG</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Session Creation Dialog */}
                    <Dialog open={isSessionDialogOpen} onOpenChange={setIsSessionDialogOpen}>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center space-x-2">
                                    {chamadaType === "plenaria" ? (
                                        <Users className="w-5 h-5 text-purple-600" />
                                    ) : (
                                        <Building className="w-5 h-5 text-blue-600" />
                                    )}
                                    <span>Nova {getChamadaTypeLabel(chamadaType)}</span>
                                </DialogTitle>
                                <DialogDescription>
                                    Crie uma nova {chamadaType} para a AG selecionada.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="assembly-selection">Assembleia Geral</Label>
                                    <select
                                        id="assembly-selection"
                                        value={selectedAssemblyId}
                                        onChange={(e) => setSelectedAssemblyId(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="">Selecione uma AG</option>
                                        {assemblies?.map((assembly) => (
                                            <option key={assembly._id} value={assembly._id}>
                                                {assembly.name} - {assembly.location}
                                            </option>
                                        ))}
                                    </select>
                                    </div>

                                <div>
                                    <Label htmlFor="session-name">Nome da {getChamadaTypeLabel(chamadaType)}</Label>
                                    <Input
                                        id="session-name"
                                        value={sessionName}
                                        onChange={(e) => setSessionName(e.target.value)}
                                        placeholder={`Ex: ${chamadaType === "plenaria" ? "Plenária de Abertura" : "Sessão Administrativa"}`}
                                    />
                                </div>
                                                    </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsSessionDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button 
                                    onClick={handleCreateNewSessionFromModal}
                                    disabled={!selectedAssemblyId || !sessionName.trim()}
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                >
                                    Criar {getChamadaTypeLabel(chamadaType)}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Session Status Card */}
                    {currentSessionId && currentSessionData && (
                        <Card className="shadow-lg border-0 border-l-4 border-l-blue-500">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                                            {currentSessionType === "plenaria" ? (
                                                <Users className="w-6 h-6 text-white" />
                                            ) : currentSessionType === "sessao" ? (
                                                <ClipboardCheck className="w-6 h-6 text-white" />
                                            ) : (
                                                <Clock className="w-6 h-6 text-white" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">
                                                Sessão Ativa: {currentSessionData.name}
                                            </h3>
                                            <p className="text-gray-600">
                                                {getChamadaTypeLabel(currentSessionType)} • {currentSessionData.attendanceStats.total || 0} presenças registradas
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-3">
                                        <Button
                                            onClick={handleCreateSessionQrReader}
                                            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Novo Leitor QR
                                        </Button>
                                        
                                        <Button
                                            onClick={handleFinalizeSession}
                                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Finalizar Sessão
                                        </Button>
                                    </div>
                                </div>

                                {/* Session QR Readers */}
                                {sessionQrReaders && sessionQrReaders.length > 0 && (
                                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <h4 className="font-semibold text-blue-800 mb-3 flex items-center space-x-2">
                                            <Smartphone className="w-4 h-4" />
                                            <span>Leitores QR desta Sessão</span>
                                            <Badge variant="outline" className="text-blue-600 border-blue-300">
                                                {sessionQrReaders.length} ativos
                                            </Badge>
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {sessionQrReaders.map((reader) => (
                                                <div key={reader._id} className="bg-white p-3 rounded border border-blue-200">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-medium text-sm text-blue-900">{reader.name}</p>
                                                            <p className="text-xs text-blue-600">
                                                                Criado {new Date(reader.createdAt).toLocaleString('pt-BR')}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center space-x-1">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleCopySessionReaderLink(reader.token, reader.name)}
                                                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                                            >
                                                                <Copy className="w-3 h-3" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    const baseUrl = window.location.origin;
                                                                    const readerUrl = `${baseUrl}/leitor-qr/${reader.token}`;
                                                                    window.open(readerUrl, '_blank');
                                                                }}
                                                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                                            >
                                                                <ExternalLink className="w-3 h-3" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleDeleteSessionQrReader(reader._id, reader.name)}
                                                                className="text-red-600 border-red-200 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-blue-600 mt-3">
                                            Leitores QR específicos podem escanear crachás para marcar presença nesta sessão
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Manual Attendance Management for Current Session */}
                    {currentSessionId && currentSessionData && (
                        <SessionAttendanceManager 
                            sessionId={currentSessionId}
                            sessionType={currentSessionType}
                            sessionName={currentSessionData.name}
                            assemblyId={selectedAssemblyId}
                            onAttendanceUpdate={handleSessionAttendanceToggle}
                        />
                    )}

                    {/* Floating Summary Menu */}
                    <div className="fixed right-6 top-24 z-50">
                        <div className="group">
                            {/* Summary Icon */}
                            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full p-3 shadow-lg cursor-pointer transition-all duration-300 hover:shadow-xl">
                                <BarChart3 className="w-6 h-6 text-white" />
                            </div>
                            
                            {/* Expandable Summary Panel */}
                            <div className="absolute right-16 top-0 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0 pointer-events-none group-hover:pointer-events-auto">
                                <Card className="shadow-xl border-0 w-80">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="flex items-center space-x-2 text-lg">
                                            <BarChart3 className="w-5 h-5 text-blue-600" />
                                            <span>Resumo Geral</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { label: "Diretoria Executiva", data: filteredEbMembers, requirement: QUORUM_REQUIREMENTS.eb },
                                                { label: "Coordenadores Regionais", data: filteredCrMembers, requirement: QUORUM_REQUIREMENTS.cr },
                                                { label: "Comitês Plenos", data: filteredComitesPlenos, requirement: QUORUM_REQUIREMENTS.comitesPlenos },
                                                { label: "Comitês Não Plenos", data: filteredComitesNaoPlenos, requirement: QUORUM_REQUIREMENTS.comitesNaoPlenos }
                                            ].map(({ label, data, requirement }) => {
                                                const stats = getStats(data);
                                                return (
                                                    <div key={label} className="text-center p-3 bg-gray-50 rounded-lg">
                                                        <h4 className="font-semibold text-gray-900 mb-2 text-sm">{label}</h4>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-center space-x-1">
                                                                <CheckCircle className="w-3 h-3 text-green-600" />
                                                                <span className="text-xs text-green-700">{stats.present}</span>
                                                            </div>
                                                            <div className="flex items-center justify-center space-x-1">
                                                                <XCircle className="w-3 h-3 text-red-600" />
                                                                <span className="text-xs text-red-700">{stats.absent}</span>
                                                            </div>
                                                            <div className="flex items-center justify-center space-x-1">
                                                                <XCircle className="w-3 h-3 text-orange-600" />
                                                                <span className="text-xs text-orange-700">{stats.excluded}</span>
                                                            </div>
                                                            <div className="flex items-center justify-center space-x-1">
                                                                <Minus className="w-3 h-3 text-gray-400" />
                                                                <span className="text-xs text-gray-600">{stats.notCounting}</span>
                                                            </div>
                                                            <div className="mt-2 text-xs text-gray-600">
                                                                {stats.quorumPercentage.toFixed(1)}% quórum
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Nova Chamada Modal */}
            <Dialog open={novaChamadaModalOpen} onOpenChange={setNovaChamadaModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                            <ClipboardCheck className="w-5 h-5 text-blue-600" />
                            <span>Nova Chamada</span>
                        </DialogTitle>
                        <DialogDescription>
                            Escolha o tipo de sessão e forneça um nome para criar uma nova chamada.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                        <div>
                            <Label className="text-base font-semibold">Tipo de Sessão</Label>
                            <div className="grid grid-cols-1 gap-3 mt-3">
                                <div 
                                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                        novaChamadaType === "avulsa" 
                                            ? "border-blue-500 bg-blue-50" 
                                            : "border-gray-200 hover:border-gray-300"
                                    }`}
                                    onClick={() => setNovaChamadaType("avulsa")}
                                >
                                    <div className="flex items-center space-x-3">
                                        <ClipboardCheck className="w-5 h-5 text-blue-600" />
                                        <div>
                                            <h3 className="font-semibold text-gray-900">Chamada Avulsa</h3>
                                            <p className="text-sm text-gray-600">Sessão geral para presença (não requer assembleia)</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div 
                                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                        novaChamadaType === "plenaria" 
                                            ? "border-purple-500 bg-purple-50" 
                                            : "border-gray-200 hover:border-gray-300"
                                    }`}
                                    onClick={() => setNovaChamadaType("plenaria")}
                                >
                                    <div className="flex items-center space-x-3">
                                        <Users className="w-5 h-5 text-purple-600" />
                                        <div>
                                            <h3 className="font-semibold text-gray-900">Plenária</h3>
                                            <p className="text-sm text-gray-600">Sessão plenária de uma assembleia específica</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div 
                                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                        novaChamadaType === "sessao" 
                                            ? "border-green-500 bg-green-50" 
                                            : "border-gray-200 hover:border-gray-300"
                                    }`}
                                    onClick={() => setNovaChamadaType("sessao")}
                                >
                                    <div className="flex items-center space-x-3">
                                        <Building className="w-5 h-5 text-green-600" />
                                        <div>
                                            <h3 className="font-semibold text-gray-900">Sessão</h3>
                                            <p className="text-sm text-gray-600">Sessão específica de uma assembleia</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {novaChamadaType && (novaChamadaType === "plenaria" || novaChamadaType === "sessao") && (
                            <div>
                                <Label className="text-base font-semibold">Assembleia Geral</Label>
                                <div className="mt-3">
                                    <select
                                        value={novaChamadaAssemblyId}
                                        onChange={(e) => setNovaChamadaAssemblyId(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Selecione uma assembleia...</option>
                                        {assemblies?.map((assembly) => (
                                            <option key={assembly._id} value={assembly._id}>
                                                {assembly.name} - {assembly.location} ({assembly.type})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                        
                        {novaChamadaType && (novaChamadaType === "avulsa" || (novaChamadaAssemblyId && (novaChamadaType === "plenaria" || novaChamadaType === "sessao"))) && (
                            <div>
                                <Label htmlFor="nova-chamada-name">Nome da {getChamadaTypeLabel(novaChamadaType)}</Label>
                                <Input
                                    id="nova-chamada-name"
                                    value={novaChamadaName}
                                    onChange={(e) => setNovaChamadaName(e.target.value)}
                                    placeholder={
                                        novaChamadaType === "plenaria" 
                                            ? "Ex: Plenária de Abertura" 
                                            : novaChamadaType === "sessao"
                                            ? "Ex: Sessão Administrativa"
                                            : "Ex: Chamada Geral"
                                    }
                                    className="mt-2"
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNovaChamadaModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleCreateNewSessionFromModal}
                            disabled={!novaChamadaType || !novaChamadaName.trim() || ((novaChamadaType === "plenaria" || novaChamadaType === "sessao") && !novaChamadaAssemblyId)}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        >
                            <ClipboardCheck className="w-4 h-4 mr-2" />
                            Criar {novaChamadaType ? getChamadaTypeLabel(novaChamadaType) : "Sessão"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    );
} 