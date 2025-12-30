import AddButton from "./AddButton"
import type { AddStatus, CapState, GameCardVM } from "./types"

type ResultItemProps = {
  item: GameCardVM
  addStatus: AddStatus
  capState: CapState
  onAddBacklog: (steamAppId: number) => void
  onAddInProgress: (steamAppId: number) => void
}

const ResultItem = ({
  item,
  addStatus,
  capState,
  onAddBacklog,
  onAddInProgress,
}: ResultItemProps) => {
  return (
    <article className="flex gap-4 rounded-lg border border-border bg-background p-4 shadow-sm">
      <div className="h-24 w-20 overflow-hidden rounded-md bg-muted">
        {item.artworkUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.artworkUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-foreground/50">
            No art
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
            <p className="text-xs uppercase tracking-wide text-foreground/60">
              {item.genres.join(", ") || "Uncategorized"}
            </p>
            <p className="text-sm text-foreground/70">
              Released: {item.releaseDate ?? "Unknown"} • Popularity: {item.popularityScore ?? "—"}
            </p>
          </div>
          <div className="flex flex-col gap-2 text-right text-xs text-foreground/70">
            <p>Achievements: {item.achievementsTotal ?? "—"}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <AddButton
            mode="backlog"
            status={addStatus}
            onClick={() => onAddBacklog(item.steamAppId)}
            disabledReason={item.addDisabledReason}
          />
          <AddButton
            mode="inProgress"
            status={addStatus}
            onClick={() => onAddInProgress(item.steamAppId)}
            disabledReason={item.addDisabledReason}
            capState={capState}
          />
          {item.isInBacklog ? (
            <span className="rounded-full bg-muted px-2 py-1 text-xs text-foreground/70">
              Already in backlog
            </span>
          ) : null}
          {item.isInProgress ? (
            <span className="rounded-full bg-muted px-2 py-1 text-xs text-foreground/70">
              In your queue
            </span>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export default ResultItem

