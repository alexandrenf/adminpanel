import Link from "next/link";
import { getIfmsaEmailSession } from "~/server/lib/authcheck";
import CreateOrEditArquivado from "~/app/_components/CreateOrEditArquivado";
import PrecisaLogin from "~/app/_components/PrecisaLogin";


export default async function Noticias() {
    const { session, hasIfmsaEmail } = await getIfmsaEmailSession();

    if (!hasIfmsaEmail) {
        return (
            <main className="flex flex-col min-h-screen bg-gradient-to-b from-blue-800 to-blue-600 text-white">
                <div className="flex-grow flex items-center justify-center">
                    <PrecisaLogin />
                </div>
            </main>
        );
    } else {
        return (

            <main className="flex flex-col min-h-screen bg-gradient-to-b from-slate-300 to-slate-50 text-white">
                <div className="flex-grow flex items-center justify-center">
                    <div className="container mx-auto px-6 py-12">
                        <CreateOrEditArquivado />
                    </div>
                </div>
            </main>
        );

    }
}