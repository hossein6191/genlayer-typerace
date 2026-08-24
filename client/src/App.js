import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import Home from "@/pages/Home";
// Everything except the landing page is split out — the race screen pulls in
// socket.io and confetti, and a first-time visitor should not pay for that.
const Play = lazy(() => import("@/pages/Play"));
const RaceEntry = lazy(() => import("@/pages/RaceEntry"));
const Race = lazy(() => import("@/pages/Race"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const Admin = lazy(() => import("@/pages/Admin"));
const Profile = lazy(() => import("@/pages/Profile"));
const NotFound = lazy(() => import("@/pages/NotFound"));
function PageFallback() {
    return (_jsxs("div", { className: "mx-auto w-full max-w-4xl px-4 py-16", children: [_jsx(Skeleton, { className: "h-9 w-56" }), _jsx(Skeleton, { className: "mt-4 h-4 w-full max-w-md" }), _jsx(Skeleton, { className: "mt-10 h-56 w-full rounded-lg" })] }));
}
export default function App() {
    return (_jsx(TooltipProvider, { delayDuration: 200, children: _jsxs("div", { className: "flex min-h-dvh flex-col", children: [_jsx(Header, {}), _jsx("main", { className: "flex-1", children: _jsx(Suspense, { fallback: _jsx(PageFallback, {}), children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Home, {}) }), _jsx(Route, { path: "/play", element: _jsx(Play, {}) }), _jsx(Route, { path: "/race", element: _jsx(RaceEntry, {}) }), _jsx(Route, { path: "/race/:code", element: _jsx(Race, {}) }), _jsx(Route, { path: "/leaderboard", element: _jsx(Leaderboard, {}) }), _jsx(Route, { path: "/admin", element: _jsx(Admin, {}) }), _jsx(Route, { path: "/profile", element: _jsx(Profile, {}) }), _jsx(Route, { path: "/profile/:userId", element: _jsx(Profile, {}) }), _jsx(Route, { path: "*", element: _jsx(NotFound, {}) })] }) }) }), _jsx(Footer, {})] }) }));
}
