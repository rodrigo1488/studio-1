import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border-2 px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-sm",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md",
        secondary:
          "border-secondary/30 bg-secondary text-secondary-foreground hover:bg-secondary/90 hover:shadow-md",
        destructive:
          "border-destructive/30 bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-md",
        outline: "text-foreground border-primary/30 hover:bg-primary/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
