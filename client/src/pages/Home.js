import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Flag, Gauge, Keyboard, MessagesSquare, ShieldCheck, Sparkles, Trophy, Users, Zap, } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DifficultyPicker } from "@/components/game/DifficultyPicker";
import { RaceTrack } from "@/components/game/RaceTrack";
import { StrongMark } from "@/components/layout/BrandMark";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
const FEATURES = [
    {
        icon: Flag,
        title: "A track above the text",
        body: "Every keystroke moves your car, accuracy is traction, a mistake stalls you until you fix it, and the first car across the line wins the round",
    },
    {
        icon: Keyboard,
        title: "The board teaches you",
        body: "A tactile keyboard sits under the passage and lights the next key you need, so leave it on while you learn and switch it off when you are fast",
    },
    {
        icon: Zap,
        title: "Consensus Boost",
        body: "String together forty clean characters and the network agrees with you: your car flares, the trail lengthens, and everyone sees it happen",
    },
    {
        icon: Users,
        title: "Hosted rooms",
        body: "An admin opens a room, shares one link, and holds everyone in the lobby until the countdown, while late arrivals drop into the next round",
    },
    {
        icon: Trophy,
        title: "Records that follow you",
        body: "Type the name you want on the board and your bests, wins and rank stay with it, so come back next week and the game still knows you",
    },
    {
        icon: ShieldCheck,
        title: "Clean leaderboard",
        body: "Paste is blocked, keystrokes are counted, and impossible runs are held back for review before they can touch the public board",
    },
];
/** A short scripted demo so the landing page shows the real track component. */
const DEMO_RACERS = [
    {
        userId: "a",
        username: "leader",
        displayName: "cheshire",
        avatarUrl: null,
        isHost: true,
        isSpectator: false,
        connected: true,
        ready: true,
        progress: 0.82,
        wpm: 118,
        rawWpm: 122,
        accuracy: 98.4,
        errors: 2,
        correctChars: 240,
        streak: 96,
        boostUntil: null,
        finishedAt: null,
        position: null,
        personalBest: 121,
    },
    {
        userId: "b",
        username: "chaser",
        displayName: "0xNimbus",
        avatarUrl: null,
        isHost: false,
        isSpectator: false,
        connected: true,
        ready: true,
        progress: 0.71,
        wpm: 96,
        rawWpm: 101,
        accuracy: 96.1,
        errors: 5,
        correctChars: 208,
        streak: 41,
        boostUntil: Date.now() + 4_000,
        finishedAt: null,
        position: null,
        personalBest: 99,
    },
    {
        userId: "c",
        username: "third",
        displayName: "keycap",
        avatarUrl: null,
        isHost: false,
        isSpectator: false,
        connected: true,
        ready: true,
        progress: 0.55,
        wpm: 74,
        rawWpm: 80,
        accuracy: 92.8,
        errors: 9,
        correctChars: 161,
        streak: 12,
        boostUntil: null,
        finishedAt: null,
        position: null,
        personalBest: null,
    },
];
export default function Home() {
    const { user } = useAuth();
    const reduceMotion = useReducedMotion();
    const [difficulties, setDifficulties] = useState([]);
    const [counters, setCounters] = useState();
    const [top, setTop] = useState([]);
    const [preview, setPreview] = useState("medium");
    const [demo, setDemo] = useState(DEMO_RACERS);
    useEffect(() => {
        api
            .meta()
            .then((m) => {
            setDifficulties(m.difficulties);
            setCounters(m.counters);
        })
            .catch(() => undefined);
        api
            .leaderboard({ difficulty: "all", limit: 5 })
            .then((d) => setTop(d.entries))
            .catch(() => undefined);
    }, []);
    // Nudge the demo cars so the hero feels alive without pretending to be live.
    useEffect(() => {
        if (reduceMotion)
            return;
        const id = window.setInterval(() => {
            setDemo((prev) => prev.map((racer) => {
                const step = (racer.wpm / 12_000) * 3;
                const progress = racer.progress + step > 0.97 ? 0.12 : racer.progress + step;
                return { ...racer, progress };
            }));
        }, 420);
        return () => window.clearInterval(id);
    }, [reduceMotion]);
    const fadeUp = {
        initial: reduceMotion ? {} : { opacity: 0, y: 18 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-60px" },
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    };
    return (_jsxs("div", { className: "mx-auto w-full max-w-6xl px-4", children: [_jsxs("section", { className: "pb-12 pt-14 sm:pb-16 sm:pt-20", children: [_jsxs(motion.div, { initial: reduceMotion ? {} : { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }, className: "mx-auto max-w-3xl text-center", children: [_jsxs(Badge, { variant: "default", className: "mb-5 h-7 px-3", children: [_jsx(Sparkles, { className: "size-3" }), "A typing race about the adjudication layer"] }), _jsxs("h1", { className: "text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl", children: ["Type faster than", _jsx("br", {}), "the ", _jsx("span", { className: "gl-gradient-text", children: "network" })] }), _jsx("p", { className: "mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg", children: "GenLayer TypeRace turns the protocol into a track, so you race real people over passages about Intelligent Contracts, Optimistic Democracy and the GenVM, and whoever reaches finality first takes the round" }), _jsxs("div", { className: "mt-8 flex flex-wrap items-center justify-center gap-3", children: [_jsx(Link, { to: "/play", children: _jsxs(Button, { variant: "gradient", size: "xl", children: [_jsx(Gauge, { className: "size-5" }), "Start typing"] }) }), _jsx(Link, { to: "/race", children: _jsxs(Button, { variant: "outline", size: "xl", children: [_jsx(Flag, { className: "size-5" }), "Join a race"] }) })] }), counters && (_jsx("dl", { className: "mx-auto mt-9 flex max-w-lg flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm", children: [
                                    ["Racers", formatNumber(counters.players)],
                                    ["Races run", formatNumber(counters.races)],
                                    ["Top speed", counters.topWpm ? `${Math.round(counters.topWpm)} wpm` : "n/a"],
                                ].map(([label, value]) => (_jsxs("div", { className: "text-center", children: [_jsx("dt", { className: "text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground", children: label }), _jsx("dd", { className: "text-lg font-bold tabular-nums", children: value })] }, label))) }))] }), _jsxs(motion.div, { ...fadeUp, className: "mt-12", children: [_jsx(RaceTrack, { racers: demo, meId: "b", boosts: {}, maxWpm: 130 }), _jsx("p", { className: "mt-2 text-center text-[11px] text-muted-foreground", children: "Sample track, and in a real race these positions are pushed from the server ten times a second" })] })] }), _jsxs(motion.section, { ...fadeUp, className: "py-12", children: [_jsxs("header", { className: "mb-6 max-w-2xl", children: [_jsxs("h2", { className: "text-2xl font-bold tracking-tight sm:text-3xl", children: ["Three tiers, one ", _jsx("span", { className: "gl-gradient-text", children: "subject" })] }), _jsx("p", { className: "mt-2 text-sm leading-relaxed text-muted-foreground", children: "Every passage is about GenLayer, so the vocabulary sinks in while your fingers learn Start on Genesis, graduate to Byzantine where you are typing actual contract code" })] }), difficulties.length > 0 && (_jsx(DifficultyPicker, { options: difficulties, value: preview, onChange: setPreview })), _jsx("div", { className: "mt-5", children: _jsx(Link, { to: "/play", children: _jsxs(Button, { variant: "outline", children: ["Practise ", difficulties.find((d) => d.id === preview)?.codename ?? "this tier", _jsx(ArrowRight, { className: "size-4" })] }) }) })] }), _jsxs(motion.section, { ...fadeUp, className: "py-12", children: [_jsxs("header", { className: "mb-7 max-w-2xl", children: [_jsxs("h2", { className: "text-2xl font-bold tracking-tight sm:text-3xl", children: ["Built like a real ", _jsx("span", { className: "gl-gradient-text", children: "race" })] }), _jsx("p", { className: "mt-2 text-sm leading-relaxed text-muted-foreground", children: "Positions, timing and scoring all live on the server, so nobody's laggy connection decides the winner" })] }), _jsx("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3", children: FEATURES.map((feature, i) => (_jsxs(motion.article, { initial: reduceMotion ? {} : { opacity: 0, y: 16, scale: 0.98 }, whileInView: { opacity: 1, y: 0, scale: 1 }, viewport: { once: true, margin: "-40px" }, transition: { duration: 0.4, delay: Math.min(i * 0.06, 0.3), ease: [0.34, 1.56, 0.64, 1] }, className: "gl-panel group rounded-lg p-5 transition-colors hover:border-gl-purple/40", children: [_jsx("span", { className: "mb-3 grid size-9 place-items-center rounded-md bg-gl-purple/12 text-gl-purple transition-transform duration-300 group-hover:scale-105", children: _jsx(feature.icon, { className: "size-4" }) }), _jsx("h3", { className: "text-sm font-semibold", children: feature.title }), _jsx("p", { className: "mt-1.5 text-[13px] leading-relaxed text-muted-foreground", children: feature.body })] }, feature.title))) })] }), top.length > 0 && (_jsx(motion.section, { ...fadeUp, className: "py-12", children: _jsxs("div", { className: "gl-panel gl-panel-glow overflow-hidden rounded-lg", children: [_jsxs("header", { className: "flex items-center gap-2 border-b border-border px-5 py-4", children: [_jsx(Trophy, { className: "size-4 text-warn" }), _jsx("h2", { className: "text-base font-semibold tracking-tight", children: "Fastest typists" }), _jsx(Link, { to: "/leaderboard", className: "ml-auto text-xs font-semibold text-gl-purple underline underline-offset-2 hover:text-gl-pink", children: "Full ledger \u2192" })] }), _jsx("ol", { className: "divide-y divide-border", children: top.map((entry) => (_jsxs("li", { className: "flex items-center gap-3 px-5 py-3", children: [_jsx("span", { className: "w-5 text-xs font-bold tabular-nums text-muted-foreground", children: entry.rank }), _jsx("span", { className: "min-w-0 flex-1 truncate text-sm font-medium", children: entry.displayName }), _jsx("span", { className: "text-sm font-bold tabular-nums", children: Math.round(entry.wpm) }), _jsxs("span", { className: "w-14 text-right text-[11px] text-muted-foreground", children: [entry.accuracy.toFixed(0), "% acc"] })] }, entry.userId))) })] }) })), _jsx(motion.section, { ...fadeUp, className: "py-14", children: _jsxs("div", { className: "gl-panel gl-panel-glow relative overflow-hidden rounded-xl px-6 py-12 text-center sm:px-12", children: [_jsx("div", { "aria-hidden": true, className: "pointer-events-none absolute inset-0 opacity-70", style: {
                                background: "radial-gradient(60% 80% at 50% 0%, color-mix(in oklab, var(--color-gl-purple) 22%, transparent), transparent 70%)",
                            } }), _jsxs("div", { className: "relative", children: [_jsx(StrongMark, { className: "mx-auto mb-5 size-9 text-foreground", glow: true }), _jsx("h2", { className: "text-2xl font-bold tracking-tight sm:text-3xl", children: user ? `Back for another lap, ${user.displayName}?` : "Take a lane" }), _jsx("p", { className: "mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-muted-foreground", children: user
                                        ? "Your records are saved, so beat them, or go and take someone else's"
                                        : "Pick a name and every record you set stays attached to it, this session and the next" }), _jsxs("div", { className: "mt-7 flex flex-wrap items-center justify-center gap-3", children: [_jsx(Link, { to: "/play", children: _jsx(Button, { variant: "gradient", size: "lg", children: "Practice solo" }) }), _jsx(Link, { to: "/race", children: _jsxs(Button, { variant: "outline", size: "lg", children: [_jsx(MessagesSquare, { className: "size-4" }), "Join a hosted race"] }) })] })] })] }) })] }));
}
