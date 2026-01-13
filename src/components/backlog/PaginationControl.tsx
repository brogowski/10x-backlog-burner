import { Button } from "@/components/ui/button";

interface PaginationControlProps {
  hasMore: boolean;
  isLoadingMore: boolean;
  loadedCount: number;
  total: number;
  onLoadMore: () => void;
}

const PaginationControl = ({ hasMore, isLoadingMore, loadedCount, total, onLoadMore }: PaginationControlProps) => {
  if (!hasMore) {
    return (
      <div className="mt-2 text-sm text-muted-foreground">
        Showing {loadedCount} of {total} games.
      </div>
    );
  }

  return (
    <div className="mt-4 flex items-center gap-3">
      <div className="text-sm text-muted-foreground">
        Showing {loadedCount} of {total} games
      </div>
      <Button
        onClick={onLoadMore}
        disabled={isLoadingMore || !hasMore}
        aria-label="Load more backlog games"
        variant="outline"
      >
        {isLoadingMore ? "Loading..." : "Load more"}
      </Button>
    </div>
  );
};

export default PaginationControl;
