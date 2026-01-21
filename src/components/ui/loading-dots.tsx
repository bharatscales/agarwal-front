import { cn } from "@/lib/utils"

interface LoadingDotsProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export function LoadingDots({ className, size = "md" }: LoadingDotsProps) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  }

  return (
    <div className={cn("flex items-center space-x-1", className)}>
      <div className={cn("animate-bounce", sizeClasses[size])}>
        <div className="h-full w-full rounded-full bg-current opacity-75"></div>
      </div>
      <div className={cn("animate-bounce [animation-delay:-0.3s]", sizeClasses[size])}>
        <div className="h-full w-full rounded-full bg-current opacity-75"></div>
      </div>
      <div className={cn("animate-bounce [animation-delay:-0.5s]", sizeClasses[size])}>
        <div className="h-full w-full rounded-full bg-current opacity-75"></div>
      </div>
    </div>
  )
}
