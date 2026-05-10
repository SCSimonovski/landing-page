"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutListIcon,
  UsersIcon,
  LogOutIcon,
  UserCircleIcon,
  MoreHorizontalIcon,
} from "lucide-react";
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

// Display name preference: agent's full_name (from agents table) > email
// local part. Email's local part is shown as the subtitle line either way.
function resolveDisplayName(fullName: string | null, email: string): string {
  if (fullName && fullName.trim()) return fullName.trim();
  const local = email.split("@")[0] ?? email;
  return local || email;
}

// Initials for the avatar tile. Two letters when the display name has at
// least two words (first + last), otherwise the first two characters.
function initialsOf(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}

export function AppSidebar({
  user,
  email,
  fullName,
}: {
  user: PlatformUser;
  email: string;
  fullName: string | null;
}) {
  const isAdmin = user.role === "admin" || user.role === "superadmin";
  const pathname = usePathname();
  const isLeadsActive =
    pathname === "/leads" || pathname.startsWith("/leads/");
  const isUsersActive =
    pathname === "/users" || pathname.startsWith("/users/");
  const isAccountActive =
    pathname === "/account" || pathname.startsWith("/account/");

  const displayName = resolveDisplayName(fullName, email);
  const initials = initialsOf(displayName);

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
              <SidebarMenuItem>
                <Link
                  href="/account"
                  data-slot="sidebar-menu-button"
                  data-sidebar="menu-button"
                  data-size="default"
                  data-active={isAccountActive}
                  aria-current={isAccountActive ? "page" : undefined}
                  className={cn(sidebarMenuButtonVariants({ size: "default" }))}
                >
                  <UserCircleIcon />
                  <span>Account</span>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                // Card chrome is stripped on collapsed (icon-only) state so
                // only the avatar tile remains.
                className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent p-2 text-left text-sidebar-accent-foreground shadow-sm outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent/80 focus-visible:ring-2 group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:shadow-none group-data-[collapsible=icon]:hover:bg-transparent"
              >
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-avatar text-xs font-semibold text-sidebar-avatar-foreground"
                >
                  {initials}
                </span>
                <span className="flex min-w-0 flex-1 flex-col leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-sm font-medium">
                    {displayName}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {email}
                  </span>
                </span>
                <MoreHorizontalIcon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden"
                />
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
