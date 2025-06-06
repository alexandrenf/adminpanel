"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { BarChart3 } from "lucide-react";
import UserAttendanceDashboard from "~/app/_components/UserAttendanceDashboard";
import { useQuery } from "convex/react";
import { api as convexApi } from "../../../../../convex/_generated/api";
import PrecisaLogin from "~/app/_components/PrecisaLogin";
import type { Id } from "../../../../../convex/_generated/dataModel";

export default function AttendancePage({ params }: { params: { id: string } }) {
    const { data: session } = useSession();
    const assembly = useQuery(convexApi.assemblies?.getById, { id: params.id as Id<"assemblies"> });

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

    if (!assembly) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
                <div className="container mx-auto px-6 py-12">
                    <div className="max-w-7xl mx-auto">
                        <Card className="shadow-lg border-0">
                            <CardContent className="text-center py-12">
                                <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Assembleia não encontrada
                                </h3>
                                <p className="text-gray-600">
                                    A assembleia que você está procurando não existe ou você não tem permissão para acessá-la.
                                </p>
                            </CardContent>
                        </Card>
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
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                            <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                                Dashboard de Presença
                            </h1>
                            <p className="text-gray-600">
                                {assembly.name}
                            </p>
                        </div>
                    </div>

                    {/* Attendance Dashboard */}
                    <Card className="shadow-lg border-0 border-l-4 border-l-green-500">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <BarChart3 className="w-5 h-5 text-green-600" />
                                <span>Meu Dashboard de Presença</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <UserAttendanceDashboard 
                                assemblyId={params.id}
                                userId={session.user.id}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
} 