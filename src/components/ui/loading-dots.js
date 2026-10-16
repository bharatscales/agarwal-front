import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export function LoadingDots({ className, size = "md" }) {
    const sizeClasses = {
        sm: "h-3 w-3",
        md: "h-4 w-4",
        lg: "h-5 w-5"
    };
    return (_jsxs("div", { className: cn("flex items-center space-x-1", className), children: [_jsx("div", { className: cn("animate-bounce", sizeClasses[size]), children: _jsx("div", { className: "h-full w-full rounded-full bg-current opacity-75" }) }), _jsx("div", { className: cn("animate-bounce [animation-delay:-0.3s]", sizeClasses[size]), children: _jsx("div", { className: "h-full w-full rounded-full bg-current opacity-75" }) }), _jsx("div", { className: cn("animate-bounce [animation-delay:-0.5s]", sizeClasses[size]), children: _jsx("div", { className: "h-full w-full rounded-full bg-current opacity-75" }) })] }));
}
