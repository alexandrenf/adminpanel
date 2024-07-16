"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import TimesTable from "~/app/_components/TimesTable";

type TimesTableWrapperProps = {
    type: string;
    label: string;
};

export default function TimesTableWrapper({ type, label }: TimesTableWrapperProps) {
    const router = useRouter();

    useEffect(() => {
        if (!type) {
            router.push("/404");
        }
    }, [type, router]);

    return <TimesTable type={type} label={label} />;
}
