import { StrongMark } from "./BrandMark";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-7 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2">
          <StrongMark className="size-3.5 text-muted-foreground" />
          <span>
            An unofficial community game about{" "}
            <a
              href="https://genlayer.com"
              target="_blank"
              rel="noreferrer noopener"
              className="text-foreground underline decoration-gl-purple/50 underline-offset-2 transition-colors hover:text-gl-purple"
            >
              GenLayer
            </a>
          </span>
        </p>
        <p>
          Built by{" "}
          <a
            href="https://x.com/Hellishnum1"
            target="_blank"
            rel="noreferrer noopener"
            className="font-semibold text-foreground transition-colors hover:text-gl-pink"
          >
            @Hellishnum1
          </a>
        </p>
      </div>
    </footer>
  );
}
