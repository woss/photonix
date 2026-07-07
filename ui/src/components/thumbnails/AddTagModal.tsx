import { useState } from 'react'
import { Modal, Input, Button } from '../ui'

interface AddTagModalProps {
  title: string
  label: string
  onSubmit: (name: string) => Promise<void> | void
  onClose: () => void
}

/**
 * Small modal to enter a tag/album name for a batch assignment.
 */
export function AddTagModal({ title, label, onSubmit, onClose }: AddTagModalProps) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const valid = name.trim().length >= 2

  const handleSave = async () => {
    if (!valid) return
    setSaving(true)
    try {
      await onSubmit(name.trim())
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose} data-testid="add-tag-modal">
      <div className="space-y-4">
        <Input
          label={label}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
          }}
          autoFocus
          data-testid="add-tag-input"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            isLoading={saving}
            disabled={!valid}
            data-testid="add-tag-save"
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  )
}
