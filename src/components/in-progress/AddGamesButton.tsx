import { Button } from "@/components/ui/button";

interface AddGamesButtonProps {
  onClick: () => void;
  disabled: boolean;
}

const AddGamesButton = ({ onClick, disabled }: AddGamesButtonProps) => (
  <Button onClick={onClick} disabled={disabled}>
    Add games
  </Button>
);

export default AddGamesButton;
