import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { isIfmsaEmailSession } from "~/server/lib/authcheck";
import { authOptions } from "~/server/auth";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.email) {
            return NextResponse.json({ isIfmsaEmail: false }, { status: 401 });
        }

        const isIfmsaEmail = await isIfmsaEmailSession(session);
        return NextResponse.json({ isIfmsaEmail });
    } catch (error) {
        console.error("Error checking IFMSA email:", error);
        return NextResponse.json(
            { error: "Failed to check IFMSA email" },
            { status: 500 }
        );
    }
} 