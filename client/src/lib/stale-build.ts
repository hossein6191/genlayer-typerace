/**
 * Recovery from a deploy that happened while this tab was open.
 *
 * Every route except the landing page is a lazily imported chunk with a hash in
 * its name. A deploy replaces those files. A tab that loaded index.html before
 * the deploy still holds the old names, and the first navigation after it asks
 * the server for a chunk that is gone: "Failed to fetch dynamically imported
 * module". Nothing is wrong with the build; the tab is simply behind.
 *
 * The fix is to reload once, which fetches the new index.html and the new
 * names. Once, because if the reload does not clear it the cause is something
 * else and looping would hide it.
 */
const KEY = "typerace:reloaded-for-stale-build";

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message)
  );
}

/** True if a reload was issued. False means the caller should surface the error. */
export function reloadForStaleBuild(): boolean {
  try {
    if (sessionStorage.getItem(KEY) === "1") return false;
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* no sessionStorage: reload anyway, it is still the right move once */
  }
  window.location.reload();
  return true;
}

/** Clears the once-only guard after a successful load, so the next deploy can be recovered too. */
export function installStaleBuildRecovery() {
  // Vite raises this from its preload helper before the import rejects.
  window.addEventListener("vite:preloadError", (event) => {
    if (reloadForStaleBuild()) event.preventDefault();
  });
  // A page that reached this point loaded fine; forget the guard.
  window.addEventListener("load", () => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  });
}
