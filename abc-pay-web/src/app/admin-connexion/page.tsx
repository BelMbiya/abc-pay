"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui";
import { adminLogin, setAdminSession, getAdminToken } from "@/lib/admin-auth";
import { ApiError } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getAdminToken()) router.replace("/admin");
  }, [router]);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const { token, refresh, user } = await adminLogin(email.trim(), password);
      setAdminSession(token, user, refresh);
      router.replace("/admin");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center px-6 py-10">
      <div className="mb-8 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-[10px] bg-grad-navy text-gold-400">
          <ShieldCheck className="size-5" strokeWidth={2.2} />
        </span>
        <span className="font-display text-[15.5px] font-bold text-ink">abc pay · Admin</span>
      </div>

      <h1 className="font-display text-[24px] font-extrabold tracking-tight text-ink">Console super-admin</h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-gray-500">Réservé à l&apos;équipe abc pay. Connecte-toi avec ton compte administrateur.</p>

      <label htmlFor="email" className="mb-[7px] mt-8 text-[12.5px] font-bold text-gray-700">Email</label>
      <div className="flex items-center gap-2 rounded-[13px] border-[1.5px] border-gray-100 bg-gray-100 px-3.5 focus-within:border-blue-500 focus-within:bg-white">
        <Mail className="size-[18px] shrink-0 text-gray-500" strokeWidth={2} />
        <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@abcpay.cd" className="w-full bg-transparent py-3.5 text-[14.5px] text-ink placeholder:text-gray-500 focus:outline-none" />
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
        <b className="text-gray-700">Démo</b> : admin@abcpay.cd · mot de passe <b className="text-gray-700">password</b>.
      </p>
    </main>
  );
}
