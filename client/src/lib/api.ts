import type {
  AdminRoomRow,
  Difficulty,
  DifficultyMeta,
  LeaderboardEntry,
  Passage,
  PublicUser,
  RoomSettings,
  RoomState,
  SoloResultResponse,
  UserProfile,
} from "./types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });

  const text = await res.text();
  const data = text ? safeParse(text) : null;

  if (!res.ok) {
    const code = (data as { error?: string } | null)?.error ?? "request_failed";
    const message =
      (data as { message?: string } | null)?.message ?? humanize(code, res.status);
    throw new ApiError(res.status, code, message);
  }

  return data as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function humanize(code: string, status: number) {
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
  meta: () =>
    request<{
      difficulties: DifficultyMeta[];
      counters: { players: number; races: number; results: number; topWpm: number | null };
    }>("/meta"),

  randomPassage: (difficulty: Difficulty, exclude?: string) =>
    request<{ passage: Passage }>(
      `/passages/random?difficulty=${difficulty}${exclude ? `&exclude=${exclude}` : ""}`,
    ).then((r) => r.passage),

  passage: (id: string) => request<{ passage: Passage }>(`/passages/${id}`).then((r) => r.passage),

  passages: (difficulty: Difficulty) =>
    request<{ passages: Array<{ id: string; title: string; chars: number }> }>(
      `/passages?difficulty=${difficulty}`,
    ).then((r) => r.passages),

  /* ---- auth ---- */

  me: () =>
    request<{
      user: PublicUser | null;
      profile: UserProfile | null;
      isAdmin: boolean;
    }>("/auth/me"),

  signIn: (username: string) =>
    request<{ user: PublicUser; returning: boolean }>("/auth/signin", {
      method: "POST",
      body: JSON.stringify({ username }),
    }),

  logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),

  adminLogin: (password: string) =>
    request<{ ok: true }>("/auth/admin", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  adminLogout: () => request<{ ok: true }>("/auth/admin/logout", { method: "POST" }),

  /* ---- leaderboard + profile ---- */

  leaderboard: (opts: {
    difficulty?: Difficulty | "all";
    window?: "all" | "7d" | "24h";
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (opts.difficulty) params.set("difficulty", opts.difficulty);
    if (opts.window) params.set("window", opts.window);
    if (opts.limit) params.set("limit", String(opts.limit));
    return request<{ entries: LeaderboardEntry[]; meRank: number | null }>(
      `/leaderboard?${params}`,
    );
  },

  profile: (userId: string) => request<UserProfile>(`/profile/${userId}`),

  /* ---- solo results ---- */

  submitSolo: (body: {
    passageId: string;
    difficulty: Difficulty;
    mode: "practice" | "solo-sprint";
    correctChars: number;
    typedChars: number;
    keystrokes: number;
    errors: number;
    durationMs: number;
    finished: boolean;
    pasteAttempts: number;
    wpmSamples: number[];
    unranked: boolean;
  }) =>
    request<SoloResultResponse>("/results", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /* ---- admin ---- */

  createRoom: (settings: Partial<RoomSettings>) =>
    request<{ code: string; inviteUrl: string; state: RoomState }>("/admin/rooms", {
      method: "POST",
      body: JSON.stringify(settings),
    }),

  listRooms: () => request<{ rooms: AdminRoomRow[] }>("/admin/rooms"),

  closeRoom: (code: string) => request<{ ok: true }>(`/admin/rooms/${code}`, { method: "DELETE" }),

  adminStats: () =>
    request<{
      counters: { players: number; races: number; results: number; topWpm: number | null };
      flagged: Array<{
        id: string;
        wpm: number;
        accuracy: number;
        difficulty: string;
        mode: string;
        created_at: number;
        username: string;
        user_id: string;
      }>;
      recent: Array<{
        id: string;
        wpm: number;
        accuracy: number;
        difficulty: string;
        mode: string;
        position: number | null;
        created_at: number;
        username: string;
        user_id: string;
      }>;
      activeRooms: AdminRoomRow[];
      errors: {
        counts: { total: number; last24h: number; unseen: number };
        recent: Array<{
          id: string;
          at: number;
          source: string;
          message: string;
          detail: string | null;
          url: string | null;
          user_id: string | null;
          user_agent: string | null;
          seen: number;
        }>;
      };
    }>("/admin/stats"),

  markErrorsSeen: () => request<{ ok: true }>("/admin/errors/seen", { method: "POST" }),

  clearErrors: () => request<{ ok: true }>("/admin/errors", { method: "DELETE" }),

  resetData: (scope: "scores" | "everything") =>
    request<{ ok: true; scope: string; counters: { players: number; races: number } }>(
      "/admin/reset",
      { method: "POST", body: JSON.stringify({ scope, confirm: "RESET" }) },
    ),

  deleteResult: (id: string) => request<{ ok: true }>(`/admin/results/${id}`, { method: "DELETE" }),

  clearFlag: (id: string) =>
    request<{ ok: boolean }>(`/admin/results/${id}/clear-flag`, { method: "POST" }),
};
