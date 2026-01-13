import BacklogListItem from "@/components/backlog/BacklogListItem";
import type { BacklogGameItemVM } from "@/lib/backlog/types";

interface BacklogListProps {
  items: BacklogGameItemVM[];
  onAddToInProgress: (item: BacklogGameItemVM) => void;
  onRemove: (item: BacklogGameItemVM) => void;
  activeItemMutations: Record<number, "addToInProgress" | "remove" | "idle">;
}

const BacklogList = ({ items, onAddToInProgress, onRemove, activeItemMutations }: BacklogListProps) => {
  return (
    <ul role="list" className="flex flex-col gap-3">
      {items.map((item) => (
        <BacklogListItem
          key={item.steamAppId}
          item={item}
          activeState={activeItemMutations[item.steamAppId] ?? "idle"}
          onAddToInProgress={onAddToInProgress}
          onRemove={onRemove}
        />
      ))}
    </ul>
  );
};

export default BacklogList;
