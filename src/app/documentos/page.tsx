import Link from "next/link";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { FileText, Upload, Download, Trash2, Edit, Plus, Clock, Users, Plane, FileCheck } from "lucide-react";
import PrecisaLogin from "~/app/_components/PrecisaLogin";
import { getIfmsaEmailSession } from "~/server/lib/authcheck";

const documentTypes = [
    { 
        href: "/documentos/notas-de-posicionamento", 
        label: "Notas de Posicionamento",
        icon: FileText,
        description: "Documentos oficiais de posicionamento",
        color: "from-blue-500 to-blue-600"
    },
    { 
        href: "/documentos/informa-susi", 
        label: "Informa SUSi",
        icon: FileText,
        description: "Informativo do Sistema Único de Saúde",
        color: "from-green-500 to-green-600"
    },
    { 
        href: "/documentos/ressonancia-poetica", 
        label: "Ressonância Poética",
        icon: FileText,
        description: "Publicações de ressonância poética",
        color: "from-purple-500 to-purple-600"
    },
    { 
        href: "/documentos/brazilian-medical-students", 
        label: "Brazilian Medical Students",
        icon: FileText,
        description: "Documentos para estudantes brasileiros",
        color: "from-indigo-500 to-indigo-600"
    },
    { 
        href: "/documentos/relatorios", 
        label: "Relatórios",
        icon: FileText,
        description: "Relatórios e análises institucionais",
        color: "from-orange-500 to-orange-600"
    },
    { 
        href: "/documentos/declaracoes-de-politica", 
        label: "Declarações de Política",
        icon: FileText,
        description: "Declarações oficiais de política",
        color: "from-red-500 to-red-600"
    },
    { 
        href: "/documentos/intercambio-nac", 
        label: "Intercâmbio Nacional",
        icon: FileText,
        description: "Documentos de intercâmbio nacional",
        color: "from-teal-500 to-teal-600"
    },
    { 
        href: "/documentos/intercambio-internacional", 
        label: "Intercâmbio Internacional",
        icon: FileText,
        description: "Documentos de intercâmbio internacional",
        color: "from-cyan-500 to-cyan-600"
    },
    { 
        href: "/documentos/regulamento", 
        label: "Regulamento de Intercâmbios",
        icon: FileText,
        description: "Regulamentos e normas de intercâmbio",
        color: "from-amber-500 to-amber-600"
    },
];

export default async function DocumentosPage() {
    const { session, hasIfmsaEmail } = await getIfmsaEmailSession();

    if (!hasIfmsaEmail) {
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

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="container mx-auto px-6 py-12">
                {/* Header */}
                <div className="flex items-center justify-center space-x-4 mb-12">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                        <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                            Documentos
                        </h1>
                        <p className="text-gray-600">Selecione a área que deseja editar</p>
                    </div>
                </div>

                {/* Document Types Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {documentTypes.map((item, index) => {
                        const IconComponent = item.icon;
                        return (
                            <Link href={item.href} key={index}>
                                <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 shadow-lg cursor-pointer">
                                    <CardContent className="p-6">
                                        <div className="flex flex-col items-center text-center space-y-4">
                                            <div className={`p-4 bg-gradient-to-br ${item.color} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                                <IconComponent className="w-8 h-8 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                                                    {item.label}
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    {item.description}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}
