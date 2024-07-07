import Link from "next/link";
import { getServerAuthSession } from "~/server/auth";
import CreateOrEditEb from "~/app/_components/CreateOrEditEb";
import PrecisaLogin from "~/app/_components/PrecisaLogin";


export default async function Noticias() {
    const session = await getServerAuthSession();

    if (!session) {
        return (
            <main className="flex flex-col min-h-screen bg-gradient-to-b from-blue-800 to-blue-600 text-white">
                <div className="flex-grow flex items-center justify-center">
                    <PrecisaLogin />
                </div>
            </main>
        );
    } else {
        return <CreateOrEditEb />;

    }
}