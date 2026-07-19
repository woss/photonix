import { useRef, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Button, Input, PasswordInput } from '../ui'
import { Avatar } from '../ui/Avatar'
import { SettingsCard } from './SettingsCard'
import { GET_PROFILE } from '../../lib/auth/graphql'
import {
  CHANGE_PASSWORD,
  CLEAR_AVATAR,
  SET_AVATAR,
  UPDATE_PROFILE,
} from '../../lib/account/graphql'
import { getErrorMessage } from '../../lib/onboarding'
import { addToast } from '../../lib/ui/store'

const AVATAR_UPLOAD_EDGE = 512
const AVATAR_MAX_FILE_BYTES = 20 * 1024 * 1024

/** Downscale the picked image client-side so uploads stay well under the
 * server's 2MB decoded cap regardless of the source photo's size. */
async function fileToAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, AVATAR_UPLOAD_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas unavailable')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.9)
}

export function AccountPage() {
  const { data, loading } = useQuery(GET_PROFILE, { fetchPolicy: 'cache-and-network' })
  const profile = data?.profile

  return (
    <>
      {profile && <ProfileCard key={profile.id} profile={profile} />}
      {!profile && !loading && (
        <SettingsCard title="Profile">
          <p className="text-sm text-neutral-400">Couldn't load your profile.</p>
        </SettingsCard>
      )}
      <PasswordCard />
    </>
  )
}

const profileSchema = z.object({
  email: z.string().email('Enter a valid email address').or(z.literal('')),
  firstName: z.string(),
  lastName: z.string(),
})

function ProfileCard({
  profile,
}: {
  profile: {
    id: string
    username: string
    email: string | null
    firstName: string | null
    lastName: string | null
    avatarUrl: string | null
  }
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [setAvatar] = useMutation(SET_AVATAR, { refetchQueries: ['Profile'] })
  const [clearAvatar] = useMutation(CLEAR_AVATAR, { refetchQueries: ['Profile'] })
  const [updateProfile, { loading: saving }] = useMutation(UPDATE_PROFILE, {
    refetchQueries: ['Profile'],
  })

  const pickAvatar = () => fileInputRef.current?.click()

  const onAvatarFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > AVATAR_MAX_FILE_BYTES) {
      addToast('That image is too large')
      return
    }
    setAvatarBusy(true)
    try {
      const dataUrl = await fileToAvatarDataUrl(file)
      await setAvatar({ variables: { imageBase64: dataUrl } })
      addToast('Avatar updated', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Couldn't save avatar")
    } finally {
      setAvatarBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const onClearAvatar = async () => {
    setAvatarBusy(true)
    try {
      await clearAvatar()
    } catch {
      addToast("Couldn't remove avatar")
    } finally {
      setAvatarBusy(false)
    }
  }

  const form = useForm({
    defaultValues: {
      email: profile.email ?? '',
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
    },
    validators: { onSubmit: profileSchema },
    onSubmit: async ({ value }) => {
      setSaved(false)
      try {
        await updateProfile({
          variables: {
            email: value.email,
            firstName: value.firstName,
            lastName: value.lastName,
          },
        })
        setSaved(true)
      } catch (err) {
        addToast(err instanceof Error ? err.message : "Couldn't save profile")
      }
    },
  })

  return (
    <SettingsCard title="Profile" data-testid="profile-card">
      <div className="flex items-center gap-4">
        <Avatar
          username={profile.username}
          avatarUrl={profile.avatarUrl}
          size={64}
          data-testid="profile-avatar"
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-neutral-200">
            {profile.username}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={pickAvatar}
              isLoading={avatarBusy}
              data-testid="avatar-upload-button"
            >
              {profile.avatarUrl ? 'Change avatar' : 'Upload avatar'}
            </Button>
            {profile.avatarUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClearAvatar}
                disabled={avatarBusy}
                data-testid="avatar-remove-button"
              >
                Remove
              </Button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onAvatarFile(e.target.files?.[0])}
            data-testid="avatar-file-input"
          />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
        className="mt-6 space-y-4"
      >
        <form.Field name="email">
          {(field) => (
            <Input
              label="Email"
              type="email"
              name={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              error={getErrorMessage(field.state.meta.errors)}
              autoComplete="email"
              data-testid="profile-email-input"
            />
          )}
        </form.Field>

        <div className="flex gap-4">
          <form.Field name="firstName">
            {(field) => (
              <Input
                label="First name"
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                autoComplete="given-name"
                data-testid="profile-first-name-input"
              />
            )}
          </form.Field>
          <form.Field name="lastName">
            {(field) => (
              <Input
                label="Last name"
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                autoComplete="family-name"
                data-testid="profile-last-name-input"
              />
            )}
          </form.Field>
        </div>

        {saved && (
          <div
            className="rounded-md bg-green-800/60 p-3 text-sm text-green-200"
            data-testid="profile-success"
          >
            Profile saved!
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" isLoading={saving} data-testid="profile-save">
            Save
          </Button>
        </div>
      </form>
    </SettingsCard>
  )
}

const passwordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Old password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    newPasswordConfirm: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: 'Password fields do not match',
    path: ['newPasswordConfirm'],
  })

/** The change-password form (moved unchanged from the old Account modal,
 * keeping its testids so existing e2e coverage carries over). */
function PasswordCard() {
  const [changePassword, { loading }] = useMutation(CHANGE_PASSWORD)
  const [saved, setSaved] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      oldPassword: '',
      newPassword: '',
      newPasswordConfirm: '',
    },
    validators: { onSubmit: passwordSchema },
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
    <SettingsCard title="Change password" data-testid="password-card">
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
    </SettingsCard>
  )
}
