import Link from "next/link";
import { NorthgateLeadsLogo } from "@/components/northgate-leads-logo";

// Chromeless layout for /login + /auth/* — no sidebar, no Toaster.
// Just the logo at top so signed-out / mid-flow users see the brand.
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-svh flex flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-6">
          <Link href="/login" aria-label="Northgate Leads">
            <NorthgateLeadsLogo />
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-start justify-center">{children}</main>
    </div>
  );
}
