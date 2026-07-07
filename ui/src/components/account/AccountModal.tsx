import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Modal, Button, PasswordInput } from '../ui'
import { CHANGE_PASSWORD } from '../../lib/account/graphql'
import { getErrorMessage } from '../../lib/onboarding'

interface AccountModalProps {
  onClose: () => void
}

const schema = z
  .object({
    oldPassword: z.string().min(1, 'Old password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    newPasswordConfirm: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: 'Password fields do not match',
    path: ['newPasswordConfirm'],
  })

export function AccountModal({ onClose }: AccountModalProps) {
  const [changePassword, { loading }] = useMutation(CHANGE_PASSWORD)
  const [saved, setSaved] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      oldPassword: '',
      newPassword: '',
      newPasswordConfirm: '',
    },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setFormError(null)
      setSaved(false)
      try {
        const result = await changePassword({
          variables: {
            oldPassword: value.oldPassword,
            newPassword: value.newPassword,
          },
        })
        if (result.data?.changePassword.ok) {
          setSaved(true)
          form.reset()
        } else {
          setFormError("Old password doesn't match!")
        }
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : 'Failed to change password'
        )
      }
    },
  })

  return (
    <Modal
      title="Account"
      subtitle="Change password"
      onClose={onClose}
      data-testid="account-modal"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
        className="space-y-4"
      >
        <form.Field name="oldPassword">
          {(field) => (
            <PasswordInput
              label="Old password"
              name={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              error={getErrorMessage(field.state.meta.errors)}
              autoComplete="current-password"
              data-testid="old-password-input"
            />
          )}
        </form.Field>

        <form.Field name="newPassword">
          {(field) => (
            <PasswordInput
              label="New password"
              name={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              error={getErrorMessage(field.state.meta.errors)}
              autoComplete="new-password"
              data-testid="new-password-input"
            />
          )}
        </form.Field>

        <form.Field name="newPasswordConfirm">
          {(field) => (
            <PasswordInput
              label="New password (again)"
              name={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              error={getErrorMessage(field.state.meta.errors)}
              autoComplete="new-password"
              data-testid="new-password-confirm-input"
            />
          )}
        </form.Field>

        {formError && (
          <div
            className="rounded-md bg-red-900/50 p-3 text-sm text-red-300"
            data-testid="account-error"
          >
            {formError}
          </div>
        )}

        {saved && (
          <div
            className="rounded-md bg-green-800/60 p-3 text-sm text-green-200"
            data-testid="account-success"
          >
            Password saved!
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button type="submit" isLoading={loading} data-testid="account-save">
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}
