"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { 
    ClipboardCheck, 
    ArrowLeft, 
    Users, 
    UserCheck, 
    Building, 
    Building2,
    CheckCircle,
    XCircle,
    Minus,
    Download,
    Upload,
    RotateCcw,
    Save,
    Search,
    BarChart3
} from "lucide-react";
import { api } from "~/trpc/react";
import { useQuery, useMutation } from "convex/react";
import { useToast } from "~/components/ui/use-toast";
import { useSession } from "next-auth/react";
import { api as convexApi } from "../../../../convex/_generated/api";
import * as XLSX from 'xlsx';

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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [comitesLocais, setComitesLocais] = useState<ComiteLocal[]>([]);
    const [ebMembers, setEbMembers] = useState<EbMember[]>([]);
    const [crMembers, setCrMembers] = useState<CrMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchEb, setSearchEb] = useState("");
    const [searchCr, setSearchCr] = useState("");
    const [searchPlenos, setSearchPlenos] = useState("");
    const [searchNaoPlenos, setSearchNaoPlenos] = useState("");
    const [isResetting, setIsResetting] = useState(false);
    const { data: session } = useSession();
    const { toast } = useToast();

    // Convex queries
    const ebsAttendance = useQuery(convexApi.attendance.getByType, { type: "eb" });
    const crsAttendance = useQuery(convexApi.attendance.getByType, { type: "cr" });
    const comitesAttendance = useQuery(convexApi.attendance.getByType, { type: "comite" });

    // Convex mutations
    const updateAttendance = useMutation(convexApi.attendance.updateAttendance);
    const resetAllAttendance = useMutation(convexApi.attendance.resetAll);

    // Fetch data
    const { data: registrosData, isLoading: registrosLoading } = api.registros.get.useQuery();
    const { data: ebData } = api.eb.getAll.useQuery();
    const { data: crData } = api.cr.getAll.useQuery();

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

    useEffect(() => {
        const fetchCSVData = async () => {
            // Don't start fetching if registros is still loading
            if (registrosLoading) {
                return;
            }

            if (!registrosData) {
                setError("URL do CSV não configurada");
                setLoading(false);
                return;
            }

            if (!registrosData.url) {
                setError("URL do CSV não configurada");
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(registrosData.url, {
                    redirect: 'follow',
                });
                if (!response.ok) {
                    throw new Error(`Erro ao buscar dados do CSV: ${response.status} ${response.statusText}`);
                }
                
                const csvText = await response.text();
                
                if (!csvText.trim()) {
                    throw new Error("O arquivo CSV está vazio");
                }

                // Handle potential BOM and different line endings
                const cleanText = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
                const lines = cleanText.split('\n').filter(line => line.trim());
                
                if (lines.length < 2) {
                    throw new Error("O arquivo CSV não contém dados");
                }
                
                // Skip header line
                const dataLines = lines.slice(1);
                
                const comites: ComiteLocal[] = dataLines.map((line) => {
                    try {
                        // Handle potential quoted fields
                        const columns = line.split(',').map(col => {
                            const trimmed = col.trim();
                            // Remove quotes if they wrap the entire field
                            return trimmed.startsWith('"') && trimmed.endsWith('"') 
                                ? trimmed.slice(1, -1).trim() 
                                : trimmed;
                        });
                        
                        // Normalize the status text for comparison
                        const statusText = (columns[5] || '').toLowerCase()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '') // Remove accents
                            .replace(/[^a-z0-9]/g, '') // Remove special characters
                            .trim();
                        
                        // Check if the status is "Não-pleno" first
                        const isNaoPleno = statusText.includes('naopleno') || 
                                          statusText.includes('nao pleno') || 
                                          statusText.includes('nao-pleno');
                        
                        // If it's not "Não-pleno", then check if it's "Pleno"
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

                // Sort alphabetically by name
                comites.sort((a, b) => a.name.localeCompare(b.name));
                
                setComitesLocais(comites);
                setLoading(false);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Erro ao carregar dados do CSV");
                setLoading(false);
            }
        };

        fetchCSVData();
    }, [registrosData, registrosLoading]);

    // Update attendance state when Convex data changes
    useEffect(() => {
        if (ebMembers.length > 0) {
            setEbMembers(prev => prev.map(eb => ({
                ...eb,
                attendance: (ebsAttendance?.find(a => a.memberId === eb.id.toString())?.attendance || "not-counting") as AttendanceState
            })));
        }
    }, [ebsAttendance, ebMembers.length]);

    useEffect(() => {
        if (crMembers.length > 0) {
            setCrMembers(prev => prev.map(cr => ({
                ...cr,
                attendance: (crsAttendance?.find(a => a.memberId === cr.id.toString())?.attendance || "not-counting") as AttendanceState
            })));
        }
    }, [crsAttendance, crMembers.length]);

    useEffect(() => {
        if (comitesLocais.length > 0) {
            setComitesLocais(prev => prev.map(comite => ({
                ...comite,
                attendance: (comitesAttendance?.find(a => a.memberId === comite.name)?.attendance || "not-counting") as AttendanceState
            })));
        }
    }, [comitesAttendance, comitesLocais.length]);

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

    // Save/Load/Reset functions
    const saveAttendanceState = () => {
        const state = {
            timestamp: new Date().toISOString(),
            ebMembers,
            crMembers,
            comitesLocais
        };
        
        const dataStr = JSON.stringify(state, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `chamada-ag-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const loadAttendanceState = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const state = JSON.parse(content);
                
                if (state.ebMembers) {
                    setEbMembers(state.ebMembers);
                }
                if (state.crMembers) {
                    setCrMembers(state.crMembers);
                }
                if (state.comitesLocais) {
                    setComitesLocais(state.comitesLocais);
                }
            } catch (error) {
                console.error('Error loading attendance state:', error);
                alert('Erro ao carregar o arquivo. Verifique se o formato está correto.');
            }
        };
        reader.readAsText(file);
        
        // Reset the input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
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

        if (window.confirm("⚠️ ATENÇÃO: Tem certeza que deseja resetar todas as presenças?\n\nEsta ação irá:\n• Apagar TODOS os registros de presença do banco de dados\n• Resetar todos os membros para 'Não contabilizado'\n• Esta ação NÃO pode ser desfeita\n\nDeseja continuar?")) {
            setIsResetting(true);
            try {
                // Reset all attendance records in Convex database
                const deletedCount = await resetAllAttendance({ lastUpdatedBy: session.user.id });
                
                // Update local state immediately for better UX - reset all to "not-counting"
                setEbMembers(prev => prev.map(member => ({ ...member, attendance: "not-counting" as AttendanceState })));
                setCrMembers(prev => prev.map(member => ({ ...member, attendance: "not-counting" as AttendanceState })));
                setComitesLocais(prev => prev.map(comite => ({ ...comite, attendance: "not-counting" as AttendanceState })));
                
                toast({
                    title: "✅ Presenças resetadas com sucesso",
                    description: `${deletedCount} registros de presença foram removidos do banco de dados.`,
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

    const handleAttendanceChange = async (type: string, id: string, name: string, role?: string) => {
        if (!session?.user?.id) {
            toast({
                title: "Erro",
                description: "Você precisa estar logado para alterar a presença.",
                variant: "destructive",
            });
            return;
        }

        // Get current state from local data
        let currentState: AttendanceState = "not-counting";
        
        if (type === "eb") {
            const member = ebMembers.find(m => m.id.toString() === id);
            currentState = member?.attendance || "not-counting";
        } else if (type === "cr") {
            const member = crMembers.find(m => m.id.toString() === id);
            currentState = member?.attendance || "not-counting";
        } else if (type === "comite") {
            const comite = comitesLocais.find(c => c.name === id);
            currentState = comite?.attendance || "not-counting";
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

            // Update local state immediately for better UX
            if (type === "eb") {
                setEbMembers(prev => prev.map(m => 
                    m.id.toString() === id ? { ...m, attendance: nextState } : m
                ));
            } else if (type === "cr") {
                setCrMembers(prev => prev.map(m => 
                    m.id.toString() === id ? { ...m, attendance: nextState } : m
                ));
            } else if (type === "comite") {
                setComitesLocais(prev => prev.map(c => 
                    c.name === id ? { ...c, attendance: nextState } : c
                ));
            }

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

            // Update local state immediately for better UX
            if (type === "eb") {
                setEbMembers(prev => prev.map(m => 
                    m.id.toString() === id ? { ...m, attendance: newState } : m
                ));
            } else if (type === "cr") {
                setCrMembers(prev => prev.map(m => 
                    m.id.toString() === id ? { ...m, attendance: newState } : m
                ));
            } else if (type === "comite") {
                setComitesLocais(prev => prev.map(c => 
                    c.name === id ? { ...c, attendance: newState } : c
                ));
            }

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

    if (loading) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
                <div className="container mx-auto px-6 py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Carregando dados...</p>
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
                        <Button onClick={() => router.push("/comites-locais")} variant="outline">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar
                        </Button>
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
                                        onClick={downloadExcelReport}
                                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Baixar Relatório
                                    </Button>
                                    <Button
                                        onClick={saveAttendanceState}
                                        variant="outline"
                                        className="hover:bg-blue-50 hover:border-blue-200 border-blue-300 text-blue-700"
                                    >
                                        <Save className="w-4 h-4 mr-2" />
                                        Salvar Estado
                                    </Button>
                                    <Button
                                        onClick={() => fileInputRef.current?.click()}
                                        variant="outline"
                                        className="hover:bg-purple-50 hover:border-purple-200 border-purple-300 text-purple-700"
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Carregar Estado
                                    </Button>
                                    <Button
                                        onClick={resetAttendanceState}
                                        variant="outline"
                                        disabled={isResetting}
                                        className="hover:bg-red-50 hover:border-red-200 border-red-300 text-red-700"
                                    >
                                        <RotateCcw className={`w-4 h-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
                                        {isResetting ? 'Resetando...' : 'Resetar'}
                                    </Button>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-sm text-gray-600">
                                        <p>Use os botões para gerenciar o estado da chamada</p>
                                    </div>
                                </div>
                            </div>
                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={loadAttendanceState}
                                style={{ display: 'none' }}
                            />
                        </CardContent>
                    </Card>

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

                    {/* Grid Layout */}
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
        </main>
    );
} 