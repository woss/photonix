import type { ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { Button as ShadcnButton } from './button'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
}

// Map the app's semantic variant/size names onto the shadcn Button. The
// "primary" variant resolves to shadcn's default (Photonix brand teal).
const VARIANT_MAP: Record<ButtonVariant, 'default' | 'secondary' | 'ghost'> = {
  primary: 'default',
  secondary: 'secondary',
  ghost: 'ghost',
}

const SIZE_MAP: Record<ButtonSize, 'default' | 'sm' | 'lg'> = {
  sm: 'sm',
  md: 'default',
  lg: 'lg',
}

/**
 * App-level Button built on the shadcn Button. Keeps the existing
 * variant/size/isLoading API so call sites need no changes.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <ShadcnButton
      variant={VARIANT_MAP[variant]}
      size={SIZE_MAP[size]}
      disabled={disabled || isLoading}
      className={className}
      {...props}
    >
      {isLoading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </ShadcnButton>
  )
}
