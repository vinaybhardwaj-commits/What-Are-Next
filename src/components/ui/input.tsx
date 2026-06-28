import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(
      "h-9 w-full rounded-lg border border-input bg-card px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground",
      className)} {...props} />
  )
);
Input.displayName = "Input";
