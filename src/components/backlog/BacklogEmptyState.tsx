import AddGamesButton from "@/components/in-progress/AddGamesButton"

type BacklogEmptyStateProps = {
  onAddClick: () => void
}

const BacklogEmptyState = ({ onAddClick }: BacklogEmptyStateProps) => (
  <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-6">
    <h2 className="text-lg font-semibold">Your backlog is empty</h2>
    <p className="max-w-2xl text-sm text-muted-foreground">
      Add games from Steam or manually to start building your backlog. Once added, you can move them
      into your in-progress queue whenever you’re ready to play.
    </p>
    <AddGamesButton onClick={onAddClick} disabled={false} />
  </div>
)

export default BacklogEmptyState

