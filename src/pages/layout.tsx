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
import { useLocation } from "react-router-dom"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

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

export default function Layout() {
  const location = useLocation();

  const renderContent = () => {
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
        return <Home />;
    }
  };

  return (
    <SidebarProvider>
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
