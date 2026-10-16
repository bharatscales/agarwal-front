import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Home from "./home";
import Users from "./users";
import Item from "./item";
import ItemNew from "./item-new";
import Party from "./party";
import Template from "./template";
import Machine from "./machine";
import Operator from "./operator";
import EnumMaster from "./enum-master";
import Warehouse from "./warehouse";
import Operation from "./operation";
import WorkOrder from "./work-order";
import WorkOrderDetail from "./work-order-detail";
import OrderBook from "./order-book";
import OrderBookDetail from "./order-book-detail";
import JobCard from "./job-card";
import StockEntry from "./stock-entry";
import StockEntryPartyIndex from "./stock-entry-party-index";
import StockEntryItems from "./stock-entry-items";
import StockEntryChemItems from "./stock-entry-chem-items";
import Reports from "./reports";
import WipReport from "./wip-report";
import StockReport from "./stock-report";
import RollIssuesReport from "./roll-issues-report";
import InkStockReport from "./ink-stock-report";
import InkIssuesReport from "./ink-issues-report";
import AdhesiveStockReport from "./adhesive-stock-report";
import AdhesiveIssuesReport from "./adhesive-issues-report";
import ChemicalStockReport from "./chemical-stock-report";
import ChemicalIssuesReport from "./chemical-issues-report";
import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImpersonationBar, IMPERSONATION_BAR_HEIGHT } from "@/components/ImpersonationBar";
import { getCurrentUser } from "@/lib/user-api";
import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
function MobileMenuToggle() {
    const { toggleSidebar, isMobile } = useSidebar();
    if (!isMobile) {
        return null;
    }
    return (_jsx(Button, { onClick: toggleSidebar, className: "fixed bottom-4 left-4 z-50 h-10 w-10 rounded-full shadow-lg md:hidden", size: "icon", "aria-label": "Toggle menu", children: _jsx(Menu, { className: "h-5 w-5" }) }));
}
// Paths that printing department users (role=user, department=Printing) must not access
const PRINTING_USER_BLOCKED_PATHS = [
    "/manufacturing/stock-entry",
    "/manufacturing/reports/stock",
    "/manufacturing/reports/ink-stock",
    "/manufacturing/reports/adhesive-stock",
    "/manufacturing/reports/chemical-stock",
];
const isPrintingUserBlockedPath = (path) => path === "/manufacturing/stock-entry" ||
    path.startsWith("/manufacturing/stock-entry/") ||
    PRINTING_USER_BLOCKED_PATHS.includes(path);
// Inspection department: only work-order and job-card; block home, stock-entry, reports, masters
const isInspectUserBlockedPath = (path) => path === "/home" ||
    path === "/manufacturing/stock-entry" ||
    path.startsWith("/manufacturing/stock-entry/") ||
    path.startsWith("/manufacturing/reports") ||
    path.startsWith("/masters/") ||
    path === "/users";
export default function Layout() {
    const location = useLocation();
    const { user, isLoading: authLoading, impersonatedBy } = useAuth();
    const [stockUserBlock, setStockUserBlock] = useState(null);
    const [printingUserBlock, setPrintingUserBlock] = useState(null);
    const isFloorUser = !authLoading &&
        !!user &&
        user.role === "user" &&
        (user.department?.toLowerCase() === "floor" || user.department === "Floor");
    const isInspectUser = !authLoading &&
        !!user &&
        user.role === "user" &&
        (user.department?.toLowerCase() === "inspection" || user.department === "Inspection");
    // Block work-order and job-card for stock department users (role=user, department=stock)
    useEffect(() => {
        const path = location.pathname;
        const isBlockedPath = path === "/manufacturing/work-order" ||
            path === "/manufacturing/job-card" ||
            (path.startsWith("/manufacturing/work-order/") && path !== "/manufacturing/work-order");
        if (!isBlockedPath) {
            setStockUserBlock(false);
            return;
        }
        let cancelled = false;
        getCurrentUser()
            .then((user) => {
            if (cancelled)
                return;
            const isStock = user.role === "user" &&
                (user.department?.toLowerCase() === "stock" || user.department === "Stock");
            setStockUserBlock(!!isStock);
        })
            .catch(() => {
            if (!cancelled)
                setStockUserBlock(false);
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
            if (cancelled)
                return;
            const isPrinting = user.role === "user" &&
                (user.department?.toLowerCase() === "printing" || user.department === "Printing");
            setPrintingUserBlock(!!isPrinting);
        })
            .catch(() => {
            if (!cancelled)
                setPrintingUserBlock(false);
        });
        return () => {
            cancelled = true;
        };
    }, [location.pathname]);
    const renderContent = () => {
        // Inspection department: only work-order and job-card; redirect blocked paths to work-order
        if (isInspectUser && isInspectUserBlockedPath(location.pathname)) {
            return _jsx(Navigate, { to: "/manufacturing/work-order", replace: true });
        }
        const isBlockedPath = location.pathname === "/manufacturing/work-order" ||
            location.pathname === "/manufacturing/job-card" ||
            (location.pathname.startsWith("/manufacturing/work-order/") && location.pathname !== "/manufacturing/work-order");
        if (isBlockedPath && stockUserBlock === true) {
            return _jsx(Navigate, { to: "/home", replace: true });
        }
        if (isBlockedPath && stockUserBlock === null) {
            return (_jsx("div", { className: "flex items-center justify-center p-8", children: _jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" }) }));
        }
        if (isPrintingUserBlockedPath(location.pathname) && printingUserBlock === true) {
            return _jsx(Navigate, { to: "/home", replace: true });
        }
        if (isPrintingUserBlockedPath(location.pathname) && printingUserBlock === null) {
            return (_jsx("div", { className: "flex items-center justify-center p-8", children: _jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" }) }));
        }
        switch (location.pathname) {
            case "/home":
                return _jsx(Home, {});
            case "/users":
                return _jsx(Users, {});
            case "/masters/item/new":
                return _jsx(ItemNew, {});
            case "/masters/item":
                return _jsx(Item, {});
            case "/masters/party":
                return _jsx(Navigate, { to: "/masters/party/supplier", replace: true });
            case "/masters/party/supplier":
                return _jsx(Party, { partyKind: "supplier" }, "supplier");
            case "/masters/party/customer":
                return _jsx(Party, { partyKind: "customer" }, "customer");
            case "/masters/template":
                return _jsx(Template, {});
            case "/masters/machine":
                return _jsx(Machine, {});
            case "/masters/operator":
                return _jsx(Operator, {});
            case "/masters/enum":
                return _jsx(EnumMaster, {});
            case "/masters/warehouse":
                return _jsx(Warehouse, {});
            case "/masters/operation":
                return _jsx(Operation, {});
            case "/manufacturing/work-order":
                return _jsx(WorkOrder, {});
            case "/manufacturing/order-book":
                return _jsx(OrderBook, {});
            case "/manufacturing/job-card":
                return _jsx(JobCard, {});
            case "/manufacturing/stock-entry":
                return _jsx(StockEntryPartyIndex, {});
            default:
                if (location.pathname.startsWith("/manufacturing/work-order/") && location.pathname !== "/manufacturing/work-order") {
                    return _jsx(WorkOrderDetail, {});
                }
                if (location.pathname.startsWith("/manufacturing/order-book/") && location.pathname !== "/manufacturing/order-book") {
                    return _jsx(OrderBookDetail, {});
                }
                if (location.pathname.startsWith("/manufacturing/stock-entry/party/") &&
                    location.pathname !== "/manufacturing/stock-entry/party") {
                    return _jsx(StockEntry, {});
                }
                if (location.pathname.startsWith("/manufacturing/stock-entry/") && location.pathname !== "/manufacturing/stock-entry") {
                    // Check if it's a chem stock entry page
                    if (location.pathname.endsWith("/chem")) {
                        return _jsx(StockEntryChemItems, {});
                    }
                    // Default to rolls stock entry
                    return _jsx(StockEntryItems, {});
                }
                if (location.pathname === "/manufacturing/reports") {
                    return _jsx(Reports, {});
                }
                if (location.pathname === "/manufacturing/reports/stock") {
                    return _jsx(StockReport, {});
                }
                if (location.pathname === "/manufacturing/reports/rm-balance") {
                    return _jsx(StockReport, {});
                }
                if (location.pathname === "/manufacturing/reports/roll-issues") {
                    return _jsx(RollIssuesReport, {});
                }
                if (location.pathname === "/manufacturing/reports/ink-stock") {
                    return _jsx(InkStockReport, {});
                }
                if (location.pathname === "/manufacturing/reports/ink-issues") {
                    return _jsx(InkIssuesReport, {});
                }
                if (location.pathname === "/manufacturing/reports/adhesive-stock") {
                    return _jsx(AdhesiveStockReport, {});
                }
                if (location.pathname === "/manufacturing/reports/adhesive-issues") {
                    return _jsx(AdhesiveIssuesReport, {});
                }
                if (location.pathname === "/manufacturing/reports/chemical-stock") {
                    return _jsx(ChemicalStockReport, {});
                }
                if (location.pathname === "/manufacturing/reports/chemical-issues") {
                    return _jsx(ChemicalIssuesReport, {});
                }
                if (location.pathname === "/manufacturing/reports/wip-all") {
                    return _jsx(WipReport, {});
                }
                if (location.pathname === "/manufacturing/reports/wip-printing") {
                    return _jsx(WipReport, {});
                }
                if (location.pathname === "/manufacturing/reports/wip-inspection") {
                    return _jsx(WipReport, {});
                }
                if (location.pathname === "/manufacturing/reports/wip-ecl") {
                    return _jsx(WipReport, {});
                }
                if (location.pathname === "/manufacturing/reports/wip-lamination") {
                    return _jsx(WipReport, {});
                }
                return _jsx(Home, {});
        }
    };
    const impersonationOffset = impersonatedBy ? IMPERSONATION_BAR_HEIGHT : 0;
    if (authLoading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-screen p-8", children: _jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" }) }));
    }
    return (_jsxs(_Fragment, { children: [_jsx(ImpersonationBar, {}), _jsx("div", { style: { paddingTop: impersonationOffset }, children: _jsxs(SidebarProvider, { defaultOpen: !isFloorUser, children: [_jsx(AppSidebar, {}), _jsx("main", { className: "min-h-screen overflow-hidden dark:bg-gradient-to-br from-zinc-900 via-black to-zinc-900 w-full dark:text-white", children: _jsx("div", { className: "flex-1 overflow-auto", children: renderContent() }) }), _jsx(MobileMenuToggle, {})] }) })] }));
}
