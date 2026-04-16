import type { GetSpaceQuery } from '@/generated/graphql'
import { Button } from '@/components/ui/button'

export type SpaceSettingsData = NonNullable<GetSpaceQuery['space']>

// ── Avatar helpers ─────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-fuchsia-500',
] as const

export function avatarColor(slug: string): string {
  let hash = 0
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function spaceInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

// ── SecretField — masked-reveal input ─────────────────────────────────────

interface SecretFieldProps {
  show: boolean
  onShow: () => void
  onHide: () => void
  updateLabel: string
  cancelLabel: string
  disabled?: boolean
  /** The controlled Input to render when revealed */
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
