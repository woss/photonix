import { Switch as SwitchRoot } from './switch'
import { cn } from '@/lib/utils'

interface SwitchProps {
  label: string
  description?: string
  checked?: boolean
  /**
   * Kept in the old checkbox-style shape (`e.target.checked`) so existing call
   * sites (TanStack Form fields, settings toggles) work unchanged.
   */
  onChange?: (event: { target: { checked: boolean } }) => void
  name?: string
  id?: string
  disabled?: boolean
  className?: string
  'data-testid'?: string
}

/**
 * Labelled toggle built on the shadcn (Radix) Switch. The visible switch
 * carries the base `data-testid`; the text label carries `${testid}-label` and
 * is associated via `htmlFor` so clicking it toggles the switch (a <button> is
 * a labelable element). Checked color is the brand teal (--primary).
 */
export function Switch({
  label,
  description,
  checked,
  onChange,
  name,
  id,
  disabled,
  className,
  'data-testid': testId,
}: SwitchProps) {
  const switchId = id || name

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <label
        htmlFor={switchId}
        data-testid={testId ? `${testId}-label` : undefined}
        className="flex-1 cursor-pointer"
      >
        <span className="block text-sm font-medium text-neutral-200">
          {label}
        </span>
        {description && (
          <span className="block text-sm text-neutral-500">{description}</span>
        )}
      </label>
      <SwitchRoot
        id={switchId}
        name={name}
        data-testid={testId}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onChange?.({ target: { checked: value } })}
      />
    </div>
  )
}
