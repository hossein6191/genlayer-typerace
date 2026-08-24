import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Flag, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
export default function RaceEntry() {
    const [code, setCode] = useState("");
    const navigate = useNavigate();
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    return (_jsxs("div", { className: "mx-auto w-full max-w-lg px-4 py-16", children: [_jsxs("div", { className: "mb-8 text-center", children: [_jsx("span", { className: "mx-auto mb-4 grid size-12 place-items-center rounded-xl border border-gl-purple/40 bg-gl-purple/10", children: _jsx(Flag, { className: "size-5 text-gl-purple" }) }), _jsxs("h1", { className: "text-2xl font-bold tracking-tight sm:text-3xl", children: ["Join a ", _jsx("span", { className: "gl-gradient-text", children: "race" })] }), _jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Enter the six-character room code your host shared, or open their invite link directly" })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Room code" }), _jsx(CardDescription, { children: "Codes are not case-sensitive" })] }), _jsx(CardContent, { children: _jsxs("form", { className: "flex flex-col gap-3", onSubmit: (e) => {
                                e.preventDefault();
                                if (clean.length === 6)
                                    navigate(`/race/${clean}`);
                            }, children: [_jsx(Label, { htmlFor: "code", className: "sr-only", children: "Room code" }), _jsx(Input, { id: "code", value: clean, onChange: (e) => setCode(e.target.value), placeholder: "ABC123", autoComplete: "off", autoFocus: true, className: "h-14 text-center font-mono text-2xl font-bold tracking-[0.42em]", maxLength: 6 }), _jsxs(Button, { type: "submit", variant: "gradient", size: "lg", disabled: clean.length !== 6, children: ["Take a lane ", _jsx(ArrowRight, { className: "size-4" })] })] }) })] }), _jsxs("div", { className: "mt-8 rounded-lg border border-border bg-surface/50 px-5 py-4 text-center", children: [_jsxs("p", { className: "flex items-center justify-center gap-2 text-sm font-semibold", children: [_jsx(Users, { className: "size-4 text-gl-purple" }), "Want to host a race?"] }), _jsx("p", { className: "mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground", children: "Open race control, create a room, and send the invite link to your players. Everyone waits in the lobby until you start" }), _jsx(Link, { to: "/admin", children: _jsxs(Button, { variant: "outline", size: "sm", className: "mt-3", children: [_jsx(ShieldCheck, { className: "size-4" }), "Open race control"] }) })] })] }));
}
