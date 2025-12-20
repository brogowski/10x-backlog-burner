type HeaderCapBadgeProps = {
  currentCount: number
  cap: number
  isAtCap?: boolean
}

const HeaderCapBadge = ({ currentCount, cap, isAtCap = currentCount >= cap }: HeaderCapBadgeProps) => {
  const tone = isAtCap ? "bg-destructive/10 text-destructive border-destructive/40" : "bg-muted text-foreground/80 border-border"

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${tone}`}
      aria-label={`In-progress queue ${currentCount} of ${cap}`}
    >
      <span>In progress</span>
      <span className="text-foreground/70">
        {currentCount} / {cap}
      </span>
    </span>
  )
}

export default HeaderCapBadge

