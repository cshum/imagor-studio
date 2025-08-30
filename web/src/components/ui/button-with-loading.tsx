import { LoaderCircle } from 'lucide-react'

import { Button, ButtonProps } from '@/components/ui/button'

interface ButtonWithLoadingProps extends ButtonProps {
  isLoading?: boolean
}

export const ButtonWithLoading = ({
  children,
  isLoading = false,
  disabled,
  ...props
}: ButtonWithLoadingProps) => {
  return (
    <Button {...props} disabled={disabled || isLoading}>
      <span className={isLoading ? 'invisible' : 'visible'}>{children}</span>
      {isLoading && (
        <span className='absolute'>
          <LoaderCircle className='h-5 w-5 animate-spin' />
        </span>
      )}
    </Button>
  )
}
