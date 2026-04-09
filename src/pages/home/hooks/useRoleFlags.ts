type UserLike = {
  role?: string | null
  department?: string | null
} | null | undefined

export function useRoleFlags(user: UserLike) {
  const department = user?.department?.toLowerCase()

  const isStockUser = user?.role === "user" && department === "stock"
  const isPrintingUser = user?.role === "user" && department === "printing"
  const isFloorUser = user?.role === "user" && department === "floor"

  return { isStockUser, isPrintingUser, isFloorUser }
}
