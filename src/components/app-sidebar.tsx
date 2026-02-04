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
  PanelLeftClose,
  X,
  PersonStanding,
  Factory,
  Box,
  BarChart3,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const manufacturingItems: MenuItem[] = [
  {
    title: "Work Order",
    icon: Factory,
    path: "/manufacturing/work-order",
  },
  {
    title: "Job Card",
    icon: PersonStanding,
    path: "/manufacturing/job-card",
  },
  {
    title: "Stock Entry",
    icon: Box,
    path: "/manufacturing/stock-entry",
  },
  {
    title: "Reports",
    icon: BarChart3,
    path: "/manufacturing/reports",
  },
];




const masterItems: MenuItem[] = [
  {
    title: "Users",
    icon: UserCheck,
    path: "/users",
  },
  {
    title: "Item",
    icon: Building2,
    path: "/masters/item",
  },
  {
    title: "Party",
    icon: Building2,
    path: "/masters/party",
  },
];


export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { setOpenMobile, state, toggleSidebar } = useSidebar();
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

  useEffect(() => {
    if (state === "collapsed") {
      setIsMastersOpen(false);
    }
  }, [state]);


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
                    className="h-8 w-8"
                  />
                  <div>
                    <h1 className="text-sm font-bold text-gray-900 dark:text-white">
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
                  className="h-8 w-8"
                />
                <div>
                  <h1 className="text-sm font-bold text-gray-900 dark:text-white">
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
                    {item.path === "/home" && <Home className="mr-2 h-4 w-4" />}
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

        <SidebarGroup>
          <SidebarGroupLabel>Manufacturing</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {manufacturingItems.map((item) => (
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
            <SidebarMenuButton
              onClick={toggleSidebar}
              className={`w-full ${state === "collapsed" ? "justify-center" : ""}`}
            >
              <PanelLeftClose className="h-4 w-4" />
              {state !== "collapsed" && <span>Collapse</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="min-h-15">
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
            </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start">
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    toggleTheme();
                  }}
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                  <span>
                    Switch to {theme === "dark" ? "light" : "dark"} mode
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
