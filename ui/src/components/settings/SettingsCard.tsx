import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SettingsCardProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
  'data-testid'?: string
}

/** Sectioned panel for the settings pages (the OnboardingCard look, reusable). */
export function SettingsCard({
  title,
  description,
  children,
  className,
  'data-testid': testId,
}: SettingsCardProps) {
  return (
    <section
      className={cn('rounded-xl bg-neutral-800 p-6 shadow-xl', className)}
      data-testid={testId}
    >
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {description && <p className="mt-1 text-sm text-neutral-400">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}
