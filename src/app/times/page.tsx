import Link from "next/link";
import { getIfmsaEmailSession } from "~/server/lib/authcheck";
import PrecisaLogin from "~/app/_components/PrecisaLogin";
import { Card, CardContent } from "../../components/ui/card";
import { Users } from "lucide-react";

export default async function Times() {
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

    const teams = [
        { href: "/times/tre", label: "Time de Relações Externas", color: "from-amber-500 to-amber-600", textColor: "text-white" },
        { href: "/times/drp", label: "Divisão de Relações Públicas", color: "from-pink-400 to-pink-500", textColor: "text-white" },
        { href: "/times/cbt", label: "Capacity Building Team", color: "from-stone-800 to-stone-900", textColor: "text-white" },
        { href: "/times/st", label: "Scientific Team", color: "from-gray-400 to-gray-500", textColor: "text-white" },
        { href: "/times/net", label: "National Exchange Team", color: "from-sky-500 to-sky-600", textColor: "text-white" },
        { href: "/times/nssb", label: "National SCORE Supervising Board", color: "from-blue-500 to-blue-600", textColor: "text-white" },
        { href: "/times/tin", label: "Time de Intercâmbio Nacional", color: "from-yellow-400 via-green-500 to-blue-600", textColor: "text-white" },
        { href: "/times/ot", label: "Orange Team", color: "from-orange-500 to-orange-600", textColor: "text-white" },
        { href: "/times/rlt", label: "Redlight Team", color: "from-red-500 to-red-600", textColor: "text-white" },
        { href: "/times/glt", label: "Green Lamp Team", color: "from-green-500 to-green-600", textColor: "text-white" },
        { href: "/times/wt", label: "White Team", color: "from-gray-100 to-gray-200", textColor: "text-gray-900" },
        { href: "/times/yt", label: "Yellow Team", color: "from-yellow-400 to-yellow-500", textColor: "text-gray-900" },
        { href: "/times/cnp", label: "Coordenadores Nacionais de Programas", color: "from-purple-500 to-purple-600", textColor: "text-white" },
    ];

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="container mx-auto px-6 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-lg">
                        <Users className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-4">
                        Selecione um Time
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Escolha o time que você deseja gerenciar
                    </p>
                </div>

                {/* Teams Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {teams.map((team, index) => (
                        <Link href={team.href} key={index} className="group">
                            <Card className="h-full overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform group-hover:scale-105">
                                <CardContent className="p-0">
                                    <div className={`bg-gradient-to-br ${team.color} p-6 h-full flex flex-col items-center justify-center text-center min-h-[140px]`}>
                                        <Users className={`w-8 h-8 mb-3 ${team.textColor} opacity-90`} />
                                        <h3 className={`font-bold text-lg leading-tight ${team.textColor}`}>
                                            {team.label}
                                        </h3>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>

                {/* Footer info */}
                <div className="mt-12 text-center">
                    <p className="text-gray-600">
                        Clique em um time para gerenciar seus membros e informações
                    </p>
                </div>
            </div>
        </main>
    );
}
