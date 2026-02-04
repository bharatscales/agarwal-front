import { useEffect, useRef, useState } from "react"
import { DataTable } from "@/components/data-table"
import { getUserColumns, type User } from "@/components/columns/user-columns"
import { createUser, deleteUser, getAllUsers, updateUser, updateUserStatus } from "@/lib/user-api"
import { Button } from "@/components/ui/button"
import api from "@/lib/axios"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowRight, Eye, EyeOff, Plus, RefreshCw, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/AuthContext"

interface CreateUserForm {
  firstname: string
  lastname: string
  username: string
  password: string
  confirmPassword: string
  role: "superuser" | "admin" | "user"
  department: "Stock" | "Printing" | "Inspection" | "Slitter" | "ECL" | "Lamination" | "Dispatch" | "Floor" | ""
}

interface EditUserForm {
  firstname: string
  lastname: string
  username: string
  password: string
  confirmPassword: string
  role: "superuser" | "admin" | "user"
}

export default function Users() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [skip] = useState(0)
  const [limit] = useState(20)
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isEditUserOpen, setIsEditUserOpen] = useState(false)
  const [editUserId, setEditUserId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false)
  const [formData, setFormData] = useState<CreateUserForm>({
    firstname: "",
    lastname: "",
    username: "",
    password: "",
    confirmPassword: "",
    role: "user",
    department: "",
  })
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CreateUserForm, string>>>({})
  const [departmentOptions, setDepartmentOptions] = useState<CreateUserForm["department"][]>([])
  const [roleOptions, setRoleOptions] = useState<CreateUserForm["role"][]>([])
  const [editFormData, setEditFormData] = useState<EditUserForm>({
    firstname: "",
    lastname: "",
    username: "",
    password: "",
    confirmPassword: "",
    role: "user",
  })
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof EditUserForm, string>>>({})
  const addFieldRefs = useRef<Array<HTMLInputElement | HTMLButtonElement | null>>([])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const fetchedUsers = await getAllUsers(skip, limit)
      setUsers(fetchedUsers)
    } catch (err: any) {
      console.error('Error fetching users:', err)
      if (err.response?.status === 401) {
        setError("You don't have permission to view users")
      } else if (err.response?.status === 403) {
        setError("Access denied. Admin privileges required.")
      } else {
        setError("Failed to fetch users. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchUsers()
  }

  const handleAddUser = () => {
    setIsAddUserOpen(true)
  }

  const handleEditUserOpen = (user: User) => {
    setEditUserId(user.id)
    setEditFormData({
      firstname: user.firstname || "",
      lastname: user.lastname || "",
      username: user.username || "",
      password: "",
      confirmPassword: "",
      role: user.role,
    })
    setEditErrors({})
    setIsEditUserOpen(true)
  }

  const handleInputChange = (field: keyof CreateUserForm, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      return newData
    })
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleEnterKey = (
    event: React.KeyboardEvent<HTMLInputElement | HTMLButtonElement>,
    index: number
  ) => {
    if (event.key !== "Enter") return
    const nextField = addFieldRefs.current[index + 1]
    if (nextField) {
      event.preventDefault()
      nextField.focus()
    }
  }

  const handleEditInputChange = (field: keyof EditUserForm, value: string) => {
    setEditFormData(prev => {
      const newData = { ...prev, [field]: value }
      return newData
    })

    if (editErrors[field]) {
      setEditErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof CreateUserForm, string>> = {}
    
    if (!formData.firstname.trim()) {
      errors.firstname = "First name is required"
    }
    if (!formData.username.trim()) {
      errors.username = "Username is required"
    }
    if (!formData.password.trim()) {
      errors.password = "Password is required"
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters"
    }
    if (!formData.confirmPassword.trim()) {
      errors.confirmPassword = "Please confirm your password"
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match"
    }
    if (formData.role === "user" && !formData.department.trim()) {
      errors.department = "Department is required for users"
    }
    


    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateEditForm = (): boolean => {
    const errors: Partial<Record<keyof EditUserForm, string>> = {}

    if (!editFormData.firstname.trim()) {
      errors.firstname = "First name is required"
    }
    if (!editFormData.username.trim()) {
      errors.username = "Username is required"
    }
    if (editFormData.password.trim() && editFormData.password.length < 6) {
      errors.password = "Password must be at least 6 characters"
    }
    if (editFormData.password.trim() && !editFormData.confirmPassword.trim()) {
      errors.confirmPassword = "Please confirm the password"
    } else if (
      editFormData.password.trim() &&
      editFormData.password !== editFormData.confirmPassword
    ) {
      errors.confirmPassword = "Passwords do not match"
    }

    setEditErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      setIsSubmitting(true)
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...userDataForAPI } = {
        ...formData,
        department: formData.department || undefined,
      }
      if (userDataForAPI.role !== "user") {
        delete (userDataForAPI as Partial<typeof userDataForAPI>).department
      }
      await createUser(userDataForAPI)
      
      // Close modal and refresh users
      setIsAddUserOpen(false)
      setFormData({
        firstname: "",
        lastname: "",
        username: "",
        password: "",
        confirmPassword: "",
        role: "user",
        department: "",
      })
      setFormErrors({})
      
      // Refresh the users list
      await fetchUsers()
    } catch (err: any) {
      console.error('Error creating user:', err)
      if (err.response?.status === 400) {
        setFormErrors({ username: "Username already exists" })
      } else if (err.response?.status === 401) {
        setFormErrors({ username: "You don't have permission to create users" })
      } else {
        setFormErrors({ username: "Failed to create user. Please try again." })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseModal = () => {
    setIsAddUserOpen(false)
    setFormData({
      firstname: "",
      lastname: "",
      username: "",
      password: "",
      confirmPassword: "",
      role: "user",
      department: "",
    })
    setFormErrors({})
  }

  const handleCloseEditModal = () => {
    setIsEditUserOpen(false)
    setEditUserId(null)
    setEditFormData({
      firstname: "",
      lastname: "",
      username: "",
      password: "",
      confirmPassword: "",
      role: "user",
    })
    setEditErrors({})
    setShowEditPassword(false)
    setShowEditConfirmPassword(false)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editUserId || !validateEditForm()) {
      return
    }

    try {
      setIsUpdating(true)
      const updatePayload: Parameters<typeof updateUser>[1] = {
        firstname: editFormData.firstname,
        lastname: editFormData.lastname,
        username: editFormData.username,
        role: editFormData.role,
      }
      if (editFormData.password.trim()) {
        updatePayload.password = editFormData.password.trim()
      }
      const updatedUser = await updateUser(editUserId, updatePayload)
      setUsers(prev =>
        prev.map(user => (user.id === updatedUser.id ? updatedUser : user))
      )
      handleCloseEditModal()
    } catch (err: any) {
      console.error("Error updating user:", err)
      setEditErrors({
        username: "Failed to update user. Please try again.",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleToggleStatus = async (user: User) => {
    try {
      const updatedUser = await updateUserStatus(user.id, !user.isEnable)
      setUsers(prev =>
        prev.map(item => (item.id === updatedUser.id ? updatedUser : item))
      )
    } catch (err) {
      console.error("Error updating user status:", err)
    }
  }

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Delete user "${user.username}"? This cannot be undone.`)) {
      return
    }

    try {
      await deleteUser(user.id)
      setUsers(prev => prev.filter(item => item.id !== user.id))
    } catch (err) {
      console.error("Error deleting user:", err)
      setError("Failed to delete user. Please try again.")
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [skip, limit])

  useEffect(() => {
    if (isAddUserOpen) {
      requestAnimationFrame(() => {
        addFieldRefs.current[0]?.focus()
      })
    }
  }, [isAddUserOpen])

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await api.get<string[]>("/meta/departments")
        const options = response.data.filter(Boolean) as CreateUserForm["department"][]
        setDepartmentOptions(options)
      } catch (error) {
        console.error("Failed to load departments:", error)
        setDepartmentOptions([])
      }
    }

    fetchDepartments()
  }, [])

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await api.get<string[]>("/meta/roles")
        const options = response.data.filter(Boolean) as CreateUserForm["role"][]
        setRoleOptions(options)
      } catch (error) {
        console.error("Failed to load roles:", error)
        setRoleOptions([])
      }
    }

    fetchRoles()
  }, [])

  if (isLoading && users.length === 0) {
    return (
      <div className="px-6 pt-2 pb-6">
        <div className="mb-6">
          <h1 className="text-lg sm:text-xl font-bold">User Management</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Manage system users, roles, and permissions
          </p>
        </div>
        
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading users...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-6 pt-2 pb-6">
        <div className="mb-6">
          <h1 className="text-lg sm:text-xl font-bold">User Management</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Manage system users, roles, and permissions
          </p>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              Error Loading Users
            </h3>
            <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 pt-2 pb-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">User Management</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Manage system users, roles, and permissions
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button onClick={handleAddUser} size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add User</span>
            </Button>
          </div>
        </div>
      </div>
      
      <div>
        <DataTable
          columns={getUserColumns({
            onEdit: handleEditUserOpen,
            onToggleStatus: handleToggleStatus,
            onDelete: handleDeleteUser,
            canManage: currentUser?.role === "admin" || currentUser?.role === "superuser",
          })}
          data={users}
        />
      </div>

      {users.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No users found. {users.length === 0 && 'Create your first user to get started.'}
          </p>
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Add New User</CardTitle>
                <CardDescription>
                  Create a new user account with appropriate role and permissions.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseModal}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstname">First Name *</Label>
                    <Input
                      id="firstname"
                      ref={(el) => {
                        addFieldRefs.current[0] = el
                      }}
                      value={formData.firstname}
                      onChange={(e) => handleInputChange('firstname', e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, 0)}
                      placeholder="Enter first name"
                      className={formErrors.firstname ? "border-red-500" : ""}
                    />
                    {formErrors.firstname && (
                      <p className="text-sm text-red-500">{formErrors.firstname}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lastname">Last Name</Label>
                    <Input
                      id="lastname"
                      ref={(el) => {
                        addFieldRefs.current[1] = el
                      }}
                      value={formData.lastname}
                      onChange={(e) => handleInputChange('lastname', e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, 1)}
                      placeholder="Enter last name"
                      className={formErrors.lastname ? "border-red-500" : ""}
                    />
                    {formErrors.lastname && (
                      <p className="text-sm text-red-500">{formErrors.lastname}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    ref={(el) => {
                      addFieldRefs.current[2] = el
                    }}
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    onKeyDown={(e) => handleEnterKey(e, 2)}
                    placeholder="Enter username"
                    className={formErrors.username ? "border-red-500" : ""}
                  />
                  {formErrors.username && (
                    <p className="text-sm text-red-500">{formErrors.username}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      ref={(el) => {
                        addFieldRefs.current[3] = el
                      }}
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, 3)}
                      placeholder="Enter password"
                      className={`pr-10 ${formErrors.password ? "border-red-500" : ""}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {formErrors.password && (
                    <p className="text-sm text-red-500">{formErrors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      ref={(el) => {
                        addFieldRefs.current[4] = el
                      }}
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, 4)}
                      placeholder="Confirm your password"
                      className={`pr-10 ${formErrors.confirmPassword ? "border-red-500" : ""}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0"
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {formErrors.confirmPassword && (
                    <p className="text-sm text-red-500">{formErrors.confirmPassword}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => {
                        const nextRole = value as CreateUserForm["role"]
                        handleInputChange("role", nextRole)
                        if (nextRole !== "user") {
                          handleInputChange("department", "")
                        }
                      }}
                    >
                      <SelectTrigger
                        id="role"
                        ref={(el) => {
                          addFieldRefs.current[5] = el
                        }}
                        onKeyDown={(e) => handleEnterKey(e, 5)}
                        className="w-full"
                        icon={ArrowRight}
                      >
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.role === "user" && (
                    <div className="space-y-2">
                      <Label htmlFor="department">Department *</Label>
                      <Select
                        value={formData.department}
                        onValueChange={(value) =>
                          handleInputChange(
                            "department",
                            value as CreateUserForm["department"]
                          )
                        }
                      >
                        <SelectTrigger
                          id="department"
                          ref={(el) => {
                            addFieldRefs.current[6] = el
                          }}
                          onKeyDown={(e) => handleEnterKey(e, 6)}
                          className="w-full"
                          icon={ArrowRight}
                        >
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departmentOptions.map((department) => (
                            <SelectItem key={department} value={department}>
                              {department}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.department && (
                        <p className="text-sm text-red-500">{formErrors.department}</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    'Create User'
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {isEditUserOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Edit User</CardTitle>
                <CardDescription>
                  Update user details and role.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseEditModal}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <form onSubmit={handleEditSubmit}>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-firstname">First Name *</Label>
                    <Input
                      id="edit-firstname"
                      value={editFormData.firstname}
                      onChange={(e) => handleEditInputChange("firstname", e.target.value)}
                      placeholder="Enter first name"
                      className={editErrors.firstname ? "border-red-500" : ""}
                    />
                    {editErrors.firstname && (
                      <p className="text-sm text-red-500">{editErrors.firstname}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-lastname">Last Name</Label>
                    <Input
                      id="edit-lastname"
                      value={editFormData.lastname}
                      onChange={(e) => handleEditInputChange("lastname", e.target.value)}
                      placeholder="Enter last name"
                      className={editErrors.lastname ? "border-red-500" : ""}
                    />
                    {editErrors.lastname && (
                      <p className="text-sm text-red-500">{editErrors.lastname}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-username">Username *</Label>
                  <Input
                    id="edit-username"
                    value={editFormData.username}
                    onChange={(e) => handleEditInputChange("username", e.target.value)}
                    placeholder="Enter username"
                    className={editErrors.username ? "border-red-500" : ""}
                  />
                  {editErrors.username && (
                    <p className="text-sm text-red-500">{editErrors.username}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="edit-password"
                      type={showEditPassword ? "text" : "password"}
                      value={editFormData.password}
                      onChange={(e) => handleEditInputChange("password", e.target.value)}
                      placeholder="Enter new password"
                      className={`pr-10 ${editErrors.password ? "border-red-500" : ""}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowEditPassword((prev) => !prev)}
                      className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0"
                      aria-label={showEditPassword ? "Hide password" : "Show password"}
                    >
                      {showEditPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {editErrors.password && (
                    <p className="text-sm text-red-500">{editErrors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="edit-confirmPassword"
                      type={showEditConfirmPassword ? "text" : "password"}
                      value={editFormData.confirmPassword}
                      onChange={(e) => handleEditInputChange("confirmPassword", e.target.value)}
                      placeholder="Confirm new password"
                      className={`pr-10 ${editErrors.confirmPassword ? "border-red-500" : ""}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowEditConfirmPassword((prev) => !prev)}
                      className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0"
                      aria-label={showEditConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showEditConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {editErrors.confirmPassword && (
                    <p className="text-sm text-red-500">{editErrors.confirmPassword}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-role">Role *</Label>
                    <select
                      id="edit-role"
                      value={editFormData.role}
                      onChange={(e) =>
                        handleEditInputChange(
                          "role",
                          e.target.value as "superuser" | "admin" | "user"
                        )
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="superuser">Superuser</option>
                    </select>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseEditModal}
                  className="flex-1"
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
