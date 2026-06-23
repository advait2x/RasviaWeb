import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { MKT_BODY, MKT_DISPLAY, MKT_HEADING, MKT_PANEL } from "@/lib/marketingUi";
import { cn } from "@/lib/utils";

export default function ContactPage() {
  return (
    <MarketingLayout>
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className={cn("text-4xl text-balance", MKT_DISPLAY, MKT_HEADING)}>Contact Us</h1>
        <p className={cn("mt-3 text-pretty", MKT_BODY)}>
          Email or call. We usually reply within one business day.
        </p>

        <div className="mt-10 flex flex-col gap-4">
          <div className={cn("px-6 py-5", MKT_PANEL)}>
            <p className={cn("text-sm font-medium", MKT_HEADING)}>Support email</p>
            <a
              href="mailto:support@rasvia.com"
              className="mt-1 block text-lg font-semibold text-amber-700 transition-colors hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-400 dark:hover:text-amber-300"
            >
              support@rasvia.com
            </a>
          </div>

          <div className={cn("px-6 py-5", MKT_PANEL)}>
            <p className={cn("text-sm font-medium", MKT_HEADING)}>Phone</p>
            <a
              href="tel:4698917169"
              className={cn(
                "mt-1 block text-lg font-semibold transition-colors hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:hover:text-white",
                MKT_HEADING,
              )}
            >
              469-891-7169
            </a>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
