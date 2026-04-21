import { DashboardProvider } from "@/context/DashboardContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "sonner";

function Home() {
  return (
    <DashboardProvider>
      <AppShell>
        <DashboardLayout />
      </AppShell>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "rgba(24, 24, 27, 0.95)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#e4e4e7",
            backdropFilter: "blur(12px)",
          },
        }}
      />
    </DashboardProvider>
  );
}

export default Home;
