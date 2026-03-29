import { ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { Bell, LogOut, Menu } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface DashboardLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  title: string;
}

const DesktopSidebar = ({ navItems, title }: { navItems: NavItem[]; title: string }) => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut, user } = useAuth();
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4">
          {!collapsed && (
            <h2 className="text-lg font-display font-bold text-sidebar-foreground">{title}</h2>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="mt-auto p-4">
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent">
            <LogOut className="mr-2 h-4 w-4" />
            {!collapsed && 'Sign Out'}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

const BottomNav = ({ navItems }: { navItems: NavItem[] }) => {
  const location = useLocation();

  return (
    <div className="bottom-nav">
      {navItems.map((item) => (
        <Link
          key={item.title}
          to={item.url}
          className={`bottom-nav-item ${location.pathname === item.url ? 'active' : ''}`}
        >
          <item.icon className="h-5 w-5" />
          <span>{item.title}</span>
        </Link>
      ))}
    </div>
  );
};

const DashboardLayout = ({ children, navItems, title }: DashboardLayoutProps) => {
  const isMobile = useIsMobile();
  const { signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {!isMobile && <DesktopSidebar navItems={navItems} title={title} />}
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4">
            <div className="flex items-center gap-2">
              {!isMobile && <SidebarTrigger />}
              <h1 className="text-lg font-display font-semibold text-foreground">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link to={`/${title.toLowerCase()}/notifications`}>
                <Button variant="ghost" size="icon">
                  <Bell className="h-5 w-5" />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => signOut()} title="Sign Out">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </header>
          <main className="flex-1 pb-20 md:pb-0">
            {children}
          </main>
          {isMobile && <BottomNav navItems={navItems} />}
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
