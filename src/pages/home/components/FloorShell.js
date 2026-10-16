import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { IMPERSONATION_BAR_HEIGHT } from "@/components/ImpersonationBar";
import { cn } from "@/lib/utils";
export function FloorShell({ isMobile, sidebarState, floorView, floorViewLabel, userName, onBackToDepartments, isScaleConnected, isScaleConnecting, scaleWeight, scaleWeightError, isSerialSupported, onConnectScale, printerName, printerAvailable, websocketConnected, printingPrintStatus, children, }) {
    const { impersonatedBy } = useAuth();
    const impersonationOffset = impersonatedBy ? IMPERSONATION_BAR_HEIGHT : 0;
    return (_jsxs("div", { className: cn("pt-16 pb-10 min-h-screen", floorView && "bg-background"), "data-floor-theme": floorView ?? undefined, children: [_jsxs("div", { className: cn("fixed h-16 flex items-center justify-between px-4 z-40 transition-all duration-200", floorView
                    ? "bg-secondary border-b-2 border-primary/40"
                    : "bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800"), style: {
                    top: impersonationOffset,
                    left: isMobile ? 0 : sidebarState === "expanded" ? "14rem" : "3rem",
                    right: 0,
                }, children: [floorView !== null && (_jsx("div", { className: "absolute left-1/2 -translate-x-1/2 pointer-events-none", children: _jsx("h2", { className: "text-lg font-semibold text-primary capitalize", children: floorViewLabel ?? floorView }) })), _jsxs("div", { className: "flex items-center gap-3", children: [floorView !== null && (_jsxs(Button, { type: "button", variant: "ghost", size: "sm", className: "gap-2 -ml-2 shrink-0 h-auto py-1.5 px-2", onClick: onBackToDepartments, "aria-label": "Back to Departments", title: "Back to Departments", children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), _jsxs("span", { className: "flex flex-col items-start leading-tight", children: [_jsx("span", { className: "text-sm font-semibold", children: "Floor Dashboard" }), _jsxs("span", { className: "text-xs text-gray-600 dark:text-gray-400", children: ["Welcome, ", userName ?? "User", "."] })] })] })), floorView === null && (_jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-sm font-semibold text-gray-900 dark:text-gray-100", children: "Floor Dashboard" }), _jsxs("span", { className: "text-xs text-gray-600 dark:text-gray-400", children: ["Welcome, ", userName ?? "User", "."] })] }))] }), _jsx("div", { className: "flex items-center gap-4", children: _jsxs("div", { className: cn("rounded-md px-3 py-2 min-w-[130px] text-center flex flex-col items-center justify-center gap-1", floorView
                                ? "border border-primary/30 bg-background"
                                : "border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"), children: [_jsx("div", { className: "text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium", children: "Weight" }), isScaleConnected || isScaleConnecting ? (_jsx("div", { className: "text-lg font-bold tabular-nums text-gray-900 dark:text-gray-100", children: scaleWeightError
                                        ? scaleWeightError
                                        : scaleWeight != null
                                            ? `${Number(scaleWeight).toFixed(2)} kg`
                                            : "…" })) : (_jsx(Button, { type: "button", variant: "default", size: "sm", className: "h-8 min-w-[90px] px-3 text-xs font-semibold", onClick: onConnectScale, disabled: !isSerialSupported || isScaleConnecting, children: !isSerialSupported ? "No Serial" : "Connect" }))] }) })] }), _jsx("div", { className: "px-6 pt-4 pb-6", children: children }), _jsxs("div", { className: cn("fixed bottom-0 h-7 flex items-center justify-between px-3 z-50 transition-all duration-200", floorView
                    ? "bg-secondary border-t-2 border-primary/40"
                    : "bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"), style: {
                    left: isMobile ? 0 : sidebarState === "expanded" ? "14rem" : "3rem",
                    right: 0,
                }, children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "text-xs text-gray-600 dark:text-gray-400 font-medium", children: "Printer:" }), _jsx("span", { className: "text-xs text-gray-900 dark:text-gray-100 font-semibold", children: printerName || "Loading..." })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-gray-600 dark:text-gray-400 font-medium", children: "Status:" }), _jsx("span", { className: `text-xs font-semibold ${!printerAvailable
                                    ? "text-red-600 dark:text-red-400"
                                    : printingPrintStatus === "printing"
                                        ? "text-primary"
                                        : printingPrintStatus === "done"
                                            ? "text-green-600 dark:text-green-400"
                                            : websocketConnected
                                                ? "text-gray-600 dark:text-gray-400"
                                                : "text-yellow-600 dark:text-yellow-400"}`, children: !printerAvailable
                                    ? "Not available"
                                    : printingPrintStatus === "printing"
                                        ? "Printing..."
                                        : printingPrintStatus === "done"
                                            ? "Done"
                                            : websocketConnected
                                                ? "Idle"
                                                : "Poll" })] })] })] }));
}
