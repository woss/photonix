import { cn } from '@/lib/utils'

interface AvatarProps {
  username: string
  avatarUrl?: string | null
  /** Diameter in px */
  size?: number
  className?: string
  'data-testid'?: string
}

/**
 * User avatar: the uploaded image when one exists, otherwise the user's
 * initial on a stable per-username background colour.
 */
export function Avatar({
  username,
  avatarUrl,
  size = 32,
  className,
  'data-testid': testId,
}: AvatarProps) {
  const initial = (username || '?').charAt(0).toUpperCase()
  // Stable hue derived from the username so the fallback colour doesn't
  // change between sessions or components.
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = (hash * 31 + username.charCodeAt(i)) >>> 0
  }
  const hue = hash % 360

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${username} avatar`}
        width={size}
        height={size}
        className={cn('rounded-full object-cover flex-none', className)}
        style={{ width: size, height: size }}
        data-testid={testId}
      />
    )
  }

  return (
    <span
      role="img"
      aria-label={`${username} avatar`}
      className={cn(
        'rounded-full flex-none inline-flex items-center justify-center font-semibold text-white/90 select-none',
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        backgroundColor: `hsl(${hue} 45% 38%)`,
      }}
      data-testid={testId}
    >
      {initial}
    </span>
  )
}
