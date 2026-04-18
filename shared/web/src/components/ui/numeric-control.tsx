import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'

import { Button } from '@shared/components/ui/button'
import { Input } from '@shared/components/ui/input'
import { Label } from '@shared/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { cn } from '@shared/lib-utils'

interface NumericControlProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
  className?: string
  disabled?: boolean
}

export function NumericControl({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  onChange,
  className,
  disabled = false,
}: NumericControlProps) {
  const [showInput, setShowInput] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    if (!isNaN(newValue)) {
      onChange(Math.max(min, Math.min(max, newValue)))
    }
  }

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    if (isNaN(newValue) || newValue < min) {
      onChange(min)
    } else if (newValue > max) {
      onChange(max)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = [
      'Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End',
    ]
    if (e.ctrlKey || e.metaKey) return
    if (allowedKeys.includes(e.key)) return
    if (/^[0-9]$/.test(e.key)) return
    if (e.key === '.' && step % 1 !== 0 && !e.currentTarget.value.includes('.')) return
    if (e.key === '-' && min < 0 && e.currentTarget.selectionStart === 0) return
    e.preventDefault()
  }

  return (
    <div className={cn('space-y-2', disabled && 'pointer-events-none opacity-50', className)}>
      <div className='flex items-center justify-between'>
        <Label className='text-sm'>{label}</Label>
        <div className='flex items-center gap-2'>
          {!showInput && (
            <span className='text-muted-foreground text-xs'>
              {value}
              {unit}
            </span>
          )}
          <Button variant='ghost' size='icon' className='h-6 w-6' onClick={() => setShowInput((p) => !p)} disabled={disabled} type='button'>
            <SlidersHorizontal className='h-3.5 w-3.5' />
          </Button>
        </div>
      </div>

      {showInput ? (
        <div className='flex items-center gap-3'>
          <Slider value={[value]} onValueChange={([newValue]) => onChange(newValue)} min={min} max={max} step={step} disabled={disabled} className='flex-1' />
          <Input
            type='number'
            value={value}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            min={min}
            max={max}
            step={step}
            className='h-8 w-20 text-center'
          />
        </div>
      ) : (
        <Slider value={[value]} onValueChange={([newValue]) => onChange(newValue)} min={min} max={max} step={step} disabled={disabled} className='w-full' />
      )}
    </div>
  )
}
