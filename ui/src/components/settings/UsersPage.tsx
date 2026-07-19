import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Button, Input, PasswordInput, Switch } from '../ui'
import { Avatar } from '../ui/Avatar'
import { SettingsCard } from './SettingsCard'
import { GET_PROFILE } from '../../lib/auth/graphql'
import {
  ADMIN_CREATE_USER,
  ADMIN_SET_USER_ACTIVE,
  GET_ALL_USERS,
} from '../../lib/account/graphql'
import { getErrorMessage } from '../../lib/onboarding'
import { addToast } from '../../lib/ui/store'

const newUserSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  email: z.string().email('Enter a valid email address').or(z.literal('')),
})

/** Site-admin user management. The sidebar link is already hidden for
 * non-staff users; the query and mutations are enforced server-side too. */
export function UsersPage() {
  const { data: profileData } = useQuery(GET_PROFILE)
  const me = profileData?.profile
  const { data, error, refetch } = useQuery(GET_ALL_USERS, {
    fetchPolicy: 'cache-and-network',
  })
  const [setUserActive] = useMutation(ADMIN_SET_USER_ACTIVE)
  const [createUser, { loading: creating }] = useMutation(ADMIN_CREATE_USER)
  const [showAddForm, setShowAddForm] = useState(false)

  const form = useForm({
    defaultValues: { username: '', password: '', email: '' },
    validators: { onSubmit: newUserSchema },
    onSubmit: async ({ value }) => {
      try {
        await createUser({
          variables: {
            username: value.username,
            password: value.password,
            email: value.email || undefined,
          },
        })
        addToast(`User "${value.username}" created`, 'success')
        form.reset()
        setShowAddForm(false)
        refetch()
      } catch (err) {
        addToast(err instanceof Error ? err.message : "Couldn't create user")
      }
    },
  })

  const toggleActive = async (userId: string, isActive: boolean) => {
    try {
      await setUserActive({ variables: { userId, isActive } })
      refetch()
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Couldn't update user")
    }
  }

  if (error) {
    return (
      <SettingsCard title="Users">
        <p className="text-sm text-neutral-400" data-testid="users-error">
          Only site admins can manage users.
        </p>
      </SettingsCard>
    )
  }

  return (
    <>
      <SettingsCard
        title="Users"
        description="Everyone with an account on this Photonix instance."
        data-testid="users-card"
      >
        <ul className="divide-y divide-white/5" data-testid="users-list">
          {data?.allUsers?.map((user) => (
            <li
              key={user.id}
              className="flex items-center gap-3 py-3"
              data-testid={`user-row-${user.username}`}
            >
              <Avatar username={user.username} avatarUrl={user.avatarUrl} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-neutral-200">
                    {user.username}
                  </span>
                  {user.isStaff && (
                    <span className="rounded-full bg-teal-900/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-300">
                      Admin
                    </span>
                  )}
                  {!user.isActive && (
                    <span className="rounded-full bg-neutral-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                      Deactivated
                    </span>
                  )}
                </div>
                {user.email && (
                  <span className="block truncate text-xs text-neutral-500">
                    {user.email}
                  </span>
                )}
              </div>
              {me && user.id !== me.id && (
                <Switch
                  label=""
                  checked={user.isActive}
                  onChange={(e) => toggleActive(user.id, e.target.checked)}
                  className="flex-none"
                  data-testid={`user-active-toggle-${user.username}`}
                />
              )}
            </li>
          ))}
        </ul>
      </SettingsCard>

      <SettingsCard
        title="Add user"
        description="Create an account for someone on this instance. To give them access to a library, add them under the library's Members."
        data-testid="add-user-card"
      >
        {!showAddForm ? (
          <Button
            type="button"
            onClick={() => setShowAddForm(true)}
            data-testid="add-user-button"
          >
            Add user
          </Button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              form.handleSubmit()
            }}
            className="space-y-4"
          >
            <form.Field name="username">
              {(field) => (
                <Input
                  label="Username"
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={getErrorMessage(field.state.meta.errors)}
                  autoComplete="off"
                  data-testid="new-user-username-input"
                />
              )}
            </form.Field>
            <form.Field name="password">
              {(field) => (
                <PasswordInput
                  label="Password"
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={getErrorMessage(field.state.meta.errors)}
                  autoComplete="new-password"
                  data-testid="new-user-password-input"
                />
              )}
            </form.Field>
            <form.Field name="email">
              {(field) => (
                <Input
                  label="Email (optional)"
                  type="email"
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={getErrorMessage(field.state.meta.errors)}
                  autoComplete="off"
                  data-testid="new-user-email-input"
                />
              )}
            </form.Field>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={creating} data-testid="new-user-save">
                Create user
              </Button>
            </div>
          </form>
        )}
      </SettingsCard>
    </>
  )
}
