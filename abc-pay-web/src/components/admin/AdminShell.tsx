"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AdminSidebar, NAV } from "./AdminSidebar";
import { ToastProvider } from "@/components/ui";
import { cn } from "@/lib/cn";

/** Coquille super-admin abc pay — même disposition (rail desktop / drawer mobile). */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-white md:flex">
        <AdminSidebar className="hidden md:flex" />

        <div className="flex min-h-dvh flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 md:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo statique */}
            <img src="/logo.png" alt="abc pay" width={28} height={28} className="size-7 rounded-lg object-contain" />
            <span className="font-display text-[14px] font-bold text-ink">abc pay · Admin</span>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Ouvrir le menu"
              className="ml-auto flex size-[38px] items-center justify-center rounded-xl bg-gray-100 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <Menu className="size-5" strokeWidth={2.2} />
            </button>
          </header>

          <main className="flex-1">{children}</main>
        </div>

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
            aria-label="Menu super-admin"
            className={cn(
              "fixed inset-y-0 right-0 z-[80] w-[78vw] max-w-[300px] overflow-y-auto bg-white p-[18px] shadow-panel transition-transform duration-300",
              open ? "translate-x-0" : "translate-x-full",
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-[13.5px] font-bold text-ink">Super-admin abc pay</span>
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
          </nav>
        </div>
      </div>
    </ToastProvider>
  );
}
