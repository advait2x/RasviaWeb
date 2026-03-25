import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

const basename = import.meta.env.BASE_URL;
const missingEnvVars = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"].filter(
  (key) => !import.meta.env[key as "VITE_SUPABASE_URL" | "VITE_SUPABASE_ANON_KEY"],
);

type AppErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unknown application error",
    };
  }

  componentDidCatch(error: unknown) {
    console.error("Unhandled React error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-6">
          <div className="max-w-xl w-full rounded-xl border border-red-500/30 bg-red-500/10 p-5 space-y-3">
            <h1 className="text-lg font-semibold text-red-300">App crashed during startup</h1>
            <p className="text-sm text-zinc-300 break-words">{this.state.message}</p>
            <p className="text-xs text-zinc-400">
              Open browser devtools console for the full stack trace.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function BootDiagnostics({ children }: { children: React.ReactNode }) {
  const [fatalError, setFatalError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const onWindowError = (event: ErrorEvent) => {
      setFatalError(event.error?.message || event.message || "Unknown window error");
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      setFatalError(message);
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  if (missingEnvVars.length > 0) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-xl w-full rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3">
          <h1 className="text-lg font-semibold text-amber-300">Missing deployment environment variables</h1>
          <p className="text-sm text-zinc-300">
            Set these variables in DigitalOcean App Platform, then redeploy:
          </p>
          <ul className="text-sm text-zinc-200 list-disc pl-5">
            {missingEnvVars.map((key) => (
              <li key={key}>
                <code>{key}</code>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (fatalError) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-xl w-full rounded-xl border border-red-500/30 bg-red-500/10 p-5 space-y-3">
          <h1 className="text-lg font-semibold text-red-300">Unhandled runtime error</h1>
          <p className="text-sm text-zinc-300 break-words">{fatalError}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BootDiagnostics>
        <BrowserRouter basename={basename}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </BootDiagnostics>
    </AppErrorBoundary>
  </React.StrictMode>,
);
