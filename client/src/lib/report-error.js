/**
 * Sends a fault to the server so it shows up in the admin panel.
 *
 * Best effort by design: a failure to report must never itself surface, and it
 * must never retry, or a broken endpoint turns one fault into a flood.
 */
let sent = 0;
const MAX_PER_SESSION = 10;
export function reportError(message, detail) {
    if (sent >= MAX_PER_SESSION)
        return;
    sent += 1;
    try {
        const body = JSON.stringify({
            message: message.slice(0, 500),
            detail: detail?.slice(0, 4_000),
            url: window.location.pathname + window.location.search,
        });
        // keepalive lets the report survive the page being closed by the fault.
        void fetch("/api/errors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            keepalive: true,
            body,
        }).catch(() => undefined);
    }
    catch {
        /* reporting is never allowed to throw */
    }
}
/** Catches the faults that never reach a React error boundary. */
export function installGlobalErrorReporting() {
    window.addEventListener("error", (event) => {
        reportError(event.message || "window error", event.error?.stack ?? String(event.error ?? ""));
    });
    window.addEventListener("unhandledrejection", (event) => {
        const reason = event.reason;
        reportError(reason instanceof Error ? reason.message : `unhandled rejection: ${String(reason)}`, reason instanceof Error ? reason.stack : undefined);
    });
}
