"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Game from "@/components/game"; // pindahin kode game kamu ke sini

export default function GamePage() {
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const checkUser = async () => {
        const { data } = await supabase.auth.getUser();

        if (!data.user) {
            router.push("/");
        } else {
            setLoading(false);
        }
        };

        checkUser();
    }, []);

    if (loading) {
        return (
        <div className="h-screen flex items-center justify-center">
            Loading...
        </div>
        );
    }

    return <Game />;
}