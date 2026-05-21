import { MarketingLayout } from "@/components/marketing/MarketingLayout";

export default function ContactPage() {
  return (
    <MarketingLayout>
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white">Contact Us</h1>
        <p className="mt-3 text-zinc-600 dark:text-neutral-400">
          We are here to help. Reach out anytime and we will get back to you within one business day.
        </p>

        <div className="mt-10 flex flex-col gap-4">
          <div className="rounded-2xl border border-zinc-200/80 bg-white px-6 py-5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Support Email</p>
            <a
              href="mailto:support@rasvia.com"
              className="mt-1 block text-lg font-semibold text-amber-600 transition-colors hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300"
            >
              support@rasvia.com
            </a>
          </div>

          <div className="rounded-2xl border border-zinc-200/80 bg-white px-6 py-5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Phone</p>
            <a
              href="tel:4698917169"
              className="mt-1 block text-lg font-semibold text-zinc-800 transition-colors hover:text-zinc-950 dark:text-zinc-200 dark:hover:text-white"
            >
              469-891-7169
            </a>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
