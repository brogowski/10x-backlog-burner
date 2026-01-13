import { Button } from "@/components/ui/button";

interface AddToInProgressButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  isQueueAtCap?: boolean;
  title?: string;
}

const AddToInProgressButton = ({ onClick, isLoading, isQueueAtCap, title }: AddToInProgressButtonProps) => (
  <Button
    onClick={onClick}
    disabled={isLoading || isQueueAtCap}
    aria-label={title ? `Add ${title} to in-progress queue` : "Add to in-progress queue"}
  >
    {isLoading ? "Adding..." : "Add to In-Progress"}
  </Button>
);

export default AddToInProgressButton;
