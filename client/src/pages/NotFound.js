import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StrongMark } from "@/components/layout/BrandMark";
export default function NotFound() {
    return (_jsxs("div", { className: "mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center", children: [_jsx(StrongMark, { className: "mb-5 size-10 text-muted-foreground" }), _jsx("h1", { className: "text-3xl font-bold tracking-tight", children: "No consensus on this route" }), _jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "The page you asked for is not part of the chain" }), _jsxs("div", { className: "mt-7 flex gap-2", children: [_jsx(Link, { to: "/", children: _jsx(Button, { variant: "outline", children: "Home" }) }), _jsx(Link, { to: "/play", children: _jsx(Button, { variant: "gradient", children: "Start typing" }) })] })] }));
}
