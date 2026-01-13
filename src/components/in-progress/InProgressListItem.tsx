import { CSS, type Transform } from "@dnd-kit/utilities";

import CompleteButton from "@/components/in-progress/CompleteButton";
import GameRow from "@/components/in-progress/GameRow";
import RemoveToBacklogButton from "@/components/in-progress/RemoveToBacklogButton";
import type { InProgressGameItemVM } from "@/lib/in-progress/types";
import { Button } from "@/components/ui/button";

interface InProgressListItemProps {
  item: InProgressGameItemVM;
  isMutating: boolean;
  isReordering: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onComplete: (payload: { achievementsUnlocked?: number }) => void;
  onRemove: () => void;
  isFirst: boolean;
  isLast: boolean;
  setNodeRef: (node: HTMLElement | null) => void;
  attributes: Record<string, unknown>;
  listeners: Record<string, unknown>;
  transform: Transform;
  transition: string | undefined;
}

const InProgressListItem = ({
  item,
  isMutating,
  isReordering,
  onMoveUp,
  onMoveDown,
  onComplete,
  onRemove,
  isFirst,
  isLast,
  setNodeRef,
  attributes,
  listeners,
  transform,
  transition,
}: InProgressListItemProps) => (
  <li
    className="flex flex-col gap-3 rounded-lg border border-border bg-background px-4 py-3 shadow-sm"
    ref={setNodeRef}
    style={{
      transform: CSS.Transform.toString(transform),
      transition,
    }}
  >
    <div className="flex items-start justify-between gap-3">
      <GameRow
        title={item.title}
        status={item.status}
        position={item.position}
        achievementsUnlocked={item.achievementsUnlocked}
        achievementsTotal={item.achievementsTotal}
        artworkUrl={item.artworkUrl}
      />
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${item.title}`}
          disabled={isReordering}
        >
          ☰
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onMoveUp}
          disabled={isReordering || isFirst}
          aria-label={`Move ${item.title} up`}
        >
          ↑
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onMoveDown}
          disabled={isReordering || isLast}
          aria-label={`Move ${item.title} down`}
        >
          ↓
        </Button>
      </div>
    </div>
    <div className="flex flex-wrap gap-2">
      <CompleteButton onConfirm={onComplete} achievementsTotal={item.achievementsTotal} isLoading={isMutating} />
      <RemoveToBacklogButton onRemove={onRemove} isLoading={isMutating} />
    </div>
  </li>
);

export default InProgressListItem;
