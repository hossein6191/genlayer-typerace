import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
/**
 * The server clock is the only clock that matters — everyone's countdown and
 * time limit are expressed in server epoch ms. This tracks the offset so the
 * UI can convert without every player's system clock skewing the race.
 */
function useClockOffset(socket) {
    const offsetRef = useRef(0);
    useEffect(() => {
        if (!socket)
            return;
        const sample = () => {
            const sentAt = Date.now();
            socket.emit("ping2", sentAt);
        };
        const onPong = ({ clientSent, serverTime }) => {
            const now = Date.now();
            const roundTrip = now - clientSent;
            // Assume symmetric latency; half the round trip is the one-way delay.
            offsetRef.current = serverTime + roundTrip / 2 - now;
        };
        socket.on("pong2", onPong);
        sample();
        const id = window.setInterval(sample, 15_000);
        return () => {
            socket.off("pong2", onPong);
            window.clearInterval(id);
        };
    }, [socket]);
    /** Converts a server timestamp into this browser's clock. */
    return useCallback((serverTs) => serverTs - offsetRef.current, []);
}
export function useRoom(code, options = {}) {
    const [socket, setSocket] = useState(null);
    /**
     * Emits go through a ref, not through the state.
     *
     * The state is null for the render between creating the socket and storing
     * it, and every emit in that window used to vanish without a trace. For
     * progress that means the track freezes at zero while the player's own
     * screen keeps counting, which looks like the server ignoring them.
     */
    const socketRef = useRef(null);
    const droppedRef = useRef(0);
    const [status, setStatus] = useState("connecting");
    const [state, setState] = useState(null);
    const [summary, setSummary] = useState(null);
    const [messages, setMessages] = useState([]);
    const [error, setError] = useState(null);
    const [boosts, setBoosts] = useState({});
    const asSpectator = options.asSpectator;
    useEffect(() => {
        if (!code)
            return;
        const s = io({
            withCredentials: true,
            transports: ["websocket", "polling"],
            reconnectionAttempts: 12,
            reconnectionDelay: 700,
        });
        socketRef.current = s;
        setSocket(s);
        setStatus("connecting");
        const join = () => {
            s.emit("room:join", { code, asSpectator }, (res) => {
                if (res.ok && res.state) {
                    setState(res.state);
                    setStatus("connected");
                    setError(null);
                }
                else {
                    setStatus("error");
                    setError(res.error ?? "join_failed");
                }
            });
        };
        s.on("connect", join);
        s.on("connect_error", (err) => {
            setStatus("error");
            setError(err.message === "sign_in_required" ? "sign_in_required" : "connection_failed");
        });
        s.on("disconnect", () => setStatus("connecting"));
        s.on("room:state", (next) => {
            setState(next);
            // A fresh round clears the previous podium.
            if (next.phase === "countdown" || next.phase === "lobby")
                setSummary(null);
        });
        s.on("room:finished", (result) => setSummary(result));
        s.on("room:chat", (msg) => setMessages((prev) => [...prev.slice(-60), msg]));
        s.on("room:error", (payload) => setError(payload.message));
        s.on("racer:boost", ({ userId, until }) => {
            setBoosts((prev) => ({ ...prev, [userId]: until }));
        });
        return () => {
            s.removeAllListeners();
            s.close();
            socketRef.current = null;
            setSocket(null);
            setStatus("closed");
        };
    }, [code, asSpectator]);
    const emit = useCallback((event, ...args) => {
        const live = socketRef.current;
        if (!live) {
            droppedRef.current += 1;
            if (droppedRef.current === 1) {
                console.warn("[room] emitted before the socket existed:", event);
            }
            return;
        }
        live.emit(event, ...args);
    }, []);
    const toLocalTime = useClockOffset(socket);
    const actions = {
        setReady: useCallback((ready) => emit("room:ready", ready), [emit]),
        updateSettings: useCallback((patch) => emit("room:settings", patch), [emit]),
        start: useCallback(() => emit("room:start"), [emit]),
        abort: useCallback(() => emit("room:abort"), [emit]),
        nextRound: useCallback(() => emit("room:next"), [emit]),
        kick: useCallback((userId) => emit("room:kick", userId), [emit]),
        sendChat: useCallback((text) => emit("room:chat", text), [emit]),
        sendProgress: useCallback((payload) => emit("race:progress", payload), [emit]),
        sendFinish: useCallback((payload) => emit("race:finish", payload), [emit]),
        leave: useCallback(() => emit("room:leave"), [emit]),
    };
    return { socket, status, state, summary, messages, error, boosts, actions, toLocalTime };
}
