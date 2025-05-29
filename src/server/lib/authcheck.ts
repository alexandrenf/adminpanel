"use server"

import { Session } from "next-auth";
import { env } from "~/env";
import { getServerAuthSession } from "~/server/auth";

const WEBMASTER_EMAIL = env.WEBMASTER_EMAIL;

export async function isIfmsaEmailSession(session: Session | null): Promise<boolean> {
    if (!session?.user?.email) return false;
    if (session.user.email === WEBMASTER_EMAIL) return true;
    return session.user.email.endsWith("@ifmsabrazil.org");
}

export async function getIfmsaEmailSession(): Promise<{ session: Session | null; hasIfmsaEmail: boolean }> {
    const session = await getServerAuthSession();
    const hasIfmsaEmail = session ? await isIfmsaEmailSession(session) : false;
    return { session, hasIfmsaEmail };
}