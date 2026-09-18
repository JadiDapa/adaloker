import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "neu-pressed-sm neu-transition flex field-sizing-content min-h-16 w-full resize-none rounded-xl border-none bg-background px-3 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:neu-focus-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
