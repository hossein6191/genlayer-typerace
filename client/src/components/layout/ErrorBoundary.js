import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/report-error";
/**
 * Catches a render fault so the player sees an explanation instead of a blank
 * page, and so the fault reaches the server rather than only the console.
 */
export class ErrorBoundary extends Component {
    state = { error: null };
    static getDerivedStateFromError(error) {
        return { error };
    }
    componentDidCatch(error, info) {
        reportError(error.message, `${error.stack ?? ""}\n\ncomponent stack:${info.componentStack}`);
    }
    render() {
        if (!this.state.error)
            return this.props.children;
        return (_jsxs("div", { className: "mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center", children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Something broke on this screen" }), _jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "The fault has been reported. Reloading usually clears it" }), _jsx("p", { className: "mt-4 max-w-md break-words rounded-md border border-border bg-surface/70 px-4 py-3 text-left font-mono text-[11px] text-muted-foreground", children: this.state.error.message }), _jsxs(Button, { variant: "gradient", className: "mt-6", onClick: () => window.location.reload(), children: [_jsx(RefreshCw, { className: "size-4" }), "Reload"] })] }));
    }
}
