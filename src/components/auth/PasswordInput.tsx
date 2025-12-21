import { useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PasswordInputProps = {
  id: string
  value: string
  error?: string
  label: string
  onChange: (value: string) => void
}

const PasswordInput = ({ id, value, error, label, onChange }: PasswordInputProps) => {
  const [show, setShow] = useState(false)
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={cn(
            "block w-full rounded-md border border-input bg-background px-3 py-2 pr-24 text-sm text-foreground shadow-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            error ? "border-destructive/60 focus-visible:ring-destructive/50" : "",
          )}
          autoComplete="current-password"
          required
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute inset-y-1 right-1 px-2 text-xs font-medium"
          aria-pressed={show}
          aria-label={show ? "Hide password" : "Show password"}
          onClick={() => setShow((prev) => !prev)}
        >
          {show ? "Hide" : "Show"}
        </Button>
      </div>
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default PasswordInput
