import { Suspense, lazy, type ComponentType } from "react";
import { isChunkLoadError, reloadForStaleBuild } from "@/lib/stale-build";
import { Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import Home from "@/pages/Home";

// Everything except the landing page is split out — the race screen pulls in
// socket.io and confetti, and a first-time visitor should not pay for that.
//
// A chunk that fails to load after a deploy is not a fault in this code, it is
// a tab holding yesterday's file names. One reload fixes it; the error page is
// only for when it does not.
function lazyPage<T extends ComponentType<unknown>>(load: () => Promise<{ default: T }>) {
  return lazy(() =>
    load().catch((error: unknown) => {
      if (isChunkLoadError(error) && reloadForStaleBuild()) {
        // The reload is under way; keep Suspense showing its fallback meanwhile.
        return new Promise<{ default: T }>(() => undefined);
      }
      throw error;
    }),
  );
}
const Play = lazyPage(() => import("@/pages/Play"));
const RaceEntry = lazyPage(() => import("@/pages/RaceEntry"));
const Race = lazyPage(() => import("@/pages/Race"));
const Leaderboard = lazyPage(() => import("@/pages/Leaderboard"));
const Admin = lazyPage(() => import("@/pages/Admin"));
const Profile = lazyPage(() => import("@/pages/Profile"));
const NotFound = lazyPage(() => import("@/pages/NotFound"));

function PageFallback() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-16">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-4 h-4 w-full max-w-md" />
      <Skeleton className="mt-10 h-56 w-full rounded-lg" />
    </div>
  );
}

export default function App() {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-dvh flex-col">
        <Header />
        <main className="flex-1">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/play" element={<Play />} />
              <Route path="/race" element={<RaceEntry />} />
              <Route path="/race/:code" element={<Race />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </TooltipProvider>
  );
}
