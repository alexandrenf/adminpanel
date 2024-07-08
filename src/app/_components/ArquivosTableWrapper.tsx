"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ArquivosTable from "~/app/_components/ArquivosTable";

type ArquivosTableWrapperProps = {
    type: string;
    label: string;
};

export default function ArquivosTableWrapper({ type, label }: ArquivosTableWrapperProps) {
    const router = useRouter();

    useEffect(() => {
        if (!type) {
            router.push("/404");
        }
    }, [type, router]);

    return <ArquivosTable type={type} label={label} />;
}
