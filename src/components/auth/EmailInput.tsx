import { cn } from "@/lib/utils"

type EmailInputProps = {
  id: string
  value: string
  error?: string
  onChange: (value: string) => void
}

const EmailInput = ({ id, value, error, onChange }: EmailInputProps) => {
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        Email
      </label>
      <input
        id={id}
        name={id}
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={cn(
          "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          error ? "border-destructive/60 focus-visible:ring-destructive/50" : "",
        )}
        autoComplete="email"
        required
      />
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default EmailInput
