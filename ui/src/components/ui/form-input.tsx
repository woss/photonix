import type { ComponentProps } from 'react'
import { Input as ShadcnInput } from './input'
import { Label } from './label'
import { cn } from '@/lib/utils'

interface InputProps extends ComponentProps<'input'> {
  label?: string
  error?: string
  hint?: string
}

/**
 * Labelled text field built on the shadcn Input. Preserves the existing
 * label/error/hint API used across the onboarding and modal forms.
 */
export function Input({ label, error, hint, id, className, ...props }: InputProps) {
  const inputId = id || props.name

  return (
    <div className="w-full">
      {label && (
        <Label htmlFor={inputId} className="mb-1.5 text-neutral-300">
          {label}
        </Label>
      )}
      <ShadcnInput
        id={inputId}
        aria-invalid={!!error}
        className={cn('h-10 w-full dark:bg-neutral-800', className)}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
      {hint && !error && (
        <p className="mt-1.5 text-sm text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}
