"use client";

import { useEffect, useState } from "react";
import { NotificationCenter } from "@/components/payer/NotificationBell";
import { getStaffToken } from "@/lib/staff-auth";

/**
 * Cloche de notifications de l'espace ÉTABLISSEMENT (back-office).
 * Réutilise le cœur `NotificationCenter` avec le token STAFF : le staff voit en
 * temps réel chaque paiement encaissé par son établissement.
 */
export function StaffNotificationBell({ className = "" }: { className?: string }) {
  const [token, setToken] = useState<string | null>(null);

  // Token lu côté client uniquement (localStorage) → évite tout mismatch SSR.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- init client
  useEffect(() => setToken(getStaffToken()), []);

  return <NotificationCenter token={token} ready={!!token} className={className} />;
}
