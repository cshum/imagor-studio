import { useState } from 'react'
import { Hash, Minus, Plus, SlidersHorizontal } from 'lucide-react'

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
  const [mode, setMode] = useState<'slider' | 'stepper'>('slider')

  const handleIncrement = () => {
    const newValue = Math.min(value + step, max)
    onChange(newValue)
  }

  const handleDecrement = () => {
    const newValue = Math.max(value - step, min)
    onChange(newValue)
  }

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

  const toggleMode = () => {
    setMode((prev) => (prev === 'slider' ? 'stepper' : 'slider'))
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
            className='h-6 w-6'
            onClick={toggleMode}
            type='button'
          >
            {mode === 'slider' ? (
              <Hash className='h-3.5 w-3.5' />
            ) : (
              <SlidersHorizontal className='h-3.5 w-3.5' />
            )}
          </Button>
        </div>
      </div>

      {mode === 'slider' ? (
        <Slider
          value={[value]}
          onValueChange={([newValue]) => onChange(newValue)}
          min={min}
          max={max}
          step={step}
          className='w-full'
        />
      ) : (
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8 shrink-0'
            onClick={handleDecrement}
            disabled={value <= min}
            type='button'
          >
            <Minus className='h-3.5 w-3.5' />
          </Button>
          <Input
            type='number'
            value={value}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            min={min}
            max={max}
            step={step}
            className='h-8 text-center'
          />
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8 shrink-0'
            onClick={handleIncrement}
            disabled={value >= max}
            type='button'
          >
            <Plus className='h-3.5 w-3.5' />
          </Button>
        </div>
      )}
    </div>
  )
}
