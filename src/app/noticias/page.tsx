import Link from "next/link";
import { getServerAuthSession } from "~/server/auth";
import NoticiasTable from "~/app/_components/NoticiasTable";
import PrecisaLogin from "~/app/_components/PrecisaLogin";


export default async function Noticias() {
    const session = await getServerAuthSession();

    return (
        <main className="flex flex-col min-h-screen bg-gradient-to-b from-blue-800 to-blue-600 text-white">
            <div className="flex-grow flex items-center justify-center">
                {session ? (
                    <div className="container mx-auto px-6 py-12">
                        <NoticiasTable />
                    </div>
                ) : <PrecisaLogin />}
            </div>
        </main>
    );
}
