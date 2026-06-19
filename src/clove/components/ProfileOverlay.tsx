import { LogIn, LogOut, Mail, User } from "lucide-react";
import { CloveOverlay } from "@/clove/components/CloveOverlay";
import { useCloveAuth } from "@/clove/CloveAuthContext";

function profileInitials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "";
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function ProfileOverlay({
  open,
  onClose,
  onRequestSignIn,
}: {
  open: boolean;
  onClose: () => void;
  onRequestSignIn: () => void;
}) {
  const { session, email, displayName, avatarUrl, signOut } = useCloveAuth();
  const loggedIn = !!session?.user;

  return (
    <CloveOverlay open={open} onClose={onClose} title="Your Profile">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-secondary text-muted-foreground">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName ? `${displayName}'s profile` : "Your profile"}
              className="h-full w-full object-cover"
            />
          ) : loggedIn ? (
            <span className="text-lg font-bold text-foreground">
              {profileInitials(displayName, email)}
            </span>
          ) : (
            <User size={32} />
          )}
        </div>

        {loggedIn ? (
          <>
            <div>
              <p className="text-lg font-bold text-foreground">
                {displayName || "Clove Guest"}
              </p>
              {email ? (
                <p className="mt-0.5 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                  <Mail size={14} />
                  {email}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                onClose();
              }}
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary text-sm font-bold text-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </>
        ) : (
          <>
            <div>
              <p className="text-lg font-bold text-foreground">You are not signed in.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Log in to view your rewards and order faster.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onRequestSignIn();
              }}
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <LogIn size={16} />
              Log in
            </button>
          </>
        )}
      </div>
    </CloveOverlay>
  );
}
