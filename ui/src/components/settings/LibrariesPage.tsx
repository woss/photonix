import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from '@apollo/client/react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { ChevronRight, Library as LibraryIcon } from 'lucide-react'
import { Button, Input } from '../ui'
import { SettingsCard } from './SettingsCard'
import { GET_ALL_LIBRARIES } from '../../lib/libraries'
import { CREATE_LIBRARY } from '../../lib/settings/graphql'
import { getErrorMessage } from '../../lib/onboarding'
import { addToast } from '../../lib/ui/store'

const newLibrarySchema = z.object({
  name: z.string().min(3, 'Library name must be at least 3 characters'),
  path: z.string().min(1, 'Base path is required'),
})

export function LibrariesPage() {
  const navigate = useNavigate()
  const { data, refetch } = useQuery(GET_ALL_LIBRARIES, {
    fetchPolicy: 'cache-and-network',
  })
  const [createLibrary, { loading: creating }] = useMutation(CREATE_LIBRARY)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const form = useForm({
    defaultValues: { name: '', path: '/data/photos' },
    validators: { onSubmit: newLibrarySchema },
    onSubmit: async ({ value }) => {
      try {
        const result = await createLibrary({
          variables: { name: value.name, path: value.path },
        })
        const libraryId = result.data?.createLibrary.libraryId
        await refetch()
        addToast(`Library "${value.name}" created`, 'success')
        if (libraryId) {
          navigate({
            to: '/settings/libraries/$libraryId',
            params: { libraryId },
          })
        }
      } catch (err) {
        addToast(err instanceof Error ? err.message : "Couldn't create library")
      }
    },
  })

  return (
    <>
      <SettingsCard
        title="Libraries"
        description="Libraries you're a member of. Open one to manage its settings and members."
        data-testid="libraries-card"
      >
        <ul className="divide-y divide-white/5" data-testid="libraries-list">
          {data?.allLibraries?.map((library) => (
            <li key={library.id}>
              <Link
                to="/settings/libraries/$libraryId"
                params={{ libraryId: library.id }}
                className="flex items-center gap-3 py-3 text-neutral-200 hover:text-white transition-colors"
                data-testid={`library-settings-link-${library.id}`}
              >
                <LibraryIcon className="w-5 h-5 flex-none text-white/70" />
                <span className="flex-1 truncate text-sm font-medium">
                  {library.name}
                </span>
                <ChevronRight className="w-4 h-4 flex-none text-neutral-500" />
              </Link>
            </li>
          ))}
        </ul>
      </SettingsCard>

      <SettingsCard
        title="New library"
        description="Create another library with its own photos, members and settings."
        data-testid="new-library-card"
      >
        {!showCreateForm ? (
          <Button
            type="button"
            onClick={() => setShowCreateForm(true)}
            data-testid="new-library-button"
          >
            New library
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
            <form.Field name="name">
              {(field) => (
                <Input
                  label="Library name"
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={getErrorMessage(field.state.meta.errors)}
                  data-testid="new-library-name-input"
                />
              )}
            </form.Field>
            <form.Field name="path">
              {(field) => (
                <Input
                  label="Base path"
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={getErrorMessage(field.state.meta.errors)}
                  hint="Where photos for this library are stored on the server"
                  data-testid="new-library-path-input"
                />
              )}
            </form.Field>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={creating}
                data-testid="new-library-save"
              >
                Create library
              </Button>
            </div>
          </form>
        )}
      </SettingsCard>
    </>
  )
}
