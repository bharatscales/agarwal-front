import Layout from "./pages/layout";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginRoute } from "./components/LoginRoute";

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/home" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            } />

            <Route path="/users" element={
              <ProtectedRoute requiredRole="superuser">
                <Layout />
              </ProtectedRoute>
            } />
            <Route path="/masters/item" element={
              <ProtectedRoute requiredRole="admin">
                <Layout />
              </ProtectedRoute>
            } />
            <Route path="/masters/party" element={
              <ProtectedRoute requiredRole="admin">
                <Layout />
              </ProtectedRoute>
            } />
            <Route path="/masters/template" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            } />
            <Route path="/masters/warehouse" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            } />
            <Route path="/masters/operation" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            } />
            <Route path="/manufacturing/work-order" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            } />
            <Route path="/manufacturing/job-card" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            } />
            <Route path="/manufacturing/stock-entry" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            } />
            <Route path="/manufacturing/stock-entry/:voucherId" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            } />
            <Route path="/manufacturing/reports" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
