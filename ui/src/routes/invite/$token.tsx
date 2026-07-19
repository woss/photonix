import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from '@apollo/client/react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Button, Input, PasswordInput } from '../../components/ui'
import { useAuth } from '../../lib/auth/auth-context'
import { useLibrariesStore } from '../../lib/libraries'
import {
  ACCEPT_LIBRARY_INVITATION,
  CREATE_USER_VIA_INVITATION,
  GET_INVITATION_INFO,
} from '../../lib/settings/graphql'
import { getErrorMessage } from '../../lib/onboarding'

// Public route (outside `_authenticated`): the unguessable token in the URL
// is the authorization, mirroring the backend's capability-URL design.
export const Route = createFileRoute('/invite/$token')({
  component: InvitePage,
})

const signupSchema = z
  .object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    passwordConfirm: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Password fields do not match',
    path: ['passwordConfirm'],
  })

function InvitePage() {
  const { token } = Route.useParams()
  const navigate = useNavigate()
  const { isAuthenticated, login } = useAuth()
  const setActiveLibrary = useLibrariesStore((s) => s.setActiveLibrary)

  const { data, loading } = useQuery(GET_INVITATION_INFO, {
    variables: { token },
    fetchPolicy: 'network-only',
  })

  const [acceptInvitation, { loading: accepting }] = useMutation(
    ACCEPT_LIBRARY_INVITATION
  )
  const [createUser, { loading: signingUp }] = useMutation(
    CREATE_USER_VIA_INVITATION
  )
  const [pageError, setPageError] = useState<string | null>(null)
  const [showSignup, setShowSignup] = useState(false)

  const info = data?.invitationInfo

  const enterLibrary = (libraryId: string | undefined) => {
    if (libraryId) setActiveLibrary(libraryId)
    navigate({ to: '/' })
  }

  const onAccept = async () => {
    setPageError(null)
    try {
      const result = await acceptInvitation({ variables: { token } })
      enterLibrary(result.data?.acceptLibraryInvitation.libraryId)
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : "Couldn't accept the invitation"
      )
    }
  }

  const form = useForm({
    defaultValues: { username: '', password: '', passwordConfirm: '' },
    validators: { onSubmit: signupSchema },
    onSubmit: async ({ value }) => {
      setPageError(null)
      try {
        const result = await createUser({
          variables: { token, username: value.username, password: value.password },
        })
        const libraryId = result.data?.createUserViaInvitation.libraryId
        const loginResult = await login(value.username, value.password)
        if (loginResult.success) {
          enterLibrary(libraryId)
        } else {
          // Account exists; the invite is consumed, so plain login gets them in.
          navigate({ to: '/login', search: { next: '/' } })
        }
      } catch (err) {
        setPageError(
          err instanceof Error ? err.message : "Couldn't create the account"
        )
      }
    },
  })

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#1d1d1d] p-4">
      <div
        className="w-full max-w-md rounded-xl bg-neutral-800 p-8 shadow-xl"
        data-testid="invite-card"
      >
        {loading && <p className="text-neutral-400">Checking invitation…</p>}

        {!loading && (!info || !info.valid) && (
          <div data-testid="invite-invalid">
            <h1 className="text-2xl font-bold text-white">
              This invitation isn't valid
            </h1>
            <p className="mt-2 text-neutral-400">
              The link may have expired, been revoked, or already been used. Ask
              the person who invited you for a new one.
            </p>
          </div>
        )}

        {!loading && info?.valid && (
          <div data-testid="invite-valid">
            <h1 className="text-2xl font-bold text-white">
              Join “{info.libraryName}”
            </h1>
            <p className="mt-2 text-neutral-400">
              <span data-testid="invite-inviter">{info.invitedBy}</span> invited
              you to their photo library on Photonix.
            </p>

            {pageError && (
              <div
                className="mt-4 rounded-md bg-red-900/50 p-3 text-sm text-red-300"
                data-testid="invite-error"
              >
                {pageError}
              </div>
            )}

            {isAuthenticated ? (
              <Button
                type="button"
                className="mt-6 w-full"
                onClick={onAccept}
                isLoading={accepting}
                data-testid="invite-accept-button"
              >
                Accept invitation
              </Button>
            ) : showSignup ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  form.handleSubmit()
                }}
                className="mt-6 space-y-4"
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
                      autoComplete="username"
                      data-testid="invite-username-input"
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
                      data-testid="invite-password-input"
                    />
                  )}
                </form.Field>
                <form.Field name="passwordConfirm">
                  {(field) => (
                    <PasswordInput
                      label="Password (again)"
                      name={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      error={getErrorMessage(field.state.meta.errors)}
                      autoComplete="new-password"
                      data-testid="invite-password-confirm-input"
                    />
                  )}
                </form.Field>
                <Button
                  type="submit"
                  className="w-full"
                  isLoading={signingUp}
                  data-testid="invite-signup-submit"
                >
                  Create account & join
                </Button>
                <button
                  type="button"
                  onClick={() => setShowSignup(false)}
                  className="w-full cursor-pointer text-center text-sm text-neutral-400 hover:text-white"
                >
                  Back
                </button>
              </form>
            ) : (
              <div className="mt-6 space-y-3">
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => setShowSignup(true)}
                  data-testid="invite-signup-button"
                >
                  Create an account
                </Button>
                <Link
                  to="/login"
                  search={{ next: `/invite/${token}` }}
                  className="block w-full rounded-md border border-white/15 py-2 text-center text-sm text-neutral-300 hover:bg-white/5 hover:text-white transition-colors"
                  data-testid="invite-login-link"
                >
                  I already have an account
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
