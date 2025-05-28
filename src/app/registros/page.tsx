import { getServerAuthSession } from "~/server/auth";
import PrecisaLogin from "~/app/_components/PrecisaLogin";
import UrlManager from "~/app/_components/UrlManager";

export default async function RegistrosPage() {
    const session = await getServerAuthSession();

    if (!session) {
        return <PrecisaLogin />;
    }

    return (
        <main className="container mx-auto px-4 py-8">
            <UrlManager />
        </main>
    );
} 