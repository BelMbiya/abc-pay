"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { setAuthToken } from "@/lib/api";
import { isJwtExpired } from "@/lib/jwt";
import { setSessionTokens, clearSession, refreshScope } from "@/lib/refresh";

export interface AuthUser {
  id: string;
  phone: string;
  name?: string | null;
}

interface AuthState {
  ready: boolean; // localStorage relu
  token: string | null;
  user: AuthUser | null;
  login: (token: string, user: AuthUser, refresh?: string) => void;
  logout: () => void;
}

const STORAGE_TOKEN = "abcpay_token";
const STORAGE_USER = "abcpay_user";

const AuthContext = createContext<AuthState | null>(null);

/**
 * État d'authentification global. Le JWT d'accès est en mémoire (via api client) +
 * persisté ; le refresh token permet de renouveler l'accès expiré sans reconnexion.
 * NB prod : durcir avec cookie httpOnly (voir docs/SECURITY.md).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      let access: string | null = null;
      let stored: string | null = null;
      try {
        const t = localStorage.getItem(STORAGE_TOKEN);
        stored = localStorage.getItem(STORAGE_USER);
        // Accès encore valide → on l'utilise ; sinon on tente un renouvellement.
        access = t && !isJwtExpired(t) ? t : await refreshScope("payer");
      } catch {
        /* localStorage indisponible */
      }
      if (!active) return;
      if (access) {
        setToken(access);
        setAuthToken(access);
        if (stored) {
          try {
            setUser(JSON.parse(stored) as AuthUser);
          } catch {
            /* ignore */
          }
        }
      } else {
        clearSession("payer");
      }
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback((newToken: string, newUser: AuthUser, refresh?: string) => {
    setToken(newToken);
    setUser(newUser);
    setAuthToken(newToken);
    setSessionTokens("payer", newToken, refresh);
    try {
      localStorage.setItem(STORAGE_USER, JSON.stringify(newUser));
    } catch {
      /* ignore */
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    clearSession("payer");
  }, []);

  return (
    <AuthContext.Provider value={{ ready, token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>.");
  return ctx;
}
