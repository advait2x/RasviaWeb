import { useState } from "react";
import { Loader2, Lock, Mail, Smartphone } from "lucide-react";
import { CloveOverlay } from "@/clove/components/CloveOverlay";
import { useCloveAuth } from "@/clove/CloveAuthContext";

export function SignInOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { signIn } = useCloveAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await signIn(email, password);
    setSubmitting(false);
    if (signInError) {
      setError(signInError);
      return;
    }
    setEmail("");
    setPassword("");
    onClose();
  }

  return (
    <CloveOverlay open={open} onClose={onClose} title="Welcome back">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Email
          </span>
          <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3.5 focus-within:border-primary">
            <Mail size={16} className="text-muted-foreground" />
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="you@example.com"
              className="h-11 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Password
          </span>
          <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3.5 focus-within:border-primary">
            <Lock size={16} className="text-muted-foreground" />
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="••••••••"
              className="h-11 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </label>

        {error ? (
          <p className="text-sm font-medium text-destructive">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
          {submitting ? "Signing in…" : "Log in"}
        </button>
      </form>

      {/* New user → download the app */}
      <div className="mt-6 rounded-2xl border-2 border-clove-saffron bg-secondary p-5 text-center">
        <Smartphone size={22} className="mx-auto text-clove-saffron" />
        <p className="mt-2 text-sm font-semibold text-foreground">New to Clove Dining?</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Download the app below to create an account and unlock exclusive deals,
          rewards points, and faster ordering every time you visit.
        </p>
        <button
          type="button"
          onClick={() => {
            /* App link not available yet — intentionally a no-op. */
          }}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-clove-saffron bg-card text-sm font-bold text-clove-saffron transition-colors hover:bg-clove-saffron"
        >
          <Smartphone size={16} />
          Download the App
        </button>
      </div>
    </CloveOverlay>
  );
}
