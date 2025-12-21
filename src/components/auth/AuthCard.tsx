import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type AuthCardProps = {
  title?: string
  subtitle?: string
  icon?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}

const AuthCard = ({ title, subtitle, icon, children, footer, className }: AuthCardProps) => {
  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      <header className="flex flex-col gap-2 border-b border-border px-6 py-5">
        <div className="flex items-center gap-3">
          {icon ? <div aria-hidden>{icon}</div> : null}
          <div className="space-y-1">
            {title ? <h1 className="text-xl font-semibold">{title}</h1> : null}
            {subtitle ? (
              <p className="text-sm text-foreground/70 leading-relaxed">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="px-6 py-5">{children}</div>

      {footer ? (
        <footer className="border-t border-border px-6 py-4 text-sm text-foreground/70">
          {footer}
        </footer>
      ) : null}
    </section>
  )
}

export default AuthCard
