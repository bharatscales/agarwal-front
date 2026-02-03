import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import Home from "./home"
import Users from "./users"
import Item from "./item"
import Warehouse from "./warehouse"
import Operation from "./operation"
import WorkOrder from "./work-order"
import JobCard from "./job-card"
import StockEntry from "./stock-entry"
import Reports from "./reports"
import { useLocation } from "react-router-dom"

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
      case "/manufacturing/reports":
        return <Reports />;
      default:
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
    </SidebarProvider>
  )
}
