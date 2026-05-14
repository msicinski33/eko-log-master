import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, Layers3, Palette, PartyPopper, Recycle } from "lucide-react";
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
} from "@/components/ui/sidebar";

const items = [
  { title: "Pulpit", url: "/", icon: CalendarDays },
  { title: "Reguły", url: "/rules", icon: Layers3 },
  { title: "Frakcje", url: "/fractions", icon: Palette },
  { title: "Święta", url: "/holidays", icon: PartyPopper },
];

export function AppSidebar() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon" data-print-hide>
      <SidebarHeader className="border-b-2 border-border">
        <Link to="/" className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center bg-primary text-primary-foreground brutal-shadow-sm">
            <Recycle className="h-5 w-5" strokeWidth={3} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-lg font-black tracking-tight">EKO-LOG</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Harmonogram odbiorów
            </span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-display uppercase tracking-widest text-xs">
            Nawigacja
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = currentPath === item.url;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.url} className="flex items-center gap-2 font-semibold uppercase tracking-wide">
                        <item.icon className="h-4 w-4" strokeWidth={2.5} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
