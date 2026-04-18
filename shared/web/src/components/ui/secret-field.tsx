import { Button } from '@shared/components/ui/button'

interface SecretFieldProps {
  show: boolean
  onShow: () => void
  onHide: () => void
  updateLabel: string
  cancelLabel: string
  disabled?: boolean
  renderInput: () => React.ReactNode
}

export function SecretField({
  show,
  onShow,
  onHide,
  updateLabel,
  cancelLabel,
  disabled,
  renderInput,
}: SecretFieldProps) {
  if (show) {
    return (
      <div className='flex items-center gap-2'>
        <div className='min-w-0 flex-1'>{renderInput()}</div>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={onHide}
          disabled={disabled}
          className='shrink-0'
        >
          {cancelLabel}
        </Button>
      </div>
    )
  }
  return (
    <div className='flex items-center gap-2'>
      <div className='border-input bg-background text-muted-foreground flex-1 rounded-md border px-3 py-2 text-sm tracking-[0.25em]'>
        ••••••••
      </div>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={onShow}
        disabled={disabled}
        className='shrink-0'
      >
        {updateLabel}
      </Button>
    </div>
  )
}
