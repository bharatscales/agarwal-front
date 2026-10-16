import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate } from 'react-router-dom';
import { Login } from '@/pages/login';
import { useAuth } from '@/contexts/AuthContext';
export function LoginRoute() {
    const { isAuthenticated, isLoading } = useAuth();
    if (isLoading) {
        return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-zinc-300 via-zinc-100 to-zinc-300 dark:from-zinc-900 dark:via-black dark:to-zinc-900 flex items-center justify-center p-4", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" }), _jsx("p", { className: "text-gray-500 dark:text-zinc-300", children: "Loading..." })] }) }));
    }
    if (isAuthenticated) {
        return _jsx(Navigate, { to: "/home", replace: true });
    }
    // If not authenticated, show login page directly
    return _jsx(Login, {});
}
