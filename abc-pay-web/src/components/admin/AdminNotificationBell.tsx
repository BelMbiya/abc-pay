"use client";

import { useEffect, useState } from "react";
import { NotificationCenter } from "@/components/payer/NotificationBell";
import { getAdminToken } from "@/lib/admin-auth";

/**
 * Cloche du fil OPÉRATIONNEL super-admin (fraude / support / système).
 * Réutilise le cœur `NotificationCenter` avec le token ADMIN et l'endpoint dédié
 * `/api/v1/admin/notifications` — surtout pas le `/notifications` payeur (401 → déconnexion).
 */
export function AdminNotificationBell({ className = "" }: { className?: string }) {
  const [token, setToken] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- init client (localStorage)
  useEffect(() => setToken(getAdminToken()), []);

  return <NotificationCenter token={token} ready={!!token} className={className} basePath="/api/v1/admin" />;
}
