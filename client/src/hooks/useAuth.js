import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, } from "react";
import { api } from "@/lib/api";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const refresh = useCallback(async () => {
        try {
            const data = await api.me();
            setUser(data.user);
            setProfile(data.profile);
            setIsAdmin(data.isAdmin);
        }
        catch {
            setUser(null);
            setProfile(null);
            setIsAdmin(false);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        void refresh();
    }, [refresh]);
    const value = useMemo(() => ({
        user,
        profile,
        isAdmin,
        loading,
        refresh,
        async signIn(username) {
            await api.signIn(username);
            await refresh();
        },
        async signOut() {
            await api.logout();
            await refresh();
        },
        async loginAsAdmin(password) {
            await api.adminLogin(password);
            await refresh();
        },
        async logoutAdmin() {
            await api.adminLogout();
            await refresh();
        },
    }), [user, profile, isAdmin, loading, refresh]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
}
