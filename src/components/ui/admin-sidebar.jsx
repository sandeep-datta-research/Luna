"use client";

import { memo } from "react";
import { useTheme } from "next-themes";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  FileText,
  Activity,
  Database,
  Shield,
  Zap,
  Bell,
  Settings,
  Moon,
  Sun,
  User,
} from "lucide-react";

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, href: "#dashboard" },
  { title: "Analytics", icon: BarChart3, href: "#analytics" },
  { title: "Users", icon: Users, href: "#users" },
  { title: "Content", icon: FileText, href: "#content" },
  { title: "Activity", icon: Activity, href: "#activity" },
  { title: "Database", icon: Database, href: "#database" },
  { title: "Security", icon: Shield, href: "#security" },
  { title: "Performance", icon: Zap, href: "#performance" },
  { title: "Notifications", icon: Bell, href: "#notifications" },
  { title: "Settings", icon: Settings, href: "#settings" },
];

export const AdminSidebar = memo(() => {
  const { theme, setTheme } = useTheme();

  return (
    <Sidebar collapsible="icon" className="border-r border-zinc-800/90">
      <SidebarHeader className="border-b border-zinc-800/80 bg-[#12121a]">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="text-zinc-100 hover:bg-zinc-800/70 hover:text-white data-[active=true]:bg-zinc-800/80"
            >
              <a href="#dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-violet-500/20 text-violet-200">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Luna</span>
                  <span className="truncate text-xs text-zinc-400">Admin Panel</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="bg-[#0f0f16]">
        <SidebarGroup>
          <SidebarGroupLabel className="text-zinc-400">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      className="text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100 data-[active=true]:bg-zinc-800/80 data-[active=true]:text-zinc-100"
                    >
                      <a href={item.href}>
                        <Icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-zinc-800/80 bg-[#12121a]">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100"
            >
              {theme === "dark" ? <Sun /> : <Moon />}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100">
              <a href="#profile">
                <User />
                <span>Admin Profile</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail className="after:bg-zinc-700/40 hover:after:bg-zinc-500/60" />
    </Sidebar>
  );
});

AdminSidebar.displayName = "AdminSidebar";
