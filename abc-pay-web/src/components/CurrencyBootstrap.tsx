"use client";

import { useEffect } from "react";
import { fetchSettings } from "@/lib/settings-api";
import { setCurrencyCode, setRate } from "@/lib/money";

/** Charge la devise + le taux de change au démarrage (money()/convert() les utilisent). */
export function CurrencyBootstrap() {
  useEffect(() => {
    fetchSettings().then((s) => {
      setCurrencyCode(s.currency);
      setRate(s.usd_cdf_rate);
    }).catch(() => {});
  }, []);
  return null;
}
