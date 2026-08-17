"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Check, XCircle, Info, AlertTriangle, ShieldAlert, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { fetchNotifications, markNotificationsRead, NOTIFY_EVENT, type AppNotification } from "@/lib/notifications-api";

const ICON: Record<string, { icon: typeof Check; cls: string }> = {
  success: { icon: Check, cls: "bg-success-bg text-green" },
  error: { icon: XCircle, cls: "bg-[#FDE7E8] text-red" },
  info: { icon: Info, cls: "bg-blue-100 text-blue-600" },
  // Niveaux du fil admin (fraude / support / système)
  warning: { icon: AlertTriangle, cls: "bg-fee-bg text-gold-600" },
  critical: { icon: ShieldAlert, cls: "bg-[#FDE7E8] text-red" },
};

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

/**
 * Cœur réutilisable du centre de notifications (cloche + drawer coulissant à droite).
 * Découplé de `useAuth` : on lui passe `token`/`ready` selon la session (payeur, staff, admin).
 */
export function NotificationCenter({
  token,
  ready,
  className = "",
  basePath = "/api/v1",
}: {
  token: string | null;
  ready: boolean;
  className?: string;
  basePath?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const readTimer = useRef<number | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- montage client (portal)
  useEffect(() => setMounted(true), []);

  // Nettoie le minuteur « marquer lu » au démontage.
  useEffect(() => () => { if (readTimer.current) window.clearTimeout(readTimer.current); }, []);

  const refresh = useCallback(async () => {
    try {
      const d = await fetchNotifications(token ?? undefined, basePath);
      setItems(d.notifications);
      setUnread(d.unread);
    } catch {
      /* silencieux */
    }
  }, [token, basePath]);

  // Temps réel : ping après action + focus + retour d'onglet + polling léger (8 s).
  useEffect(() => {
    if (!ready || !token) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh() est async
    refresh();
    const id = setInterval(refresh, 8_000);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    window.addEventListener(NOTIFY_EVENT, refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener(NOTIFY_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ready, token, refresh]);

  // Verrouille le défilement du fond quand le drawer est ouvert (UX drawer + bord collé).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const openPanel = () => {
    setOpen(true);
    if (unread === 0) return;
    setUnread(0); // le badge disparaît dès l'ouverture
    // Laisse le temps de LIRE : on ne marque « lu » que 10 s après l'ouverture (le gras
    // et le point restent jusque-là). On annule un éventuel minuteur précédent.
    if (readTimer.current) window.clearTimeout(readTimer.current);
    readTimer.current = window.setTimeout(() => {
      markNotificationsRead(token ?? undefined, basePath).catch(() => {});
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    }, 10_000);
  };

  if (!token) return null;

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        aria-label="Notifications"
        className={`relative flex size-9 items-center justify-center rounded-lg bg-gray-100 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${className}`}
      >
        <Bell className="size-[18px]" strokeWidth={2} />
        {unread > 0 ? (
          <span
            aria-label={`${unread} non lues`}
            className="absolute -right-1 -top-1 flex h-[16px] min-w-[16px] max-w-[30px] items-center justify-center rounded-full bg-red px-[3px] text-[9px] font-extrabold leading-none text-white tabular-nums ring-2 ring-white"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {mounted
        ? createPortal(
            <div className={`fixed inset-0 z-[60] overflow-hidden ${open ? "" : "pointer-events-none"}`}>
              {/* Voile */}
              <div
                onClick={() => setOpen(false)}
                className={`absolute inset-0 bg-navy/30 backdrop-blur-[1px] transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
                aria-hidden="true"
              />

      {/* Panneau coulissant à droite */}
      <aside
        style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
        className="absolute right-0 top-0 flex h-full w-full max-w-[380px] flex-col border-l border-gray-100 bg-white shadow-hero transition-transform duration-300"
        role="dialog"
        aria-label="Notifications"
      >
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-display text-[15px] font-bold text-ink">Notifications</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="flex size-8 items-center justify-center rounded-lg bg-gray-100 text-ink hover:bg-gray-300/40">
            <X className="size-4" strokeWidth={2.4} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-gray-100 text-gray-500"><Bell className="size-5" strokeWidth={2} /></span>
              <p className="text-[13px] text-gray-500">Aucune notification pour l&apos;instant.</p>
            </div>
          ) : (
            items.map((n) => {
              const m = ICON[n.level] ?? ICON.info;
              const Icon = m.icon;
              return (
                <div key={n.id} className={`-mx-5 flex items-start gap-3 border-b border-gray-100 px-5 py-3.5 transition-colors last:border-b-0 ${n.read ? "" : "bg-blue-100/40"}`}>
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${m.cls}`}><Icon className="size-[17px]" strokeWidth={2.4} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate text-[13px] text-ink ${n.read ? "font-medium" : "font-bold"}`}>{n.title}</p>
                      <span className="flex shrink-0 items-center gap-1.5 text-[10.5px] text-gray-500">
                        {n.read ? null : <span className="size-1.5 rounded-full bg-blue-600" aria-label="Non lue" />}
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    {n.body ? <p className={`mt-0.5 text-[11.5px] leading-relaxed ${n.read ? "text-gray-500" : "text-gray-700"}`}>{n.body}</p> : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/** Cloche de notifications de l'espace PAYEUR (utilise le contexte d'auth payeur). */
export function NotificationBell({ className = "" }: { className?: string }) {
  const { ready, token } = useAuth();
  return <NotificationCenter token={token} ready={ready} className={className} />;
}
