export default function ContactPage() {
  return (
    <div className="w-full min-h-screen overflow-x-hidden bg-[#0A0A0A] text-zinc-100">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <a
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-amber-400"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to Home
        </a>

        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-400">rasvia</p>
        <h1 className="text-4xl font-black tracking-tighter text-white">Contact Us</h1>
        <p className="mt-3 text-neutral-400">
          We are here to help. Reach out anytime and we will get back to you within one business day.
        </p>

        <div className="mt-10 flex flex-col gap-4">
          <div className="rounded-2xl border border-white/10 bg-neutral-900/50 px-6 py-5 backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Support Email</p>
            <a
              href="mailto:support@rasvia.com"
              className="mt-1 block text-lg font-semibold text-amber-400 transition-colors hover:text-amber-300"
            >
              support@rasvia.com
            </a>
          </div>

          <div className="rounded-2xl border border-white/10 bg-neutral-900/50 px-6 py-5 backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Phone</p>
            <a
              href="tel:4698917169"
              className="mt-1 block text-lg font-semibold text-zinc-200 transition-colors hover:text-white"
            >
              469-891-7169
            </a>
          </div>
        </div>

        <p className="mt-10 text-sm text-neutral-600">
          &copy; {new Date().getFullYear()} Rasvia, Inc.
        </p>
      </div>
    </div>
  );
}