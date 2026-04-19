"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export const useAuthGuard = (redirectIfAuth = false) => {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();

      const user = data?.user;

      if (redirectIfAuth && user) {
        router.replace("/game"); // kalau sudah login, jangan ke login/register
      }

      if (!redirectIfAuth && !user) {
        router.replace("/"); // kalau belum login, paksa ke login
      }
    };

    checkUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const user = session?.user;

        if (redirectIfAuth && user) {
          router.replace("/game");
        }

        if (!redirectIfAuth && !user) {
          router.replace("/");
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router, redirectIfAuth]);
};