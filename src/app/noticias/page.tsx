import Link from "next/link";
import { getServerAuthSession } from "~/server/auth";
import NoticiasTable from "~/app/_components/NoticiasTable";

export default async function Noticias() {
    const session = await getServerAuthSession();

    return (
        <main className="flex flex-col min-h-screen bg-gradient-to-b from-blue-800 to-blue-600 text-white">
            {session && (
                <nav className="w-full bg-blue-900 text-white py-4">
                    <div className="container mx-auto flex justify-between items-center px-4">
                        <h1 className="text-xl font-bold">IFMSA Brazil Admin Portal</h1>
                        <ul className="flex space-x-4">
                            <li>
                                <Link href="/noticias" legacyBehavior>
                                    <a className="hover:underline">Notícias</a>
                                </Link>
                            </li>
                            <li>
                                <Link href="/eb" legacyBehavior>
                                    <a className="hover:underline">EB</a>
                                </Link>
                            </li>
                            <li>
                                <Link href="/config" legacyBehavior>
                                    <a className="hover:underline">Configurações</a>
                                </Link>
                            </li>
                            <li>
                                <Link href="/api/auth/signout" legacyBehavior>
                                    <a className="hover:underline">Sair da conta</a>
                                </Link>
                            </li>
                        </ul>
                    </div>
                </nav>
            )}
            <div className="flex-grow flex items-center justify-center">
                <div className="container mx-auto px-6 py-12">
                    <NoticiasTable />
                </div>
            </div>
        </main>
    );
}
