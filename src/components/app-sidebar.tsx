import {
  Home,
  Building2,
  User2,
  LucidePower,
  UserCheck,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getCurrentUser } from "@/lib/user-api";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import logo from "../assets/logo.svg";

interface MenuItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  adminOnly?: boolean;
}

const items: MenuItem[] = [
  {
    title: "Home",
    icon: Home,
    path: "/home",
  },
  
];




const masterItems: MenuItem[] = [
  {
    title: "Users",
    icon: UserCheck,
    path: "/users",
  },
];


export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { setOpenMobile } = useSidebar();
  const [currentUser, setCurrentUser] = useState<{
    username: string;
    role: string;
  } | null>(null);

  const [isMastersOpen, setIsMastersOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };



  const toggleMasters = () => {
    setIsMastersOpen(!isMastersOpen);
  };


  // Fetch current user info
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser({
          username: user.username,
          role: user.role,
        });
      } catch (error) {
        console.error("Error fetching current user:", error);
        // Fallback to basic info if API fails - default to user role for security
        setCurrentUser({
          username: "User",
          role: "user",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  // Show loading state while determining user role
  if (isLoading) {
    return (
      <Sidebar
        collapsible="icon"
        className="border-r border-gray-200 dark:border-gray-800"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="min-h-15">
                <a>
                  <img
                    src={logo}
                    alt="Production ERP Logo"
                    className="h-12 w-12"
                  />
                  <div>
                    <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                      PRODUCTION ERP
                    </h1>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          
          {/* Close button for mobile devices */}
          <div className="md:hidden absolute top-4 right-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpenMobile(false)}
              className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SidebarHeader>
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-gray-200 dark:border-gray-800"
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="min-h-15">
              <a>
                <img
                  src={logo}
                  alt="Production ERP Logo"
                  className="h-12 w-12"
                />
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                    PRODUCTION ERP
                  </h1>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        
        {/* Close button for mobile devices */}
        <div className="md:hidden absolute top-4 right-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpenMobile(false)}
            className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </SidebarHeader>

      {/* Theme Toggle Button */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="w-full justify-center"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Filter items based on user role - hide admin-only items for non-admin users */}
              {/* Hide items for gate users if hideForGate is true */}
              {items
                .filter(item => {
                  // Hide admin-only items for non-admin users
                  if (item.adminOnly && currentUser?.role !== 'admin' && currentUser?.role !== 'superuser') {
                    return false;
                  }
                  return true;
                })
                .map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={isActive(item.path)}
                    onClick={() => handleNavigation(item.path)}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


        {/* Separator */}
        <div className="px-4 py-2">
          <div className="h-px bg-gray-200 dark:bg-gray-700"></div>
        </div>
        {/* Masters Section - Only visible for superuser */}
        {currentUser?.role === 'superuser' && (
        <SidebarGroup>
          <SidebarGroupLabel>Masters</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={toggleMasters}
                  className="w-full justify-between"
                >
                  <div className="flex items-center">
                    <Building2 className="h-4 w-4 mr-2" />
                    <span>Masters</span>
                  </div>
                  {isMastersOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {isMastersOpen && (
                <div className="ml-4 space-y-1">
                  {masterItems
                    .filter(item => {
                      // Hide Users for regular users
                      if (currentUser?.role !== 'user' || item.title !== 'Users') {
                        return true;
                      }
                      return false;
                    })
                    .map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        isActive={isActive(item.path)}
                        onClick={() => handleNavigation(item.path)}
                        className="w-full pl-8"
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}


        {/* Scanner Management - Admin Only */}

      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="min-h-15">
              <a>
                <User2 />
                <div>
                  <div>
                    <span>{currentUser?.username || "Loading..."}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 capitalize">
                      {currentUser?.role || "Loading..."}
                    </span>
                  </div>
                </div>
              </a>
            </SidebarMenuButton>
            <SidebarMenuAction
              asChild
              className="min-h-10 min-w-10 m-2 p-3"
              onClick={() => {
                logout();
              }}
            >
              <LucidePower />
            </SidebarMenuAction>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
