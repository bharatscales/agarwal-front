
import { Navigate } from 'react-router-dom';
import { Login } from '@/pages/login';
import { useAuth } from '@/contexts/AuthContext';

export function LoginRoute() {
  const { isAuthenticated } = useAuth();

  // If already authenticated, redirect to home
  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  // If not authenticated, show login page directly
  return <Login />;
}
