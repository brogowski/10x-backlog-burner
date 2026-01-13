import AddGamesButton from "./AddGamesButton";

interface EmptyStateProps {
  onAddClick: () => void;
  isAtCap: boolean;
}

const EmptyState = ({ onAddClick, isAtCap }: EmptyStateProps) => (
  <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-6 text-sm text-foreground/80">
    <p>You don’t have any games in progress yet.</p>
    <div className="flex flex-wrap gap-2">
      <AddGamesButton onClick={onAddClick} disabled={isAtCap} />
    </div>
  </div>
);

export default EmptyState;
