import { cn } from "cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("neu-pressed-sm animate-pulse rounded-xl bg-background", className)}
      {...props}
    />
  )
}

export { Skeleton }
