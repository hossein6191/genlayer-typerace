import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
const CONFIRM_WORD = "RESET";
/**
 * Wiping the records has no undo, so the button cannot be reached by a stray
 * click: the word has to be typed first, and the two scopes are separate so
 * clearing a leaderboard never deletes people by accident.
 */
export function DangerZone({ onDone }) {
    const [confirm, setConfirm] = useState("");
    const [busy, setBusy] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const armed = confirm.trim().toUpperCase() === CONFIRM_WORD;
    const run = async (scope) => {
        setBusy(scope);
        setError(null);
        setResult(null);
        try {
            await api.resetData(scope);
            setResult(scope === "scores"
                ? "Every score is gone. Players keep their names"
                : "Everything is gone, players included");
            setConfirm("");
            onDone();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "The reset did not run");
        }
        finally {
            setBusy(null);
        }
    };
    return (_jsxs("div", { className: "rounded-lg border border-bad/40 bg-bad/6 p-5", children: [_jsxs("h2", { className: "flex items-center gap-2 text-sm font-semibold text-bad", children: [_jsx(AlertTriangle, { className: "size-4" }), "Reset the data"] }), _jsx("p", { className: "mt-1.5 text-xs leading-relaxed text-muted-foreground", children: "There is no undo and no backup. Use this to clear the test runs before you open the game to real players" }), _jsxs("div", { className: "mt-4 max-w-xs", children: [_jsxs(Label, { htmlFor: "reset-confirm", className: "mb-1.5 block", children: ["Type ", CONFIRM_WORD, " to unlock"] }), _jsx(Input, { id: "reset-confirm", value: confirm, onChange: (e) => setConfirm(e.target.value), placeholder: CONFIRM_WORD, autoComplete: "off", spellCheck: false, className: "font-mono" })] }), _jsxs("div", { className: "mt-4 flex flex-wrap gap-2", children: [_jsxs(Button, { variant: "outline", size: "sm", disabled: !armed || busy !== null, onClick: () => void run("scores"), children: [busy === "scores" ? (_jsx(Loader2, { className: "size-4 animate-spin" })) : (_jsx(Trash2, { className: "size-4" })), "Clear every score"] }), _jsxs(Button, { variant: "danger", size: "sm", disabled: !armed || busy !== null, onClick: () => void run("everything"), children: [busy === "everything" ? (_jsx(Loader2, { className: "size-4 animate-spin" })) : (_jsx(Trash2, { className: "size-4" })), "Delete everything"] })] }), _jsxs("ul", { className: "mt-3 space-y-1 text-[11px] leading-relaxed text-muted-foreground", children: [_jsxs("li", { children: [_jsx("span", { className: "font-semibold text-foreground", children: "Clear every score" }), " removes results, records, race history and stats, and keeps the players so a returning name still finds itself"] }), _jsxs("li", { children: [_jsx("span", { className: "font-semibold text-foreground", children: "Delete everything" }), " also removes the players"] }), _jsx("li", { children: "Either one closes any race that is currently open" })] }), result && (_jsx("p", { role: "status", className: "mt-3 text-xs font-medium text-ok", children: result })), error && (_jsx("p", { role: "alert", className: "mt-3 text-xs font-medium text-bad", children: error }))] }));
}
