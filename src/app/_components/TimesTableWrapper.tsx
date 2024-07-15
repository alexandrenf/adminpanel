"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import TimesTable from "~/app/_components/TimesTable";

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

    return <TimesTable type={type} label={label} />;
}
