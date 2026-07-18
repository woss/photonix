import type { FocusEventHandler } from 'react'
import {
  Select as SelectRoot,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'
import { Label } from './label'
import { cn } from '@/lib/utils'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
  value?: string
  onValueChange?: (value: string) => void
  onBlur?: FocusEventHandler<HTMLButtonElement>
  name?: string
  id?: string
  disabled?: boolean
  className?: string
  'data-testid'?: string
}

/**
 * Labelled select built on the shadcn (Radix) Select. Takes a simple
 * `options` array plus `value`/`onValueChange`.
 */
export function Select({
  label,
  error,
  options,
  placeholder,
  value,
  onValueChange,
  onBlur,
  name,
  id,
  disabled,
  className,
  'data-testid': testId,
}: SelectProps) {
  const selectId = id || name

  return (
    <div className="w-full">
      {label && (
        <Label htmlFor={selectId} className="mb-1.5 text-neutral-300">
          {label}
        </Label>
      )}
      <SelectRoot
        value={value}
        onValueChange={onValueChange}
        name={name}
        disabled={disabled}
      >
        <SelectTrigger
          id={selectId}
          onBlur={onBlur}
          aria-invalid={!!error}
          data-testid={testId}
          className={cn('w-full dark:bg-neutral-800', className)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectRoot>
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
    </div>
  )
}
