import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { isIfmsaEmailSession } from "~/server/lib/authcheck";
import { authOptions } from "~/server/auth";

/**
 * Handles a GET request to determine if the authenticated user's email is an IFMSA email.
 *
 * Returns a JSON response with `isIfmsaEmail: true` or `false` based on the user's session email.
 * Responds with HTTP 401 if the user is not authenticated or lacks an email, and HTTP 500 if an internal error occurs.
 *
 * @returns A JSON response indicating whether the user's email is an IFMSA email.
 */
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