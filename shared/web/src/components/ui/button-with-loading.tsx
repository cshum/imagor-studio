import * as React from 'react'
import { LoaderCircle } from 'lucide-react'

import { Button, type ButtonProps } from '@shared/components/ui/button'

type ButtonWithLoadingProps = ButtonProps & {
  children?: React.ReactNode
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
