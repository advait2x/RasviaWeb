// [build] Partner chrome — full interactive UI lives at /partner-portal (requires auth).
import { AppShell } from "@/components/layout/AppShell";

const meta = {
  title: "Partner/Chrome",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
};
export default meta;

export const ShellPreview = {
  render: () => (
    <AppShell>
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-8 text-sm text-zinc-400">
        <p className="text-center text-zinc-300">Use the partner portal route for the full chrome.</p>
        <code className="rounded-md border border-white/10 bg-zinc-900/80 px-2 py-1 text-xs text-zinc-500">
          /partner-portal
        </code>
      </div>
    </AppShell>
  ),
};
