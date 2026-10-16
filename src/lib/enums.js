export const StatusEnum = {
    NEW: "new",
    PENDING: "pending",
    DONE: "done"
};
export const STATUS_OPTIONS = [
    { value: StatusEnum.NEW, label: "New" },
    { value: StatusEnum.PENDING, label: "Pending" },
    { value: StatusEnum.DONE, label: "Done" }
];
export const StockTypeEnum = {
    ROLLS: "rolls",
    INK_ADHESIVE_CHEMICAL: "ink/adhesive/chemical"
};
export const STOCK_TYPE_OPTIONS = [
    { value: StockTypeEnum.ROLLS, label: "Rolls" },
    { value: StockTypeEnum.INK_ADHESIVE_CHEMICAL, label: "Ink/Adhesive/Chemical" }
];
