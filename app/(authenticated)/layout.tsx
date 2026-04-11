import SideMenu from "@/app/components/SideMenu";
import NavigationBar from "@/app/components/NavigationBar";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

import Providers from "@/app/components/Providers";
import ClientLayout from "@/app/components/ClientLayout";
import MainContent from "../components/MainContent";
import RouteGuard from "../components/RouteGuard";
import DashboardLoadingOverlay from "@/app/components/DashboardLoadingOverlay";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <Providers>
      <ClientLayout>
        <div className="min-h-screen bg-gray-50">
          <DashboardLoadingOverlay />
          <NavigationBar session={session} />
          <SideMenu />
          <MainContent><RouteGuard>{children}</RouteGuard></MainContent>
        </div>
      </ClientLayout>
    </Providers>
  );
}
