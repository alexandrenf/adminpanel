"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function ResubmitRedirectPage() {
    const router = useRouter();
    const params = useParams() as { id: string; registrationId: string };
    
    const assemblyId = params.id;
    const registrationId = params.registrationId;

    useEffect(() => {
        // Redirect to step 1 with resubmit parameter
        router.replace(`/ag/${assemblyId}/register?resubmit=${registrationId}`);
    }, [router, assemblyId, registrationId]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Redirecionando para reenvio...</p>
            </div>
        </div>
    );
} 