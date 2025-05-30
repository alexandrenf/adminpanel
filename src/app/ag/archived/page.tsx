"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { 
    Calendar, 
    MapPin, 
    Users, 
    ArrowLeft,
    Archive,
    Trash2,
    Eye,
    Search,
    Building,
    Globe,
    Clock,
    Database,
    AlertTriangle,
    BarChart3
} from "lucide-react";
import { useToast } from "~/components/ui/use-toast";
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
} from "~/components/ui/dialog";

type ArchivedAssembly = {
    id: string;
    name: string;
    type: string;
    location: string;
    startDate: Date;
    endDate: Date;
    originalStatus: string;
    archivedAt: Date;
    archivedByUser: {
        name: string | null;
        email: string | null;
    };
    _count: {
        participants: number;
        registrations: number;
        modalities: number;
    };
};

export default function ArchivedAGPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const { toast } = useToast();
    
    const [isIfmsaEmail, setIsIfmsaEmail] = useState<boolean | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedType, setSelectedType] = useState<string>("");
    const [selectedYear, setSelectedYear] = useState<number | undefined>();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedAssembly, setSelectedAssembly] = useState<ArchivedAssembly | null>(null);
    const [confirmationText, setConfirmationText] = useState("");

    // tRPC queries and mutations
    const { data: archivedAssemblies, refetch } = api.archivedAg.getAll.useQuery(undefined, {
        enabled: isIfmsaEmail === true,
    });
    
    const deleteArchivedAssembly = api.archivedAg.delete.useMutation({
        onSuccess: () => {
            refetch();
        },
    });

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

    // Handle delete confirmation
    const handleDeleteConfirm = useCallback(async () => {
        if (!selectedAssembly) return;

        if (confirmationText !== selectedAssembly.name) {
            toast({ title: "❌ Erro", description: "Nome de confirmação incorreto.", variant: "destructive" });
            return;
        }

        try {
            await deleteArchivedAssembly.mutateAsync({
                id: selectedAssembly.id,
                confirmationText: confirmationText,
            });

            toast({ 
                title: "✅ AG Deletada Permanentemente", 
                description: `${selectedAssembly.name} foi deletada permanentemente do arquivo.`,
            });

            setIsDeleteDialogOpen(false);
            setSelectedAssembly(null);
            setConfirmationText("");
        } catch (error) {
            toast({ 
                title: "❌ Erro", 
                description: "Erro ao deletar AG arquivada. Tente novamente.", 
                variant: "destructive" 
            });
        }
    }, [selectedAssembly, confirmationText, deleteArchivedAssembly, toast]);

    // Filter archived assemblies based on search criteria
    const filteredAssemblies = archivedAssemblies?.filter(assembly => {
        const matchesSearch = !searchQuery || 
            assembly.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            assembly.location.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesType = !selectedType || assembly.type === selectedType;
        
        const matchesYear = !selectedYear || 
            new Date(assembly.startDate).getFullYear() === selectedYear;
        
        return matchesSearch && matchesType && matchesYear;
    });

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
                <Card className="max-w-md w-full mx-4">
                    <CardContent className="text-center py-12">
                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
                        <p className="text-gray-600 mb-4">
                            Apenas usuários com email @ifmsabrazil.org podem acessar esta página.
                        </p>
                        <Button onClick={() => router.push("/ag")}>
                            Voltar às Assembleias
                        </Button>
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
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Button 
                                variant="outline" 
                                onClick={() => router.push("/ag")}
                                className="flex items-center space-x-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Voltar</span>
                            </Button>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg">
                                <Archive className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-orange-800 bg-clip-text text-transparent">
                                    Assembleias Arquivadas
                                </h1>
                                <p className="text-gray-600">
                                    Visualize e gerencie assembleias arquivadas
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Search and Filters */}
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center">
                                <Search className="w-5 h-5 text-blue-600 mr-2" />
                                Filtros de Busca
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="search">Buscar por nome ou local</Label>
                                    <Input
                                        id="search"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Digite para buscar..."
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="type">Tipo</Label>
                                    <select
                                        id="type"
                                        value={selectedType}
                                        onChange={(e) => setSelectedType(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="">Todos os tipos</option>
                                        <option value="AG">AG (Presencial)</option>
                                        <option value="AGE">AGE (Online)</option>
                                    </select>
                                </div>
                                <div>
                                    <Label htmlFor="year">Ano</Label>
                                    <select
                                        id="year"
                                        value={selectedYear || ""}
                                        onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : undefined)}
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="">Todos os anos</option>
                                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Archived Assemblies List */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredAssemblies?.map((assembly) => (
                            <ArchivedAssemblyCard 
                                key={assembly.id} 
                                assembly={assembly}
                                onDelete={(assembly) => {
                                    setSelectedAssembly(assembly);
                                    setIsDeleteDialogOpen(true);
                                }}
                            />
                        ))}
                    </div>

                    {filteredAssemblies?.length === 0 && (
                        <Card className="shadow-lg border-0">
                            <CardContent className="text-center py-12">
                                <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Nenhuma AG arquivada encontrada
                                </h3>
                                <p className="text-gray-600">
                                    {searchQuery || selectedType || selectedYear ? 
                                        "Tente ajustar os filtros de busca." :
                                        "Não há assembleias arquivadas no momento."
                                    }
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                            <span>Deletar AG Arquivada Permanentemente</span>
                        </DialogTitle>
                        <DialogDescription>
                            Esta ação é irreversível. A AG arquivada e todos os dados relacionados serão permanentemente removidos.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4">
                        <div className="space-y-4">
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-800">
                                    <strong>⚠️ Atenção:</strong> Você está prestes a deletar permanentemente:
                                </p>
                                <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                                    <li>A assembleia arquivada &quot;{selectedAssembly?.name}&quot;</li>
                                    <li>Todos os participantes arquivados ({selectedAssembly?._count.participants || 0})</li>
                                    <li>Todas as inscrições arquivadas ({selectedAssembly?._count.registrations || 0})</li>
                                    <li>Todas as modalidades arquivadas ({selectedAssembly?._count.modalities || 0})</li>
                                    <li>Todos os comprovantes de pagamento salvos</li>
                                </ul>
                                <p className="mt-2 text-sm text-red-800 font-medium">
                                    Esta ação não pode ser desfeita!
                                </p>
                            </div>
                            
                            <div>
                                <Label htmlFor="delete-confirmation">
                                    Para confirmar, digite o nome da AG: <strong>{selectedAssembly?.name}</strong>
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
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleDeleteConfirm} 
                            variant="destructive"
                            disabled={confirmationText !== selectedAssembly?.name || deleteArchivedAssembly.isPending}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Deletar Permanentemente
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    );
}

// Archived Assembly Card Component
function ArchivedAssemblyCard({ 
    assembly, 
    onDelete 
}: { 
    assembly: ArchivedAssembly; 
    onDelete: (assembly: ArchivedAssembly) => void;
}) {
    const router = useRouter();

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    return (
        <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-lg">{assembly.name}</CardTitle>
                        <div className="flex items-center space-x-2 mt-2">
                            <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                                Arquivada
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
                            onClick={() => router.push(`/ag/archived/${assembly.id}`)}
                        >
                            <Eye className="w-3 h-3" />
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDelete(assembly)}
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
                            {formatDate(assembly.startDate)} - {formatDate(assembly.endDate)}
                        </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Archive className="w-4 h-4" />
                        <span>
                            Arquivada em {formatDate(assembly.archivedAt)} por {assembly.archivedByUser.name}
                        </span>
                    </div>
                    
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                        <div className="text-center">
                            <div className="text-lg font-semibold text-blue-600">{assembly._count.participants}</div>
                            <div className="text-xs text-gray-500">Participantes</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-semibold text-green-600">{assembly._count.registrations}</div>
                            <div className="text-xs text-gray-500">Inscrições</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-semibold text-purple-600">{assembly._count.modalities}</div>
                            <div className="text-xs text-gray-500">Modalidades</div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
} 