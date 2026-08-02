"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui";
import { staffLogin, setStaffSession, getStaffToken } from "@/lib/staff-auth";
import { ApiError } from "@/lib/api";

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getStaffToken()) router.replace("/etablissement");
  }, [router]);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const { token, refresh, user } = await staffLogin(email.trim(), password);
      setStaffSession(token, user, refresh);
      router.replace("/etablissement");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center px-6 py-10">
      <div className="mb-8 flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo statique */}
        <img src="/logo.png" alt="abc pay" width={34} height={34} className="size-[34px] rounded-[10px] object-contain" />
        <span className="font-display text-[15.5px] font-bold text-ink">abc pay · Établissement</span>
      </div>

      <h1 className="font-display text-[24px] font-extrabold tracking-tight text-ink">Espace établissement</h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-gray-500">Connecte-toi avec l&apos;email et le mot de passe de ton établissement.</p>

      <label htmlFor="email" className="mb-[7px] mt-8 text-[12.5px] font-bold text-gray-700">Email professionnel</label>
      <div className="flex items-center gap-2 rounded-[13px] border-[1.5px] border-gray-100 bg-gray-100 px-3.5 focus-within:border-blue-500 focus-within:bg-white">
        <Mail className="size-[18px] shrink-0 text-gray-500" strokeWidth={2} />
        <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="direction@ets045.cd" className="w-full bg-transparent py-3.5 text-[14.5px] text-ink placeholder:text-gray-500 focus:outline-none" />
      </div>

      <label htmlFor="password" className="mb-[7px] mt-3.5 text-[12.5px] font-bold text-gray-700">Mot de passe</label>
      <div className="flex items-center gap-2 rounded-[13px] border-[1.5px] border-gray-100 bg-gray-100 px-3.5 focus-within:border-blue-500 focus-within:bg-white">
        <Lock className="size-[18px] shrink-0 text-gray-500" strokeWidth={2} />
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent py-3.5 text-[14.5px] text-ink placeholder:text-gray-500 focus:outline-none" onKeyDown={(e) => e.key === "Enter" && submit()} />
      </div>

      {error ? <p className="mt-3 text-[12.5px] font-semibold text-red">{error}</p> : null}

      <Button className="mt-6" disabled={!email || !password || loading} onClick={submit}>
        {loading ? "Connexion…" : "Se connecter"}
      </Button>

      <p className="mt-4 rounded-xl bg-gray-100 p-3 text-[11.5px] leading-relaxed text-gray-500">
        <b className="text-gray-700">Démo</b> : direction@ets045.cd · mot de passe <b className="text-gray-700">password</b> (ISC).
      </p>
    </main>
  );
}
