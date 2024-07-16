import Link from "next/link";
import { getServerAuthSession } from "~/server/auth";
import PrecisaLogin from "~/app/_components/PrecisaLogin";
import ConfigComponent from "~/app/_components/ConfigComponent";


export default async function Times() {
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
        return (
            <main className="flex flex-col min-h-screen bg-gradient-to-b from-slate-300 to-slate-50 text-black">
                <div className="flex-grow flex items-center justify-center">
                    <div className="container mx-auto px-6 py-12">
                        <ConfigComponent/>
                    </div>
                </div>
            </main>
        );

    }
}