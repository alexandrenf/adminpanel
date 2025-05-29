import Link from "next/link";
import { getIfmsaEmailSession } from "~/server/lib/authcheck";
import CreateOrEditCR from "~/app/_components/CreateOrEditCR";
import PrecisaLogin from "~/app/_components/PrecisaLogin";


export default async function CreateCRPage() {
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
        return <CreateOrEditCR />;
    }
}