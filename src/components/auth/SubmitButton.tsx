import { Button } from "@/components/ui/button"

type SubmitButtonProps = {
  label: string
  isLoading?: boolean
  disabled?: boolean
}

const SubmitButton = ({ label, isLoading, disabled }: SubmitButtonProps) => {
  return (
    <Button
      type="submit"
      className="w-full"
      disabled={disabled || isLoading}
      aria-busy={isLoading}
    >
      {isLoading ? "Please wait..." : label}
    </Button>
  )
}

export default SubmitButton
