"use client";
import * as React from "react";
import { usePathname } from "next/navigation";
// 👇 1. Import signOut
import { useSession, signOut } from "next-auth/react";
// 👇 2. Import the LogOut icon
import { LogOut } from "lucide-react";

import { TeamSwitcher } from "@/components/team-switcher";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

// This is sample data.
const data = {
  versions: ["1.0.1", "1.1.0-alpha", "2.0.0-beta1"],
  navMain: [
    {
      title: "Getting Started",
      url: "#",
      items: [
        {
          title: "Home",
          url: "/dashboard",
        },
        {
          title: "Assets",
          url: "/dashboard/assets",
        },
        {
          title: "Bookings",
          url: "/dashboard/bookings",
        },
        {
          title: "Professions",
          url: "/dashboard/professions",
        },
        {
          title: "Consultants",
          url: "/dashboard/consultants",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <TeamSwitcher
          profile={{
            name: session?.user?.name || "Admin",
            logo: session?.user?.image || null,
            plan: "Admin",
          }}
        />
      </SidebarHeader>
      <SidebarContent>
        {/* We create a SidebarGroup for each parent. */}
        {data.navMain.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {/* 👇 3. Updated isActive to use startsWith for sub-pages */}
                    <SidebarMenuButton
                      asChild
                      isActive={
                        item.url === "/dashboard"
                          ? pathname === "/dashboard"
                          : pathname.startsWith(item.url)
                      }
                    >
                      <a href={item.url}>{item.title}</a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {/* 👇 4. Added Logout button group */}
        <SidebarGroup className="mt-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
