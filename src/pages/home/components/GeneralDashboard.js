import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { homeActions } from "../constants";
export function GeneralDashboard({ isPrintingUser, onNavigate }) {
    return (_jsxs("div", { className: "px-6 pt-2 pb-6", children: [_jsx("div", { className: "mb-6", children: _jsx("div", { className: "flex items-center justify-between", children: _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold", children: "Home Dashboard" }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-2", children: "Welcome to Production ERP" })] }) }) }), _jsx("div", { className: "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 max-w-4xl", children: homeActions
                    .filter(({ path, label }) => {
                    if (isPrintingUser && (path === "/manufacturing/stock-entry" || label === "Stock")) {
                        return false;
                    }
                    return true;
                })
                    .map(({ label, icon: Icon, path }) => (_jsxs(Button, { type: "button", variant: "outline", className: "h-24 flex flex-col items-center justify-center gap-2 text-base", onClick: () => {
                        if (path)
                            onNavigate(path);
                    }, children: [_jsx(Icon, { className: "h-6 w-6" }), _jsx("span", { children: label })] }, label))) })] }));
}
