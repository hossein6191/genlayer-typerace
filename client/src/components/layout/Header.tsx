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

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/72 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link
            to="/"
            className="shrink-0 rounded transition-opacity hover:opacity-85"
            aria-label="GenLayer TypeRace home"
          >
            <BrandLockup />
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive || location.pathname.startsWith(link.to)
                      ? "bg-surface-2 text-foreground"
                      : "text-muted-foreground hover:bg-surface-2/60 hover:text-foreground",
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {isAdmin && (
              <Link to="/admin" className="hidden sm:block">
                <Badge variant="warn" className="h-7 cursor-pointer px-3">
                  <Shield className="size-3" />
                  Admin
                </Badge>
              </Link>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 rounded-full border border-border bg-surface/70 py-1 pl-1 pr-3 transition-colors hover:border-border-strong"
                >
                  <Avatar className="size-6">
                    {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
                    <AvatarFallback>{user.displayName.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <span className="max-w-[8rem] truncate text-xs font-semibold">
                    {user.displayName}
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => void signOut()}
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="size-4" />
                </Button>
              </div>
            ) : (
              <Button variant="gradient" size="sm" onClick={() => setSignInOpen(true)}>
                Sign in
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon-sm"
              className="md:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </Button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-border bg-surface/95 px-4 py-2 md:hidden" aria-label="Mobile">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className="block rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                {link.label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink
                to="/admin"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-warn"
              >
                <Shield className="size-4" /> Admin
              </NavLink>
            )}
            <NavLink
              to="/leaderboard"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground"
            >
              <Trophy className="size-4" /> Leaderboard
            </NavLink>
          </nav>
        )}
      </header>

      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
    </>
  );
}
