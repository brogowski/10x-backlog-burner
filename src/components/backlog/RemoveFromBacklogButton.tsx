import { Button } from "@/components/ui/button";

interface RemoveFromBacklogButtonProps {
  onRemove: () => void;
  isLoading?: boolean;
  title?: string;
}

const RemoveFromBacklogButton = ({ onRemove, isLoading, title }: RemoveFromBacklogButtonProps) => (
  <Button
    variant="ghost"
    onClick={onRemove}
    disabled={isLoading}
    aria-label={title ? `Remove ${title} from backlog` : "Remove from backlog"}
  >
    {isLoading ? "Removing..." : "Remove"}
  </Button>
);

export default RemoveFromBacklogButton;
