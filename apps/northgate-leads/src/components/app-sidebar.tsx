"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutListIcon, UsersIcon, LogOutIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { sidebarMenuButtonVariants } from "@/components/ui/sidebar-variants";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NorthgateLeadsLogo } from "@/components/northgate-leads-logo";
import type { PlatformUser } from "@/lib/auth/get-platform-user";

// Server component. Receives the resolved platform user from the root
// layout — role drives whether the Users link renders. The sign-out
// trigger is a form posting to /auth/signout (existing route handler
// from Plan 3) so this stays a server component end-to-end.
export function AppSidebar({
  user,
  email,
}: {
  user: PlatformUser;
  email: string;
}) {
  const isAdmin = user.role === "admin" || user.role === "superadmin";

  // Highlight the nav item matching the current route. startsWith covers
  // future nested routes like /leads/[id] and /users/[id] keeping the
  // parent section active.
  const pathname = usePathname();
  const isLeadsActive =
    pathname === "/leads" || pathname.startsWith("/leads/");
  const isUsersActive =
    pathname === "/users" || pathname.startsWith("/users/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex flex-row items-center justify-between gap-2 px-2 py-2">
        <Link
          href="/leads"
          className="flex items-center group-data-[collapsible=icon]:hidden"
        >
          <NorthgateLeadsLogo className="h-12 w-auto" />
        </Link>
        <SidebarTrigger className="ml-auto" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link
                  href="/leads"
                  data-slot="sidebar-menu-button"
                  data-sidebar="menu-button"
                  data-size="default"
                  data-active={isLeadsActive}
                  aria-current={isLeadsActive ? "page" : undefined}
                  className={cn(sidebarMenuButtonVariants({ size: "default" }))}
                >
                  <LayoutListIcon />
                  <span>Leads</span>
                </Link>
              </SidebarMenuItem>
              {isAdmin && (
                <SidebarMenuItem>
                  <Link
                    href="/users"
                    data-slot="sidebar-menu-button"
                    data-sidebar="menu-button"
                    data-size="default"
                    data-active={isUsersActive}
                    aria-current={isUsersActive ? "page" : undefined}
                    className={cn(sidebarMenuButtonVariants({ size: "default" }))}
                  >
                    <UsersIcon />
                    <span>Users</span>
                  </Link>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                data-sidebar="menu-button"
                data-size="default"
                className={cn(
                  sidebarMenuButtonVariants({ size: "default" }),
                  "justify-start",
                )}
              >
                <span className="truncate">{email}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-(--radix-popper-anchor-width)"
              >
                <DropdownMenuLabel className="truncate font-normal">
                  Signed in as <strong>{email}</strong>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    (
                      document.getElementById(
                        "signout-form",
                      ) as HTMLFormElement | null
                    )?.submit();
                  }}
                >
                  <LogOutIcon className="size-4" />
                  Sign out
                </DropdownMenuItem>
                <form
                  id="signout-form"
                  action="/auth/signout"
                  method="post"
                  className="hidden"
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
