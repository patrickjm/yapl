import * as React from "react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "./tooltip"

interface HelpTooltipProps {
  explanation: string
  className?: string
  side?: "top" | "right" | "bottom" | "left"
}

export function HelpTooltip({ explanation, className, side = "top" }: HelpTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center justify-center rounded-full w-4 h-4 text-sm text-muted-foreground hover:text-foreground hover:bg-muted ${className ?? ""}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3 h-3"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <path d="M12 17h.01" />
            </svg>
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs text-xs">
          {explanation}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 