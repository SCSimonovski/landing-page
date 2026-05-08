import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Northgate Leads",
  description: "Internal lead management for licensed agents.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Show sign-out only when there's a session. Header chrome is shared
  // across /login (no session) and /leads (session) — keep it simple.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-border bg-background">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
            <Link href="/leads" aria-label="Northgate Leads home" className="block">
              <Image
                src="/northgate-leads-logo.svg"
                alt="Northgate Leads"
                width={280}
                height={80}
                priority
                className="h-10 w-auto"
              />
            </Link>
            {user && (
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted">{user.email}</span>
                <SignOutButton />
              </div>
            )}
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
