import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { DataTable } from "@/components/data-table";
import { getUserColumns } from "@/components/columns/user-columns";
import { createUser, deleteUser, getAllUsers, updateUser, updateUserStatus, createUserApiKey } from "@/lib/user-api";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { ArrowRight, Eye, EyeOff, Plus, RefreshCw, X, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
export default function Users() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [skip] = useState(0);
    const [limit] = useState(20);
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [isEditUserOpen, setIsEditUserOpen] = useState(false);
    const [editUserId, setEditUserId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showEditPassword, setShowEditPassword] = useState(false);
    const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        firstname: "",
        lastname: "",
        username: "",
        password: "",
        confirmPassword: "",
        role: "user",
        department: "",
    });
    const [formErrors, setFormErrors] = useState({});
    const [departmentOptions, setDepartmentOptions] = useState([]);
    const [roleOptions, setRoleOptions] = useState([]);
    const [editFormData, setEditFormData] = useState({
        firstname: "",
        lastname: "",
        username: "",
        password: "",
        confirmPassword: "",
        role: "user",
    });
    const [editErrors, setEditErrors] = useState({});
    const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
    const [createdApiKey, setCreatedApiKey] = useState(null);
    const [apiKeyCopied, setApiKeyCopied] = useState(false);
    const [creatingApiKeyForUser, setCreatingApiKeyForUser] = useState(null);
    const addFieldRefs = useRef([]);
    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const fetchedUsers = await getAllUsers(skip, limit);
            setUsers(fetchedUsers);
        }
        catch (err) {
            console.error('Error fetching users:', err);
            if (err.response?.status === 401) {
                setError("You don't have permission to view users");
            }
            else if (err.response?.status === 403) {
                setError("Access denied. Admin privileges required.");
            }
            else {
                setError("Failed to fetch users. Please try again.");
            }
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleRefresh = () => {
        fetchUsers();
    };
    const handleAddUser = () => {
        setIsAddUserOpen(true);
    };
    const handleEditUserOpen = (user) => {
        setEditUserId(user.id);
        setEditFormData({
            firstname: user.firstname || "",
            lastname: user.lastname || "",
            username: user.username || "",
            password: "",
            confirmPassword: "",
            role: user.role,
        });
        setEditErrors({});
        setIsEditUserOpen(true);
    };
    const handleInputChange = (field, value) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };
            return newData;
        });
        // Clear error when user starts typing
        if (formErrors[field]) {
            setFormErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };
    const handleEnterKey = (event, index) => {
        if (event.key !== "Enter")
            return;
        const nextField = addFieldRefs.current[index + 1];
        if (nextField) {
            event.preventDefault();
            nextField.focus();
        }
    };
    const handleEditInputChange = (field, value) => {
        setEditFormData(prev => {
            const newData = { ...prev, [field]: value };
            return newData;
        });
        if (editErrors[field]) {
            setEditErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };
    const validateForm = () => {
        const errors = {};
        if (!formData.firstname.trim()) {
            errors.firstname = "First name is required";
        }
        if (!formData.username.trim()) {
            errors.username = "Username is required";
        }
        if (!formData.password.trim()) {
            errors.password = "Password is required";
        }
        else if (formData.password.length < 6) {
            errors.password = "Password must be at least 6 characters";
        }
        if (!formData.confirmPassword.trim()) {
            errors.confirmPassword = "Please confirm your password";
        }
        else if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = "Passwords do not match";
        }
        if (formData.role === "user" && !formData.department.trim()) {
            errors.department = "Department is required for users";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const validateEditForm = () => {
        const errors = {};
        if (!editFormData.firstname.trim()) {
            errors.firstname = "First name is required";
        }
        if (!editFormData.username.trim()) {
            errors.username = "Username is required";
        }
        if (editFormData.password.trim() && editFormData.password.length < 6) {
            errors.password = "Password must be at least 6 characters";
        }
        if (editFormData.password.trim() && !editFormData.confirmPassword.trim()) {
            errors.confirmPassword = "Please confirm the password";
        }
        else if (editFormData.password.trim() &&
            editFormData.password !== editFormData.confirmPassword) {
            errors.confirmPassword = "Passwords do not match";
        }
        setEditErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }
        try {
            setIsSubmitting(true);
            // Remove confirmPassword before sending to API
            const { confirmPassword, ...userDataForAPI } = {
                ...formData,
                department: formData.department || undefined,
            };
            if (userDataForAPI.role !== "user") {
                delete userDataForAPI.department;
            }
            await createUser(userDataForAPI);
            // Close modal and refresh users
            setIsAddUserOpen(false);
            setFormData({
                firstname: "",
                lastname: "",
                username: "",
                password: "",
                confirmPassword: "",
                role: "user",
                department: "",
            });
            setFormErrors({});
            // Refresh the users list
            await fetchUsers();
        }
        catch (err) {
            console.error('Error creating user:', err);
            if (err.response?.status === 400) {
                setFormErrors({ username: "Username already exists" });
            }
            else if (err.response?.status === 401) {
                setFormErrors({ username: "You don't have permission to create users" });
            }
            else {
                setFormErrors({ username: "Failed to create user. Please try again." });
            }
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleCloseModal = () => {
        setIsAddUserOpen(false);
        setFormData({
            firstname: "",
            lastname: "",
            username: "",
            password: "",
            confirmPassword: "",
            role: "user",
            department: "",
        });
        setFormErrors({});
    };
    const handleCloseEditModal = () => {
        setIsEditUserOpen(false);
        setEditUserId(null);
        setEditFormData({
            firstname: "",
            lastname: "",
            username: "",
            password: "",
            confirmPassword: "",
            role: "user",
        });
        setEditErrors({});
        setShowEditPassword(false);
        setShowEditConfirmPassword(false);
    };
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editUserId || !validateEditForm()) {
            return;
        }
        try {
            setIsUpdating(true);
            const updatePayload = {
                firstname: editFormData.firstname,
                lastname: editFormData.lastname,
                username: editFormData.username,
                role: editFormData.role,
            };
            if (editFormData.password.trim()) {
                updatePayload.password = editFormData.password.trim();
            }
            const updatedUser = await updateUser(editUserId, updatePayload);
            setUsers(prev => prev.map(user => (user.id === updatedUser.id ? updatedUser : user)));
            handleCloseEditModal();
        }
        catch (err) {
            console.error("Error updating user:", err);
            setEditErrors({
                username: "Failed to update user. Please try again.",
            });
        }
        finally {
            setIsUpdating(false);
        }
    };
    const handleToggleStatus = async (user) => {
        try {
            const updatedUser = await updateUserStatus(user.id, !user.isEnable);
            setUsers(prev => prev.map(item => (item.id === updatedUser.id ? updatedUser : item)));
        }
        catch (err) {
            console.error("Error updating user status:", err);
        }
    };
    const handleDeleteUser = async (user) => {
        if (!window.confirm(`Delete user "${user.username}"? This cannot be undone.`)) {
            return;
        }
        try {
            await deleteUser(user.id);
            setUsers(prev => prev.filter(item => item.id !== user.id));
        }
        catch (err) {
            console.error("Error deleting user:", err);
            setError("Failed to delete user. Please try again.");
        }
    };
    const handleCreateApiKey = async (user) => {
        try {
            setCreatingApiKeyForUser(user);
            const apiKey = await createUserApiKey(user.id);
            setCreatedApiKey(apiKey);
            setIsApiKeyDialogOpen(true);
        }
        catch (err) {
            console.error("Error creating API key:", err);
            if (err.response?.status === 403) {
                setError("Only superusers can create API keys for other users");
            }
            else {
                setError("Failed to create API key. Please try again.");
            }
        }
        finally {
            setCreatingApiKeyForUser(null);
        }
    };
    const handleCopyApiKey = async () => {
        if (createdApiKey?.key) {
            try {
                await navigator.clipboard.writeText(createdApiKey.key);
                setApiKeyCopied(true);
                setTimeout(() => setApiKeyCopied(false), 2000);
            }
            catch (err) {
                console.error("Failed to copy API key:", err);
            }
        }
    };
    const handleCloseApiKeyDialog = () => {
        setIsApiKeyDialogOpen(false);
        setCreatedApiKey(null);
        setApiKeyCopied(false);
        setCreatingApiKeyForUser(null);
    };
    useEffect(() => {
        fetchUsers();
    }, [skip, limit]);
    useEffect(() => {
        if (isAddUserOpen) {
            requestAnimationFrame(() => {
                addFieldRefs.current[0]?.focus();
            });
        }
    }, [isAddUserOpen]);
    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const response = await api.get("/meta/departments");
                const options = response.data.filter(Boolean);
                setDepartmentOptions(options);
            }
            catch (error) {
                console.error("Failed to load departments:", error);
                setDepartmentOptions([]);
            }
        };
        fetchDepartments();
    }, []);
    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const response = await api.get("/meta/roles");
                const options = response.data.filter(Boolean);
                setRoleOptions(options);
            }
            catch (error) {
                console.error("Failed to load roles:", error);
                setRoleOptions([]);
            }
        };
        fetchRoles();
    }, []);
    if (isLoading && users.length === 0) {
        return (_jsxs("div", { className: "px-6 pt-2 pb-6", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-lg sm:text-xl font-bold", children: "User Management" }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-2", children: "Manage system users, roles, and permissions" })] }), _jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Loading users..." })] }) })] }));
    }
    if (error) {
        return (_jsxs("div", { className: "px-6 pt-2 pb-6", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-lg sm:text-xl font-bold", children: "User Management" }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-2", children: "Manage system users, roles, and permissions" })] }), _jsx("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6", children: _jsxs("div", { className: "text-center", children: [_jsx("h3", { className: "text-lg font-semibold text-red-800 dark:text-red-200 mb-2", children: "Error Loading Users" }), _jsx("p", { className: "text-red-600 dark:text-red-300 mb-4", children: error }), _jsxs(Button, { onClick: handleRefresh, variant: "outline", children: [_jsx(RefreshCw, { className: "mr-2 h-4 w-4" }), "Try Again"] })] }) })] }));
    }
    return (_jsxs("div", { className: "px-6 pt-2 pb-6", children: [_jsx("div", { className: "mb-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-lg sm:text-xl font-bold", children: "User Management" }), _jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-2", children: "Manage system users, roles, and permissions" })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs(Button, { onClick: handleRefresh, variant: "outline", size: "sm", disabled: isLoading, children: [_jsx(RefreshCw, { className: `h-4 w-4 ${isLoading ? 'animate-spin' : ''}` }), _jsx("span", { className: "hidden sm:inline", children: "Refresh" })] }), _jsxs(Button, { onClick: handleAddUser, size: "sm", children: [_jsx(Plus, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "Add User" })] })] })] }) }), _jsx("div", { children: _jsx(DataTable, { columns: getUserColumns({
                        onEdit: handleEditUserOpen,
                        onToggleStatus: handleToggleStatus,
                        onDelete: handleDeleteUser,
                        onCreateApiKey: handleCreateApiKey,
                        canManage: currentUser?.role === "admin" || currentUser?.role === "superuser",
                        isSuperuser: currentUser?.role === "superuser",
                    }), data: users }) }), users.length === 0 && !isLoading && (_jsx("div", { className: "text-center py-8", children: _jsxs("p", { className: "text-gray-500 dark:text-gray-400", children: ["No users found. ", users.length === 0 && 'Create your first user to get started.'] }) })), isAddUserOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-2xl", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Add New User" }), _jsx(CardDescription, { children: "Create a new user account with appropriate role and permissions." })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: handleCloseModal, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "firstname", children: "First Name *" }), _jsx(Input, { id: "firstname", ref: (el) => {
                                                                addFieldRefs.current[0] = el;
                                                            }, value: formData.firstname, onChange: (e) => handleInputChange('firstname', e.target.value), onKeyDown: (e) => handleEnterKey(e, 0), placeholder: "Enter first name", className: formErrors.firstname ? "border-red-500" : "" }), formErrors.firstname && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.firstname }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "lastname", children: "Last Name" }), _jsx(Input, { id: "lastname", ref: (el) => {
                                                                addFieldRefs.current[1] = el;
                                                            }, value: formData.lastname, onChange: (e) => handleInputChange('lastname', e.target.value), onKeyDown: (e) => handleEnterKey(e, 1), placeholder: "Enter last name", className: formErrors.lastname ? "border-red-500" : "" }), formErrors.lastname && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.lastname }))] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "username", children: "Username *" }), _jsx(Input, { id: "username", ref: (el) => {
                                                        addFieldRefs.current[2] = el;
                                                    }, value: formData.username, onChange: (e) => handleInputChange('username', e.target.value), onKeyDown: (e) => handleEnterKey(e, 2), placeholder: "Enter username", className: formErrors.username ? "border-red-500" : "" }), formErrors.username && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.username }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "password", children: "Password *" }), _jsxs("div", { className: "relative", children: [_jsx(Input, { id: "password", ref: (el) => {
                                                                addFieldRefs.current[3] = el;
                                                            }, type: showPassword ? "text" : "password", value: formData.password, onChange: (e) => handleInputChange('password', e.target.value), onKeyDown: (e) => handleEnterKey(e, 3), placeholder: "Enter password", className: `pr-10 ${formErrors.password ? "border-red-500" : ""}` }), _jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => setShowPassword((prev) => !prev), className: "absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0", "aria-label": showPassword ? "Hide password" : "Show password", children: showPassword ? (_jsx(EyeOff, { className: "h-4 w-4" })) : (_jsx(Eye, { className: "h-4 w-4" })) })] }), formErrors.password && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.password }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "confirmPassword", children: "Confirm Password *" }), _jsxs("div", { className: "relative", children: [_jsx(Input, { id: "confirmPassword", ref: (el) => {
                                                                addFieldRefs.current[4] = el;
                                                            }, type: showConfirmPassword ? "text" : "password", value: formData.confirmPassword, onChange: (e) => handleInputChange('confirmPassword', e.target.value), onKeyDown: (e) => handleEnterKey(e, 4), placeholder: "Confirm your password", className: `pr-10 ${formErrors.confirmPassword ? "border-red-500" : ""}` }), _jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => setShowConfirmPassword((prev) => !prev), className: "absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0", "aria-label": showConfirmPassword ? "Hide confirm password" : "Show confirm password", children: showConfirmPassword ? (_jsx(EyeOff, { className: "h-4 w-4" })) : (_jsx(Eye, { className: "h-4 w-4" })) })] }), formErrors.confirmPassword && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.confirmPassword }))] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "role", children: "Role *" }), _jsxs(Select, { value: formData.role, onValueChange: (value) => {
                                                                const nextRole = value;
                                                                handleInputChange("role", nextRole);
                                                                if (nextRole !== "user") {
                                                                    handleInputChange("department", "");
                                                                }
                                                            }, children: [_jsx(SelectTrigger, { id: "role", ref: (el) => {
                                                                        addFieldRefs.current[5] = el;
                                                                    }, onKeyDown: (e) => handleEnterKey(e, 5), className: "w-full", icon: ArrowRight, children: _jsx(SelectValue, { placeholder: "Select role" }) }), _jsx(SelectContent, { children: roleOptions.map((role) => (_jsx(SelectItem, { value: role, children: role }, role))) })] })] }), formData.role === "user" && (_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "department", children: "Department *" }), _jsxs(Select, { value: formData.department, onValueChange: (value) => handleInputChange("department", value), children: [_jsx(SelectTrigger, { id: "department", ref: (el) => {
                                                                        addFieldRefs.current[6] = el;
                                                                    }, onKeyDown: (e) => handleEnterKey(e, 6), className: "w-full", icon: ArrowRight, children: _jsx(SelectValue, { placeholder: "Select department" }) }), _jsx(SelectContent, { children: departmentOptions.map((department) => (_jsx(SelectItem, { value: department, children: department }, department))) })] }), formErrors.department && (_jsx("p", { className: "text-sm text-red-500", children: formErrors.department }))] }))] })] }), _jsxs(CardFooter, { className: "flex gap-2 mt-6", children: [_jsx(Button, { type: "button", variant: "outline", onClick: handleCloseModal, className: "flex-1", disabled: isSubmitting, children: "Cancel" }), _jsx(Button, { type: "submit", className: "flex-1", disabled: isSubmitting, children: isSubmitting ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" }), "Creating..."] })) : ('Create User') })] })] })] }) })), isEditUserOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-2xl", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "Edit User" }), _jsx(CardDescription, { children: "Update user details and role." })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: handleCloseEditModal, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("form", { onSubmit: handleEditSubmit, children: [_jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-firstname", children: "First Name *" }), _jsx(Input, { id: "edit-firstname", value: editFormData.firstname, onChange: (e) => handleEditInputChange("firstname", e.target.value), placeholder: "Enter first name", className: editErrors.firstname ? "border-red-500" : "" }), editErrors.firstname && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.firstname }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-lastname", children: "Last Name" }), _jsx(Input, { id: "edit-lastname", value: editFormData.lastname, onChange: (e) => handleEditInputChange("lastname", e.target.value), placeholder: "Enter last name", className: editErrors.lastname ? "border-red-500" : "" }), editErrors.lastname && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.lastname }))] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-username", children: "Username *" }), _jsx(Input, { id: "edit-username", value: editFormData.username, onChange: (e) => handleEditInputChange("username", e.target.value), placeholder: "Enter username", className: editErrors.username ? "border-red-500" : "" }), editErrors.username && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.username }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-password", children: "New Password" }), _jsxs("div", { className: "relative", children: [_jsx(Input, { id: "edit-password", type: showEditPassword ? "text" : "password", value: editFormData.password, onChange: (e) => handleEditInputChange("password", e.target.value), placeholder: "Enter new password", className: `pr-10 ${editErrors.password ? "border-red-500" : ""}` }), _jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => setShowEditPassword((prev) => !prev), className: "absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0", "aria-label": showEditPassword ? "Hide password" : "Show password", children: showEditPassword ? (_jsx(EyeOff, { className: "h-4 w-4" })) : (_jsx(Eye, { className: "h-4 w-4" })) })] }), editErrors.password && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.password }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-confirmPassword", children: "Confirm New Password" }), _jsxs("div", { className: "relative", children: [_jsx(Input, { id: "edit-confirmPassword", type: showEditConfirmPassword ? "text" : "password", value: editFormData.confirmPassword, onChange: (e) => handleEditInputChange("confirmPassword", e.target.value), placeholder: "Confirm new password", className: `pr-10 ${editErrors.confirmPassword ? "border-red-500" : ""}` }), _jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => setShowEditConfirmPassword((prev) => !prev), className: "absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0", "aria-label": showEditConfirmPassword ? "Hide confirm password" : "Show confirm password", children: showEditConfirmPassword ? (_jsx(EyeOff, { className: "h-4 w-4" })) : (_jsx(Eye, { className: "h-4 w-4" })) })] }), editErrors.confirmPassword && (_jsx("p", { className: "text-sm text-red-500", children: editErrors.confirmPassword }))] }), _jsx("div", { className: "grid grid-cols-2 gap-4", children: _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "edit-role", children: "Role *" }), _jsxs("select", { id: "edit-role", value: editFormData.role, onChange: (e) => handleEditInputChange("role", e.target.value), className: "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", children: [_jsx("option", { value: "user", children: "User" }), _jsx("option", { value: "admin", children: "Admin" }), _jsx("option", { value: "superuser", children: "Superuser" })] })] }) })] }), _jsxs(CardFooter, { className: "flex gap-2 mt-6", children: [_jsx(Button, { type: "button", variant: "outline", onClick: handleCloseEditModal, className: "flex-1", disabled: isUpdating, children: "Cancel" }), _jsx(Button, { type: "submit", className: "flex-1", disabled: isUpdating, children: isUpdating ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" }), "Saving..."] })) : ("Save Changes") })] })] })] }) })), isApiKeyDialogOpen && createdApiKey && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs(Card, { className: "w-full max-w-2xl", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-4", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: "API Key Created" }), _jsxs(CardDescription, { children: ["API key for ", creatingApiKeyForUser?.username || "user", " has been created successfully.", _jsx("br", {}), _jsx("strong", { className: "text-red-600 dark:text-red-400", children: "Please copy this key now. You won't be able to see it again!" })] })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: handleCloseApiKeyDialog, className: "h-8 w-8 p-0", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "API Key" }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Input, { value: createdApiKey.key, readOnly: true, className: "font-mono text-sm" }), _jsx(Button, { type: "button", variant: "outline", size: "sm", onClick: handleCopyApiKey, className: "shrink-0", children: apiKeyCopied ? (_jsxs(_Fragment, { children: [_jsx(Check, { className: "h-4 w-4 mr-2" }), "Copied!"] })) : (_jsxs(_Fragment, { children: [_jsx(Copy, { className: "h-4 w-4 mr-2" }), "Copy"] })) })] })] }), _jsx("div", { className: "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4", children: _jsxs("p", { className: "text-sm text-yellow-800 dark:text-yellow-200", children: [_jsx("strong", { children: "Important:" }), " This API key provides full access to the user's account. Store it securely and never share it publicly."] }) })] }) }), _jsx(CardFooter, { children: _jsx(Button, { type: "button", onClick: handleCloseApiKeyDialog, className: "w-full", children: "Close" }) })] }) }))] }));
}
