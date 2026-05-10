import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { NorthgateLeadsLogo } from "@/components/northgate-leads-logo";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPlatformUser } from "@/lib/auth/get-platform-user";
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

// Root layout serves two shapes:
//   - Authed routes (/leads, /users): rendered with sidebar shell.
//   - (auth) routes (/login, /auth/*): rendered chromeless via the
//     (auth) group's own layout — those override this one's <main>
//     children content but still inherit the <html>/<body> wrapper.
// We branch by checking whether there's a resolved platform user.
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // Plan 4 Approach B: server-side cookie read for first paint. shadcn
  // Sidebar persists open/closed via the sidebar_state cookie; without
  // reading it on the server, every navigation flashes the default
  // (open) before client hydration corrects it.
  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";

  const platformUser = authUser ? await getPlatformUser() : null;
  const showShell = Boolean(authUser && platformUser && platformUser.active);

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geist.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-svh bg-background text-foreground">
        {showShell ? (
          <SidebarProvider defaultOpen={sidebarOpen}>
            <AppSidebar user={platformUser!} email={authUser!.email ?? ""} />
            <SidebarInset>
              <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-card px-3 md:hidden">
                <SidebarTrigger />
                <NorthgateLeadsLogo className="h-10 w-auto" />
              </header>
              {children}
            </SidebarInset>
          </SidebarProvider>
        ) : (
          children
        )}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
