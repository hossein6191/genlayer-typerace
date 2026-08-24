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
