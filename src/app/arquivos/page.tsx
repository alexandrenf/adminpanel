import Link from "next/link";
import { getServerAuthSession } from "~/server/auth";
import PrecisaLogin from "~/app/_components/PrecisaLogin";

export default async function Noticias() {
    const session = await getServerAuthSession();

    if (!session) {
        return (
            <main className="flex flex-col min-h-screen bg-gradient-to-b from-blue-500 to-blue-300 text-white">
                <div className="flex-grow flex items-center justify-center">
                    <PrecisaLogin />
                </div>
            </main>
        );
    } else {
        return (
            <main className="flex flex-col min-h-screen bg-gradient-to-b from-slate-300 to-slate-50 text-black">
                <div className="flex-grow flex items-center justify-center">
                    <div className="container mx-auto px-6 py-12 text-center">
                        <h1 className="text-3xl font-bold mb-8 text-gray-800">Selecione que área deseja editar</h1>
                        <div className="flex justify-center items-center flex-wrap gap-4">
                            {[
                                { href: "/arquivos/notas-de-posicionamento", label: "Notas de Posicionamento" },
                                { href: "/arquivos/informa-susi", label: "Informa SUSi" },
                                { href: "/arquivos/ressonancia-poetica", label: "Ressonância Poética" },
                                { href: "/arquivos/brazilian-medical-students", label: "Brazilian Medical Students" },
                                { href: "/arquivos/relatorios", label: "Relatórios" },
                                { href: "/arquivos/declaracoes-de-politica", label: "Declarações de Política" },
                                { href: "/arquivos/intercambio-nac", label: "Intercâmbio Nacional" },
                                { href: "/arquivos/intercambio-internacional", label: "Intercâmbio Internacional" },
                            ].map((item, index) => (
                                <Link href={item.href} key={index} legacyBehavior>
                                    <a className="bg-blue-500 text-white rounded-full py-4 px-8 flex items-center justify-center shadow-md hover:bg-blue-600 transition-all transform hover:-translate-y-1">
                                        {item.label}
                                    </a>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        );
    }
}
