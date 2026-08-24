import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/report-error";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches a render fault so the player sees an explanation instead of a blank
 * page, and so the fault reaches the server rather than only the console.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error.message, `${error.stack ?? ""}\n\ncomponent stack:${info.componentStack}`);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Something broke on this screen</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The fault has been reported. Reloading usually clears it
        </p>
        <p className="mt-4 max-w-md break-words rounded-md border border-border bg-surface/70 px-4 py-3 text-left font-mono text-[11px] text-muted-foreground">
          {this.state.error.message}
        </p>
        <Button variant="gradient" className="mt-6" onClick={() => window.location.reload()}>
          <RefreshCw className="size-4" />
          Reload
        </Button>
      </div>
    );
  }
}
