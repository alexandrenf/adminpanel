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
    Save
} from "lucide-react";
import { api } from "~/trpc/react";

type AttendanceState = "present" | "absent" | "not-counting";

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

// Add quorum requirements
const QUORUM_REQUIREMENTS = {
    eb: 0.5, // 50% of EB members
    cr: 0.5, // 50% of CR members
    comitesPlenos: 0.5, // 50% of Pleno committees
    comitesNaoPlenos: 0.5, // 50% of Não-pleno committees
} as const;

export default function ChamadaAGPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [comitesLocais, setComitesLocais] = useState<ComiteLocal[]>([]);
    const [ebMembers, setEbMembers] = useState<EbMember[]>([]);
    const [crMembers, setCrMembers] = useState<CrMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch data
    const { data: registrosData } = api.registros.get.useQuery();
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
            if (!registrosData) {
                console.log("No registros data available");
                setError("URL do CSV não configurada");
                setLoading(false);
                return;
            }

            if (!registrosData.url) {
                console.log("No URL in registros data");
                setError("URL do CSV não configurada");
                setLoading(false);
                return;
            }

            try {
                console.log("Fetching CSV from URL:", registrosData.url);
                const response = await fetch(registrosData.url, {
                    redirect: 'follow',
                });
                if (!response.ok) {
                    console.error("Failed to fetch CSV:", response.status, response.statusText);
                    throw new Error(`Erro ao buscar dados do CSV: ${response.status} ${response.statusText}`);
                }
                
                const csvText = await response.text();
                console.log("CSV content length:", csvText.length);
                console.log("First 100 characters of CSV:", csvText.substring(0, 100));
                
                if (!csvText.trim()) {
                    console.error("Empty CSV content");
                    throw new Error("O arquivo CSV está vazio");
                }

                // Handle potential BOM and different line endings
                const cleanText = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
                const lines = cleanText.split('\n').filter(line => line.trim());
                console.log("Number of lines in CSV:", lines.length);
                
                if (lines.length < 2) {
                    console.error("CSV has no data lines");
                    throw new Error("O arquivo CSV não contém dados");
                }
                
                // Skip header line
                const dataLines = lines.slice(1);
                console.log("First data line:", dataLines[0]);
                
                const comites: ComiteLocal[] = dataLines.map((line, index) => {
                    try {
                        // Handle potential quoted fields
                        const columns = line.split(',').map(col => {
                            const trimmed = col.trim();
                            // Remove quotes if they wrap the entire field
                            return trimmed.startsWith('"') && trimmed.endsWith('"') 
                                ? trimmed.slice(1, -1).trim() 
                                : trimmed;
                        });
                        
                        console.log(`Processing line ${index + 1}:`, columns);
                        
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
                        console.error(`Error processing line ${index + 1}:`, err);
                        return null;
                    }
                }).filter((comite): comite is ComiteLocal => comite !== null && comite.name !== '');

                console.log("Number of comites parsed:", comites.length);
                console.log("First comite:", comites[0]);

                // Sort alphabetically by name
                comites.sort((a, b) => a.name.localeCompare(b.name));
                
                setComitesLocais(comites);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching CSV:", err);
                setError(err instanceof Error ? err.message : "Erro ao carregar dados do CSV");
                setLoading(false);
            }
        };

        fetchCSVData();
    }, [registrosData]);

    const toggleAttendance = (type: 'eb' | 'cr' | 'comite', index: number) => {
        const nextState = (current: AttendanceState): AttendanceState => {
            switch (current) {
                case "not-counting": return "present";
                case "present": return "absent";
                case "absent": return "not-counting";
                default: return "not-counting";
            }
        };

        if (type === 'eb') {
            setEbMembers(prev => prev.map((member, i) => 
                i === index ? { ...member, attendance: nextState(member.attendance) } : member
            ));
        } else if (type === 'cr') {
            setCrMembers(prev => prev.map((member, i) => 
                i === index ? { ...member, attendance: nextState(member.attendance) } : member
            ));
        } else if (type === 'comite') {
            setComitesLocais(prev => prev.map((comite, i) => 
                i === index ? { ...comite, attendance: nextState(comite.attendance) } : comite
            ));
        }
    };

    const getAttendanceIcon = (state: AttendanceState) => {
        switch (state) {
            case "present":
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case "absent":
                return <XCircle className="w-5 h-5 text-red-600" />;
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
            case "not-counting":
                return "bg-gray-50 border-gray-200 hover:bg-gray-100";
        }
    };

    const getStats = (members: { attendance: AttendanceState }[]) => {
        const present = members.filter(m => m.attendance === "present").length;
        const absent = members.filter(m => m.attendance === "absent").length;
        const notCounting = members.filter(m => m.attendance === "not-counting").length;
        const total = members.length;
        const quorumPercentage = total > 0 ? (present / total) * 100 : 0;
        return { present, absent, notCounting, total, quorumPercentage };
    };

    const comitesPlenos = comitesLocais.filter(c => c.status === "Pleno");
    const comitesNaoPlenos = comitesLocais.filter(c => c.status === "Não-pleno");

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

    const resetAttendanceState = () => {
        if (confirm('Tem certeza que deseja resetar todos os estados de presença?')) {
            setEbMembers(prev => prev.map(member => ({ ...member, attendance: "not-counting" })));
            setCrMembers(prev => prev.map(member => ({ ...member, attendance: "not-counting" })));
            setComitesLocais(prev => prev.map(comite => ({ ...comite, attendance: "not-counting" })));
        }
    };

    const downloadExcelReport = () => {
        // Create CSV content
        let csvContent = "Tipo,Nome,Cargo/Localização,Status,Presença\n";
        
        // Add EB members
        ebMembers.forEach(member => {
            const status = member.attendance === "present" ? "Presente" : 
                          member.attendance === "absent" ? "Ausente" : "Não contabilizado";
            csvContent += `EB,"${member.name}","${member.role}","${status}"\n`;
        });
        
        // Add CR members
        crMembers.forEach(member => {
            const status = member.attendance === "present" ? "Presente" : 
                          member.attendance === "absent" ? "Ausente" : "Não contabilizado";
            csvContent += `CR,"${member.name}","${member.role}","${status}"\n`;
        });
        
        // Add Comitês
        comitesLocais.forEach(comite => {
            const status = comite.attendance === "present" ? "Presente" : 
                          comite.attendance === "absent" ? "Ausente" : "Não contabilizado";
            csvContent += `${comite.status},"${comite.name}","${comite.cidade}, ${comite.uf}","${status}"\n`;
        });
        
        // Create and download file
        const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio-presenca-ag-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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
                                        className="hover:bg-red-50 hover:border-red-200 border-red-300 text-red-700"
                                    >
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Resetar
                                    </Button>
                                </div>
                                <div className="text-sm text-gray-600">
                                    <p>Use os botões para gerenciar o estado da chamada</p>
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
                                        <Minus className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-600">Não contabilizado</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Grid Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* EBs Section */}
                        <Card className="shadow-lg border-0">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Users className="w-5 h-5 text-blue-600" />
                                        <span>Executiva Brasileira</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {(() => {
                                            const stats = getStats(ebMembers);
                                            const hasQuorum = stats.quorumPercentage >= QUORUM_REQUIREMENTS.eb * 100;
                                            return (
                                                <>
                                                    <Badge variant="outline" className="text-green-600 border-green-200">
                                                        {stats.present} presentes
                                                    </Badge>
                                                    <Badge variant="outline" className="text-red-600 border-red-200">
                                                        {stats.absent} ausentes
                                                    </Badge>
                                                    <Badge 
                                                        variant="outline" 
                                                        className={`${hasQuorum ? 'text-green-600 border-green-200' : 'text-amber-600 border-amber-200'}`}
                                                    >
                                                        {stats.quorumPercentage.toFixed(1)}% quórum
                                                        {hasQuorum ? ' ✓' : ' ✗'}
                                                    </Badge>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {ebMembers.map((member, index) => (
                                        <button
                                            key={member.id}
                                            onClick={() => toggleAttendance('eb', index)}
                                            className={`w-full p-3 rounded-lg border transition-colors text-left ${getAttendanceColor(member.attendance)}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">{member.name}</p>
                                                    <p className="text-sm text-gray-600">{member.role}</p>
                                                </div>
                                                {getAttendanceIcon(member.attendance)}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* CRs Section */}
                        <Card className="shadow-lg border-0">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <UserCheck className="w-5 h-5 text-purple-600" />
                                        <span>Coordenadores Regionais</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {(() => {
                                            const stats = getStats(crMembers);
                                            const hasQuorum = stats.quorumPercentage >= QUORUM_REQUIREMENTS.cr * 100;
                                            return (
                                                <>
                                                    <Badge variant="outline" className="text-green-600 border-green-200">
                                                        {stats.present} presentes
                                                    </Badge>
                                                    <Badge variant="outline" className="text-red-600 border-red-200">
                                                        {stats.absent} ausentes
                                                    </Badge>
                                                    <Badge 
                                                        variant="outline" 
                                                        className={`${hasQuorum ? 'text-green-600 border-green-200' : 'text-amber-600 border-amber-200'}`}
                                                    >
                                                        {stats.quorumPercentage.toFixed(1)}% quórum
                                                        {hasQuorum ? ' ✓' : ' ✗'}
                                                    </Badge>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {crMembers.map((member, index) => (
                                        <button
                                            key={member.id}
                                            onClick={() => toggleAttendance('cr', index)}
                                            className={`w-full p-3 rounded-lg border transition-colors text-left ${getAttendanceColor(member.attendance)}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">{member.name}</p>
                                                    <p className="text-sm text-gray-600">{member.role}</p>
                                                </div>
                                                {getAttendanceIcon(member.attendance)}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Comitês Plenos Section */}
                        <Card className="shadow-lg border-0">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Building className="w-5 h-5 text-green-600" />
                                        <span>Comitês Plenos</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {(() => {
                                            const stats = getStats(comitesPlenos);
                                            const hasQuorum = stats.quorumPercentage >= QUORUM_REQUIREMENTS.comitesPlenos * 100;
                                            return (
                                                <>
                                                    <Badge variant="outline" className="text-green-600 border-green-200">
                                                        {stats.present} presentes
                                                    </Badge>
                                                    <Badge variant="outline" className="text-red-600 border-red-200">
                                                        {stats.absent} ausentes
                                                    </Badge>
                                                    <Badge 
                                                        variant="outline" 
                                                        className={`${hasQuorum ? 'text-green-600 border-green-200' : 'text-amber-600 border-amber-200'}`}
                                                    >
                                                        {stats.quorumPercentage.toFixed(1)}% quórum
                                                        {hasQuorum ? ' ✓' : ' ✗'}
                                                    </Badge>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {comitesPlenos.map((comite, index) => {
                                        const originalIndex = comitesLocais.findIndex(c => c.name === comite.name);
                                        return (
                                            <button
                                                key={comite.name}
                                                onClick={() => toggleAttendance('comite', originalIndex)}
                                                className={`w-full p-3 rounded-lg border transition-colors text-left ${getAttendanceColor(comite.attendance)}`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium">{comite.name}</p>
                                                        <p className="text-sm text-gray-600">{comite.cidade}, {comite.uf}</p>
                                                    </div>
                                                    {getAttendanceIcon(comite.attendance)}
                                                </div>
                                            </button>
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
                                        <span>Comitês Não Plenos</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {(() => {
                                            const stats = getStats(comitesNaoPlenos);
                                            const hasQuorum = stats.quorumPercentage >= QUORUM_REQUIREMENTS.comitesNaoPlenos * 100;
                                            return (
                                                <>
                                                    <Badge variant="outline" className="text-green-600 border-green-200">
                                                        {stats.present} presentes
                                                    </Badge>
                                                    <Badge variant="outline" className="text-red-600 border-red-200">
                                                        {stats.absent} ausentes
                                                    </Badge>
                                                    <Badge 
                                                        variant="outline" 
                                                        className={`${hasQuorum ? 'text-green-600 border-green-200' : 'text-amber-600 border-amber-200'}`}
                                                    >
                                                        {stats.quorumPercentage.toFixed(1)}% quórum
                                                        {hasQuorum ? ' ✓' : ' ✗'}
                                                    </Badge>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {comitesNaoPlenos.map((comite, index) => {
                                        const originalIndex = comitesLocais.findIndex(c => c.name === comite.name);
                                        return (
                                            <button
                                                key={comite.name}
                                                onClick={() => toggleAttendance('comite', originalIndex)}
                                                className={`w-full p-3 rounded-lg border transition-colors text-left ${getAttendanceColor(comite.attendance)}`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium">{comite.name}</p>
                                                        <p className="text-sm text-gray-600">{comite.cidade}, {comite.uf}</p>
                                                    </div>
                                                    {getAttendanceIcon(comite.attendance)}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Summary */}
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <ClipboardCheck className="w-5 h-5 text-green-600" />
                                <span>Resumo Geral</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {[
                                    { label: "EBs", data: ebMembers, color: "blue", requirement: QUORUM_REQUIREMENTS.eb },
                                    { label: "CRs", data: crMembers, color: "purple", requirement: QUORUM_REQUIREMENTS.cr },
                                    { label: "Comitês Plenos", data: comitesPlenos, color: "green", requirement: QUORUM_REQUIREMENTS.comitesPlenos },
                                    { label: "Comitês Não Plenos", data: comitesNaoPlenos, color: "orange", requirement: QUORUM_REQUIREMENTS.comitesNaoPlenos }
                                ].map(({ label, data, color, requirement }) => {
                                    const stats = getStats(data);
                                    const hasQuorum = stats.quorumPercentage >= requirement * 100;
                                    return (
                                        <div key={label} className="text-center">
                                            <h4 className="font-semibold text-gray-900 mb-2">{label}</h4>
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-center space-x-1">
                                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                                    <span className="text-sm text-green-700">{stats.present}</span>
                                                </div>
                                                <div className="flex items-center justify-center space-x-1">
                                                    <XCircle className="w-4 h-4 text-red-600" />
                                                    <span className="text-sm text-red-700">{stats.absent}</span>
                                                </div>
                                                <div className="flex items-center justify-center space-x-1">
                                                    <Minus className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm text-gray-600">{stats.notCounting}</span>
                                                </div>
                                                <div className={`mt-2 text-sm ${hasQuorum ? 'text-green-600' : 'text-amber-600'}`}>
                                                    {stats.quorumPercentage.toFixed(1)}% quórum
                                                    {hasQuorum ? ' ✓' : ' ✗'}
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
        </main>
    );
} 