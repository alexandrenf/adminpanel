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
    Clock,
    Info,
    AlertCircle
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
    const [isSelfAttendanceQrOpen, setIsSelfAttendanceQrOpen] = useState(false);
    const [currentSessionQrCode, setCurrentSessionQrCode] = useState<string>("");

    // Session QR Reader state
    const [isSessionQrDialogOpen, setIsSessionQrDialogOpen] = useState(false);
    const [newSessionReaderName, setNewSessionReaderName] = useState("");

    // Chamada type state
    const [chamadaType, setChamadaType] = useState<"avulsa" | "plenaria" | "sessao">("avulsa");

    // Session management state
    const [selectedAssemblyId, setSelectedAssemblyId] = useState<string>("");
    const [sessionName, setSessionName] = useState("");
    const [isSessionDialogOpen, setIsSessionDialogOpen] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [currentSessionType, setCurrentSessionType] = useState<"avulsa" | "plenaria" | "sessao">("avulsa");

    // Restore session state from localStorage on component mount
    useEffect(() => {
        const savedSessionId = localStorage.getItem('currentSessionId');
        const savedSessionType = localStorage.getItem('currentSessionType');
        const savedAssemblyId = localStorage.getItem('selectedAssemblyId');
        
        if (savedSessionId) {
            setCurrentSessionId(savedSessionId);
        }
        if (savedSessionType && (savedSessionType === "avulsa" || savedSessionType === "plenaria" || savedSessionType === "sessao")) {
            setCurrentSessionType(savedSessionType as "avulsa" | "plenaria" | "sessao");
        }
        if (savedAssemblyId) {
            setSelectedAssemblyId(savedAssemblyId);
        }
    }, []);

    // Save session state to localStorage whenever it changes
    useEffect(() => {
        if (currentSessionId) {
            localStorage.setItem('currentSessionId', currentSessionId);
            localStorage.setItem('currentSessionType', currentSessionType);
            if (selectedAssemblyId) {
                localStorage.setItem('selectedAssemblyId', selectedAssemblyId);
            }
        } else {
            // Clear localStorage when session is ended
            localStorage.removeItem('currentSessionId');
            localStorage.removeItem('currentSessionType');
            localStorage.removeItem('selectedAssemblyId');
        }
    }, [currentSessionId, currentSessionType, selectedAssemblyId]);

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

    // agParticipants data for plenaria sessions (needed for floating report)
    const agComitesParticipants = useQuery(
        convexApi.assemblies?.getComitesLocaisWithStatus, 
        currentSessionType === "plenaria" && selectedAssemblyId ? { assemblyId: selectedAssemblyId as any } : "skip"
    );

    // Generate QR code for current session self-attendance - MUST be before early returns
    useEffect(() => {
        if (currentSessionId && (currentSessionType === "plenaria" || currentSessionType === "sessao")) {
            const selfAttendanceUrl = `${window.location.origin}/presenca-sessao/${currentSessionId}`;
            QRCode.toDataURL(selfAttendanceUrl, {
                width: 192, // 48 * 4 for w-48
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            }).then(setCurrentSessionQrCode);
        } else {
            setCurrentSessionQrCode("");
        }
    }, [currentSessionId, currentSessionType]);

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
            console.log("Loading EB attendance data:", {
                ebsAttendanceCount: ebsAttendance.length,
                sampleEBs: ebsAttendance.slice(0, 3).map(a => ({ memberId: a.memberId, attendance: a.attendance }))
            });
            
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
            console.log("Loading CR attendance data:", {
                crsAttendanceCount: crsAttendance.length,
                sampleCRs: crsAttendance.slice(0, 3).map(a => ({ memberId: a.memberId, attendance: a.attendance }))
            });
            
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
            console.log("Loading Comités attendance data:", {
                comitesAttendanceCount: comitesAttendance.length,
                sampleComites: comitesAttendance.slice(0, 3).map(a => ({ name: a.name, attendance: a.attendance, status: a.status }))
            });
            
            // Always rebuild comites from Convex data with complete CSV information
            const comitesFromConvex = comitesAttendance
                .filter(record => record.type === "comite")
                .map(record => {
                    // The status field gets overwritten by attendance, so we need to determine 
                    // committee status from the stored data or default to "Não-pleno"
                    let comiteStatus: "Pleno" | "Não-pleno" = "Não-pleno";
                    
                    // First try to get status from the record if it's a valid committee status
                    if (record.status === "Pleno" || record.status === "Não-pleno") {
                        comiteStatus = record.status as "Pleno" | "Não-pleno";
                    } else {
                        // Try to determine status from agFiliacao or other stored fields
                        // This is a fallback since the original status may have been overwritten
                        if (record.agFiliacao) {
                            const statusText = record.agFiliacao.toLowerCase()
                                .normalize('NFD')
                                .replace(/[\u0300-\u036f]/g, '')
                                .replace(/[^a-z0-9]/g, '')
                                .trim();
                            
                            const isNaoPleno = statusText.includes('naopleno') || 
                                              statusText.includes('nao pleno') || 
                                              statusText.includes('nao-pleno');
                            const isPleno = !isNaoPleno && statusText.includes('pleno');
                            
                            comiteStatus = isNaoPleno ? 'Não-pleno' : (isPleno ? 'Pleno' : 'Não-pleno');
                        }
                    }
                    
                    return {
                        name: record.name,
                        escola: record.escola || "",
                        regional: record.regional || "",
                        cidade: record.cidade || "",
                        uf: record.uf || "",
                        status: comiteStatus,
                        agFiliacao: record.agFiliacao || "",
                        attendance: record.attendance as AttendanceState
                    };
                })
                .filter((comite): comite is ComiteLocal => comite !== undefined);
            
            setComitesLocais(comitesFromConvex);
            
            // Debug: Show status breakdown after Convex reconstruction
            const convexPlenosCount = comitesFromConvex.filter(c => c.status === "Pleno").length;
            const convexNaoPlenosCount = comitesFromConvex.filter(c => c.status === "Não-pleno").length;
            console.log(`After Convex reconstruction - Status breakdown: ${convexPlenosCount} Plenos, ${convexNaoPlenosCount} Não-Plenos`);
            if (comitesFromConvex.length > 0) {
                console.log("Sample reconstructed comités:", comitesFromConvex.slice(0, 3).map(c => ({ 
                    name: c.name, 
                    status: c.status,
                    originalRecordStatus: comitesAttendance?.find(r => r.name === c.name)?.status,
                    agFiliacao: c.agFiliacao
                })));
            }
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
                console.log("🔄 Starting Nova Chamada Avulsa process...");
                
                // First, clear all existing attendance records and QR readers
                console.log("🗑️ Clearing existing attendance records...");
                await clearAllAttendance();
                console.log("🗑️ Clearing existing QR readers...");
                await clearQrReaders();
                
                // Load CSV data
                if (!registrosData?.url) {
                    throw new Error("URL do CSV não configurada");
                }

                console.log("📄 Loading CSV data from:", registrosData.url);
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
                        
                        // Debug: Log the first few rows to understand CSV structure
                        if (dataLines.indexOf(line) < 3) {
                            console.log(`CSV Row ${dataLines.indexOf(line)}:`, {
                                col0_name: columns[0],
                                col1_escola: columns[1], 
                                col2_regional: columns[2],
                                col3_cidade: columns[3],
                                col4_uf: columns[4],
                                col5_original: columns[5],
                                col6_agFiliacao: columns[6],
                                totalColumns: columns.length
                            });
                        }
                        
                        const statusText = (columns[5] || '').toLowerCase()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/[^a-z0-9]/g, '')
                            .trim();
                        
                        const isNaoPleno = statusText.includes('naopleno') || 
                                          statusText.includes('nao pleno') || 
                                          statusText.includes('nao-pleno');
                        const isPleno = !isNaoPleno && statusText.includes('pleno');
                        
                        const comite = {
                            name: columns[0] || '',
                            escola: columns[1] || '',
                            regional: columns[2] || '',
                            cidade: columns[3] || '',
                            uf: columns[4] || '',
                            status: isNaoPleno ? 'Não-pleno' : (isPleno ? 'Pleno' : 'Não-pleno') as "Pleno" | "Não-pleno",
                            agFiliacao: columns[6] || '',
                            attendance: "not-counting" as AttendanceState
                        };
                        
                        // Debug: Log status detection for first few rows
                        if (dataLines.indexOf(line) < 3) {
                            console.log(`Status detection for ${comite.name}:`, {
                                originalColumn5: columns[5],
                                cleanedStatusText: statusText,
                                isNaoPleno,
                                isPleno,
                                finalStatus: comite.status
                            });
                        }
                        
                        return comite;
                    } catch (err) {
                        return null;
                    }
                }).filter((comite): comite is ComiteLocal => comite !== null && comite.name !== '');

                comites.sort((a, b) => a.name.localeCompare(b.name));
                
                console.log(`📊 Processed ${comites.length} comités from CSV`);
                
                // Debug: Show status breakdown
                const plenosCount = comites.filter(c => c.status === "Pleno").length;
                const naoPlenosCount = comites.filter(c => c.status === "Não-pleno").length;
                console.log(`Status breakdown: ${plenosCount} Plenos, ${naoPlenosCount} Não-Plenos`);
                console.log("Sample comités:", comites.slice(0, 5).map(c => ({ 
                    name: c.name, 
                    status: c.status, 
                    originalColumn5: c.agFiliacao 
                })));
                
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
                    console.log(`👥 Added ${ebData.length} EB records with attendance: "not-counting"`);
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
                    console.log(`👥 Added ${crData.length} CR records with attendance: "not-counting"`);
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
                console.log(`🏢 Added ${comites.length} Comité records with attendance: "not-counting"`);
                
                console.log(`💾 Bulk inserting ${allRecords.length} total records to Convex...`);
                console.log("Sample records being inserted:", allRecords.slice(0, 3).map(r => ({ 
                    type: r.type, 
                    name: r.name, 
                    attendance: r.attendance, 
                    status: r.status 
                })));
                
                // Bulk insert all records to Convex
                await bulkInsertAttendance({ records: allRecords });
                
                console.log("✅ Bulk insert completed successfully!");
                
                setLoading(false);
                
                toast({
                    title: "✅ Nova chamada avulsa criada com sucesso",
                    description: `${allRecords.length} registros foram carregados na nova sessão.`,
                });
                
            } catch (error) {
                console.error("❌ Error creating new chamada:", error);
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
            if (novaChamadaType === "avulsa") {
                // For avulsa, we need to load all data first
                setNovaChamadaModalOpen(false);
                
                // Set the session name for display
                const tempSessionName = novaChamadaName.trim();
                
                // First load all the data using the existing function
                await handleNovaChamadaAvulsa();
                
                // Then create a session record for tracking (but it's temporary)
                const result = await createSession({
                    assemblyId: undefined,
                    name: tempSessionName,
                    type: "avulsa",
                    createdBy: session.user.id
                });
                
                if (result) {
                    setCurrentSessionId(result as string);
                    setCurrentSessionType("avulsa");
                    toast({
                        title: "✅ Chamada avulsa criada",
                        description: `"${tempSessionName}" foi criada com sucesso!`
                    });
                }
                
                setNovaChamadaName("");
                setNovaChamadaType(null);
                setNovaChamadaAssemblyId("");
            } else {
                // For plenaria/sessão, create the session normally
                const result = await createSession({
                    assemblyId: novaChamadaAssemblyId as any,
                    name: novaChamadaName.trim(),
                    type: novaChamadaType,
                    createdBy: session.user.id
                });
                
                if (result) {
                    setCurrentSessionId(result as string);
                    setCurrentSessionType(novaChamadaType);
                    setSelectedAssemblyId(novaChamadaAssemblyId);
                    toast({
                        title: "✅ Sessão criada",
                        description: `${getChamadaTypeLabel(novaChamadaType)} "${novaChamadaName}" foi criada com sucesso!`
                    });
                    setNovaChamadaModalOpen(false);
                    setNovaChamadaName("");
                    setNovaChamadaType(null);
                    setNovaChamadaAssemblyId("");
                }
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

        if (window.confirm("⚠️ ATENÇÃO: Tem certeza que deseja resetar todas as presenças?\n\nEsta ação irá:\n• Resetar todos os status de presença para 'Não contabilizado'\n• Manter todos os registros na tabela\n• Criar registros para membros que não estão no Convex\n\nDeseja continuar?")) {
            setIsResetting(true);
            try {
                console.log("🔄 Starting attendance reset process...");
                
                // Step 1: Ensure ALL people have Convex records (create missing ones)
                const allRecords = [];
                
                // Add EB records that might be missing
                if (ebData) {
                    for (const eb of ebData) {
                        const existingRecord = ebsAttendance?.find(a => a.memberId === eb.id.toString());
                        if (!existingRecord) {
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
                }
                
                // Add CR records that might be missing
                if (crData) {
                    for (const cr of crData) {
                        const existingRecord = crsAttendance?.find(a => a.memberId === cr.id.toString());
                        if (!existingRecord) {
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
                }
                
                // Add Comité records that might be missing (need to load from CSV if not in Convex)
                if (comitesLocais.length === 0 && registrosData?.url) {
                    // Load CSV data if no comités in Convex
                    console.log("📄 Loading CSV data to ensure all comités are in database...");
                    try {
                        const response = await fetch(registrosData.url, { redirect: 'follow' });
                        if (response.ok) {
                            const csvText = await response.text();
                            const cleanText = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
                            const lines = cleanText.split('\n').filter(line => line.trim());
                            
                            if (lines.length > 1) {
                                const dataLines = lines.slice(1);
                                
                                // Add missing comité records
                                for (const line of dataLines) {
                                    try {
                                        const columns = line.split(',').map(col => {
                                            const trimmed = col.trim();
                                            return trimmed.startsWith('"') && trimmed.endsWith('"') 
                                                ? trimmed.slice(1, -1).trim() 
                                                : trimmed;
                                        });
                                        
                                        const name = columns[0] || '';
                                        if (!name) continue; // Skip if no name
                                        
                                        const statusText = (columns[5] || '').toLowerCase()
                                            .normalize('NFD')
                                            .replace(/[\u0300-\u036f]/g, '')
                                            .replace(/[^a-z0-9]/g, '')
                                            .trim();
                                        
                                        const isNaoPleno = statusText.includes('naopleno') || 
                                                          statusText.includes('nao pleno') || 
                                                          statusText.includes('nao-pleno');
                                        const isPleno = !isNaoPleno && statusText.includes('pleno');
                                        
                                        const existingRecord = comitesAttendance?.find(a => a.name === name && a.type === "comite");
                                        if (!existingRecord) {
                                            allRecords.push({
                                                type: "comite",
                                                memberId: name,
                                                name: name,
                                                status: isNaoPleno ? 'Não-pleno' : (isPleno ? 'Pleno' : 'Não-pleno'),
                                                attendance: "not-counting",
                                                lastUpdatedBy: session.user.id,
                                                escola: columns[1] || '',
                                                regional: columns[2] || '',
                                                cidade: columns[3] || '',
                                                uf: columns[4] || '',
                                                agFiliacao: columns[6] || ''
                                            });
                                        }
                                    } catch (err) {
                                        // Skip invalid lines
                                        continue;
                                    }
                                }
                            }
                        }
                    } catch (csvError) {
                        console.warn("Could not load CSV data for missing comités:", csvError);
                    }
                }
                
                // Step 2: Bulk insert missing records if any
                if (allRecords.length > 0) {
                    console.log(`💾 Creating ${allRecords.length} missing Convex records...`);
                    await bulkInsertAttendance({ records: allRecords });
                }
                
                // Step 3: Reset all attendance status to "not-counting" 
                console.log("🔄 Resetting all attendance to 'not-counting'...");
                const updatedCount = await resetAttendanceOnly({ lastUpdatedBy: session.user.id });
                
                // No local state updates - Convex will trigger UI updates via useEffect
                
                const totalExpected = (ebData?.length || 0) + (crData?.length || 0) + (comitesLocais.length || allRecords.filter(r => r.type === "comite").length);
                
                toast({
                    title: "✅ Presenças resetadas com sucesso",
                    description: `${updatedCount} registros foram resetados para 'Não contabilizado' (esperado: ${totalExpected}).`,
                });
                
                console.log(`✅ Reset completed! Updated ${updatedCount} records (expected: ${totalExpected})`);
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

        // Determine data source based on session type
        const isSessionMode = currentSessionType === "plenaria" || currentSessionType === "sessao";
        
        let reportData = {
            ebs: [] as any[],
            crs: [] as any[],
            comitesPlenos: [] as any[],
            comitesNaoPlenos: [] as any[]
        };

        if (isSessionMode && sessionAttendance && currentSessionData) {
            // Use session attendance data for plenaria/sessao
            console.log("Excel Report Debug (Session Mode):", {
                sessionType: currentSessionType,
                sessionName: currentSessionData.name,
                sessionAttendanceStructure: sessionAttendance,
                sessionAttendanceKeys: Object.keys(sessionAttendance || {})
            });

            // sessionAttendance appears to be an object with arrays, let's handle all its contents
            if (sessionAttendance && typeof sessionAttendance === 'object') {
                // If it has specific arrays for different types
                if ('ebs' in sessionAttendance && Array.isArray((sessionAttendance as any).ebs)) {
                    reportData.ebs = (sessionAttendance as any).ebs.map((record: any) => ({
                        'Tipo': 'EB',
                        'Nome': record.participantName || record.name || 'N/A',
                        'Cargo': record.participantRole || record.role || 'N/A',
                        'Status': record.attendance === "present" ? "Presente" : 
                                 record.attendance === "absent" ? "Ausente" : 
                                 record.attendance === "excluded" ? "Excluído do quórum" : "Não contabilizado"
                    }));
                }
                
                if ('crs' in sessionAttendance && Array.isArray((sessionAttendance as any).crs)) {
                    reportData.crs = (sessionAttendance as any).crs.map((record: any) => ({
                        'Tipo': 'CR',
                        'Nome': record.participantName || record.name || 'N/A',
                        'Cargo': record.participantRole || record.role || 'N/A',
                        'Status': record.attendance === "present" ? "Presente" : 
                                 record.attendance === "absent" ? "Ausente" : 
                                 record.attendance === "excluded" ? "Excluído do quórum" : "Não contabilizado"
                    }));
                }
                
                if ('comites' in sessionAttendance && Array.isArray((sessionAttendance as any).comites)) {
                    (sessionAttendance as any).comites.forEach((record: any) => {
                        const comiteData = {
                            'Tipo': record.participantStatus === "Pleno" ? 'Comitê Pleno' : 'Comitê Não-Pleno',
                            'Nome': record.participantName || record.name || 'N/A',
                            'Escola': record.participantSchool || record.escola || 'N/A',
                            'Regional': record.participantRegion || record.regional || 'N/A',
                            'Localização': record.participantLocation || `${record.cidade || 'N/A'}, ${record.uf || 'N/A'}`,
                            'Status': record.attendance === "present" ? "Presente" : 
                                     record.attendance === "absent" ? "Ausente" : 
                                     record.attendance === "excluded" ? "Excluído do quórum" : "Não contabilizado"
                        };

                        if (record.participantStatus === "Pleno" || record.status === "Pleno") {
                            reportData.comitesPlenos.push(comiteData);
                        } else {
                            reportData.comitesNaoPlenos.push(comiteData);
                        }
                    });
                }

                // Handle individual participants for sessions
                if ('participantes' in sessionAttendance && Array.isArray((sessionAttendance as any).participantes)) {
                    // For sessions, we'll create a single worksheet with all individual participants
                    if (currentSessionType === "sessao") {
                        const individualParticipants = (sessionAttendance as any).participantes.map((record: any) => ({
                            'Nome': record.participantName || 'N/A',
                            'Cargo/Função': record.participantRole || 'Participante',
                            'Comitê/Instituição': record.comiteLocal || '-',
                            'ID': record.participantId || '-',
                            'Status': record.attendance === "present" ? "Presente" : 
                                     record.attendance === "absent" ? "Ausente" : 
                                     record.attendance === "excluded" ? "Excluído do quórum" : "Não contabilizado",
                            'Última Atualização': new Date(record.lastUpdated || record.markedAt).toLocaleString('pt-BR')
                        }));

                        // For sessions, create a single comprehensive worksheet
                        createWorksheet(individualParticipants, 'Participantes da Sessão');
                        
                        // Generate Excel file
                        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                        const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                        
                        // Create download link
                        const url = URL.createObjectURL(dataBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        
                        // Add session info to filename
                        const sessionInfo = currentSessionData?.name ? `-${currentSessionData.name.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
                        link.download = `relatorio-presenca-sessao${sessionInfo}-${new Date().toISOString().split('T')[0]}.xlsx`;
                        
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);

                        // Show summary in toast
                        const presentCount = individualParticipants.filter((p: any) => p.Status === "Presente").length;
                        const totalCount = individualParticipants.length;
                        
                        toast({
                            title: "✅ Relatório gerado com sucesso",
                            description: `Sessão "${currentSessionData?.name}": ${presentCount} presentes de ${totalCount} participantes (${((presentCount/totalCount)*100).toFixed(1)}% de presença)`,
                        });
                        
                        return; // Exit early for sessions
                    }
                }
            }
        } else {
            // Use general attendance data for avulsa mode
            console.log("Excel Report Debug (Avulsa Mode):", {
                sessionType: currentSessionType || "avulsa",
                ebMembersCount: ebMembers.length,
                crMembersCount: crMembers.length,
                comitesLocaisCount: comitesLocais.length,
                comitesPlenosCount: comitesPlenos.length,
                comitesNaoPlenosCount: comitesNaoPlenos.length,
                sampleComites: comitesLocais.slice(0, 3).map(c => ({ name: c.name, status: c.status, attendance: c.attendance }))
            });

            // Prepare EB members data
            reportData.ebs = ebMembers.map(member => ({
                'Tipo': 'EB',
                'Nome': member.name,
                'Cargo': member.role,
                'Status': member.attendance === "present" ? "Presente" : 
                         member.attendance === "absent" ? "Ausente" : 
                         member.attendance === "excluded" ? "Excluído do quórum" : "Não contabilizado"
            }));

            // Prepare CR members data
            reportData.crs = crMembers.map(member => ({
                'Tipo': 'CR',
                'Nome': member.name,
                'Cargo': member.role,
                'Status': member.attendance === "present" ? "Presente" : 
                         member.attendance === "absent" ? "Ausente" : 
                         member.attendance === "excluded" ? "Excluído do quórum" : "Não contabilizado"
            }));

            // Prepare Comitês Plenos data
            reportData.comitesPlenos = comitesPlenos.map(comite => ({
                'Tipo': 'Comitê Pleno',
                'Nome': comite.name,
                'Escola': comite.escola,
                'Regional': comite.regional,
                'Localização': `${comite.cidade}, ${comite.uf}`,
                'Status': comite.attendance === "present" ? "Presente" : 
                         comite.attendance === "absent" ? "Ausente" : 
                         comite.attendance === "excluded" ? "Excluído do quórum" : "Não contabilizado"
            }));

            // Prepare Comitês Não-Plenos data
            reportData.comitesNaoPlenos = comitesNaoPlenos.map(comite => ({
                'Tipo': 'Comitê Não-Pleno',
                'Nome': comite.name,
                'Escola': comite.escola,
                'Regional': comite.regional,
                'Localização': `${comite.cidade}, ${comite.uf}`,
                'Status': comite.attendance === "present" ? "Presente" : 
                         comite.attendance === "absent" ? "Ausente" : 
                         comite.attendance === "excluded" ? "Excluído do quórum" : "Não contabilizado"
            }));
        }

        // Create worksheets
        createWorksheet(reportData.ebs, 'Diretoria Executiva');
        createWorksheet(reportData.crs, 'Coordenadores Regionais');
        createWorksheet(reportData.comitesPlenos, 'Comitês Plenos');
        createWorksheet(reportData.comitesNaoPlenos, 'Comitês Não-Plenos');

        // Generate Excel file
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // Create download link
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        
        // Add session info to filename
        const sessionInfo = currentSessionData?.name ? `-${currentSessionData.name.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
        link.download = `relatorio-presenca-ag${sessionInfo}-${new Date().toISOString().split('T')[0]}.xlsx`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Show summary in toast
        const totalCount = reportData.ebs.length + reportData.crs.length + reportData.comitesPlenos.length + reportData.comitesNaoPlenos.length;
        const sessionTypeLabel = isSessionMode ? `${getChamadaTypeLabel(currentSessionType)} "${currentSessionData?.name}"` : "Chamada Avulsa";
        
        toast({
            title: "✅ Relatório gerado com sucesso",
            description: `${sessionTypeLabel}: ${reportData.ebs.length} EBs, ${reportData.crs.length} CRs, ${reportData.comitesPlenos.length} Plenos, ${reportData.comitesNaoPlenos.length} Não-Plenos (${totalCount} total)`,
        });
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
                setSelectedAssemblyId("");
                
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
                setSelectedAssemblyId("");

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

        if (!newSessionReaderName.trim()) {
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
                name: newSessionReaderName.trim(),
                sessionId: currentSessionId as any,
                createdBy: session.user.id,
            });

            const readerUrl = `${window.location.origin}/leitor-qr/${result.token}`;
            
            toast({
                title: "✅ Leitor QR criado",
                description: `Leitor "${newSessionReaderName}" criado para esta sessão.`,
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

            setNewSessionReaderName("");
            setIsSessionQrDialogOpen(false);
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

                    {/* Session Selection Panel */}
                    {!currentSessionId && (
                        <Card className="shadow-lg border-0 border-l-4 border-l-blue-500">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <ClipboardCheck className="w-5 h-5 text-blue-600" />
                                    <span>Iniciar Nova Sessão</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Assembly Selection */}
                                <div>
                                    <Label htmlFor="assembly-select" className="text-base font-semibold">
                                        Selecione uma Assembleia
                                    </Label>
                                    <select
                                        id="assembly-select"
                                        value={selectedAssemblyId}
                                        onChange={(e) => setSelectedAssemblyId(e.target.value)}
                                        className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Selecione uma assembleia...</option>
                                        {assemblies?.map((assembly) => (
                                            <option key={assembly._id} value={assembly._id}>
                                                {assembly.name} - {assembly.location}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Active Sessions for Selected Assembly */}
                                {selectedAssemblyId && (
                                    <div>
                                        <Label className="text-base font-semibold">
                                            Sessões Ativas Disponíveis
                                        </Label>
                                        <div className="mt-2">
                                            {activeSessions === undefined ? (
                                                <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                                                    <span className="text-gray-600">Carregando sessões...</span>
                                                </div>
                                            ) : activeSessions === null ? (
                                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                                                    <AlertCircle className="w-5 h-5 inline-block mr-2" />
                                                    Erro ao carregar sessões. Tente novamente.
                                                </div>
                                            ) : activeSessions.length === 0 ? (
                                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
                                                    <Info className="w-5 h-5 inline-block mr-2" />
                                                    Nenhuma sessão ativa encontrada.
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {activeSessions.map((session) => (
                                                        <Card 
                                                            key={session._id} 
                                                            className="cursor-pointer hover:bg-blue-50 border-blue-200 transition-colors"
                                                            onClick={() => {
                                                                setCurrentSessionId(session._id);
                                                                setCurrentSessionType(session.type as "plenaria" | "sessao");
                                                                toast({
                                                                    title: "✅ Sessão Selecionada",
                                                                    description: `Entrando na ${session.type === "plenaria" ? "plenária" : "sessão"}: ${session.name}`,
                                                                });
                                                            }}
                                                        >
                                                            <CardContent className="pt-4">
                                                                <div className="flex items-center space-x-3">
                                                                    {session.type === "plenaria" ? (
                                                                        <Users className="w-5 h-5 text-purple-600" />
                                                                    ) : (
                                                                        <Building className="w-5 h-5 text-blue-600" />
                                                                    )}
                                                                    <div>
                                                                        <h4 className="font-medium text-gray-900">{session.name}</h4>
                                                                        <p className="text-sm text-gray-600">
                                                                            {session.type === "plenaria" ? "Plenária" : "Sessão"} • 
                                                                            Criada {new Date(session.createdAt).toLocaleDateString('pt-BR')}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Create New Session Options */}
                                <div>
                                    <Label className="text-base font-semibold">
                                        Ou Criar Nova Sessão
                                    </Label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                                        <Button
                                            onClick={handleNovaChamada}
                                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 p-4 h-auto"
                                        >
                                            <div className="flex flex-col items-center space-y-2">
                                                <ClipboardCheck className="w-6 h-6" />
                                                <span>Chamada Avulsa</span>
                                                <span className="text-xs opacity-90">Geral independente</span>
                                            </div>
                                        </Button>
                                        
                                        <Button
                                            onClick={() => {
                                                if (!selectedAssemblyId) {
                                                    toast({
                                                        title: "❌ Erro",
                                                        description: "Selecione uma assembleia primeiro.",
                                                        variant: "destructive",
                                                    });
                                                    return;
                                                }
                                                setIsSessionDialogOpen(true);
                                                setChamadaType("plenaria");
                                            }}
                                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 p-4 h-auto"
                                            disabled={!selectedAssemblyId}
                                        >
                                            <div className="flex flex-col items-center space-y-2">
                                                <Users className="w-6 h-6" />
                                                <span>Nova Plenária</span>
                                                <span className="text-xs opacity-90">EBs, CRs e Comitês</span>
                                            </div>
                                        </Button>
                                        
                                        <Button
                                            onClick={() => {
                                                if (!selectedAssemblyId) {
                                                    toast({
                                                        title: "❌ Erro",
                                                        description: "Selecione uma assembleia primeiro.",
                                                        variant: "destructive",
                                                    });
                                                    return;
                                                }
                                                setIsSessionDialogOpen(true);
                                                setChamadaType("sessao");
                                            }}
                                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 p-4 h-auto"
                                            disabled={!selectedAssemblyId}
                                        >
                                            <div className="flex flex-col items-center space-y-2">
                                                <Building className="w-6 h-6" />
                                                <span>Nova Sessão</span>
                                                <span className="text-xs opacity-90">Participantes específicos</span>
                                            </div>
                                        </Button>
                                    </div>
                                </div>

                                {/* Instructions */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h4 className="font-semibold text-blue-900 mb-2">💡 Como usar:</h4>
                                    <ul className="text-sm text-blue-800 space-y-1">
                                        <li>• <strong>Sessões Ativas:</strong> Clique para entrar em uma sessão já criada</li>
                                        <li>• <strong>Chamada Avulsa:</strong> Para controle geral de presença (independente de AG)</li>
                                        <li>• <strong>Plenária:</strong> Sessão oficial com todos os tipos de participantes</li>
                                        <li>• <strong>Sessão:</strong> Para participantes que se inscreveram na AG específica</li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    )}

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
                                    
                                    {/* Download Report Button - Conditional Label */}
                                    {(currentSessionType === "plenaria" || currentSessionType === "sessao") && currentSessionId ? (
                                        <Button
                                            onClick={downloadExcelReport}
                                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300"
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Baixar Relatório da Sessão
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={downloadExcelReport}
                                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300"
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Baixar Relatório
                                        </Button>
                                    )}

                                    {/* Download QR Codes Button - Only for Avulsa/No Session */}
                                    {(!currentSessionId || currentSessionType === "avulsa") && (
                                        <Button
                                            onClick={downloadQRCodes}
                                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
                                        >
                                            <QrCode className="w-4 h-4 mr-2" />
                                            Baixar QR Codes
                                        </Button>
                                    )}
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
                                    onClick={async () => {
                                        if (!session?.user?.id || !chamadaType || !sessionName.trim() || !selectedAssemblyId) {
                                            toast({
                                                title: "Erro",
                                                description: "Selecione a assembleia e digite um nome para a sessão.",
                                                variant: "destructive"
                                            });
                                            return;
                                        }

                                        try {
                                            const result = await createSession({
                                                assemblyId: selectedAssemblyId as any,
                                                name: sessionName.trim(),
                                                type: chamadaType,
                                                createdBy: session.user.id
                                            });
                                            
                                            if (result) {
                                                setCurrentSessionId(result as string);
                                                setCurrentSessionType(chamadaType);
                                                toast({
                                                    title: "✅ Sessão criada",
                                                    description: `${getChamadaTypeLabel(chamadaType)} "${sessionName}" foi criada com sucesso!`
                                                });
                                                setIsSessionDialogOpen(false);
                                                setSessionName("");
                                            }
                                        } catch (error) {
                                            toast({
                                                title: "❌ Erro",
                                                description: "Erro ao criar sessão. Tente novamente.",
                                                variant: "destructive"
                                            });
                                        }
                                    }}
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
                                        {/* Self Attendance QR - Only for plenaria and sessao */}
                                        {(currentSessionType === "plenaria" || currentSessionType === "sessao") && (
                                            <Dialog open={isSelfAttendanceQrOpen} onOpenChange={setIsSelfAttendanceQrOpen}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
                                                    >
                                                        <QrCode className="w-4 h-4 mr-2" />
                                                        QR Auto Presença
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-[500px]">
                                                    <DialogHeader>
                                                        <DialogTitle className="flex items-center space-x-2">
                                                            <QrCode className="w-5 h-5 text-purple-600" />
                                                            <span>QR Code para Auto Presença</span>
                                                        </DialogTitle>
                                                        <DialogDescription>
                                                            Compartilhe este QR Code ou link para que os participantes possam marcar presença automaticamente.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    
                                                    <div className="space-y-4">
                                                        <div className="text-center">
                                                            <div className="bg-white p-4 rounded-lg inline-block shadow-sm border">
                                                                {currentSessionQrCode ? (
                                                                    <img 
                                                                        src={currentSessionQrCode} 
                                                                        alt="QR Code Auto Presença" 
                                                                        className="w-48 h-48"
                                                                    />
                                                                ) : (
                                                                    <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                                                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="space-y-2">
                                                            <Label htmlFor="self-attendance-url">Link da Auto Presença</Label>
                                                            <div className="flex space-x-2">
                                                                <Input
                                                                    id="self-attendance-url"
                                                                    value={`${window.location.origin}/presenca-sessao/${currentSessionId}`}
                                                                    readOnly
                                                                    className="flex-1"
                                                                />
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        const url = `${window.location.origin}/presenca-sessao/${currentSessionId}`;
                                                                        navigator.clipboard.writeText(url);
                                                                        toast({
                                                                            title: "✅ Link copiado!",
                                                                            description: "Link da auto presença copiado para a área de transferência.",
                                                                        });
                                                                    }}
                                                                >
                                                                    <Copy className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        const url = `${window.location.origin}/presenca-sessao/${currentSessionId}`;
                                                                        window.open(url, '_blank');
                                                                    }}
                                                                >
                                                                    <ExternalLink className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                                            <h4 className="font-semibold text-purple-900 mb-2">💡 Como usar:</h4>
                                                            <ul className="text-sm text-purple-800 space-y-1">
                                                                <li>• Participantes podem escanear o QR Code com a câmera do celular</li>
                                                                <li>• Ou acessar diretamente o link compartilhado</li>
                                                                <li>• Fazem login e confirmam presença com um clique</li>
                                                                <li>• Disponível enquanto a sessão estiver ativa</li>
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                        
                                        <Button
                                            onClick={() => setIsSessionQrDialogOpen(true)}
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

                    {/* Manual Attendance UI for Avulsa Sessions - Only show when no active session */}
                    {!currentSessionId && (
                        <>
                            {/* Instructions */}
                            <Card className="shadow-lg border-0">
                                <CardContent className="p-6">
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                                        <h3 className="text-lg font-semibold text-blue-800 mb-2">Como usar</h3>
                                        <p className="text-blue-700 mb-3">Clique nos nomes para alterar o status de presença:</p>
                                        <div className="flex items-center space-x-6 text-sm">
                                            <div className="flex items-center space-x-2">
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                                <span className="text-green-700">Presente</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <XCircle className="w-4 h-4 text-red-600" />
                                                <span className="text-red-700">Ausente</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <XCircle className="w-4 h-4 text-orange-600" />
                                                <span className="text-orange-700">Excluído do quórum</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Minus className="w-4 h-4 text-gray-400" />
                                                <span className="text-gray-600">Não contabilizado</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Grid Layout for Manual Attendance */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* EBs Section */}
                                <Card className="shadow-lg border-0">
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <Users className="w-5 h-5 text-blue-600" />
                                                <span className="text-lg">Diretoria Executiva</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {(() => {
                                                    const stats = getStats(filteredEbMembers);
                                                    return (
                                                        <>
                                                            <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                                                                {stats.present} presentes
                                                            </Badge>
                                                            <Badge variant="outline" className="text-red-600 border-red-200 text-xs">
                                                                {stats.absent} ausentes
                                                            </Badge>
                                                            <Badge variant="outline" className="text-orange-600 border-orange-200 text-xs">
                                                                {stats.excluded} excluídos
                                                            </Badge>
                                                            <Badge 
                                                                variant="outline" 
                                                                className="text-gray-600 border-gray-200 text-xs"
                                                            >
                                                                {stats.quorumPercentage.toFixed(1)}% quórum
                                                            </Badge>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </CardTitle>
                                        {/* Search bar for EB */}
                                        <div className="relative mt-2">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input
                                                type="text"
                                                placeholder="Buscar por nome ou cargo na Diretoria Executiva..."
                                                value={searchEb}
                                                onChange={(e) => setSearchEb(e.target.value)}
                                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 w-full text-sm"
                                            />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 max-h-80 overflow-y-auto">
                                            {filteredEbMembers.map((member) => {
                                                return (
                                                    <div
                                                        key={member.id}
                                                        className={`group relative p-3 rounded-lg border transition-colors cursor-pointer ${getAttendanceColor(member.attendance)}`}
                                                        onClick={() => handleAttendanceChange("eb", member.id.toString(), member.name, member.role)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="font-medium text-sm">{member.name}</p>
                                                                <p className="text-xs text-gray-600">{member.role}</p>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                {getAttendanceIcon(member.attendance)}
                                                                {/* Hover buttons */}
                                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDirectAttendanceSet("eb", member.id.toString(), member.name, "present", member.role);
                                                                        }}
                                                                        className="p-1 rounded bg-green-100 hover:bg-green-200 transition-colors"
                                                                        title="Presente"
                                                                    >
                                                                        <CheckCircle className="w-3 h-3 text-green-600" />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDirectAttendanceSet("eb", member.id.toString(), member.name, "absent", member.role);
                                                                        }}
                                                                        className="p-1 rounded bg-red-100 hover:bg-red-200 transition-colors"
                                                                        title="Ausente"
                                                                    >
                                                                        <XCircle className="w-3 h-3 text-red-600" />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDirectAttendanceSet("eb", member.id.toString(), member.name, "excluded", member.role);
                                                                        }}
                                                                        className="p-1 rounded bg-orange-100 hover:bg-orange-200 transition-colors"
                                                                        title="Excluído do quórum"
                                                                    >
                                                                        <XCircle className="w-3 h-3 text-orange-600" />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDirectAttendanceSet("eb", member.id.toString(), member.name, "not-counting", member.role);
                                                                        }}
                                                                        className="p-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                                                                        title="Não contabilizado"
                                                                    >
                                                                        <Minus className="w-3 h-3 text-gray-600" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* CRs Section */}
                                <Card className="shadow-lg border-0">
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <UserCheck className="w-5 h-5 text-purple-600" />
                                                <span className="text-lg">Coordenadores Regionais</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {(() => {
                                                    const stats = getStats(filteredCrMembers);
                                                    return (
                                                        <>
                                                            <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                                                                {stats.present} presentes
                                                            </Badge>
                                                            <Badge variant="outline" className="text-red-600 border-red-200 text-xs">
                                                                {stats.absent} ausentes
                                                            </Badge>
                                                            <Badge variant="outline" className="text-orange-600 border-orange-200 text-xs">
                                                                {stats.excluded} excluídos
                                                            </Badge>
                                                            <Badge 
                                                                variant="outline" 
                                                                className="text-gray-600 border-gray-200 text-xs"
                                                            >
                                                                {stats.quorumPercentage.toFixed(1)}% quórum
                                                            </Badge>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </CardTitle>
                                        {/* Search bar for CR */}
                                        <div className="relative mt-2">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input
                                                type="text"
                                                placeholder="Buscar por nome ou cargo nos Coordenadores Regionais..."
                                                value={searchCr}
                                                onChange={(e) => setSearchCr(e.target.value)}
                                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all duration-200 w-full text-sm"
                                            />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 max-h-80 overflow-y-auto">
                                            {filteredCrMembers.map((member) => {
                                                return (
                                                    <div
                                                        key={member.id}
                                                        className={`group relative p-3 rounded-lg border transition-colors cursor-pointer ${getAttendanceColor(member.attendance)}`}
                                                        onClick={() => handleAttendanceChange("cr", member.id.toString(), member.name, member.role)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="font-medium text-sm">{member.name}</p>
                                                                <p className="text-xs text-gray-600">{member.role}</p>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                {getAttendanceIcon(member.attendance)}
                                                                {/* Hover buttons */}
                                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDirectAttendanceSet("cr", member.id.toString(), member.name, "present", member.role);
                                                                        }}
                                                                        className="p-1 rounded bg-green-100 hover:bg-green-200 transition-colors"
                                                                        title="Presente"
                                                                    >
                                                                        <CheckCircle className="w-3 h-3 text-green-600" />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDirectAttendanceSet("cr", member.id.toString(), member.name, "absent", member.role);
                                                                        }}
                                                                        className="p-1 rounded bg-red-100 hover:bg-red-200 transition-colors"
                                                                        title="Ausente"
                                                                    >
                                                                        <XCircle className="w-3 h-3 text-red-600" />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDirectAttendanceSet("cr", member.id.toString(), member.name, "excluded", member.role);
                                                                        }}
                                                                        className="p-1 rounded bg-orange-100 hover:bg-orange-200 transition-colors"
                                                                        title="Excluído do quórum"
                                                                    >
                                                                        <XCircle className="w-3 h-3 text-orange-600" />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDirectAttendanceSet("cr", member.id.toString(), member.name, "not-counting", member.role);
                                                                        }}
                                                                        className="p-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                                                                        title="Não contabilizado"
                                                                    >
                                                                        <Minus className="w-3 h-3 text-gray-600" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Comitês Plenos Section */}
                                <Card className="shadow-lg border-0">
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <Building className="w-5 h-5 text-green-600" />
                                                <span className="text-lg">Comitês Plenos</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {(() => {
                                                    const stats = getStats(filteredComitesPlenos);
                                                    return (
                                                        <>
                                                            <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                                                                {stats.present} presentes
                                                            </Badge>
                                                            <Badge variant="outline" className="text-red-600 border-red-200 text-xs">
                                                                {stats.absent} ausentes
                                                            </Badge>
                                                            <Badge variant="outline" className="text-orange-600 border-orange-200 text-xs">
                                                                {stats.excluded} excluídos
                                                            </Badge>
                                                            <Badge 
                                                                variant="outline" 
                                                                className="text-gray-600 border-gray-200 text-xs"
                                                            >
                                                                {stats.quorumPercentage.toFixed(1)}% quórum
                                                            </Badge>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </CardTitle>
                                        {/* Search bar for Comitês Plenos */}
                                        <div className="relative mt-2">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input
                                                type="text"
                                                placeholder="Buscar nos Comitês Plenos..."
                                                value={searchPlenos}
                                                onChange={(e) => setSearchPlenos(e.target.value)}
                                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all duration-200 w-full text-sm"
                                            />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 max-h-80 overflow-y-auto">
                                            {filteredComitesPlenos.map((comite) => {
                                                return (
                                                    <div
                                                        key={comite.name}
                                                        className={`group relative p-3 rounded-lg border transition-colors cursor-pointer ${getAttendanceColor(comite.attendance)}`}
                                                        onClick={() => handleAttendanceChange("comite", comite.name, comite.name, undefined)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="font-medium text-sm">{comite.name}</p>
                                                                <p className="text-xs text-gray-600">{comite.cidade}, {comite.uf}</p>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                {getAttendanceIcon(comite.attendance)}
                                                                {/* Hover buttons */}
                                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDirectAttendanceSet("comite", comite.name, comite.name, "present", undefined);
                                                                        }}
                                                                        className="p-1 rounded bg-green-100 hover:bg-green-200 transition-colors"
                                                                        title="Presente"
                                                                    >
                                                                        <CheckCircle className="w-3 h-3 text-green-600" />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDirectAttendanceSet("comite", comite.name, comite.name, "absent", undefined);
                                                                        }}
                                                                        className="p-1 rounded bg-red-100 hover:bg-red-200 transition-colors"
                                                                        title="Ausente"
                                                                    >
                                                                        <XCircle className="w-3 h-3 text-red-600" />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDirectAttendanceSet("comite", comite.name, comite.name, "excluded", undefined);
                                                                        }}
                                                                        className="p-1 rounded bg-orange-100 hover:bg-orange-200 transition-colors"
                                                                        title="Excluído do quórum"
                                                                    >
                                                                        <XCircle className="w-3 h-3 text-orange-600" />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDirectAttendanceSet("comite", comite.name, comite.name, "not-counting", undefined);
                                                                        }}
                                                                        className="p-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                                                                        title="Não contabilizado"
                                                                    >
                                                                        <Minus className="w-3 h-3 text-gray-600" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Comitês Não Plenos Section */}
                                <Card className="shadow-lg border-0">
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <Building2 className="w-5 h-5 text-orange-600" />
                                                <span className="text-lg">Comitês Não Plenos</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {(() => {
                                                    const stats = getStats(filteredComitesNaoPlenos);
                                                    return (
                                                        <>
                                                            <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                                                                {stats.present} presentes
                                                            </Badge>
                                                            <Badge variant="outline" className="text-red-600 border-red-200 text-xs">
                                                                {stats.absent} ausentes
                                                            </Badge>
                                                            <Badge variant="outline" className="text-orange-600 border-orange-200 text-xs">
                                                                {stats.excluded} excluídos
                                                            </Badge>
                                                            <Badge 
                                                                variant="outline" 
                                                                className="text-gray-600 border-gray-200 text-xs"
                                                            >
                                                                {stats.quorumPercentage.toFixed(1)}% quórum
                                                            </Badge>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </CardTitle>
                                        {/* Search bar for Comitês Não Plenos */}
                                        <div className="relative mt-2">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input
                                                type="text"
                                                placeholder="Buscar nos Comitês Não Plenos..."
                                                value={searchNaoPlenos}
                                                onChange={(e) => setSearchNaoPlenos(e.target.value)}
                                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all duration-200 w-full text-sm"
                                            />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 max-h-80 overflow-y-auto">
                                            {filteredComitesNaoPlenos.map((comite) => {
                                                return (
                                                    <div
                                                        key={comite.name}
                                                        className={`group relative p-3 rounded-lg border transition-colors cursor-pointer ${getAttendanceColor(comite.attendance)}`}
                                                        onClick={() => handleAttendanceChange("comite", comite.name, comite.name, undefined)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="font-medium text-sm">{comite.name}</p>
                                                                <p className="text-xs text-gray-600">{comite.cidade}, {comite.uf}</p>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                {getAttendanceIcon(comite.attendance)}
                                                                {/* Hover buttons */}
                                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDirectAttendanceSet("comite", comite.name, comite.name, "present", undefined);
                                                                        }}
                                                                        className="p-1 rounded bg-green-100 hover:bg-green-200 transition-colors"
                                                                        title="Presente"
                                                                    >
                                                                        <CheckCircle className="w-3 h-3 text-green-600" />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDirectAttendanceSet("comite", comite.name, comite.name, "absent", undefined);
                                                                        }}
                                                                        className="p-1 rounded bg-red-100 hover:bg-red-200 transition-colors"
                                                                        title="Ausente"
                                                                    >
                                                                        <XCircle className="w-3 h-3 text-red-600" />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDirectAttendanceSet("comite", comite.name, comite.name, "excluded", undefined);
                                                                        }}
                                                                        className="p-1 rounded bg-orange-100 hover:bg-orange-200 transition-colors"
                                                                        title="Excluído do quórum"
                                                                    >
                                                                        <XCircle className="w-3 h-3 text-orange-600" />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDirectAttendanceSet("comite", comite.name, comite.name, "not-counting", undefined);
                                                                        }}
                                                                        className="p-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                                                                        title="Não contabilizado"
                                                                    >
                                                                        <Minus className="w-3 h-3 text-gray-600" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </>
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
                                            {(() => {
                                                // If there's an active session (plenária or sessão), get data from session attendance
                                                if (currentSessionId && currentSessionData?.attendanceRecords) {
                                                    const sessionAttendance = currentSessionData.attendanceRecords;
                                                    
                                                    // Group session attendance by type
                                                    const ebs = sessionAttendance.filter((r: any) => r.participantType === "eb");
                                                    const crs = sessionAttendance.filter((r: any) => r.participantType === "cr");
                                                    const comites = sessionAttendance.filter((r: any) => r.participantType === "comite_local");
                                                    
                                                    // For sessões, show different grouping
                                                    if (currentSessionType === "sessao") {
                                                        const individuals = sessionAttendance.filter((r: any) => r.participantType === "individual");
                                                        const sessionGroups = [
                                                            { label: "Participantes Individuais", data: individuals, requirement: null }
                                                        ];
                                                        
                                                        return sessionGroups.map(({ label, data, requirement }: any) => {
                                                            // Session attendance format stats
                                                            const present = data.filter((r: any) => r.attendance === "present").length;
                                                            const absent = data.filter((r: any) => r.attendance === "absent").length;
                                                            const excluded = data.filter((r: any) => r.attendance === "excluded").length;
                                                            const notCounting = data.filter((r: any) => r.attendance === "not-counting").length;
                                                            const total = data.length;
                                                            const eligibleForQuorum = total - excluded; // Exclude "excluded" members from quorum calculation
                                                            const quorumPercentage = eligibleForQuorum > 0 ? (present / eligibleForQuorum) * 100 : 0;
                                                            const stats = { present, absent, excluded, notCounting, total, eligibleForQuorum, quorumPercentage };
                                                            
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
                                                        });
                                                    }
                                                    
                                                    // For plenárias, separate comités by status using agParticipants data
                                                    let comitesPlenos: any[] = [];
                                                    let comitesNaoPlenos: any[] = [];
                                                    
                                                    if (currentSessionType === "plenaria" && agComitesParticipants) {
                                                        // Use agParticipants data to properly separate by status
                                                        const sessionComitesMap = new Map();
                                                        comites.forEach((r: any) => {
                                                            sessionComitesMap.set(r.participantId, r);
                                                        });
                                                        
                                                        agComitesParticipants.forEach((comite: any) => {
                                                            const sessionRecord = sessionComitesMap.get(comite.participantId);
                                                            const attendanceRecord = {
                                                                participantId: comite.participantId,
                                                                attendance: sessionRecord?.attendance || "not-counting"
                                                            };
                                                            
                                                            if (comite.status === "Pleno") {
                                                                comitesPlenos.push(attendanceRecord);
                                                            } else {
                                                                comitesNaoPlenos.push(attendanceRecord);
                                                            }
                                                        });
                                                    } else {
                                                        // Fallback: treat all as não-plenos
                                                        comitesNaoPlenos = comites;
                                                    }
                                                    
                                                    const plenaryGroups = [
                                                        { label: "Diretoria Executiva", data: ebs, requirement: QUORUM_REQUIREMENTS.eb },
                                                        { label: "Coordenadores Regionais", data: crs, requirement: QUORUM_REQUIREMENTS.cr },
                                                        { label: "Comitês Plenos", data: comitesPlenos, requirement: QUORUM_REQUIREMENTS.comitesPlenos },
                                                        { label: "Comitês Não Plenos", data: comitesNaoPlenos, requirement: QUORUM_REQUIREMENTS.comitesNaoPlenos }
                                                    ];
                                                    
                                                    return plenaryGroups.map(({ label, data, requirement }: any) => {
                                                        // Session attendance format stats
                                                        const present = data.filter((r: any) => r.attendance === "present").length;
                                                        const absent = data.filter((r: any) => r.attendance === "absent").length;
                                                        const excluded = data.filter((r: any) => r.attendance === "excluded").length;
                                                        const notCounting = data.filter((r: any) => r.attendance === "not-counting").length;
                                                        const total = data.length;
                                                        const eligibleForQuorum = total - excluded;
                                                        const quorumPercentage = eligibleForQuorum > 0 ? (present / eligibleForQuorum) * 100 : 0;
                                                        const stats = { present, absent, excluded, notCounting, total, eligibleForQuorum, quorumPercentage };
                                                        
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
                                                    });
                                                } else {
                                                    // For avulsa sessions, use main page state (unfiltered for accurate totals)
                                                    // Use component-level variables that are already properly defined
                                                    const avulsaGroups = [
                                                        { label: "Diretoria Executiva", data: ebMembers, requirement: QUORUM_REQUIREMENTS.eb },
                                                        { label: "Coordenadores Regionais", data: crMembers, requirement: QUORUM_REQUIREMENTS.cr },
                                                        { label: "Comitês Plenos", data: comitesLocais.filter(c => c.status === "Pleno"), requirement: QUORUM_REQUIREMENTS.comitesPlenos },
                                                        { label: "Comitês Não Plenos", data: comitesLocais.filter(c => c.status === "Não-pleno"), requirement: QUORUM_REQUIREMENTS.comitesNaoPlenos }
                                                    ];
                                                    
                                                    return avulsaGroups.map(({ label, data, requirement }: any) => {
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
                                                    });
                                                }
                                            })()}
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

            {/* Session QR Reader Modal */}
            <Dialog open={isSessionQrDialogOpen} onOpenChange={setIsSessionQrDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                            <Smartphone className="w-5 h-5 text-cyan-600" />
                            <span>Novo Leitor QR para Sessão</span>
                        </DialogTitle>
                        <DialogDescription>
                            Crie um leitor QR específico para esta sessão.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        {currentSessionData && (
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-sm text-blue-800">
                                    <strong>Sessão:</strong> {currentSessionData.name}
                                </p>
                                <p className="text-xs text-blue-600">
                                    {getChamadaTypeLabel(currentSessionType)}
                                </p>
                            </div>
                        )}
                        
                        <div>
                            <Label htmlFor="session-reader-name">Nome do leitor</Label>
                            <Input
                                id="session-reader-name"
                                value={newSessionReaderName}
                                onChange={(e) => setNewSessionReaderName(e.target.value)}
                                placeholder="Ex: João da Silva"
                                className="mt-2"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newSessionReaderName.trim()) {
                                        handleCreateSessionQrReader();
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSessionQrDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleCreateSessionQrReader}
                            disabled={!newSessionReaderName.trim() || isCreatingReader}
                            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                        >
                            {isCreatingReader ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                    Criando...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Criar Leitor
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    );
} 