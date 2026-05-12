import * as React from "react"
import { cn } from "../../lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: "border-transparent bg-indigo-600 text-white hover:bg-indigo-600/80",
    secondary: "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80 dark:bg-slate-800 dark:text-slate-50",
    destructive: "border-transparent bg-red-500 text-white hover:bg-red-500/80",
    outline: "text-slate-950 dark:text-slate-50",
    success: "border-transparent bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
    warning: "border-transparent bg-amber-500/10 text-amber-500 border border-amber-500/20",
  }

  return (
    <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2", variants[variant], className)} {...props} />
  )
}

export { Badge }
