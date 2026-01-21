export const StatusEnum = {
  NEW: "new",
  PENDING: "pending",
  DONE: "done"
} as const

export const STATUS_OPTIONS = [
  { value: StatusEnum.NEW, label: "New" },
  { value: StatusEnum.PENDING, label: "Pending" },
  { value: StatusEnum.DONE, label: "Done" }
]





