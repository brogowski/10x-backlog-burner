import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { useState } from "react";

import InProgressListItem from "@/components/in-progress/InProgressListItem";
import type { InProgressGameItemVM } from "@/lib/in-progress/types";

interface InProgressListProps {
  items: InProgressGameItemVM[];
  isReordering: boolean;
  onReorder: (items: InProgressGameItemVM[]) => void;
  onComplete: (item: InProgressGameItemVM, payload: { achievementsUnlocked?: number }) => void;
  onRemove: (item: InProgressGameItemVM) => void;
  activeItemMutations: Record<number, "complete" | "remove" | "idle">;
}

const InProgressList = ({
  items,
  isReordering,
  onReorder,
  onComplete,
  onRemove,
  activeItemMutations,
}: InProgressListProps) => {
  const [announcement, setAnnouncement] = useState<string>("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const moveItem = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) {
      return;
    }

    const nextItems = [...items];
    const [moved] = nextItems.splice(index, 1);
    nextItems.splice(nextIndex, 0, moved);

    const normalized = nextItems.map((item, idx) => ({
      ...item,
      position: idx + 1,
    }));

    onReorder(normalized);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.steamAppId === Number(active.id));
    const newIndex = items.findIndex((item) => item.steamAppId === Number(over.id));

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
      return;
    }

    const moved = arrayMove(items, oldIndex, newIndex).map((item, idx) => ({
      ...item,
      position: idx + 1,
    }));

    onReorder(moved);
    setAnnouncement(`${items[oldIndex]?.title ?? "Game"} moved to position ${newIndex + 1}.`);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item.steamAppId)} strategy={verticalListSortingStrategy}>
        <div aria-live="polite" className="sr-only">
          {announcement}
        </div>
        <ol className="space-y-3" aria-label="In-progress games">
          {items.map((item, index) => (
            <SortableListItem
              key={item.steamAppId}
              item={item}
              index={index}
              isMutating={(activeItemMutations[item.steamAppId] ?? "idle") !== "idle"}
              isReordering={isReordering}
              onMoveUp={() => moveItem(index, -1)}
              onMoveDown={() => moveItem(index, 1)}
              onComplete={(payload) => onComplete(item, payload)}
              onRemove={() => onRemove(item)}
              isFirst={index === 0}
              isLast={index === items.length - 1}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
};

interface SortableListItemProps {
  item: InProgressGameItemVM;
  index: number;
  isMutating: boolean;
  isReordering: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onComplete: (payload: { achievementsUnlocked?: number }) => void;
  onRemove: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const SortableListItem = ({
  item,
  isMutating,
  isReordering,
  onMoveUp,
  onMoveDown,
  onComplete,
  onRemove,
  isFirst,
  isLast,
}: SortableListItemProps) => {
  const sortable = useSortable({ id: item.steamAppId });

  return (
    <InProgressListItem
      item={item}
      isMutating={isMutating}
      isReordering={isReordering}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onComplete={onComplete}
      onRemove={onRemove}
      isFirst={isFirst}
      isLast={isLast}
      setNodeRef={sortable.setNodeRef}
      attributes={sortable.attributes}
      listeners={sortable.listeners ?? {}}
      transform={sortable.transform}
      transition={sortable.transition}
    />
  );
};

export default InProgressList;
