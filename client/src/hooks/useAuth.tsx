import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import type { PublicUser, UserProfile } from "@/lib/types";

interface AuthValue {
  user: PublicUser | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signIn: (username: string) => Promise<void>;
  signOut: () => Promise<void>;
  loginAsAdmin: (password: string) => Promise<void>;
  logoutAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.me();
      setUser(data.user);
      setProfile(data.profile);
      setIsAdmin(data.isAdmin);
    } catch {
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      profile,
      isAdmin,
      loading,
      refresh,
      async signIn(username: string) {
        await api.signIn(username);
        await refresh();
      },
      async signOut() {
        await api.logout();
        await refresh();
      },
      async loginAsAdmin(password: string) {
        await api.adminLogin(password);
        await refresh();
      },
      async logoutAdmin() {
        await api.adminLogout();
        await refresh();
      },
    }),
    [user, profile, isAdmin, loading, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
