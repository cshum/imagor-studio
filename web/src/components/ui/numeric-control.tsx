import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

interface NumericControlProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
  className?: string
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
    // Allow: backspace, delete, tab, escape, enter, arrows
    const allowedKeys = [
      'Backspace',
      'Delete',
      'Tab',
      'Escape',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
    ]

    // Allow Ctrl/Cmd shortcuts (copy, paste, select all, etc.)
    if (e.ctrlKey || e.metaKey) {
      return
    }

    // Check if it's an allowed key
    if (allowedKeys.includes(e.key)) {
      return
    }

    // Allow numbers
    if (/^[0-9]$/.test(e.key)) {
      return
    }

    // Allow decimal point if step allows decimals
    if (e.key === '.' && step % 1 !== 0 && !e.currentTarget.value.includes('.')) {
      return
    }

    // Allow minus sign at the beginning if min is negative
    if (e.key === '-' && min < 0 && e.currentTarget.selectionStart === 0) {
      return
    }

    // Block everything else
    e.preventDefault()
  }

  const toggleInput = () => {
    setShowInput((prev) => !prev)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className='flex items-center justify-between'>
        <Label className='text-sm'>{label}</Label>
        <div className='flex items-center gap-2'>
          <span className='text-muted-foreground text-xs'>
            {value}
            {unit}
          </span>
          <Button
            variant='ghost'
            size='icon'
            className={cn('h-6 w-6', showInput && 'text-primary')}
            onClick={toggleInput}
            type='button'
          >
            <SlidersHorizontal className='h-3.5 w-3.5' />
          </Button>
        </div>
      </div>

      {showInput ? (
        <div className='flex items-center gap-3'>
          <Input
            type='number'
            value={value}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            min={min}
            max={max}
            step={step}
            className='h-8 w-20 text-center'
          />
          <Slider
            value={[value]}
            onValueChange={([newValue]) => onChange(newValue)}
            min={min}
            max={max}
            step={step}
            className='flex-1'
          />
        </div>
      ) : (
        <Slider
          value={[value]}
          onValueChange={([newValue]) => onChange(newValue)}
          min={min}
          max={max}
          step={step}
          className='w-full'
        />
      )}
    </div>
  )
}
