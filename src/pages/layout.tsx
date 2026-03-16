import { SidebarProvider, useSidebar } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import Home from "./home"
import Users from "./users"
import Item from "./item"
import Party from "./party"
import Template from "./template"
import Machine from "./machine"
import Operator from "./operator"
import Warehouse from "./warehouse"
import Operation from "./operation"
import WorkOrder from "./work-order"
import WorkOrderDetail from "./work-order-detail"
import JobCard from "./job-card"
import StockEntry from "./stock-entry"
import StockEntryItems from "./stock-entry-items"
import StockEntryChemItems from "./stock-entry-chem-items"
import Reports from "./reports"
import WipReport from "./wip-report"
import StockReport from "./stock-report"
import RollIssuesReport from "./roll-issues-report"
import InkStockReport from "./ink-stock-report"
import InkIssuesReport from "./ink-issues-report"
import AdhesiveStockReport from "./adhesive-stock-report"
import AdhesiveIssuesReport from "./adhesive-issues-report"
import ChemicalStockReport from "./chemical-stock-report"
import ChemicalIssuesReport from "./chemical-issues-report"
import { useLocation } from "react-router-dom"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/user-api"
import { useState, useEffect } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"

function MobileMenuToggle() {
  const { toggleSidebar, isMobile } = useSidebar();

  if (!isMobile) {
    return null;
  }

  return (
    <Button
      onClick={toggleSidebar}
      className="fixed bottom-4 left-4 z-50 h-10 w-10 rounded-full shadow-lg md:hidden"
      size="icon"
      aria-label="Toggle menu"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}

// Paths that printing department users (role=user, department=Printing) must not access
const PRINTING_USER_BLOCKED_PATHS = [
  "/manufacturing/stock-entry",
  "/manufacturing/reports/stock",
  "/manufacturing/reports/ink-stock",
  "/manufacturing/reports/adhesive-stock",
  "/manufacturing/reports/chemical-stock",
];
const isPrintingUserBlockedPath = (path: string) =>
  path === "/manufacturing/stock-entry" ||
  path.startsWith("/manufacturing/stock-entry/") ||
  PRINTING_USER_BLOCKED_PATHS.includes(path);

// Inspection department: only work-order and job-card; block home, stock-entry, reports, masters
const isInspectUserBlockedPath = (path: string) =>
  path === "/home" ||
  path === "/manufacturing/stock-entry" ||
  path.startsWith("/manufacturing/stock-entry/") ||
  path.startsWith("/manufacturing/reports") ||
  path.startsWith("/masters/") ||
  path === "/users";

export default function Layout() {
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [stockUserBlock, setStockUserBlock] = useState<boolean | null>(null);
  const [printingUserBlock, setPrintingUserBlock] = useState<boolean | null>(null);

  const isFloorUser =
    !authLoading &&
    !!user &&
    user.role === "user" &&
    (user.department?.toLowerCase() === "floor" || user.department === "Floor");

  const isInspectUser =
    !authLoading &&
    !!user &&
    user.role === "user" &&
    (user.department?.toLowerCase() === "inspection" || user.department === "Inspection");

  // Block work-order and job-card for stock department users (role=user, department=stock)
  useEffect(() => {
    const path = location.pathname;
    const isBlockedPath =
      path === "/manufacturing/work-order" ||
      path === "/manufacturing/job-card" ||
      (path.startsWith("/manufacturing/work-order/") && path !== "/manufacturing/work-order");
    if (!isBlockedPath) {
      setStockUserBlock(false);
      return;
    }
    let cancelled = false;
    getCurrentUser()
      .then((user) => {
        if (cancelled) return;
        const isStock =
          user.role === "user" &&
          (user.department?.toLowerCase() === "stock" || user.department === "Stock");
        setStockUserBlock(!!isStock);
      })
      .catch(() => {
        if (!cancelled) setStockUserBlock(false);
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  // Block stock-entry and RM stock reports for printing department users (role=user, department=Printing)
  useEffect(() => {
    if (!isPrintingUserBlockedPath(location.pathname)) {
      setPrintingUserBlock(false);
      return;
    }
    let cancelled = false;
    getCurrentUser()
      .then((user) => {
        if (cancelled) return;
        const isPrinting =
          user.role === "user" &&
          (user.department?.toLowerCase() === "printing" || user.department === "Printing");
        setPrintingUserBlock(!!isPrinting);
      })
      .catch(() => {
        if (!cancelled) setPrintingUserBlock(false);
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const renderContent = () => {
    // Inspection department: only work-order and job-card; redirect blocked paths to work-order
    if (isInspectUser && isInspectUserBlockedPath(location.pathname)) {
      return <Navigate to="/manufacturing/work-order" replace />;
    }
    const isBlockedPath =
      location.pathname === "/manufacturing/work-order" ||
      location.pathname === "/manufacturing/job-card" ||
      (location.pathname.startsWith("/manufacturing/work-order/") && location.pathname !== "/manufacturing/work-order");
    if (isBlockedPath && stockUserBlock === true) {
      return <Navigate to="/home" replace />;
    }
    if (isBlockedPath && stockUserBlock === null) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
        </div>
      );
    }
    if (isPrintingUserBlockedPath(location.pathname) && printingUserBlock === true) {
      return <Navigate to="/home" replace />;
    }
    if (isPrintingUserBlockedPath(location.pathname) && printingUserBlock === null) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
        </div>
      );
    }
    switch (location.pathname) {
      case "/home":
        return <Home />;

      case "/users":
        return <Users />;
      case "/masters/item":
        return <Item />;
      case "/masters/party":
        return <Party />;
      case "/masters/template":
        return <Template />;
      case "/masters/machine":
        return <Machine />;
      case "/masters/operator":
        return <Operator />;
      case "/masters/warehouse":
        return <Warehouse />;
      case "/masters/operation":
        return <Operation />;
      case "/manufacturing/work-order":
        return <WorkOrder />;
      case "/manufacturing/job-card":
        return <JobCard />;
      case "/manufacturing/stock-entry":
        return <StockEntry />;
      default:
        if (location.pathname.startsWith("/manufacturing/work-order/") && location.pathname !== "/manufacturing/work-order") {
          return <WorkOrderDetail />;
        }
        if (location.pathname.startsWith("/manufacturing/stock-entry/") && location.pathname !== "/manufacturing/stock-entry") {
          // Check if it's a chem stock entry page
          if (location.pathname.endsWith("/chem")) {
            return <StockEntryChemItems />;
          }
          // Default to rolls stock entry
          return <StockEntryItems />;
        }
        if (location.pathname === "/manufacturing/reports") {
          return <Reports />;
        }
        if (location.pathname === "/manufacturing/reports/stock") {
          return <StockReport />;
        }
        if (location.pathname === "/manufacturing/reports/roll-issues") {
          return <RollIssuesReport />;
        }
        if (location.pathname === "/manufacturing/reports/ink-stock") {
          return <InkStockReport />;
        }
        if (location.pathname === "/manufacturing/reports/ink-issues") {
          return <InkIssuesReport />;
        }
        if (location.pathname === "/manufacturing/reports/adhesive-stock") {
          return <AdhesiveStockReport />;
        }
        if (location.pathname === "/manufacturing/reports/adhesive-issues") {
          return <AdhesiveIssuesReport />;
        }
        if (location.pathname === "/manufacturing/reports/chemical-stock") {
          return <ChemicalStockReport />;
        }
        if (location.pathname === "/manufacturing/reports/chemical-issues") {
          return <ChemicalIssuesReport />;
        }
        if (location.pathname === "/manufacturing/reports/wip-all") {
          return <WipReport />;
        }
        if (location.pathname === "/manufacturing/reports/wip-printing") {
          return <WipReport />;
        }
        if (location.pathname === "/manufacturing/reports/wip-inspection") {
          return <WipReport />;
        }
        if (location.pathname === "/manufacturing/reports/wip-ecl") {
          return <WipReport />;
        }
        if (location.pathname === "/manufacturing/reports/wip-lamination") {
          return <WipReport />;
        }
        return <Home />;
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={!isFloorUser}>
      <AppSidebar/>
      <main className="min-h-screen overflow-hidden dark:bg-gradient-to-br from-zinc-900 via-black to-zinc-900 w-full dark:text-white">
        <div className="flex-1 overflow-auto">
          {renderContent()}
        </div>
      </main>
      <MobileMenuToggle />
    </SidebarProvider>
  )
}
