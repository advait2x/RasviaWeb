import { Construction } from "lucide-react";

export function CateringTab() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Catering</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground">Catering</h1>
      </header>

      <div className="mt-12 flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-border bg-card px-8 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Construction size={30} />
        </div>
        <p className="text-2xl font-black tracking-tight text-foreground">Under construction</p>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Our catering experience is being prepared. Check back soon — in the meantime,
          reach out through our Contact page for event inquiries.
        </p>
      </div>
    </div>
  );
}
