import { useState, useEffect, useRef, memo } from 'react'
import { useMutation } from '@apollo/client/react'
import { Check } from 'lucide-react'
import { StarRating } from './StarRating'
import { UPDATE_PHOTO_RATING } from '../../lib/photos/graphql'
import { addToast } from '../../lib/ui/store'
import type { ThumbnailPhoto } from '../../lib/photos/types'

interface ThumbnailProps {
  photo: ThumbnailPhoto
  isSelected: boolean
  isSelectable: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onClick: () => void
  onLongPress?: () => void
}

const LONG_PRESS_MS = 500
// Cancel the long press only once the pointer drifts this far, so mouse
// jitter and small touch wobble don't defeat it.
const LONG_PRESS_MOVE_TOLERANCE_PX = 10

export const Thumbnail = memo(function Thumbnail({
  photo,
  isSelected,
  isSelectable,
  onMouseDown,
  onClick,
  onLongPress,
}: ThumbnailProps) {
  const [localRating, setLocalRating] = useState(photo.starRating)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLLIElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressed = useRef(false)
  const pressOrigin = useRef<{ x: number; y: number } | null>(null)

  // Refetch any mounted filter facets so the Rating range reflects the change.
  const [updateRating] = useMutation(UPDATE_PHOTO_RATING, {
    refetchQueries: ['FilterFacets'],
  })

  useEffect(() => {
    setLocalRating(photo.starRating)
  }, [photo.starRating])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: '200px', threshold: 0 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleRatingChange = (newRating: number) => {
    setLocalRating(newRating)
    updateRating({
      variables: { photoId: photo.id, starRating: newRating },
    }).catch(() => {
      setLocalRating(photo.starRating)
      addToast("Couldn't save rating")
    })
  }

  const canHover =
    typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches

  // Long-press (any pointer type, including mouse) to enter selection mode.
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    pressOrigin.current = null
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    longPressed.current = false
    // Primary button only; skip when selection mode is already active —
    // a plain click toggles selection there, so a long press would undo it.
    if (!onLongPress || e.button !== 0 || isSelectable) return
    pressOrigin.current = { x: e.clientX, y: e.clientY }
    longPressTimer.current = setTimeout(() => {
      longPressed.current = true
      onLongPress()
    }, LONG_PRESS_MS)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!longPressTimer.current || !pressOrigin.current) return
    const dx = e.clientX - pressOrigin.current.x
    const dy = e.clientY - pressOrigin.current.y
    if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOLERANCE_PX) {
      cancelLongPress()
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    // Swallow the compatibility mousedown that can follow a touch long-press —
    // it would re-toggle the selection the long press just made.
    if (longPressed.current) return
    onMouseDown(e)
  }

  const handleClickCapture = (e: React.MouseEvent) => {
    // Swallow the click that follows a long-press so it doesn't navigate.
    if (longPressed.current) {
      e.preventDefault()
      e.stopPropagation()
      longPressed.current = false
    }
  }

  return (
    <li
      ref={containerRef}
      data-id={photo.id}
      data-testid={`thumbnail-${photo.id}`}
      className={`relative w-full pb-[100%] rounded-[10px] cursor-pointer list-none bg-[#292929] ${
        isSelected ? 'bg-transparent' : ''
      }`}
      onMouseDown={handleMouseDown}
      onClick={onClick}
      onClickCapture={handleClickCapture}
      onPointerDown={handlePointerDown}
      onPointerUp={cancelLongPress}
      onPointerMove={handlePointerMove}
      onPointerCancel={cancelLongPress}
      onPointerLeave={cancelLongPress}
    >
      <div
        className={`absolute inset-0 transition-transform duration-100 ease-in-out ${
          isSelected ? 'scale-90' : 'scale-100'
        }`}
      >
        {isVisible && (
          <img
            src={photo.thumbnailUrl}
            alt=""
            draggable={false}
            className={`w-full h-full rounded-[10px] object-cover transition-opacity duration-300 ease-in ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transform: `rotate(${photo.rotation}deg)` }}
            onLoad={() => setIsLoaded(true)}
          />
        )}

        {isLoaded && (
          <div className="absolute inset-0 rounded-[10px] shadow-[0_4px_8px_1px_rgba(0,0,0,0.3)] pointer-events-none" />
        )}

        <div className="absolute bottom-1.5 left-1.5">
          <StarRating
            rating={localRating}
            onRatingChange={
              !isSelectable && canHover ? handleRatingChange : undefined
            }
          />
        </div>
      </div>

      <div
        className={`absolute flex items-center justify-center rounded-full transition-opacity duration-150 ${
          isSelected
            ? 'w-[22px] h-[22px] bottom-[5px] right-[5px] bg-teal-500 opacity-100'
            : isSelectable
              ? 'w-[15px] h-[15px] bottom-[5px] right-[5px] border-[2px] border-white/80 opacity-100'
              : 'opacity-0'
        }`}
        data-testid={isSelected ? `thumbnail-selected-${photo.id}` : undefined}
      >
        {isSelected && <Check className="w-[14px] h-[14px] text-white stroke-[4] relative top-px" />}
      </div>
    </li>
  )
})
