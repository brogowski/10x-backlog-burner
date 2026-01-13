import AddToInProgressButton from "@/components/backlog/AddToInProgressButton";
import GameRow from "@/components/backlog/GameRow";
import RemoveFromBacklogButton from "@/components/backlog/RemoveFromBacklogButton";
import type { BacklogGameItemVM } from "@/lib/backlog/types";

interface BacklogListItemProps {
  item: BacklogGameItemVM;
  activeState: "addToInProgress" | "remove" | "idle";
  onAddToInProgress: (item: BacklogGameItemVM) => void;
  onRemove: (item: BacklogGameItemVM) => void;
}

const BacklogListItem = ({ item, activeState, onAddToInProgress, onRemove }: BacklogListItemProps) => {
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-background px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <GameRow
          steamAppId={item.steamAppId}
          title={item.title}
          status={item.status}
          lastUpdatedAt={item.lastUpdatedAt}
          importedAt={item.importedAt}
          achievementsUnlocked={item.achievementsUnlocked}
          achievementsTotal={item.achievementsTotal}
          slug={item.slug}
        />
        <div className="flex flex-wrap gap-2">
          <AddToInProgressButton
            onClick={() => onAddToInProgress(item)}
            isLoading={activeState === "addToInProgress"}
            isQueueAtCap={false}
            title={item.title}
          />
          <RemoveFromBacklogButton
            onRemove={() => onRemove(item)}
            isLoading={activeState === "remove"}
            title={item.title}
          />
        </div>
      </div>
    </li>
  );
};

export default BacklogListItem;
