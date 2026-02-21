import { DashboardProvider } from "@/context/DashboardContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

function Home() {
  return (
    <DashboardProvider>
      <DashboardLayout />
    </DashboardProvider>
  );
}

export default Home;
