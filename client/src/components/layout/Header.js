import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { LogOut, Menu, Shield, Trophy, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { BrandLockup } from "./BrandMark";
import { SignInDialog } from "./SignInDialog";
const LINKS = [
    { to: "/play", label: "Practice" },
    { to: "/race", label: "Race" },
    { to: "/leaderboard", label: "Leaderboard" },
];
export function Header() {
    const { user, isAdmin, signOut } = useAuth();
    const [signInOpen, setSignInOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const location = useLocation();
    return (_jsxs(_Fragment, { children: [_jsxs("header", { className: "sticky top-0 z-40 border-b border-border/70 bg-background/72 backdrop-blur-xl", children: [_jsxs("div", { className: "mx-auto flex h-16 max-w-6xl items-center gap-4 px-4", children: [_jsx(Link, { to: "/", className: "shrink-0 rounded transition-opacity hover:opacity-85", "aria-label": "GenLayer TypeRace home", children: _jsx(BrandLockup, {}) }), _jsx("nav", { className: "ml-4 hidden items-center gap-1 md:flex", "aria-label": "Main", children: LINKS.map((link) => (_jsx(NavLink, { to: link.to, className: ({ isActive }) => cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", isActive || location.pathname.startsWith(link.to)
                                        ? "bg-surface-2 text-foreground"
                                        : "text-muted-foreground hover:bg-surface-2/60 hover:text-foreground"), children: link.label }, link.to))) }), _jsxs("div", { className: "ml-auto flex items-center gap-2", children: [isAdmin && (_jsx(Link, { to: "/admin", className: "hidden sm:block", children: _jsxs(Badge, { variant: "warn", className: "h-7 cursor-pointer px-3", children: [_jsx(Shield, { className: "size-3" }), "Admin"] }) })), user ? (_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Link, { to: "/profile", className: "flex items-center gap-2 rounded-full border border-border bg-surface/70 py-1 pl-1 pr-3 transition-colors hover:border-border-strong", children: [_jsxs(Avatar, { className: "size-6", children: [user.avatarUrl && _jsx(AvatarImage, { src: user.avatarUrl, alt: "" }), _jsx(AvatarFallback, { children: user.displayName.slice(0, 2) })] }), _jsx("span", { className: "max-w-[8rem] truncate text-xs font-semibold", children: user.displayName })] }), _jsx(Button, { variant: "ghost", size: "icon-sm", onClick: () => void signOut(), "aria-label": "Sign out", title: "Sign out", children: _jsx(LogOut, { className: "size-4" }) })] })) : (_jsx(Button, { variant: "gradient", size: "sm", onClick: () => setSignInOpen(true), children: "Sign in" })), _jsx(Button, { variant: "ghost", size: "icon-sm", className: "md:hidden", onClick: () => setMenuOpen((v) => !v), "aria-label": menuOpen ? "Close menu" : "Open menu", "aria-expanded": menuOpen, children: menuOpen ? _jsx(X, { className: "size-4" }) : _jsx(Menu, { className: "size-4" }) })] })] }), menuOpen && (_jsxs("nav", { className: "border-t border-border bg-surface/95 px-4 py-2 md:hidden", "aria-label": "Mobile", children: [LINKS.map((link) => (_jsx(NavLink, { to: link.to, onClick: () => setMenuOpen(false), className: "block rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground", children: link.label }, link.to))), isAdmin && (_jsxs(NavLink, { to: "/admin", onClick: () => setMenuOpen(false), className: "flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-warn", children: [_jsx(Shield, { className: "size-4" }), " Admin"] })), _jsxs(NavLink, { to: "/leaderboard", onClick: () => setMenuOpen(false), className: "flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground", children: [_jsx(Trophy, { className: "size-4" }), " Leaderboard"] })] }))] }), _jsx(SignInDialog, { open: signInOpen, onOpenChange: setSignInOpen })] }));
}
