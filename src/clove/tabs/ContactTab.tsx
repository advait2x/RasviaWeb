import { useState } from "react";
import { Mail, Send } from "lucide-react";
import { CLOVE_NAME, CLOVE_SUPPORT_EMAIL } from "@/clove/data";

export function ContactTab() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in your name, email, and message.");
      return;
    }
    setError(null);

    const subject = `Clove Dining inquiry from ${fullName.trim()}`;
    const body = [
      `Name: ${fullName.trim()}`,
      `Email: ${email.trim()}`,
      `Phone: ${phone.trim() || "—"}`,
      "",
      message.trim(),
    ].join("\n");

    const href = `mailto:${CLOVE_SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  }

  const fieldClass =
    "h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground";

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Contact</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground">Contact Us</h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Questions, feedback, or event inquiries? Send {CLOVE_NAME} a message and we'll
          get back to you.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mt-10 flex flex-col gap-4 rounded-3xl border border-border bg-card p-6"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Full name
          </span>
          <input
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setError(null);
            }}
            placeholder="Jordan Kapoor"
            className={fieldClass}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="you@example.com"
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Phone
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className={fieldClass}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Message
          </span>
          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setError(null);
            }}
            rows={5}
            placeholder="How can we help?"
            className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
          />
        </label>

        {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Send size={16} />
          Send message
        </button>

        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Mail size={13} />
          Sends to {CLOVE_SUPPORT_EMAIL}
        </p>
      </form>
    </div>
  );
}
