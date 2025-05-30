"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../../components/ui/card";
import { Button } from "../../../../../../components/ui/button";
import { Badge } from "../../../../../../components/ui/badge";
import { Label } from "../../../../../../components/ui/label";
import { 
    CheckCircle, 
    Calendar, 
    MapPin, 
    Users, 
    CreditCard, 
    FileText, 
    ArrowRight,
    Download,
    Package,
    Clock,
    AlertTriangle,
    Printer
} from "lucide-react";
import { useQuery } from "convex/react";
import { api as convexApi } from "../../../../../../../convex/_generated/api";
import PrecisaLogin from "~/app/_components/PrecisaLogin";

// Utility function to format dates without timezone conversion
const formatDateWithoutTimezone = (timestamp: number): string => {
    const date = new Date(timestamp);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
};

export default function RegistrationSuccessPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const params = useParams();
    
    // Get IDs with type safety
    const assemblyId = params?.id;
    const registrationId = params?.registrationId;
    
    // Queries
    const registration = useQuery(
        convexApi.agRegistrations?.getById, 
        registrationId ? { id: registrationId as any } : "skip"
    );
    const assembly = useQuery(
        convexApi.assemblies?.getById, 
        assemblyId ? { id: assemblyId as any } : "skip"
    );
    const modality = useQuery(
        convexApi.registrationModalities?.getById,
        registration?.modalityId ? { id: registration.modalityId } : "skip"
    );
    const agConfig = useQuery(convexApi.agConfig?.get);

    // Show error if IDs are missing
    if (!assemblyId || !registrationId) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600">Erro</h1>
                    <p className="mt-2">Parâmetros inválidos.</p>
                </div>
            </div>
        );
    }

    // Loading registration data
    if (!registration || !assembly) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando dados da inscrição...</p>
                </div>
            </main>
        );
    }

    // Check if user owns this registration
    if (registration.participantId !== session?.user?.id) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
                    <p className="text-gray-600 mb-4">Você não tem permissão para ver esta inscrição.</p>
                    <Button onClick={() => router.push("/ag")}>
                        Voltar às Assembleias
                    </Button>
                </div>
            </main>
        );
    }

    const formatPrice = (priceInCents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(priceInCents / 100);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "pending_review": return "bg-orange-100 text-orange-800 border-orange-200";
            case "approved": return "bg-green-100 text-green-800 border-green-200";
            case "rejected": return "bg-red-100 text-red-800 border-red-200";
            case "cancelled": return "bg-gray-100 text-gray-800 border-gray-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "pending": return "Pendente";
            case "pending_review": return "Aguardando Análise";
            case "approved": return "Aprovado";
            case "rejected": return "Rejeitado";
            case "cancelled": return "Cancelado";
            default: return status;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "pending": return <Clock className="w-5 h-5" />;
            case "pending_review": return <FileText className="w-5 h-5" />;
            case "approved": return <CheckCircle className="w-5 h-5" />;
            case "rejected": return <AlertTriangle className="w-5 h-5" />;
            case "cancelled": return <AlertTriangle className="w-5 h-5" />;
            default: return <FileText className="w-5 h-5" />;
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const needsPayment = modality && modality.price > 0 && !registration.isPaymentExempt;

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="container mx-auto px-6 py-12">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Success Header */}
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center space-x-4">
                            <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                                <CheckCircle className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-green-800 bg-clip-text text-transparent">
                                    Inscrição Realizada com Sucesso!
                                </h1>
                                <p className="text-gray-600">Sua inscrição foi registrada no sistema</p>
                            </div>
                        </div>
                    </div>

                    {/* Status Card */}
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span className="flex items-center space-x-2">
                                    {getStatusIcon(registration.status)}
                                    <span>Status da Inscrição</span>
                                </span>
                                <Badge className={getStatusColor(registration.status)}>
                                    {getStatusLabel(registration.status)}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="font-semibold text-gray-700">ID da Inscrição:</Label>
                                        <p className="text-sm font-mono bg-gray-100 p-2 rounded">{registration._id}</p>
                                    </div>
                                    <div>
                                        <Label className="font-semibold text-gray-700">Data da Inscrição:</Label>
                                        <p className="text-sm">{new Date(registration.registeredAt).toLocaleString('pt-BR')}</p>
                                    </div>
                                </div>

                                {registration.status === "approved" && (
                                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <p className="text-green-800 font-medium">
                                            ✅ Sua inscrição foi aprovada! Você está confirmado para participar da assembleia.
                                        </p>
                                    </div>
                                )}

                                {registration.status === "pending" && (
                                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <p className="text-yellow-800 font-medium">
                                            ⏳ Sua inscrição está sendo analisada pela equipe organizadora.
                                        </p>
                                    </div>
                                )}

                                {registration.status === "pending_review" && (
                                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                        <p className="text-orange-800 font-medium">
                                            📋 Sua inscrição está aguardando revisão final.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Assembly Information */}
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Calendar className="w-5 h-5 text-blue-600" />
                                <span>Informações da Assembleia</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <Label className="font-semibold text-gray-700">Nome:</Label>
                                    <p className="text-lg font-medium">{assembly.name}</p>
                                </div>
                                <div>
                                    <Label className="font-semibold text-gray-700">Local:</Label>
                                    <p className="flex items-center space-x-1">
                                        <MapPin className="w-4 h-4 text-gray-500" />
                                        <span>{assembly.location}</span>
                                    </p>
                                </div>
                                <div>
                                    <Label className="font-semibold text-gray-700">Tipo:</Label>
                                    <p className="flex items-center space-x-1">
                                        <Users className="w-4 h-4 text-gray-500" />
                                        <span>{assembly.type === "AG" ? "Presencial" : "Online"}</span>
                                    </p>
                                </div>
                                <div>
                                    <Label className="font-semibold text-gray-700">Data de Início:</Label>
                                    <p>{new Date(assembly.startDate).toLocaleDateString('pt-BR')}</p>
                                </div>
                                <div>
                                    <Label className="font-semibold text-gray-700">Data de Término:</Label>
                                    <p>{formatDateWithoutTimezone(assembly.endDate)}</p>
                                </div>
                                <div>
                                    <Label className="font-semibold text-gray-700">Duração:</Label>
                                    <p>{Math.ceil((assembly.endDate - assembly.startDate) / (1000 * 60 * 60 * 24))} dias</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Modality Information */}
                    {modality && (
                        <Card className="shadow-lg border-0">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Package className="w-5 h-5 text-purple-600" />
                                    <span>Modalidade de Inscrição</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <Label className="font-semibold text-gray-700">Modalidade:</Label>
                                        <p className="text-lg font-medium">{modality.name}</p>
                                    </div>
                                    <div>
                                        <Label className="font-semibold text-gray-700">Preço:</Label>
                                        <p className="text-lg font-bold text-green-600">
                                            {modality.price === 0 ? "Gratuito" : formatPrice(modality.price)}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="font-semibold text-gray-700">Status do Pagamento:</Label>
                                        <p>
                                            {registration.isPaymentExempt ? (
                                                <Badge className="bg-blue-100 text-blue-800">Isento</Badge>
                                            ) : modality.price === 0 ? (
                                                <Badge className="bg-green-100 text-green-800">Não Requerido</Badge>
                                            ) : (
                                                <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>
                                            )}
                                        </p>
                                    </div>
                                    {modality.description && (
                                        <div className="col-span-1 md:col-span-3">
                                            <Label className="font-semibold text-gray-700">Descrição:</Label>
                                            <p className="text-sm p-3 bg-purple-50 rounded-lg">{modality.description}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Personal Information */}
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Users className="w-5 h-5 text-indigo-600" />
                                <span>Dados Pessoais</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label className="font-semibold text-gray-700">Nome Completo:</Label>
                                    <p>{registration.participantName}</p>
                                </div>
                                <div>
                                    <Label className="font-semibold text-gray-700">Nome do Crachá:</Label>
                                    <p>{registration.nomeCracha}</p>
                                </div>
                                <div>
                                    <Label className="font-semibold text-gray-700">Email:</Label>
                                    <p>{registration.email}</p>
                                </div>
                                <div>
                                    <Label className="font-semibold text-gray-700">Email Solar:</Label>
                                    <p>{registration.emailSolar}</p>
                                </div>
                                <div>
                                    <Label className="font-semibold text-gray-700">Celular:</Label>
                                    <p>{registration.celular}</p>
                                </div>
                                <div>
                                    <Label className="font-semibold text-gray-700">Função:</Label>
                                    <p>{registration.participantRole}</p>
                                </div>
                                <div>
                                    <Label className="font-semibold text-gray-700">Estado:</Label>
                                    <p>{registration.uf}</p>
                                </div>
                                <div>
                                    <Label className="font-semibold text-gray-700">Cidade:</Label>
                                    <p>{registration.cidade}</p>
                                </div>
                                {registration.comiteLocal && (
                                    <div className="col-span-1 md:col-span-2">
                                        <Label className="font-semibold text-gray-700">Comitê Local:</Label>
                                        <p>{registration.comiteLocal}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Next Steps */}
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Download className="w-5 h-5 text-green-600" />
                                <span>Próximos Passos</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {needsPayment && registration.status === "approved" && (
                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <CreditCard className="w-5 h-5 text-blue-600" />
                                            <div>
                                                <p className="font-medium text-blue-800">Pagamento Necessário</p>
                                                <p className="text-sm text-blue-700">
                                                    Sua inscrição foi aprovada! Agora você precisa realizar o pagamento para confirmar sua participação.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <Button 
                                                onClick={() => router.push(`/ag/${assemblyId}/register/payment-info/${registrationId}`)}
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                <CreditCard className="w-4 h-4 mr-2" />
                                                Ver Informações de Pagamento
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 border border-gray-200 rounded-lg">
                                        <h4 className="font-medium text-gray-900 mb-2">📧 Confirmação por Email</h4>
                                        <p className="text-sm text-gray-600">
                                            Você receberá um email de confirmação com todos os detalhes da sua inscrição.
                                        </p>
                                    </div>
                                    
                                    <div className="p-4 border border-gray-200 rounded-lg">
                                        <h4 className="font-medium text-gray-900 mb-2">📱 Acompanhe o Status</h4>
                                        <p className="text-sm text-gray-600">
                                            Você pode acompanhar o status da sua inscrição a qualquer momento nesta página.
                                        </p>
                                    </div>
                                    
                                    <div className="p-4 border border-gray-200 rounded-lg">
                                        <h4 className="font-medium text-gray-900 mb-2">📋 Documentação</h4>
                                        <p className="text-sm text-gray-600">
                                            Mantenha este comprovante de inscrição para seus registros.
                                        </p>
                                    </div>
                                    
                                    <div className="p-4 border border-gray-200 rounded-lg">
                                        <h4 className="font-medium text-gray-900 mb-2">❓ Dúvidas</h4>
                                        <p className="text-sm text-gray-600">
                                            Entre em contato com a organização se tiver alguma dúvida.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button 
                            onClick={handlePrint}
                            variant="outline"
                            className="flex items-center space-x-2"
                        >
                            <Download className="w-4 h-4" />
                            <span>Imprimir Comprovante</span>
                        </Button>
                        
                        <Button 
                            onClick={() => router.push("/ag")}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Voltar às Assembleias
                        </Button>
                    </div>
                </div>
            </div>
        </main>
    );
} 