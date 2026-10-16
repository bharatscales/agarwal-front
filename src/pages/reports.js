import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
export default function Reports() {
    return (_jsxs("div", { className: "px-6 pt-2 pb-6", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-lg sm:text-xl font-bold", children: "Reports" }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-2", children: "View manufacturing reports." })] }), _jsx("div", { className: "grid gap-4", children: _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Stock Report" }), _jsx(CardDescription, { children: "View and analyze stock inventory reports." })] }), _jsx(CardContent, { children: _jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "Stock report content will be available here." }) })] }) })] }));
}
