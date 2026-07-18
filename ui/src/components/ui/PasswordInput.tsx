import { type ComponentProps, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input as ShadcnInput } from './input'
import { Label } from './label'
import { cn } from '@/lib/utils'

interface PasswordInputProps extends Omit<ComponentProps<'input'>, 'type'> {
  label?: string
  error?: string
  hint?: string
}

/**
 * Password field built on the shadcn Input, keeping the show/hide eye toggle
 * and the existing label/error/hint API.
 */
export function PasswordInput({
  label,
  error,
  hint,
  id,
  className,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const inputId = id || props.name

  return (
    <div className="w-full">
      {label && (
        <Label htmlFor={inputId} className="mb-1.5 text-neutral-300">
          {label}
        </Label>
      )}
      <div className="relative">
        <ShadcnInput
          id={inputId}
          type={showPassword ? 'text' : 'password'}
          aria-invalid={!!error}
          className={cn('h-10 w-full pr-10 dark:bg-neutral-800', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-300 focus:outline-none"
          tabIndex={-1}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>
      </div>
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
      {hint && !error && (
        <p className="mt-1.5 text-sm text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}
