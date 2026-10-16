import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, Sun, Moon } from "lucide-react";
import logo from "../assets/logo.svg";
export function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [localTheme, setLocalTheme] = useState("light");
    const { login } = useAuth();
    const navigate = useNavigate();
    // Local theme toggle without API calls
    const toggleLocalTheme = () => {
        const newTheme = localTheme === "light" ? "dark" : "light";
        setLocalTheme(newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };
    // Initialize local theme from document on component mount
    useEffect(() => {
        const isDark = document.documentElement.classList.contains('dark');
        setLocalTheme(isDark ? 'dark' : 'light');
    }, []);
    const handleSubmit = async (e) => {
        e.preventDefault();
        // Clear previous errors
        setError("");
        // Basic validation
        if (!username.trim()) {
            setError("Username is required");
            return;
        }
        if (!password.trim()) {
            setError("Password is required");
            return;
        }
        setIsLoading(true);
        try {
            const success = await login(username.trim(), password);
            if (success) {
                // Redirect to home page after successful login
                navigate("/home");
            }
            else {
                setError("Invalid username or password. Please check your credentials and try again.");
            }
        }
        catch (err) {
            console.error("Login error:", err);
            // Handle different types of errors
            if (err.response?.status === 401) {
                setError("Invalid username or password");
            }
            else if (err.response?.status === 500) {
                setError("Server error. Please try again later.");
            }
            else if (err.message?.includes("Network")) {
                setError("Network error. Please check your connection and try again.");
            }
            else {
                setError("Login failed. Please try again.");
            }
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-zinc-300 via-zinc-100 to-zinc-300 dark:from-zinc-900 dark:via-black dark:to-zinc-900 flex items-center justify-center p-4", children: _jsx(Card, { className: "w-full max-w-sm", children: _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs(CardHeader, { children: [_jsxs("div", { className: "relative", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: toggleLocalTheme, className: "absolute top-0 right-0 h-8 w-8 p-0", title: `Switch to ${localTheme === 'light' ? 'dark' : 'light'} mode`, children: localTheme === 'dark' ? _jsx(Sun, { className: "h-4 w-4" }) : _jsx(Moon, { className: "h-4 w-4" }) }), _jsx("div", { className: "flex justify-center", children: _jsx("img", { src: logo, alt: "Logo", className: "h-24 w-24" }) })] }), _jsx(CardTitle, { className: "text-4xl text-center", children: "Login" })] }), _jsx(CardContent, { children: _jsxs("div", { className: "flex flex-col gap-6", children: [error && (_jsx("div", { className: "text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800", children: error })), _jsxs("div", { className: "grid gap-2", children: [_jsx(Label, { htmlFor: "username", children: "Username" }), _jsx(Input, { id: "username", type: "text", placeholder: "Enter your username", value: username, onChange: (e) => setUsername(e.target.value), required: true, disabled: isLoading, className: error && !username.trim() ? "border-red-500" : "" })] }), _jsxs("div", { className: "grid gap-2", children: [_jsx(Label, { htmlFor: "password", children: "Password" }), _jsxs("div", { className: "relative", children: [_jsx(Input, { id: "password", type: showPassword ? "text" : "password", placeholder: "Enter your password", value: password, onChange: (e) => setPassword(e.target.value), required: true, disabled: isLoading, className: `pr-10 ${error && !password.trim() ? "border-red-500" : ""}` }), _jsx("button", { type: "button", onClick: () => setShowPassword(!showPassword), className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200", disabled: isLoading, children: showPassword ? (_jsx(EyeOff, { className: "h-4 w-4" })) : (_jsx(Eye, { className: "h-4 w-4" })) })] })] })] }) }), _jsx(CardFooter, { className: "flex-col gap-2", children: _jsx(Button, { type: "submit", className: "w-full text-lg py-4 mt-8", disabled: isLoading, children: isLoading ? "Logging in..." : "Login" }) })] }) }) }));
}
