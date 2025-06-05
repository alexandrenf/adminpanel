"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { 
    ArrowLeft,
    BarChart3,
    Users,
    TrendingUp,
    CheckCircle,
    XCircle,
    Calendar,
    AlertTriangle,
    RefreshCw,
    Eye,
    EyeOff
} from "lucide-react";
import { useQuery } from "convex/react";
import { api as convexApi } from "../../../../convex/_generated/api";
import { isIfmsaEmailSession } from "~/server/lib/authcheck";
import PrecisaLogin from "~/app/_components/PrecisaLogin";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../../components/ui/select";

// Utility function to format dates
const formatDateWithoutTimezone = (timestamp: number): string => {
    const date = new Date(timestamp);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
};

export default function AnalyticsPage() {
    const { data: session } = useSession();
    const router = useRouter();
    
    const [selectedAssemblyId, setSelectedAssemblyId] = useState<string>("");
    const [isIfmsaEmail, setIsIfmsaEmail] = useState<boolean | null>(null);
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const [expandedOthers, setExpandedOthers] = useState(false);
    
    // Fetch assemblies and analytics data
    const assemblies = useQuery(convexApi.assemblies?.getAll);
    const analyticsData = useQuery(
        convexApi.assemblies?.getRegistrationAnalytics,
        selectedAssemblyId ? { assemblyId: selectedAssemblyId as any } : "skip"
    );

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

    // Set default assembly when assemblies load
    useEffect(() => {
        if (assemblies && assemblies.length > 0 && !selectedAssemblyId) {
            const activeAssemblies = assemblies.filter(a => a.status === "active");
            if (activeAssemblies.length > 0) {
                setSelectedAssemblyId(activeAssemblies[0]._id);
            } else {
                setSelectedAssemblyId(assemblies[0]._id);
            }
        }
    }, [assemblies, selectedAssemblyId]);

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

    if (!isIfmsaEmail) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
                    <p className="text-gray-600 mb-4">
                        Apenas usuários com email IFMSA podem acessar o dashboard de analytics.
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
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="outline"
                                onClick={() => router.push("/ag")}
                                className="hover:bg-gray-50"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Voltar
                            </Button>
                            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                                <BarChart3 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-purple-800 bg-clip-text text-transparent">
                                    Dashboard de Inscrições
                                </h1>
                                <p className="text-gray-600">
                                    Análise detalhada das inscrições por categoria de participante
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Assembly Selector */}
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Calendar className="w-5 h-5 text-blue-600" />
                                <span>Selecionar Assembleia</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-4">
                                <div className="flex-1">
                                    <Select value={selectedAssemblyId} onValueChange={setSelectedAssemblyId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione uma assembleia..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {assemblies?.map((assembly) => (
                                                <SelectItem key={assembly._id} value={assembly._id}>
                                                    <div className="flex items-center space-x-2">
                                                        <span>{assembly.name}</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {assembly.type}
                                                        </Badge>
                                                        <span className="text-xs text-gray-500">
                                                            {formatDateWithoutTimezone(assembly.startDate)}
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {analyticsData && (
                                    <div className="text-sm text-gray-500">
                                        Última atualização: {formatDateWithoutTimezone(analyticsData.lastUpdated)}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Analytics Content */}
                    {analyticsData && analyticsData.summary ? (
                        <div className="space-y-8">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <Card className="shadow-lg border-0">
                                    <CardContent className="p-6">
                                        <div className="flex items-center space-x-4">
                                            <div className="p-3 rounded-lg bg-blue-50">
                                                <Users className="w-6 h-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">Total Pré-definidos</p>
                                                                                                 <p className="text-2xl font-bold text-gray-900">{analyticsData?.summary?.totalPredefinedParticipants || 0}</p>
                                                 <p className="text-xs text-gray-500">Participantes esperados</p>
                                             </div>
                                         </div>
                                     </CardContent>
                                 </Card>

                                 <Card className="shadow-lg border-0">
                                     <CardContent className="p-6">
                                         <div className="flex items-center space-x-4">
                                             <div className="p-3 rounded-lg bg-green-50">
                                                 <CheckCircle className="w-6 h-6 text-green-600" />
                                             </div>
                                             <div>
                                                 <p className="text-sm font-medium text-gray-600">Inscritos Pré-definidos</p>
                                                 <p className="text-2xl font-bold text-gray-900">{analyticsData?.summary?.totalRegisteredPredefined || 0}</p>
                                                 <p className="text-xs text-gray-500">{analyticsData?.summary?.overallRegistrationRate?.toFixed(1) || 0}% do total</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="shadow-lg border-0">
                                    <CardContent className="p-6">
                                        <div className="flex items-center space-x-4">
                                            <div className="p-3 rounded-lg bg-purple-50">
                                                <TrendingUp className="w-6 h-6 text-purple-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">Outras Categorias</p>
                                                                                                 <p className="text-2xl font-bold text-gray-900">{analyticsData?.summary?.totalOtherRegistrations || 0}</p>
                                                 <p className="text-xs text-gray-500">Inscrições adicionais</p>
                                             </div>
                                         </div>
                                     </CardContent>
                                 </Card>

                                 <Card className="shadow-lg border-0">
                                     <CardContent className="p-6">
                                         <div className="flex items-center space-x-4">
                                             <div className="p-3 rounded-lg bg-indigo-50">
                                                 <BarChart3 className="w-6 h-6 text-indigo-600" />
                                             </div>
                                             <div>
                                                 <p className="text-sm font-medium text-gray-600">Total de Inscrições</p>
                                                 <p className="text-2xl font-bold text-gray-900">{analyticsData?.summary?.totalActiveRegistrations || 0}</p>
                                                <p className="text-xs text-gray-500">Inscrições ativas</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Registration Rate Chart */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <Card className="shadow-lg border-0">
                                    <CardHeader>
                                        <CardTitle className="flex items-center space-x-2">
                                            <BarChart3 className="w-5 h-5 text-blue-600" />
                                            <span>Taxa de Inscrição por Categoria</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {[
                                                { name: "Comitês Plenos", stats: analyticsData.comitesPlenos, color: "bg-green-500" },
                                                { name: "Comitês Não-Plenos", stats: analyticsData.comitesNaoPlenos, color: "bg-blue-500" },
                                                { name: "Executive Board", stats: analyticsData.ebs, color: "bg-purple-500" },
                                                { name: "Coordenadores Regionais", stats: analyticsData.crs, color: "bg-orange-500" },
                                            ].map((category, index) => (
                                                <div key={index} className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium">{category.name}</span>
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-sm text-gray-600">
                                                                {category.stats.registered}/{category.stats.total}
                                                            </span>
                                                            <Badge variant="outline" className="text-xs">
                                                                {category.stats.registrationRate.toFixed(1)}%
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                                        <div 
                                                            className={`h-3 rounded-full ${category.color} transition-all duration-500`}
                                                            style={{ 
                                                                width: `${category.stats.total > 0 ? category.stats.registrationRate : 0}%` 
                                                            }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Other Registrations */}
                                <Card className="shadow-lg border-0">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="flex items-center space-x-2">
                                                <TrendingUp className="w-5 h-5 text-purple-600" />
                                                <span>Outras Categorias</span>
                                                <Badge variant="outline">{analyticsData.others.total} inscrições</Badge>
                                            </CardTitle>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setExpandedOthers(!expandedOthers)}
                                            >
                                                {expandedOthers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {analyticsData.others.total === 0 ? (
                                            <p className="text-gray-600">Nenhuma inscrição em outras categorias.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                                                                 {analyticsData.others.byRole?.map((roleGroup: any, index: number) => (
                                                    <div key={index} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                                                        <div>
                                                            <p className="font-medium capitalize">
                                                                {roleGroup.role === 'comite_aspirante' ? 'Comitê Aspirante' :
                                                                 roleGroup.role === 'observador_externo' ? 'Observador Externo' :
                                                                 roleGroup.role === 'alumni' ? 'Alumni' :
                                                                 roleGroup.role === 'supco' ? 'Conselho Supervisor' :
                                                                 roleGroup.role}
                                                            </p>
                                                        </div>
                                                        <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                                                            {roleGroup.count} {roleGroup.count === 1 ? 'inscrição' : 'inscrições'}
                                                        </Badge>
                                                    </div>
                                                ))}
                                                
                                                {expandedOthers && (
                                                    <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                                                        <h4 className="font-medium text-gray-900">Detalhes das Inscrições:</h4>
                                                                                                                 {analyticsData.others.details?.map((registration: any, index: number) => (
                                                            <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <p className="font-medium">{registration.participantName}</p>
                                                                        <p className="text-sm text-gray-600">{registration.email}</p>
                                                                        {(registration.cidade || registration.uf) && (
                                                                            <p className="text-xs text-gray-500">
                                                                                {registration.cidade}{registration.cidade && registration.uf ? ', ' : ''}{registration.uf}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <Badge variant="outline" className="text-xs">
                                                                            {registration.participantRole || registration.participantType}
                                                                        </Badge>
                                                                        <p className="text-xs text-gray-500 mt-1">
                                                                            {registration.status === 'approved' ? 'Aprovado' :
                                                                             registration.status === 'pending' ? 'Pendente' :
                                                                             registration.status === 'pending_review' ? 'Em Análise' :
                                                                             registration.status}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Detailed Breakdown */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Detalhamento por Categoria</h3>
                                {[
                                    { 
                                        id: "comites-plenos", 
                                        name: "Comitês Plenos", 
                                        stats: analyticsData.comitesPlenos, 
                                        color: "border-green-200 bg-green-50",
                                        iconColor: "text-green-600"
                                    },
                                    { 
                                        id: "comites-nao-plenos", 
                                        name: "Comitês Não-Plenos", 
                                        stats: analyticsData.comitesNaoPlenos, 
                                        color: "border-blue-200 bg-blue-50",
                                        iconColor: "text-blue-600"
                                    },
                                    { 
                                        id: "ebs", 
                                        name: "Executive Board", 
                                        stats: analyticsData.ebs, 
                                        color: "border-purple-200 bg-purple-50",
                                        iconColor: "text-purple-600"
                                    },
                                    { 
                                        id: "crs", 
                                        name: "Coordenadores Regionais", 
                                        stats: analyticsData.crs, 
                                        color: "border-orange-200 bg-orange-50",
                                        iconColor: "text-orange-600"
                                    }
                                ].map((category) => (
                                    <Card key={category.id} className={`shadow-lg border-0 ${category.color}`}>
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="flex items-center space-x-2">
                                                    <Users className={`w-5 h-5 ${category.iconColor}`} />
                                                    <span>{category.name}</span>
                                                </CardTitle>
                                                <div className="flex items-center space-x-4">
                                                    <div className="text-right">
                                                        <p className="text-sm text-gray-600">
                                                            {category.stats.registered} de {category.stats.total} inscritos
                                                        </p>
                                                        <Badge variant="outline" className="text-xs">
                                                            {category.stats.registrationRate.toFixed(1)}%
                                                        </Badge>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setExpandedCategory(
                                                            expandedCategory === category.id ? null : category.id
                                                        )}
                                                    >
                                                        {expandedCategory === category.id ? (
                                                            <EyeOff className="w-4 h-4" />
                                                        ) : (
                                                            <Eye className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        {expandedCategory === category.id && (
                                            <CardContent>
                                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                                    {category.stats.details.map((detail: any, index: number) => (
                                                        <div 
                                                            key={index} 
                                                            className={`p-3 rounded-lg border ${
                                                                detail.isRegistered 
                                                                    ? 'border-green-200 bg-green-50' 
                                                                    : 'border-gray-200 bg-gray-50'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="font-medium">
                                                                        {detail.name || detail.participantId}
                                                                    </p>
                                                                    {detail.escola && (
                                                                        <p className="text-sm text-gray-600">{detail.escola}</p>
                                                                    )}
                                                                    {detail.role && (
                                                                        <p className="text-sm text-gray-600">{detail.role}</p>
                                                                    )}
                                                                    {(detail.cidade || detail.uf) && (
                                                                        <p className="text-xs text-gray-500">
                                                                            {detail.cidade}{detail.cidade && detail.uf ? ', ' : ''}{detail.uf}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center space-x-2">
                                                                    {detail.isRegistered ? (
                                                                        <Badge className="bg-green-100 text-green-800 border-green-200">
                                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                                            Inscrito
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="outline" className="text-gray-600">
                                                                            <XCircle className="w-3 h-3 mr-1" />
                                                                            Não Inscrito
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        )}
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ) : selectedAssemblyId ? (
                        <Card className="shadow-lg border-0">
                            <CardContent className="text-center py-12">
                                <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Carregando Analytics
                                </h3>
                                <p className="text-gray-600">
                                    Processando dados de inscrição...
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="shadow-lg border-0">
                            <CardContent className="text-center py-12">
                                <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Selecione uma Assembleia
                                </h3>
                                <p className="text-gray-600">
                                    Escolha uma assembleia para visualizar as estatísticas de inscrição.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </main>
    );
} 