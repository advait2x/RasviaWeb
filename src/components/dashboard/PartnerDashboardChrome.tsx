import PartnerDashboardNav from "./PartnerDashboardNav";
import StatusBar from "./StatusBar";

/**
 * Fixed partner dashboard chrome: primary nav (wraps, no horizontal scroll) + waitlist status row.
 */
export default function PartnerDashboardChrome() {
  return (
    <div className="relative z-30 shrink-0 border-b border-white/[0.08] bg-background/95 shadow-[0_1px_0_rgba(0,0,0,0.4)] backdrop-blur-md">
      <PartnerDashboardNav />
      <div className="border-t border-white/[0.06]">
        <StatusBar embedded />
      </div>
    </div>
  );
}
