import { useMemo } from "react";

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const PaginationControls = ({ page, pageSize, total, onPageChange, onPageSizeChange }: PaginationControlsProps) => {
  const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 0) / (pageSize || 1))), [pageSize, total]);

  const currentPage = Math.min(Math.max(page, 1), totalPages);

  const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground/80">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-md border border-border bg-background px-3 py-2 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          Prev
        </button>
        <button
          type="button"
          className="rounded-md border border-border bg-background px-3 py-2 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          Next
        </button>
        <span className="text-xs text-foreground/70">
          Page {currentPage} of {totalPages}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2">
          <span className="text-xs text-foreground/70">Rows per page</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="ml-auto text-xs text-foreground/60">
        Showing {start}-{end} of {total}
      </div>
    </div>
  );
};

export default PaginationControls;
