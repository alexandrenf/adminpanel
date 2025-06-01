"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { 
    Users, 
    UserCheck, 
    Building, 
    Building2,
    CheckCircle,
    XCircle,
    Minus,
    Search,
    Clock
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { useToast } from "~/components/ui/use-toast";
import { useSession } from "next-auth/react";
import { api as convexApi } from "../../../convex/_generated/api";
import { api } from "~/trpc/react";

type AttendanceState = "present" | "absent" | "not-counting" | "excluded";

type ComiteLocal = {
    id: string;
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

interface SessionAttendanceManagerProps {
    sessionId: string;
    sessionType: "plenaria" | "sessao" | "avulsa";
    sessionName: string;
    assemblyId?: string;
    onAttendanceUpdate: (participantId: string, currentAttendance: string) => Promise<void>;
}

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
    const eligibleForQuorum = total - excluded;
    const quorumPercentage = eligibleForQuorum > 0 ? (present / eligibleForQuorum) * 100 : 0;
    return { present, absent, excluded, notCounting, total, eligibleForQuorum, quorumPercentage };
};

export default function SessionAttendanceManager({ 
    sessionId, 
    sessionType, 
    sessionName, 
    assemblyId, 
    onAttendanceUpdate 
}: SessionAttendanceManagerProps) {
    const { data: session } = useSession();
    const { toast } = useToast();
    
    // State for UI
    const [searchEb, setSearchEb] = useState("");
    const [searchCr, setSearchCr] = useState("");
    const [searchPlenos, setSearchPlenos] = useState("");
    const [searchNaoPlenos, setSearchNaoPlenos] = useState("");
    const [searchParticipants, setSearchParticipants] = useState("");

    // Data state
    const [comitesLocais, setComitesLocais] = useState<ComiteLocal[]>([]);
    const [ebMembers, setEbMembers] = useState<EbMember[]>([]);
    const [crMembers, setCrMembers] = useState<CrMember[]>([]);

    // Queries based on session type
    const sessionAttendance = useQuery(
        convexApi.agSessions?.getSessionAttendance,
        (sessionType === "plenaria" || sessionType === "sessao") ? { sessionId: sessionId as any } : "skip"
    );

    // Traditional attendance for avulsa
    const ebsAttendance = useQuery(
        convexApi.attendance?.getByType, 
        sessionType === "avulsa" ? { type: "eb" } : "skip"
    );
    const crsAttendance = useQuery(
        convexApi.attendance?.getByType, 
        sessionType === "avulsa" ? { type: "cr" } : "skip"
    );
    const comitesAttendance = useQuery(
        convexApi.attendance?.getByType, 
        sessionType === "avulsa" ? { type: "comite" } : "skip"
    );

    // agParticipants data for plenaria
    const agComitesParticipants = useQuery(
        convexApi.assemblies?.getComitesLocaisWithStatus, 
        sessionType === "plenaria" && assemblyId ? { assemblyId: assemblyId as any } : "skip"
    );

    // Data from TRPC (for EBs and CRs)
    const { data: ebData } = api.eb.getAll.useQuery();
    const { data: crData } = api.cr.getAll.useQuery();

    // Mutations
    const updateAttendance = useMutation(convexApi.attendance?.updateAttendance);
    const markSessionAttendance = useMutation(convexApi.agSessions?.markAttendance);

    // Load data based on session type
    useEffect(() => {
        if (sessionType === "plenaria" || sessionType === "sessao") {
            // For plenaria and sessao, use session attendance data
            if (sessionAttendance && ebData && crData) {
                // Load EBs from session data
                const sessionEbs = sessionAttendance.ebs || [];
                const ebsWithAttendance = ebData.map(eb => {
                    const sessionRecord = sessionEbs.find((r: any) => r.participantId === eb.id.toString());
                    return {
                        id: eb.id,
                        role: eb.role,
                        name: eb.name,
                        attendance: (sessionRecord?.attendance || "not-counting") as AttendanceState
                    };
                });
                setEbMembers(ebsWithAttendance);

                // Load CRs from session data
                const sessionCrs = sessionAttendance.crs || [];
                const crsWithAttendance = crData.map(cr => {
                    const sessionRecord = sessionCrs.find((r: any) => r.participantId === cr.id.toString());
                    return {
                        id: cr.id,
                        role: cr.role,
                        name: cr.name,
                        attendance: (sessionRecord?.attendance || "not-counting") as AttendanceState
                    };
                });
                setCrMembers(crsWithAttendance);

                // For plenaria, load comites from agParticipants with session attendance
                if (sessionType === "plenaria" && agComitesParticipants) {
                    const sessionComites = sessionAttendance.comites || [];
                    const comitesWithAttendance = agComitesParticipants.map((comite: any) => {
                        const sessionRecord = sessionComites.find((r: any) => r.participantId === comite.participantId);
                        return {
                            id: comite.participantId,
                            name: comite.name,
                            escola: comite.escola || "",
                            regional: "",
                            cidade: comite.cidade || "",
                            uf: comite.uf || "",
                            status: (comite.status || "Não-pleno") as "Pleno" | "Não-pleno",
                            agFiliacao: comite.agFiliacao || "",
                            attendance: (sessionRecord?.attendance || "not-counting") as AttendanceState
                        };
                    });
                    setComitesLocais(comitesWithAttendance);
                }
            }
        } else if (sessionType === "avulsa") {
            // For avulsa, use traditional attendance data
            if (ebData && ebsAttendance !== undefined) {
                const ebsWithAttendance = ebData.map(eb => ({
                    id: eb.id,
                    role: eb.role,
                    name: eb.name,
                    attendance: (ebsAttendance.find((a: any) => a.memberId === eb.id.toString())?.attendance || "not-counting") as AttendanceState
                }));
                setEbMembers(ebsWithAttendance);
            }

            if (crData && crsAttendance !== undefined) {
                const crsWithAttendance = crData.map(cr => ({
                    id: cr.id,
                    role: cr.role,
                    name: cr.name,
                    attendance: (crsAttendance.find((a: any) => a.memberId === cr.id.toString())?.attendance || "not-counting") as AttendanceState
                }));
                setCrMembers(crsWithAttendance);
            }

            if (comitesAttendance !== undefined) {
                const comitesFromConvex = comitesAttendance
                    .filter((record: any) => record.type === "comite")
                    .map((record: any) => ({
                        id: record.name,
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
        }
    }, [sessionAttendance, agComitesParticipants, ebsAttendance, crsAttendance, comitesAttendance, ebData, crData, sessionType]);

    // Search filtering
    const filterBySearch = <T extends { name: string; role?: string }>(items: T[], searchTerm: string): T[] => {
        if (!searchTerm.trim()) return items;
        
        const searchLower = searchTerm.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
        
        return items.filter(item => {
            const nameMatch = item.name.toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .includes(searchLower);
            
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
    
    const comitesPlenos = comitesLocais.filter(c => c.status === "Pleno");
    const comitesNaoPlenos = comitesLocais.filter(c => c.status === "Não-pleno");
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

        if (sessionType === "sessao") {
            // For sessions, delegate to parent component
            await onAttendanceUpdate(id, "current");
        } else if (sessionType === "plenaria") {
            // For plenaria, use session attendance system
            let currentState: AttendanceState = "not-counting";
            
            if (type === "eb") {
                const member = ebMembers.find(m => m.id.toString() === id);
                currentState = member?.attendance || "not-counting";
            } else if (type === "cr") {
                const member = crMembers.find(m => m.id.toString() === id);
                currentState = member?.attendance || "not-counting";
            } else if (type === "comite") {
                const comite = comitesLocais.find(c => c.id === id);
                currentState = comite?.attendance || "not-counting";
            }

            const nextState = getNextAttendanceState(currentState);

            try {
                await markSessionAttendance({
                    sessionId: sessionId as any,
                    participantId: id,
                    participantType: type,
                    participantName: name,
                    participantRole: role,
                    attendance: nextState,
                    markedBy: session.user.id
                });

                toast({
                    title: "✅ Presença atualizada",
                    description: `${name} marcado como ${getAttendanceLabel(nextState)}`,
                });

                // Update local state immediately for better UX
                if (type === "eb") {
                    setEbMembers(prev => prev.map(m => m.id.toString() === id ? { ...m, attendance: nextState } : m));
                } else if (type === "cr") {
                    setCrMembers(prev => prev.map(m => m.id.toString() === id ? { ...m, attendance: nextState } : m));
                } else if (type === "comite") {
                    setComitesLocais(prev => prev.map(c => c.id === id ? { ...c, attendance: nextState } : c));
                }
            } catch (error) {
                console.error("Error updating attendance:", error);
                toast({
                    title: "❌ Erro",
                    description: "Erro ao atualizar presença. Tente novamente.",
                    variant: "destructive",
                });
            }
        } else if (sessionType === "avulsa") {
            // For avulsa, use traditional attendance system
            let currentState: AttendanceState = "not-counting";
            
            if (type === "eb") {
                const member = ebMembers.find(m => m.id.toString() === id);
                currentState = member?.attendance || "not-counting";
            } else if (type === "cr") {
                const member = crMembers.find(m => m.id.toString() === id);
                currentState = member?.attendance || "not-counting";
            } else if (type === "comite") {
                const comite = comitesLocais.find(c => c.id === id);
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

                toast({
                    title: "✅ Presença atualizada",
                    description: `${name} marcado como ${getAttendanceLabel(nextState)}`,
                });

                // Update local state immediately for better UX
                if (type === "eb") {
                    setEbMembers(prev => prev.map(m => m.id.toString() === id ? { ...m, attendance: nextState } : m));
                } else if (type === "cr") {
                    setCrMembers(prev => prev.map(m => m.id.toString() === id ? { ...m, attendance: nextState } : m));
                } else if (type === "comite") {
                    setComitesLocais(prev => prev.map(c => c.id === id ? { ...c, attendance: nextState } : c));
                }
            } catch (error) {
                console.error("Error updating attendance:", error);
                toast({
                    title: "❌ Erro",
                    description: "Erro ao atualizar presença. Tente novamente.",
                    variant: "destructive",
                });
            }
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

        if (sessionType === "sessao") {
            // For sessions, delegate to parent
            await onAttendanceUpdate(id, newState);
        } else if (sessionType === "plenaria") {
            // For plenaria, use session attendance
            try {
                await markSessionAttendance({
                    sessionId: sessionId as any,
                    participantId: id,
                    participantType: type,
                    participantName: name,
                    participantRole: role,
                    attendance: newState,
                    markedBy: session.user.id
                });

                toast({
                    title: "✅ Presença atualizada",
                    description: `${name} marcado como ${getAttendanceLabel(newState)}`,
                });

                // Update local state immediately
                if (type === "eb") {
                    setEbMembers(prev => prev.map(m => m.id.toString() === id ? { ...m, attendance: newState } : m));
                } else if (type === "cr") {
                    setCrMembers(prev => prev.map(m => m.id.toString() === id ? { ...m, attendance: newState } : m));
                } else if (type === "comite") {
                    setComitesLocais(prev => prev.map(c => c.id === id ? { ...c, attendance: newState } : c));
                }
            } catch (error) {
                console.error("Error updating attendance:", error);
                toast({
                    title: "❌ Erro",
                    description: "Erro ao atualizar presença. Tente novamente.",
                    variant: "destructive",
                });
            }
        } else if (sessionType === "avulsa") {
            // For avulsa, use traditional attendance
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

                toast({
                    title: "✅ Presença atualizada",
                    description: `${name} marcado como ${getAttendanceLabel(newState)}`,
                });

                // Update local state immediately
                if (type === "eb") {
                    setEbMembers(prev => prev.map(m => m.id.toString() === id ? { ...m, attendance: newState } : m));
                } else if (type === "cr") {
                    setCrMembers(prev => prev.map(m => m.id.toString() === id ? { ...m, attendance: newState } : m));
                } else if (type === "comite") {
                    setComitesLocais(prev => prev.map(c => c.id === id ? { ...c, attendance: newState } : c));
                }
            } catch (error) {
                console.error("Error updating attendance:", error);
                toast({
                    title: "❌ Erro",
                    description: "Erro ao atualizar presença. Tente novamente.",
                    variant: "destructive",
                });
            }
        }
    };

    const InstructionsCard = () => (
        <Card className="shadow-lg border-0 border-l-4 border-l-blue-500 mb-6">
            <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                        {sessionType === "plenaria" ? "Plenária" : sessionType === "sessao" ? "Sessão" : "Chamada Avulsa"}: {sessionName}
                    </h3>
                </div>
                <div className="text-sm text-gray-600 space-y-2">
                    <p>• <strong>Clique nos cards</strong> para alternar entre os estados de presença</p>
                    <p>• <strong>Use os botões de ação rápida</strong> (P/A/E/N) para definir diretamente o estado</p>
                    <p>• <strong>Use a busca</strong> para encontrar participantes específicos</p>
                    {sessionType === "avulsa" && (
                        <p className="text-orange-600">• <strong>Atenção:</strong> Esta é uma chamada avulsa. Os dados não serão salvos permanentemente.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    if (sessionType === "sessao") {
        // For sessão, show simplified interface with placeholder for future implementation
        return (
            <div className="space-y-6">
                <InstructionsCard />
                
                <Card className="shadow-lg border-0">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Building className="w-5 h-5 text-blue-600" />
                            <span>Gestão de Presenças - {sessionName}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center py-12">
                        <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Gestão de Participantes Individual
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Para sessões, a gestão de presenças é individual por participante inscrito.
                        </p>
                        <p className="text-sm text-blue-600">
                            Esta funcionalidade será implementada em breve.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Traditional design for plenaria and avulsa (keep old page design)
    return (
        <div className="space-y-6">
            <InstructionsCard />
            
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
                            <Badge variant="outline" className="text-blue-600 border-blue-200">
                                {getStats(filteredEbMembers).present}/{filteredEbMembers.length} presentes
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <Input
                                    placeholder="Buscar na Diretoria Executiva..."
                                    value={searchEb}
                                    onChange={(e) => setSearchEb(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {filteredEbMembers.map((member) => (
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
                                                <div className="hidden group-hover:flex items-center space-x-1">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-8 h-8 p-0"
                                                        title="Presente"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDirectAttendanceSet("eb", member.id.toString(), member.name, "present", member.role);
                                                        }}
                                                    >
                                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-8 h-8 p-0"
                                                        title="Ausente"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDirectAttendanceSet("eb", member.id.toString(), member.name, "absent", member.role);
                                                        }}
                                                    >
                                                        <XCircle className="w-4 h-4 text-red-600" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-8 h-8 p-0"
                                                        title="Excluído"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDirectAttendanceSet("eb", member.id.toString(), member.name, "excluded", member.role);
                                                        }}
                                                    >
                                                        <XCircle className="w-4 h-4 text-orange-600" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-8 h-8 p-0"
                                                        title="Não Encontrado"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDirectAttendanceSet("eb", member.id.toString(), member.name, "not-counting", member.role);
                                                        }}
                                                    >
                                                        <Minus className="w-4 h-4 text-gray-400" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* CRs Section */}
                <Card className="shadow-lg border-0">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Users className="w-5 h-5 text-green-600" />
                                <span className="text-lg">Coordenadores Regionais</span>
                            </div>
                            <Badge variant="outline" className="text-green-600 border-green-200">
                                {getStats(filteredCrMembers).present}/{filteredCrMembers.length} presentes
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <Input
                                    placeholder="Buscar nos Coordenadores Regionais..."
                                    value={searchCr}
                                    onChange={(e) => setSearchCr(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {filteredCrMembers.map((member) => (
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
                                                <div className="hidden group-hover:flex items-center space-x-1">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-8 h-8 p-0"
                                                        title="Presente"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDirectAttendanceSet("cr", member.id.toString(), member.name, "present", member.role);
                                                        }}
                                                    >
                                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-8 h-8 p-0"
                                                        title="Ausente"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDirectAttendanceSet("cr", member.id.toString(), member.name, "absent", member.role);
                                                        }}
                                                    >
                                                        <XCircle className="w-4 h-4 text-red-600" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-8 h-8 p-0"
                                                        title="Excluído"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDirectAttendanceSet("cr", member.id.toString(), member.name, "excluded", member.role);
                                                        }}
                                                    >
                                                        <XCircle className="w-4 h-4 text-orange-600" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-8 h-8 p-0"
                                                        title="Não Encontrado"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDirectAttendanceSet("cr", member.id.toString(), member.name, "not-counting", member.role);
                                                        }}
                                                    >
                                                        <Minus className="w-4 h-4 text-gray-400" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Comitês Plenos Section */}
                <Card className="shadow-lg border-0">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Building className="w-5 h-5 text-purple-600" />
                                <span className="text-lg">Comitês Plenos</span>
                            </div>
                            <Badge variant="outline" className="text-purple-600 border-purple-200">
                                {getStats(filteredComitesPlenos).present}/{filteredComitesPlenos.length} presentes
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <Input
                                    placeholder="Buscar nos Comitês Plenos..."
                                    value={searchPlenos}
                                    onChange={(e) => setSearchPlenos(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {filteredComitesPlenos.map((comite) => (
                                    <div
                                        key={comite.id}
                                        className={`group relative p-3 rounded-lg border transition-colors cursor-pointer ${getAttendanceColor(comite.attendance)}`}
                                        onClick={() => handleAttendanceChange("comite", comite.id, comite.name)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-sm">{comite.name}</p>
                                                <p className="text-xs text-gray-600">{comite.cidade}, {comite.uf}</p>
                                                <p className="text-xs text-purple-600 font-medium">Pleno</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {getAttendanceIcon(comite.attendance)}
                                                <div className="hidden group-hover:flex items-center space-x-1">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-8 h-8 p-0"
                                                        title="Presente"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDirectAttendanceSet("comite", comite.id, comite.name, "present");
                                                        }}
                                                    >
                                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-8 h-8 p-0"
                                                        title="Ausente"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDirectAttendanceSet("comite", comite.id, comite.name, "absent");
                                                        }}
                                                    >
                                                        <XCircle className="w-4 h-4 text-red-600" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-8 h-8 p-0"
                                                        title="Excluído"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDirectAttendanceSet("comite", comite.id, comite.name, "excluded");
                                                        }}
                                                    >
                                                        <XCircle className="w-4 h-4 text-orange-600" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-8 h-8 p-0"
                                                        title="Não Encontrado"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDirectAttendanceSet("comite", comite.id, comite.name, "not-counting");
                                                        }}
                                                    >
                                                        <Minus className="w-4 h-4 text-gray-400" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                            <Badge variant="outline" className="text-orange-600 border-orange-200">
                                {getStats(filteredComitesNaoPlenos).present}/{filteredComitesNaoPlenos.length} presentes
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <Input
                                    placeholder="Buscar nos Comitês Não Plenos..."
                                    value={searchNaoPlenos}
                                    onChange={(e) => setSearchNaoPlenos(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {filteredComitesNaoPlenos.map((comite) => (
                                    <div
                                        key={comite.id}
                                        className={`group relative p-3 rounded-lg border transition-colors cursor-pointer ${getAttendanceColor(comite.attendance)}`}
                                        onClick={() => handleAttendanceChange("comite", comite.id, comite.name)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-sm">{comite.name}</p>
                                                <p className="text-xs text-gray-600">{comite.cidade}, {comite.uf}</p>
                                                <p className="text-xs text-orange-600 font-medium">Não Pleno</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {getAttendanceIcon(comite.attendance)}
                                                <div className="hidden group-hover:flex items-center space-x-1">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-8 h-8 p-0"
                                                        title="Presente"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDirectAttendanceSet("comite", comite.id, comite.name, "present");
                                                        }}
                                                    >
                                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-8 h-8 p-0"
                                                        title="Ausente"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDirectAttendanceSet("comite", comite.id, comite.name, "absent");
                                                        }}
                                                    >
                                                        <XCircle className="w-4 h-4 text-red-600" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-8 h-8 p-0"
                                                        title="Excluído"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDirectAttendanceSet("comite", comite.id, comite.name, "excluded");
                                                        }}
                                                    >
                                                        <XCircle className="w-4 h-4 text-orange-600" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-8 h-8 p-0"
                                                        title="Não Encontrado"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDirectAttendanceSet("comite", comite.id, comite.name, "not-counting");
                                                        }}
                                                    >
                                                        <Minus className="w-4 h-4 text-gray-400" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 