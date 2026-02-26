import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** When "admin", allows admin or superuser. When "superuser", allows only superuser. */
  requiredRole?: "admin" | "superuser";
  /** When true with requiredRole="admin", also allows role "user" with department "Stock" (for Item/Party masters). */
  allowStockDepartment?: boolean;
}

export function ProtectedRoute({ children, requiredRole, allowStockDepartment }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-300 via-zinc-100 to-zinc-300 dark:from-zinc-900 dark:via-black dark:to-zinc-900 flex items-center justify-center p-4">
        <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className=" text-gray-500 dark:text-zinc-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access using user data from AuthContext
  if (requiredRole) {
    const isAdminOrSuperuser = user?.role === "admin" || user?.role === "superuser";
    const isStockUser =
      allowStockDepartment &&
      user?.role === "user" &&
      (user?.department?.toLowerCase() === "stock" || user?.department === "Stock");
    if (!isAdminOrSuperuser && !isStockUser) {
      return <Navigate to="/home" replace />;
    }
    if (requiredRole === "superuser" && user?.role !== "superuser") {
      return <Navigate to="/home" replace />;
    }
  }

  return <>{children}</>;
}
