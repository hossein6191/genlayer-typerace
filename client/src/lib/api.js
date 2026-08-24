export class ApiError extends Error {
    status;
    code;
    constructor(status, code, message) {
        super(message);
        this.status = status;
        this.code = code;
        this.name = "ApiError";
    }
}
async function request(path, init) {
    const res = await fetch(`/api${path}`, {
        credentials: "include",
        headers: init?.body ? { "Content-Type": "application/json" } : undefined,
        ...init,
    });
    const text = await res.text();
    const data = text ? safeParse(text) : null;
    if (!res.ok) {
        const code = data?.error ?? "request_failed";
        const message = data?.message ?? humanize(code, res.status);
        throw new ApiError(res.status, code, message);
    }
    return data;
}
function safeParse(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return null;
    }
}
function humanize(code, status) {
    switch (code) {
        case "sign_in_required":
            return "Sign in first, the leaderboard needs to know who you are";
        case "admin_required":
            return "That is an admin-only action";
        case "bad_password":
            return "Wrong password";
        case "too_many_attempts":
            return "Too many attempts, wait a few minutes and try again";
        case "room_not_found":
            return "No race with that code, it may have already ended";
        default:
            return `Request failed (${status})`;
    }
}
/* ------------------------------------------------------------------ */
/* Meta + content                                                      */
/* ------------------------------------------------------------------ */
export const api = {
    meta: () => request("/meta"),
    randomPassage: (difficulty, exclude) => request(`/passages/random?difficulty=${difficulty}${exclude ? `&exclude=${exclude}` : ""}`).then((r) => r.passage),
    passage: (id) => request(`/passages/${id}`).then((r) => r.passage),
    passages: (difficulty) => request(`/passages?difficulty=${difficulty}`).then((r) => r.passages),
    /* ---- auth ---- */
    me: () => request("/auth/me"),
    signIn: (username) => request("/auth/signin", {
        method: "POST",
        body: JSON.stringify({ username }),
    }),
    logout: () => request("/auth/logout", { method: "POST" }),
    adminLogin: (password) => request("/auth/admin", {
        method: "POST",
        body: JSON.stringify({ password }),
    }),
    adminLogout: () => request("/auth/admin/logout", { method: "POST" }),
    /* ---- leaderboard + profile ---- */
    leaderboard: (opts) => {
        const params = new URLSearchParams();
        if (opts.difficulty)
            params.set("difficulty", opts.difficulty);
        if (opts.window)
            params.set("window", opts.window);
        if (opts.limit)
            params.set("limit", String(opts.limit));
        return request(`/leaderboard?${params}`);
    },
    profile: (userId) => request(`/profile/${userId}`),
    /* ---- solo results ---- */
    submitSolo: (body) => request("/results", {
        method: "POST",
        body: JSON.stringify(body),
    }),
    /* ---- admin ---- */
    createRoom: (settings) => request("/admin/rooms", {
        method: "POST",
        body: JSON.stringify(settings),
    }),
    listRooms: () => request("/admin/rooms"),
    closeRoom: (code) => request(`/admin/rooms/${code}`, { method: "DELETE" }),
    adminStats: () => request("/admin/stats"),
    markErrorsSeen: () => request("/admin/errors/seen", { method: "POST" }),
    clearErrors: () => request("/admin/errors", { method: "DELETE" }),
    resetData: (scope) => request("/admin/reset", { method: "POST", body: JSON.stringify({ scope, confirm: "RESET" }) }),
    deleteResult: (id) => request(`/admin/results/${id}`, { method: "DELETE" }),
    clearFlag: (id) => request(`/admin/results/${id}/clear-flag`, { method: "POST" }),
};
