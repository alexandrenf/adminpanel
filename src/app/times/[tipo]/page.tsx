import { getIfmsaEmailSession } from "~/server/lib/authcheck";
import { redirect } from "next/navigation";
import TimesTableWrapper from "~/app/_components/TimesTableWrapper";
import PrecisaLogin from "~/app/_components/PrecisaLogin";
import { allowedTimes } from "~/app/_components/allowedTimes";

import { GetServerSidePropsContext } from "next";

export default async function Noticias({ params }: { params: GetServerSidePropsContext["params"] }) {
    const { session, hasIfmsaEmail } = await getIfmsaEmailSession();
    const { tipo } = params as { tipo: string };

    // Find the type object in the allowed types list
    const typeObject = allowedTimes.find(type => type.href === tipo);

    // Check if type is valid
    if (!typeObject) {
        redirect("/404");
    }

    if (!hasIfmsaEmail) {
        return (
            <main className="flex flex-col min-h-screen bg-gradient-to-b from-blue-800 to-blue-600 text-white">
                <div className="flex-grow flex items-center justify-center">
                    <PrecisaLogin />
                </div>
            </main>
        );
    }

    return (
        <main className="flex flex-col min-h-screen bg-gradient-to-b from-slate-300 to-slate-50 text-black">
            <div className="flex-grow flex items-center justify-center">
                <div className="container mx-auto px-6 py-12">
                    <TimesTableWrapper type={typeObject.href} label={typeObject.label} />
                </div>
            </div>
        </main>
    );
}
