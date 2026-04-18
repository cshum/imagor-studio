import * as React from 'react'
import { LoaderCircle } from 'lucide-react'

import { Button } from '@shared/components/ui/button'

export interface ButtonWithLoadingProps {
  children?: React.ReactNode
  className?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  asChild?: boolean
  disabled?: boolean
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  type?: 'button' | 'submit' | 'reset'
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
