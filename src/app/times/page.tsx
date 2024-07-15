import Link from "next/link";
import { getServerAuthSession } from "~/server/auth";
import PrecisaLogin from "~/app/_components/PrecisaLogin";
import css from "styled-jsx/css";

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
                        <h1 className="text-3xl font-bold mb-8 text-gray-800">Selecione que time você deseja selecionar</h1>
                        <div className="flex justify-center items-center flex-wrap gap-4">
                            {[
                                { href: "/times/tre", label: "Time de Relações Externas", css: "bg-amber-600 text-black" },
                                { href: "/times/drp", label: "Divisão de Relações Públicas", css: "bg-pink-400 text-white" },
                                { href: "/times/cbt", label: "Capacity Building Team", css: "bg-stone-950 text-white" },
                                { href: "/times/st", label: "Scientific Team", css: "bg-gray-400 text-black" },
                                { href: "/times/net", label: "National Exchange Team", css: "bg-sky-600 text-white" },
                                { href: "/times/nssb", label: "National SCORE Supervising Board", css: "bg-blue-600 text-white" },
                                { href: "/times/tin", label: "Time de Intercâmbio Nacional", css: "bg-gradient-to-r from-yellow-300 via-green-500 to-blue-600 text-black" },
                                { href: "/times/ot", label: "Orange Team", css: "bg-orange-500 text-white" },
                                { href: "/times/rlt", label: "Redlight Team", css: "bg-red-600 text-white" },
                                { href: "/times/glt", label: "Green Lamp Team", css: "bg-green-600 text-white" },
                                { href: "/times/wt", label: "White Team", css: "bg-gray-50 text-black" },
                                { href: "/times/yt", label: "Yellow Team", css: "bg-yellow-400 text-black" },
                                { href: "/times/cnp", label: "Coordenadores Nacionais de Programas", css: "bg-purple-500 text-white" },
                            ].map((item, index) => (
                                <Link href={item.href} key={index} legacyBehavior>
                                    <a className={`${item.css} font-bold rounded-full py-4 px-8 flex items-center justify-center shadow-md hover:bg-blue-600 transition-all transform hover:-translate-y-1`}>
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
