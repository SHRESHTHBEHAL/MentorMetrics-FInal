import TopNavBar from "@/components/layout/TopNavBar";
import SideNavBar from "@/components/layout/SideNavBar";
import MobileNav from "@/components/layout/MobileNav";
import { Providers } from "@/components/Providers";
import { AuthGuard } from "@/components/AuthGuard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <AuthGuard>
        <div className="flex min-h-screen">
          <SideNavBar />
          <div className="flex-1 md:ml-64">
            <TopNavBar />
            <main className="pb-20 md:pb-0">{children}</main>
            <MobileNav />
          </div>
        </div>
      </AuthGuard>
    </Providers>
  );
}
