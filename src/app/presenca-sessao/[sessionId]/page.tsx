"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { useToast } from "../../../hooks/use-toast";
import { CheckCircle, XCircle, Clock, Users, Building, QrCode, ExternalLink, Copy, AlertCircle } from "lucide-react";
import QRCodeLib from 'qrcode';

export default function SelfAttendancePage() {
    const { sessionId } = useParams() as { sessionId: string };
    const router = useRouter();
    const pathname = usePathname();
    const { data: session } = useSession();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [hasMarkedAttendance, setHasMarkedAttendance] = useState(false);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
    const [isIfmsaEmail, setIsIfmsaEmail] = useState<boolean | null>(null);
    const [currentUrl, setCurrentUrl] = useState<string>('');

    // Get session data
    const sessionData = useQuery(api.agSessions.getSession, { 
        sessionId: sessionId as Id<"agSessions"> 
    });

    // Get user's registration for this assembly (if needed)
    const userRegistration = useQuery(api.agRegistrations.getUserRegistrationForAssembly, {
        userId: session?.user?.id || "",
        assemblyId: sessionData?.assemblyId
    });

    // Mutation to mark attendance
    const markAttendance = useMutation(api.agSessions.markSelfAttendance);

    // All useEffect hooks must be called before any early returns
    // Set current URL
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCurrentUrl(window.location.href);
        }
    }, []);

    // Generate QR code
    useEffect(() => {
        if (currentUrl && currentUrl.length > 0) {
            QRCodeLib.toDataURL(currentUrl, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            }).then(setQrCodeDataUrl);
        }
    }, [currentUrl]);

    useEffect(() => {
        const checkEmail = async () => {
            if (session) {
                try {
                    const response = await fetch('/api/check-ifmsa-email');
                    if (response.ok) {
                        const data = await response.json();
                        setIsIfmsaEmail(data.isIfmsaEmail);
                    } else {
                        setIsIfmsaEmail(false);
                    }
                } catch (error) {
                    console.error('Error checking IFMSA email:', error);
                    setIsIfmsaEmail(false);
                }
            } else {
                setIsIfmsaEmail(false);
            }
        };
        checkEmail();
    }, [session]);

    const resolveSelfAttendanceTarget = () => {
        if (!sessionData || !session?.user?.id) return null;

        // Sessões específicas usam presença por inscrição aprovada (individual).
        if (sessionData.type === "sessao") {
            if (!userRegistration || userRegistration.status !== "approved") return null;
            return {
                participantId: userRegistration._id,
                participantType: "individual",
                participantName: userRegistration.participantName || session.user.name || "Participante",
                participantRole: userRegistration.participantRole,
            };
        }

        // Plenária: EB/CR por indivíduo e Comitê por entidade (comitê).
        if (sessionData.type === "plenaria") {
            if (!userRegistration || userRegistration.status !== "approved") return null;

            if (userRegistration.participantType === "eb" || userRegistration.participantType === "cr") {
                return {
                    participantId: userRegistration.participantId,
                    participantType: userRegistration.participantType,
                    participantName: userRegistration.participantName || session.user.name || "Participante",
                    participantRole: userRegistration.participantRole,
                };
            }

            if (userRegistration.participantType === "comite_local" || userRegistration.participantType === "comite") {
                const comiteId = userRegistration.participantId || userRegistration.comiteLocal;
                if (!comiteId) return null;

                return {
                    participantId: comiteId,
                    participantType: "comite",
                    participantName: userRegistration.comiteLocal || userRegistration.participantName || "Comitê Local",
                    participantRole: userRegistration.participantRole,
                };
            }

            return null;
        }

        // Fallback (não usado para avulsa nesta tela).
        return {
            participantId: session.user.id,
            participantType: "user",
            participantName: session.user.name || "Participante",
            participantRole: undefined as string | undefined,
        };
    };

    const selfAttendanceTarget = resolveSelfAttendanceTarget();

    useEffect(() => {
        if (sessionData && session?.user?.id) {
            if (!selfAttendanceTarget) {
                setHasMarkedAttendance(false);
                return;
            }

            const userAttendance = sessionData.attendanceRecords?.find(
                (record: any) =>
                    record.participantId === selfAttendanceTarget.participantId &&
                    record.participantType === selfAttendanceTarget.participantType &&
                    record.attendance === "present"
            );
            setHasMarkedAttendance(!!userAttendance);
        }
    }, [
        sessionData,
        session?.user?.id,
        selfAttendanceTarget?.participantId,
        selfAttendanceTarget?.participantType,
    ]);

    const handleMarkAttendance = async () => {
        if (!session?.user?.id || !sessionData) {
            toast({
                title: "❌ Erro",
                description: "Você precisa estar logado para marcar presença.",
                variant: "destructive",
            });
            return;
        }

        if (sessionData.status === "archived") {
            toast({
                title: "❌ Sessão Finalizada",
                description: "Esta sessão foi finalizada e não é mais possível marcar presença.",
                variant: "destructive",
            });
            return;
        }

        if (hasMarkedAttendance) {
            toast({
                title: "ℹ️ Presença já confirmada",
                description: "Você já marcou presença nesta sessão.",
                variant: "default",
            });
            return;
        }

        if (!selfAttendanceTarget) {
            toast({
                title: "❌ Não elegível",
                description: sessionData.type === "plenaria"
                    ? "Na plenária, auto presença está disponível apenas para EBs, CRs e Comitês Locais com inscrição aprovada."
                    : "Você precisa de inscrição aprovada nesta assembleia para marcar presença.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            const result = await markAttendance({
                sessionId: sessionId as Id<"agSessions">,
                participantId: selfAttendanceTarget.participantId,
                participantName: selfAttendanceTarget.participantName,
                participantType: selfAttendanceTarget.participantType,
            });

            if (result.success) {
                setHasMarkedAttendance(true);
                toast({
                    title: "✅ Presença Confirmada!",
                    description: `Sua presença foi registrada em "${sessionData.name}".`,
                });
            } else {
                toast({
                    title: "❌ Erro",
                    description: result.error || "Não foi possível marcar presença.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "❌ Erro",
                description: "Erro ao marcar presença. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(currentUrl);
            toast({
                title: "✅ Link copiado!",
                description: "Link da sessão copiado para a área de transferência.",
            });
        } catch (error) {
            console.error("Failed to copy link:", error);
            toast({
                title: "❌ Erro ao copiar",
                description: "Não foi possível copiar o link. Por favor, tente novamente ou copie manualmente.",
                variant: "destructive",
            });
        }
    };

    if (!sessionData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="p-6 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Carregando sessão...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (sessionData.status === "archived") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="p-6 text-center">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-red-800 mb-2">Sessão Finalizada</h2>
                        <p className="text-red-600">
                            Esta sessão foi finalizada e não é mais possível marcar presença.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (sessionData.type === "avulsa") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="p-6 text-center">
                        <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-yellow-800 mb-2">Sessão Não Disponível</h2>
                        <p className="text-yellow-600">
                            Auto presença não está disponível para sessões avulsas.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const getSessionTypeLabel = (type: string) => {
        switch (type) {
            case "plenaria":
                return "Plenária";
            case "sessao":
                return "Sessão";
            default:
                return "Sessão";
        }
    };

    const getSessionIcon = (type: string) => {
        switch (type) {
            case "plenaria":
                return <Users className="w-8 h-8 text-purple-600" />;
            case "sessao":
                return <Building className="w-8 h-8 text-blue-600" />;
            default:
                return <Clock className="w-8 h-8 text-gray-600" />;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <Card className="shadow-lg border-0">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            {getSessionIcon(sessionData.type)}
                        </div>
                        <CardTitle className="text-2xl font-bold text-gray-900">
                            {sessionData.name}
                        </CardTitle>
                        <div className="flex justify-center space-x-2 mt-2">
                            <Badge variant="outline" className="text-blue-600 border-blue-200">
                                {getSessionTypeLabel(sessionData.type)}
                            </Badge>
                            <Badge variant="outline" className="text-green-600 border-green-200">
                                Ativa
                            </Badge>
                        </div>
                    </CardHeader>
                </Card>

                {/* QR Code */}
                {isIfmsaEmail && (
                <Card className="shadow-lg border-0">
                    <CardContent className="p-6 text-center">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">
                            QR Code para Auto Presença
                        </h3>
                        <div className="bg-white p-6 rounded-lg inline-block shadow-sm border">
                            {qrCodeDataUrl ? (
                                <img 
                                    src={qrCodeDataUrl} 
                                    alt="QR Code para Auto Presença" 
                                    className="w-[200px] h-[200px]"
                                />
                            ) : (
                                <div className="w-[200px] h-[200px] bg-gray-100 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
                                </div>
                            )}
                        </div>
                        <p className="text-sm text-gray-600 mt-4">
                            Compartilhe este QR Code para que outros participantes possam marcar presença
                        </p>
                        <Button
                            onClick={handleCopyLink}
                            variant="outline"
                            className="mt-3"
                        >
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar Link
                        </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Attendance Action */}
                <Card className="shadow-lg border-0">
                    <CardContent className="p-6">
                        <div className="text-center">
                            <h3 className="text-xl font-semibold mb-4 text-gray-800">
                                Confirmar Presença
                            </h3>
                            
                            {!session ? (
                                <div className="space-y-4">
                                    <p className="text-gray-600">
                                        Você precisa estar logado para marcar presença.
                                    </p>
                                    <Button
                                        onClick={() => router.push(`/api/auth/signin?callbackUrl=${encodeURIComponent(pathname || '/')}`)}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                    >
                                        Fazer Login
                                    </Button>
                                </div>
                            ) : sessionData.type !== "avulsa" && !userRegistration ? (
                                <div className="space-y-4">
                                    <AlertCircle className="w-12 h-12 text-orange-500 mx-auto" />
                                    <p className="text-orange-600">
                                        Você não está inscrito nesta assembleia e não pode participar desta sessão.
                                    </p>
                                </div>
                            ) : sessionData.type !== "avulsa" && !!userRegistration && userRegistration.status !== "approved" ? (
                                <div className="space-y-4">
                                    <AlertCircle className="w-12 h-12 text-orange-500 mx-auto" />
                                    <p className="text-orange-600">
                                        Sua inscrição ainda não foi aprovada. Aguarde aprovação para marcar presença.
                                    </p>
                                </div>
                            ) : sessionData.type === "plenaria" && !selfAttendanceTarget ? (
                                <div className="space-y-4">
                                    <AlertCircle className="w-12 h-12 text-orange-500 mx-auto" />
                                    <p className="text-orange-600">
                                        Na plenária, auto presença está disponível apenas para EBs, CRs e Comitês Locais.
                                    </p>
                                </div>
                            ) : hasMarkedAttendance ? (
                                <div className="space-y-4">
                                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                                    <h4 className="text-lg font-semibold text-green-800">
                                        Presença Confirmada!
                                    </h4>
                                    <p className="text-green-600">
                                        Sua presença já foi registrada nesta sessão.
                                    </p>
                                    <Badge variant="outline" className="text-green-600 border-green-200">
                                        ✅ Presente
                                    </Badge>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-gray-600 mb-4">
                                        Clique no botão abaixo para confirmar sua presença:
                                    </p>
                                    <Button
                                        onClick={handleMarkAttendance}
                                        disabled={isLoading}
                                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-3 text-lg"
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                                Confirmando...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="w-5 h-5 mr-2" />
                                                Confirmar Presença
                                            </>
                                        )}
                                    </Button>
                                    
                                    {session.user?.name && (
                                        <p className="text-sm text-gray-500 mt-2">
                                            Registrando presença como: <strong>{session.user.name}</strong>
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Session Info */}
                <Card className="shadow-lg border-0">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">
                            Informações da Sessão
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Tipo:</span>
                                <span className="font-medium">{getSessionTypeLabel(sessionData.type)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Status:</span>
                                <Badge variant="outline" className="text-green-600 border-green-200">
                                    Ativa
                                </Badge>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Criada em:</span>
                                <span className="font-medium">
                                    {new Date(sessionData._creationTime).toLocaleString('pt-BR')}
                                </span>
                            </div>
                            {sessionData.attendanceStats && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Presenças registradas:</span>
                                    <span className="font-medium">{sessionData.attendanceStats.total || 0}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 
