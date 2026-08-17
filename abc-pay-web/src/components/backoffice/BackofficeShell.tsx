"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LifeBuoy, LogOut } from "lucide-react";
import { BackofficeSidebar, NAV } from "./BackofficeSidebar";
import { StaffNotificationBell } from "./StaffNotificationBell";
import { ToastProvider, ConfirmProvider } from "@/components/ui";
import { SupportSheet } from "@/components/payer/SupportSheet";
import { establishment } from "@/lib/backoffice-data";
import { clearStaffToken } from "@/lib/staff-auth";
import { fetchStaffTickets, openStaffTicket } from "@/lib/support-api";
import { cn } from "@/lib/cn";

/**
 * Coquille du back-office établissement — même disposition que l'espace payeur :
 *  - Desktop (≥ md) : rail d'icônes fixe à gauche + contenu large.
 *  - Mobile (< md)  : barre supérieure + menu coulissant (avec libellés).
 */
export function BackofficeShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/etablissement" ? pathname === href : pathname.startsWith(href);

  const logout = () => {
    clearStaffToken();
    router.push("/etablissement-connexion");
  };

  const staffSupportApi = { fetch: fetchStaffTickets, open: openStaffTicket };

  return (
    <ToastProvider>
      <ConfirmProvider>
      <div className="min-h-dvh bg-white md:flex">
        <BackofficeSidebar className="hidden md:flex" />

        <div className="relative flex min-h-dvh flex-1 flex-col">
          {/* Barre supérieure mobile */}
          <header className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 md:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo statique */}
            <img src="/logo.png" alt="abc pay" width={28} height={28} className="size-7 rounded-lg object-contain" />
            <span className="font-display text-[14px] font-bold text-ink">Back-office</span>
            <div className="ml-auto flex items-center gap-2">
              <StaffNotificationBell />
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Ouvrir le menu"
                className="flex size-[38px] items-center justify-center rounded-xl bg-gray-100 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Menu className="size-5" strokeWidth={2.2} />
              </button>
            </div>
          </header>

          {/* Contrôles desktop (flottants) : support, notifications, déconnexion */}
          <div className="pointer-events-none absolute right-5 top-5 z-20 hidden items-center gap-2 md:flex">
            <button
              type="button"
              onClick={() => setSupportOpen(true)}
              aria-label="Support"
              className="pointer-events-auto flex size-9 items-center justify-center rounded-lg bg-gray-100 text-ink hover:bg-gray-300/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <LifeBuoy className="size-[18px]" strokeWidth={2} />
            </button>
            <div className="pointer-events-auto"><StaffNotificationBell /></div>
            <button
              type="button"
              onClick={logout}
              aria-label="Déconnexion"
              className="pointer-events-auto flex size-9 items-center justify-center rounded-lg bg-gray-100 text-red hover:bg-gray-300/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <LogOut className="size-[18px]" strokeWidth={2} />
            </button>
          </div>

          <main className="flex-1">{children}</main>
        </div>

        {/* Menu coulissant mobile */}
        <div className="md:hidden">
          <div
            onClick={() => setOpen(false)}
            aria-hidden={!open}
            className={cn(
              "fixed inset-0 z-[70] bg-navy/50 transition-opacity duration-250",
              open ? "visible opacity-100" : "invisible opacity-0",
            )}
          />
          <nav
            aria-label="Menu back-office"
            className={cn(
              "fixed inset-y-0 right-0 z-[80] w-[78vw] max-w-[300px] overflow-y-auto bg-white p-[18px] shadow-panel transition-transform duration-300",
              open ? "translate-x-0" : "translate-x-full",
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="min-w-0">
                <p className="truncate font-display text-[13.5px] font-bold text-ink">{establishment.short}</p>
                <p className="truncate text-[11px] text-gray-500">{establishment.year}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="flex size-[34px] items-center justify-center rounded-[10px] bg-gray-100 text-ink"
              >
                <X className="size-[18px]" strokeWidth={2.2} />
              </button>
            </div>
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition-colors hover:bg-gray-100",
                    active ? "bg-blue-100 text-blue-700" : "text-ink",
                  )}
                >
                  <Icon className={cn("size-4", active ? "text-blue-700" : "text-gray-500")} strokeWidth={2} />
                  {item.label}
                </Link>
              );
            })}

            <div className="my-2 border-t border-gray-100" />
            <button
              type="button"
              onClick={() => { setOpen(false); setSupportOpen(true); }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold text-ink transition-colors hover:bg-gray-100"
            >
              <LifeBuoy className="size-4 text-gray-500" strokeWidth={2} /> Support & aide
            </button>
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold text-red transition-colors hover:bg-gray-100"
            >
              <LogOut className="size-4" strokeWidth={2} /> Déconnexion
            </button>
          </nav>
        </div>
      </div>

      <SupportSheet open={supportOpen} onClose={() => setSupportOpen(false)} api={staffSupportApi} />
      </ConfirmProvider>
    </ToastProvider>
  );
}
