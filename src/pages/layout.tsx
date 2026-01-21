import { SidebarProvider, SidebarTrigger} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import Home from "./home"
import Users from "./users"
import { useLocation } from "react-router-dom"

export default function Layout() {
  const location = useLocation();

  const renderContent = () => {
    switch (location.pathname) {
      case "/home":
        return <Home />;

      case "/users":
        return <Users />;
      default:
        return <Home />;
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar/>
      <main className="min-h-screen overflow-hidden dark:bg-gradient-to-br from-zinc-900 via-black to-zinc-900 w-full dark:text-white">
        <SidebarTrigger/>
        <div className="flex-1 overflow-auto">
          {renderContent()}
        </div>
      </main>
    </SidebarProvider>
  )
}
