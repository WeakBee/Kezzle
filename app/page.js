"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/lib/useAuthGuard";

export default function AuthPage() {
  useAuthGuard(true); 
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const router = useRouter();

  const handleAuth = async () => {
    setLoading(true);
    setErrorMsg(null);
    setMessage(null);

    if (mode === "register") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          }
        }
      });

      if (error) {
        setErrorMsg(error.message);
        console.log(error);
      } else {
        // 🔥 cek apakah perlu verifikasi email
        if (data.user && !data.session) {
          setMessage(
            "Akun berhasil dibuat! 📩 Silakan cek email kamu untuk verifikasi sebelum login."
          );
        } else {
          setMessage("Register berhasil! Kamu langsung login.");
          router.push("/game");
        }
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        router.push("/game");
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-gray-200">
      
        <img
          src={"/logo_kezzle.png"}
          className="w-68 relative z-10"
        />
      <div className="bg-white p-6 rounded-xl w-[360px] shadow-xl">
        <h1 className="text-xl font-bold mb-4 text-center text-black">
          {mode === "login" ? "Login" : "Register"}
        </h1>

        {/* SUCCESS MESSAGE */}
        {message && (
          <div className="bg-green-100 text-green-700 text-sm p-2 rounded mb-3">
            {message}
          </div>
        )}

        {/* ERROR MESSAGE */}
        {errorMsg && (
          <div className="bg-red-100 text-red-700 text-sm p-2 rounded mb-3">
            {errorMsg}
          </div>
        )}

        {mode === "register" && (
          <input
            type="text"
            placeholder="Your Name"
            className="w-full border px-3 py-2 rounded mb-3 text-black"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}

        <input
          type="email"
          placeholder="Email"
          className="w-full border px-3 py-2 rounded mb-3 text-black"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password (min 6 karakter)"
          className="w-full border px-3 py-2 rounded mb-4 text-black"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleAuth}
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 rounded disabled:bg-gray-300"
        >
          {loading
            ? "Loading..."
            : mode === "login"
            ? "Login"
            : "Register"}
        </button>

        {/* SWITCH MODE */}
        <p
          className="text-sm text-center mt-4 cursor-pointer text-blue-500"
          onClick={() =>
            setMode(mode === "login" ? "register" : "login")
          }
        >
          {mode === "login"
            ? "Belum punya akun? Register"
            : "Sudah punya akun? Login"}
        </p>
      </div>
    </div>
  );
}