import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { LogIn, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
/**
 * The whole sign-in: type a name, press play.
 *
 * Nothing is connected and no third party is involved. The name is the account,
 * so typing the same name again picks up the same records.
 */
export function SignInDialog({ open, onOpenChange, reason }) {
    const { signIn } = useAuth();
    const [username, setUsername] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const submit = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await signIn(username.trim());
            onOpenChange(false);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Could not sign you in");
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-md", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Pick your name" }), _jsx(DialogDescription, { children: reason ??
                                "Your races and records are saved under this name, so type the same one next time and the leaderboard picks up where you left off" })] }), _jsxs("form", { onSubmit: submit, className: "flex flex-col gap-2.5", children: [_jsx(Label, { htmlFor: "signin-username", children: "Name" }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(UserRound, { className: "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" }), _jsx(Input, { id: "signin-username", value: username, onChange: (e) => setUsername(e.target.value), placeholder: "Your Discord username", maxLength: 24, autoComplete: "nickname", className: "pl-9", required: true, autoFocus: true })] }), _jsxs(Button, { type: "submit", disabled: busy || username.trim().length < 2, children: [_jsx(LogIn, { className: "size-4" }), busy ? "…" : "Play"] })] }), _jsx("p", { className: "text-[11px] leading-relaxed text-muted-foreground", children: "No password, no wallet, nothing to connect" }), error && (_jsx("p", { role: "alert", className: "text-xs font-medium text-bad", children: error }))] })] }) }));
}
