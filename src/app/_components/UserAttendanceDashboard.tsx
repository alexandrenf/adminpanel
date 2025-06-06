"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { 
    Users, 
    CheckCircle,
    XCircle,
    Clock,
    BarChart3,
    Calendar,
    Award,
    TrendingUp,
    AlertCircle,
    RefreshCw
} from "lucide-react";
import { useQuery } from "convex/react";
import { useSession } from "next-auth/react";
import { api as convexApi } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface UserAttendanceDashboardProps {
    assemblyId?: string;
    userId?: string;
}

export default function UserAttendanceDashboard({ assemblyId, userId }: UserAttendanceDashboardProps) {
    const { data: session } = useSession();
    const userIdToUse = userId || session?.user?.id;

    // Get user's attendance stats for the assembly
    const attendanceStats = useQuery(
        convexApi.agSessions?.getUserAttendanceStats,
        assemblyId && userIdToUse ? { 
            assemblyId: assemblyId as Id<"assemblies">, 
            userId: userIdToUse 
        } : "skip"
    );

    const getStatusIcon = (attendance: string) => {
        switch (attendance) {
            case "present": return <CheckCircle className="w-4 h-4 text-green-600" />;
            case "absent": return <XCircle className="w-4 h-4 text-red-600" />;
            case "excluded": return <XCircle className="w-4 h-4 text-orange-600" />;
            default: return <Clock className="w-4 h-4 text-gray-400" />;
        }
    };

    const getStatusColor = (attendance: string) => {
        switch (attendance) {
            case "present": return "bg-green-100 text-green-800 border-green-200";
            case "absent": return "bg-red-100 text-red-800 border-red-200";
            case "excluded": return "bg-orange-100 text-orange-800 border-orange-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const getStatusLabel = (attendance: string) => {
        switch (attendance) {
            case "present": return "Presente";
            case "absent": return "Ausente";
            case "excluded": return "Excluído";
            default: return "Não contabilizado";
        }
    };

    const getSessionTypeIcon = (type: string) => {
        switch (type) {
            case "plenaria": return <Users className="w-4 h-4 text-purple-600" />;
            case "sessao": return <Calendar className="w-4 h-4 text-blue-600" />;
            case "avulsa": return <Clock className="w-4 h-4 text-gray-600" />;
            default: return <Calendar className="w-4 h-4 text-gray-600" />;
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

    const getAttendancePercentageColor = (percentage: number) => {
        if (percentage >= 85) return "text-green-600";
        if (percentage >= 75) return "text-yellow-600";
        return "text-red-600";
    };

    // Format attendance percentage with proper handling of zero sessions
    const formatAttendancePercentage = (percentage: number) => {
        if (percentage === 0) return "0.0";
        return percentage.toFixed(1);
    };

    if (!assemblyId || !userIdToUse) {
        return (
            <Card>
                <CardContent className="text-center py-12">
                    <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Dashboard de Presença
                    </h3>
                    <p className="text-gray-600">
                        Selecione uma assembleia para ver seu histórico de presença.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (attendanceStats === undefined) {
        return (
            <Card>
                <CardContent className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando dados de presença...</p>
                </CardContent>
            </Card>
        );
    }

    if (attendanceStats === null) {
        return (
            <Card>
                <CardContent className="text-center py-12">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-red-800 mb-2">
                        Erro ao Carregar Dados
                    </h3>
                    <p className="text-red-600 mb-4">
                        Não foi possível carregar os dados de presença. Por favor, tente novamente.
                    </p>
                    <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Tentar Novamente
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const { sessions, stats } = attendanceStats;

    return (
        <div className="space-y-6" role="region" aria-label="Dashboard de Presença">
            {/* Stats Overview */}
            <section aria-label="Resumo de Estatísticas" className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card>
                    <CardContent className="pt-6">
                        <article aria-label="Total de Sessões" className="flex items-center space-x-2">
                            <Calendar className="w-8 h-8 text-blue-600" aria-hidden="true" />
                            <div>
                                <p 
                                    className="text-2xl font-bold text-blue-600"
                                    aria-label={`Total de ${stats.totalSessions} sessões`}
                                >
                                    {stats.totalSessions}
                                </p>
                                <p className="text-sm text-gray-600">Total de Sessões</p>
                            </div>
                        </article>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <article aria-label="Sessões com Presença" className="flex items-center space-x-2">
                            <CheckCircle className="w-8 h-8 text-green-600" aria-hidden="true" />
                            <div>
                                <p 
                                    className="text-2xl font-bold text-green-600"
                                    aria-label={`${stats.attendedSessions} sessões com presença`}
                                >
                                    {stats.attendedSessions}
                                </p>
                                <p className="text-sm text-gray-600">Presenças</p>
                            </div>
                        </article>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <article aria-label="Taxa de Presença" className="flex items-center space-x-2">
                            <TrendingUp className="w-8 h-8 text-purple-600" aria-hidden="true" />
                            <div>
                                <p 
                                    className={`text-2xl font-bold ${getAttendancePercentageColor(stats.attendancePercentage)}`}
                                    aria-label={`Taxa de presença de ${formatAttendancePercentage(stats.attendancePercentage)}%`}
                                >
                                    {formatAttendancePercentage(stats.attendancePercentage)}%
                                </p>
                                <p className="text-sm text-gray-600">Taxa de Presença</p>
                            </div>
                        </article>
                    </CardContent>
                </Card>
            </section>

            {/* Session Details */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <BarChart3 className="w-5 h-5 text-blue-600" aria-hidden="true" />
                        <span>Histórico de Sessões</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {sessions.length > 0 ? (
                        <div className="space-y-3" role="list" aria-label="Lista de Sessões">
                            {sessions.map((session) => (
                                <div 
                                    key={session.sessionId}
                                    role="listitem"
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center space-x-3">
                                        {getSessionTypeIcon(session.sessionType)}
                                        <div>
                                            <h4 className="font-medium text-gray-900">
                                                {session.sessionName}
                                            </h4>
                                            <div className="flex items-center space-x-2">
                                                <Badge variant="outline" className="text-xs">
                                                    {getSessionTypeLabel(session.sessionType)}
                                                </Badge>
                                                <Badge variant={session.sessionStatus === "active" ? "default" : "secondary"} className="text-xs">
                                                    {session.sessionStatus === "active" ? "Ativa" : "Arquivada"}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-4">
                                        <div className="text-right">
                                            <p className="text-sm text-gray-600">
                                                {new Date(session.markedAt).toLocaleDateString('pt-BR')}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(session.markedAt).toLocaleTimeString('pt-BR')}
                                            </p>
                                        </div>
                                        <Badge className={getStatusColor(session.attendance)}>
                                            <div className="flex items-center space-x-1">
                                                {getStatusIcon(session.attendance)}
                                                <span>{getStatusLabel(session.attendance)}</span>
                                            </div>
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8" role="status" aria-label="Nenhuma sessão encontrada">
                            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" aria-hidden="true" />
                            <p className="text-gray-500">Nenhuma sessão encontrada</p>
                            <p className="text-sm text-gray-400">
                                Quando você participar de sessões, elas aparecerão aqui.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}