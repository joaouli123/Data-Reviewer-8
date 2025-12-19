import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { LayoutDashboard, TrendingUp, FileText, Settings } from "lucide-react";
import logoUrl from "@assets/Logo_HUA_1766183691207.png";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/",
  },
  {
    title: "Análise",
    icon: TrendingUp,
    path: "/",
  },
  {
    title: "Relatórios",
    icon: FileText,
    path: "/",
  },
  {
    title: "Configurações",
    icon: Settings,
    path: "/",
  },
];

export function AppSidebar() {
  return (
    <Sidebar className="bg-[#030303] border-r border-sidebar-border">
      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center justify-center px-4 py-6 mb-4">
            <img src={logoUrl} alt="HUA Logo" className="h-16 object-contain" data-testid="img-logo-sidebar" />
          </div>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.path} className="flex items-center gap-3 text-sidebar-foreground hover:text-white" data-testid={`link-${item.title.toLowerCase()}`}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
