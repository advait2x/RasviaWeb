import { motion } from "framer-motion";
import { Bell, Moon, Globe, Shield, HelpCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function SettingsPanel() {
  return (
    <div className="flex flex-col h-full p-4">
      <h2 className="text-lg font-semibold text-zinc-100 tracking-tight mb-6">
        Settings
      </h2>

      <div className="space-y-1">
        {[
          {
            icon: Bell,
            label: "Push Notifications",
            description: "Get alerts for new walk-ins and wait time thresholds",
            defaultChecked: true,
          },
          {
            icon: Moon,
            label: "Dark Mode",
            description: "Always enabled for optimal host stand visibility",
            defaultChecked: true,
          },
          {
            icon: Globe,
            label: "Auto SMS Updates",
            description: "Send automated wait time updates to guests",
            defaultChecked: true,
          },
          {
            icon: Shield,
            label: "Manager Lock",
            description: "Require PIN for menu changes and table resets",
            defaultChecked: false,
          },
          {
            icon: HelpCircle,
            label: "Onboarding Tips",
            description: "Show helpful tips and gesture hints",
            defaultChecked: false,
          },
        ].map((setting, index) => (
          <motion.div
            key={setting.label}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, delay: index * 0.03 }}
            className="flex items-center justify-between py-4 px-4 rounded-lg hover:bg-zinc-800/40 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-zinc-800/80 border border-white/10 flex items-center justify-center">
                <setting.icon
                  size={20}
                  strokeWidth={1.5}
                  className="text-zinc-400"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200">
                  {setting.label}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {setting.description}
                </p>
              </div>
            </div>
            <Switch
              defaultChecked={setting.defaultChecked}
              className="data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-zinc-700"
            />
          </motion.div>
        ))}
      </div>

      {/* Version Info */}
      <div className="mt-auto pt-6 pb-2 text-center">
        <p className="text-xs text-zinc-700">
          Rasvia Partner Mission Control v1.0.0
        </p>
      </div>
    </div>
  );
}
