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
  Cylinder,
  Droplets,
  FlaskConical,
  StickyNote,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getCurrentUser } from "@/lib/user-api";
import { getItemsByGroupForMenu, type MenuItem as ItemMenuItem } from "@/lib/item-api";

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
  SidebarSeparator,
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
    title: "Stock Entry",
    icon: Box,
    path: "/manufacturing/stock-entry",
  },
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
];

// Rm Film Stock is rendered as expandable with sub-items from item table (item group: rm film)




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
  {
    title: "Templates",
    icon: Building2,
    path: "/masters/template",
  },
  {
    title: "Machine",
    icon: Building2,
    path: "/masters/machine",
  },
  {
    title: "Operator",
    icon: Building2,
    path: "/masters/operator",
  },
];


const RM_FILM_GROUP = "rm film";
const RM_INK_GROUP = "ink";
const RM_ADHESIVE_GROUP = "adhesive";
const RM_CHEMICAL_GROUP = "chemical";

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { setOpenMobile, state, toggleSidebar } = useSidebar();
  const [currentUser, setCurrentUser] = useState<{
    username: string;
    role: string;
    department?: string;
  } | null>(null);

  const [isMastersOpen, setIsMastersOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isRmRollsStockOpen, setIsRmRollsStockOpen] = useState(false);
  const [isRmInkStockOpen, setIsRmInkStockOpen] = useState(false);
  const [isRmAdhesiveStockOpen, setIsRmAdhesiveStockOpen] = useState(false);
  const [isRmChemicalStockOpen, setIsRmChemicalStockOpen] = useState(false);
  const [rmFilmMenuItems, setRmFilmMenuItems] = useState<ItemMenuItem[]>([]);
  const [rmInkMenuItems, setRmInkMenuItems] = useState<ItemMenuItem[]>([]);
  const [rmAdhesiveMenuItems, setRmAdhesiveMenuItems] = useState<ItemMenuItem[]>([]);
  const [rmChemicalMenuItems, setRmChemicalMenuItems] = useState<ItemMenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Stock department user: can access Item/Party masters, Stock Entry, and all stock reports only; no Work Order / Job Card
  const isStockUser =
    currentUser?.role === "user" &&
    (currentUser?.department?.toLowerCase() === "stock" || currentUser?.department === "Stock");

  // Printing department user: hide Stock Entry and RM stock reports
  const isPrintingUser =
    currentUser?.role === "user" &&
    (currentUser?.department?.toLowerCase() === "printing" || currentUser?.department === "Printing");



  const toggleMasters = () => {
    setIsMastersOpen(!isMastersOpen);
  };

  const toggleReports = () => {
    setIsReportsOpen(!isReportsOpen);
  };

  const toggleRmRollsStock = () => {
    setIsRmRollsStockOpen(!isRmRollsStockOpen);
  };

  const toggleRmInkStock = () => {
    setIsRmInkStockOpen(!isRmInkStockOpen);
  };

  const toggleRmAdhesiveStock = () => {
    setIsRmAdhesiveStockOpen(!isRmAdhesiveStockOpen);
  };

  const toggleRmChemicalStock = () => {
    setIsRmChemicalStockOpen(!isRmChemicalStockOpen);
  };

  useEffect(() => {
    if (state === "collapsed") {
      setIsMastersOpen(false);
      setIsReportsOpen(false);
      setIsRmRollsStockOpen(false);
      setIsRmInkStockOpen(false);
      setIsRmAdhesiveStockOpen(false);
      setIsRmChemicalStockOpen(false);
    }
  }, [state]);

  // Auto-expand Reports when on a report subpage
  useEffect(() => {
    if (location.pathname.startsWith("/manufacturing/reports/")) {
      setIsReportsOpen(true);
    }
  }, [location.pathname]);

  // Auto-expand Rm Film Stock when on stock report page
  useEffect(() => {
    if (location.pathname === "/manufacturing/reports/stock") {
      setIsRmRollsStockOpen(true);
    }
  }, [location.pathname]);

  // Auto-expand Rm Ink Stock when on ink stock report page
  useEffect(() => {
    if (location.pathname === "/manufacturing/reports/ink-stock") {
      setIsRmInkStockOpen(true);
    }
  }, [location.pathname]);

  // Auto-expand Rm Adhesive Stock when on adhesive stock report page
  useEffect(() => {
    if (location.pathname === "/manufacturing/reports/adhesive-stock") {
      setIsRmAdhesiveStockOpen(true);
    }
  }, [location.pathname]);

  // Auto-expand Rm Chemical Stock when on chemical stock report page
  useEffect(() => {
    if (location.pathname === "/manufacturing/reports/chemical-stock") {
      setIsRmChemicalStockOpen(true);
    }
  }, [location.pathname]);

  // Fetch RM film items for Rm Film Stock sub-menu
  useEffect(() => {
    const fetchRmFilmItems = async () => {
      try {
        const items = await getItemsByGroupForMenu(RM_FILM_GROUP);
        setRmFilmMenuItems(items);
      } catch (err) {
        console.error("Failed to load item codes for Rm Film Stock menu:", err);
        setRmFilmMenuItems([]);
      }
    };
    if (isReportsOpen) {
      fetchRmFilmItems();
    }
  }, [isReportsOpen]);

  // Fetch RM ink items for Rm Ink Stock sub-menu
  useEffect(() => {
    const fetchRmInkItems = async () => {
      try {
        const items = await getItemsByGroupForMenu(RM_INK_GROUP);
        setRmInkMenuItems(items);
      } catch (err) {
        console.error("Failed to load item codes for Rm Ink Stock menu:", err);
        setRmInkMenuItems([]);
      }
    };
    if (isReportsOpen) {
      fetchRmInkItems();
    }
  }, [isReportsOpen]);

  // Fetch RM adhesive items for Rm Adhesive Stock sub-menu
  useEffect(() => {
    const fetchRmAdhesiveItems = async () => {
      try {
        const items = await getItemsByGroupForMenu(RM_ADHESIVE_GROUP);
        setRmAdhesiveMenuItems(items);
      } catch (err) {
        console.error("Failed to load item codes for Rm Adhesive Stock menu:", err);
        setRmAdhesiveMenuItems([]);
      }
    };
    if (isReportsOpen) {
      fetchRmAdhesiveItems();
    }
  }, [isReportsOpen]);

  // Fetch RM chemical items for Rm Chemical Stock sub-menu
  useEffect(() => {
    const fetchRmChemicalItems = async () => {
      try {
        const items = await getItemsByGroupForMenu(RM_CHEMICAL_GROUP);
        setRmChemicalMenuItems(items);
      } catch (err) {
        console.error("Failed to load item codes for Rm Chemical Stock menu:", err);
        setRmChemicalMenuItems([]);
      }
    };
    if (isReportsOpen) {
      fetchRmChemicalItems();
    }
  }, [isReportsOpen]);

  // Fetch current user info
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser({
          username: user.username,
          role: user.role,
          department: user.department,
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
              {manufacturingItems
                .filter((item) => {
                  // Stock user: only Stock Entry; hide Work Order and Job Card
                  if (isStockUser) {
                    return item.title === "Stock Entry";
                  }
                  // Printing user: hide Stock Entry
                  if (isPrintingUser && item.title === "Stock Entry") {
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
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={toggleReports}
                  className="w-full justify-between"
                >
                  <div className="flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    <span>Reports</span>
                  </div>
                  {isReportsOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isReportsOpen && (
                <div className="ml-4 space-y-1">
                  {!isPrintingUser && (
                    <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={toggleRmRollsStock}
                      className="w-full justify-between pl-8"
                    >
                      <div className="flex items-center">
                        <Cylinder className="h-4 w-4 mr-2 rotate-90" />
                        <span>Rm Film Stock</span>
                      </div>
                      {isRmRollsStockOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {isRmRollsStockOpen && (
                    <div className="ml-4 space-y-1">
                      <SidebarMenuItem key="stock-all">
                        <SidebarMenuButton
                          isActive={
                            location.pathname === "/manufacturing/reports/stock" &&
                            !searchParams.get("itemCode")
                          }
                          onClick={() => handleNavigation("/manufacturing/reports/stock")}
                          className="w-full pl-10"
                        >
                          <span>All</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      {rmFilmMenuItems.map((item) => {
                        const itemPath = `/manufacturing/reports/stock?itemCode=${encodeURIComponent(item.item_code)}`;
                        const isItemActive =
                          location.pathname === "/manufacturing/reports/stock" &&
                          searchParams.get("itemCode") === item.item_code;
                        return (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              isActive={isItemActive}
                              onClick={() => handleNavigation(itemPath)}
                              className="w-full pl-10"
                            >
                              <span>{item.item_code}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </div>
                  )}
                    </>
                  )}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={location.pathname === "/manufacturing/reports/roll-issues"}
                      onClick={() => handleNavigation("/manufacturing/reports/roll-issues")}
                      className="w-full pl-8"
                    >
                      <Cylinder className="h-4 w-4 mr-2 rotate-90" />
                      <span>Rm Film Issued</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarSeparator className="my-2" />
                  {!isPrintingUser && (
                    <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={toggleRmInkStock}
                      className="w-full justify-between pl-8"
                    >
                      <div className="flex items-center">
                        <Droplets className="h-4 w-4 mr-2" />
                        <span>Rm Ink Stock</span>
                      </div>
                      {isRmInkStockOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {isRmInkStockOpen && (
                    <div className="ml-4 space-y-1">
                      <SidebarMenuItem key="ink-stock-all">
                        <SidebarMenuButton
                          isActive={
                            location.pathname === "/manufacturing/reports/ink-stock" &&
                            !searchParams.get("itemCode")
                          }
                          onClick={() => handleNavigation("/manufacturing/reports/ink-stock")}
                          className="w-full pl-10"
                        >
                          <span>All</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      {rmInkMenuItems.map((item) => {
                        const itemPath = `/manufacturing/reports/ink-stock?itemCode=${encodeURIComponent(item.item_code)}`;
                        const isItemActive =
                          location.pathname === "/manufacturing/reports/ink-stock" &&
                          searchParams.get("itemCode") === item.item_code;
                        return (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              isActive={isItemActive}
                              onClick={() => handleNavigation(itemPath)}
                              className="w-full pl-10"
                            >
                              <span>{item.item_code}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </div>
                  )}
                    </>
                  )}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={location.pathname === "/manufacturing/reports/ink-issues"}
                      onClick={() => handleNavigation("/manufacturing/reports/ink-issues")}
                      className="w-full pl-8"
                    >
                      <Droplets className="h-4 w-4 mr-2" />
                      <span>Rm Ink Issued</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarSeparator className="my-2" />
                  {!isPrintingUser && (
                    <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={toggleRmAdhesiveStock}
                      className="w-full justify-between pl-8"
                    >
                      <div className="flex items-center">
                        <StickyNote className="h-4 w-4 mr-2" />
                        <span>Rm Adhesive Stock</span>
                      </div>
                      {isRmAdhesiveStockOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {isRmAdhesiveStockOpen && (
                    <div className="ml-4 space-y-1">
                      <SidebarMenuItem key="adhesive-stock-all">
                        <SidebarMenuButton
                          isActive={
                            location.pathname === "/manufacturing/reports/adhesive-stock" &&
                            !searchParams.get("itemCode")
                          }
                          onClick={() => handleNavigation("/manufacturing/reports/adhesive-stock")}
                          className="w-full pl-10"
                        >
                          <span>All</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      {rmAdhesiveMenuItems.map((item) => {
                        const itemPath = `/manufacturing/reports/adhesive-stock?itemCode=${encodeURIComponent(item.item_code)}`;
                        const isItemActive =
                          location.pathname === "/manufacturing/reports/adhesive-stock" &&
                          searchParams.get("itemCode") === item.item_code;
                        return (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              isActive={isItemActive}
                              onClick={() => handleNavigation(itemPath)}
                              className="w-full pl-10"
                            >
                              <span>{item.item_code}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </div>
                  )}
                    </>
                  )}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={location.pathname === "/manufacturing/reports/adhesive-issues"}
                      onClick={() => handleNavigation("/manufacturing/reports/adhesive-issues")}
                      className="w-full pl-8"
                    >
                      <StickyNote className="h-4 w-4 mr-2" />
                      <span>Rm Adhesive Issued</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarSeparator className="my-2" />
                  {!isPrintingUser && (
                    <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={toggleRmChemicalStock}
                      className="w-full justify-between pl-8"
                    >
                      <div className="flex items-center">
                        <FlaskConical className="h-4 w-4 mr-2" />
                        <span>Rm Chemical Stock</span>
                      </div>
                      {isRmChemicalStockOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {isRmChemicalStockOpen && (
                    <div className="ml-4 space-y-1">
                      <SidebarMenuItem key="chemical-stock-all">
                        <SidebarMenuButton
                          isActive={
                            location.pathname === "/manufacturing/reports/chemical-stock" &&
                            !searchParams.get("itemCode")
                          }
                          onClick={() => handleNavigation("/manufacturing/reports/chemical-stock")}
                          className="w-full pl-10"
                        >
                          <span>All</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      {rmChemicalMenuItems.map((item) => {
                        const itemPath = `/manufacturing/reports/chemical-stock?itemCode=${encodeURIComponent(item.item_code)}`;
                        const isItemActive =
                          location.pathname === "/manufacturing/reports/chemical-stock" &&
                          searchParams.get("itemCode") === item.item_code;
                        return (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              isActive={isItemActive}
                              onClick={() => handleNavigation(itemPath)}
                              className="w-full pl-10"
                            >
                              <span>{item.item_code}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </div>
                  )}
                    </>
                  )}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={location.pathname === "/manufacturing/reports/chemical-issues"}
                      onClick={() => handleNavigation("/manufacturing/reports/chemical-issues")}
                      className="w-full pl-8"
                    >
                      <FlaskConical className="h-4 w-4 mr-2" />
                      <span>Rm Chemical Issued</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Separator */}
        <div className="px-4 py-2">
          <div className="h-px bg-gray-200 dark:bg-gray-700"></div>
        </div>
        {/* Masters Section - Admin/superuser: full list; Stock user: Item and Party only */}
        {(currentUser?.role === 'admin' || currentUser?.role === 'superuser' || isStockUser) && (
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
                      // Stock user: only Item and Party master
                      if (isStockUser) {
                        return item.title === 'Item' || item.title === 'Party';
                      }
                      // Hide Users and Templates for admin users - only show for superuser
                      if (currentUser?.role === 'admin' && (item.title === 'Users' || item.title === 'Templates')) {
                        return false;
                      }
                      // Hide Users for regular users
                      if (currentUser?.role === 'user' && item.title === 'Users') {
                        return false;
                      }
                      return true;
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
