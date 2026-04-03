import { Providers } from "@/components/Providers";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="min-h-screen bg-background">{children}</div>
    </Providers>
  );
}
