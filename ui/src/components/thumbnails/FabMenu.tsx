import { useState } from 'react'
import { Plus, Tag, FolderPlus, FolderMinus, Trash2, X } from 'lucide-react'

interface FabAction {
  key: string
  label: string
  icon: typeof Tag
  onClick: () => void
  danger?: boolean
}

interface FabMenuProps {
  selectedCount: number
  isAlbumView?: boolean
  onAddTag: () => void
  onAddAlbum: () => void
  onRemoveFromAlbum?: () => void
  onDelete: () => void
  onClear: () => void
}

/**
 * Floating speed-dial of batch actions shown while photos are selected.
 */
export function FabMenu({
  selectedCount,
  isAlbumView = false,
  onAddTag,
  onAddAlbum,
  onRemoveFromAlbum,
  onDelete,
  onClear,
}: FabMenuProps) {
  const [open, setOpen] = useState(false)

  const actions: FabAction[] = [
    { key: 'tag', label: 'Add tag', icon: Tag, onClick: onAddTag },
    { key: 'album', label: 'Add to album', icon: FolderPlus, onClick: onAddAlbum },
    ...(isAlbumView && onRemoveFromAlbum
      ? [
          {
            key: 'remove-album',
            label: 'Remove from album',
            icon: FolderMinus,
            onClick: onRemoveFromAlbum,
          },
        ]
      : []),
    { key: 'delete', label: 'Delete', icon: Trash2, onClick: onDelete, danger: true },
  ]

  const runAction = (fn: () => void) => {
    setOpen(false)
    fn()
  }

  return (
    <div
      className="fixed bottom-24 right-6 z-20 flex flex-col items-end gap-3"
      data-testid="fab-menu"
    >
      {open &&
        actions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.key}
              onClick={() => runAction(action.onClick)}
              className={`flex items-center gap-2 rounded-full py-2 pl-4 pr-3 text-sm font-medium shadow-lg transition-colors ${
                action.danger
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-neutral-700 text-white hover:bg-neutral-600'
              }`}
              data-testid={`fab-action-${action.key}`}
            >
              <span>{action.label}</span>
              <Icon className="h-5 w-5" />
            </button>
          )
        })}

      <div className="flex items-center gap-2">
        <span className="rounded-full bg-black/60 px-3 py-1 text-sm text-white">
          {selectedCount} selected
        </span>
        <button
          onClick={onClear}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 text-white shadow-lg hover:bg-neutral-700"
          aria-label="Clear selection"
          data-testid="fab-clear"
        >
          <X className="h-5 w-5" />
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg transition-transform hover:bg-teal-700"
          aria-label="Batch actions"
          data-testid="fab-toggle"
        >
          <Plus
            className={`h-7 w-7 transition-transform ${open ? 'rotate-45' : ''}`}
          />
        </button>
      </div>
    </div>
  )
}
