import { Button } from "@/components/ui/button"

type RemoveToBacklogButtonProps = {
  onRemove: () => void
  isLoading?: boolean
}

const RemoveToBacklogButton = ({ onRemove, isLoading }: RemoveToBacklogButtonProps) => (
  <Button variant="outline" size="sm" onClick={onRemove} disabled={isLoading}>
    Move to backlog
  </Button>
)

export default RemoveToBacklogButton

