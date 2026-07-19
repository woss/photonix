import { gql } from '@apollo/client'
import type { TypedDocumentNode } from '@apollo/client'

export interface LibrarySettingData {
  name: string
  classificationColorEnabled: boolean
  classificationLocationEnabled: boolean
  classificationFaceEnabled: boolean
  classificationStyleEnabled: boolean
  classificationObjectEnabled: boolean
}

export interface LibrarySettingResponse {
  librarySetting: {
    library: LibrarySettingData
    sourceFolder: string | null
    watchPhotos: boolean | null
    importPath: string | null
    deleteAfterImport: boolean | null
  } | null
}

export const GET_LIBRARY_SETTING: TypedDocumentNode<
  LibrarySettingResponse,
  { libraryId: string }
> = gql`
  query LibrarySetting($libraryId: UUID) {
    librarySetting(libraryId: $libraryId) {
      library {
        name
        classificationColorEnabled
        classificationLocationEnabled
        classificationFaceEnabled
        classificationStyleEnabled
        classificationObjectEnabled
      }
      sourceFolder
      watchPhotos
      importPath
      deleteAfterImport
    }
  }
`

// ---------------------------------------------------------------------------
// Settings area: consolidated partial library update. Only fields present in
// the input are applied server-side.

export interface UpdateLibraryInput {
  libraryId: string
  name?: string
  sourceFolder?: string
  watchPhotos?: boolean
  /** Empty string removes the import path; non-empty creates or updates it. */
  importPath?: string
  deleteAfterImport?: boolean
  classificationColorEnabled?: boolean
  classificationLocationEnabled?: boolean
  classificationStyleEnabled?: boolean
  classificationObjectEnabled?: boolean
  classificationFaceEnabled?: boolean
}

export const UPDATE_LIBRARY: TypedDocumentNode<
  { updateLibrary: { ok: boolean } & LibrarySettingResponse },
  { input: UpdateLibraryInput }
> = gql`
  mutation UpdateLibrary($input: UpdateLibraryInput!) {
    updateLibrary(input: $input) {
      ok
      librarySetting {
        library {
          name
          classificationColorEnabled
          classificationLocationEnabled
          classificationFaceEnabled
          classificationStyleEnabled
          classificationObjectEnabled
        }
        sourceFolder
        watchPhotos
        importPath
        deleteAfterImport
      }
    }
  }
`

// Settings-area library creation: acts as the authenticated user (no userId,
// unlike the onboarding wizard's variant) and never touches onboarding flags.
export const CREATE_LIBRARY: TypedDocumentNode<
  { createLibrary: { ok: boolean; libraryId: string } },
  { name: string; path: string }
> = gql`
  mutation CreateLibraryFromSettings($name: String!, $path: String!) {
    createLibrary(input: { name: $name, backendType: "Lo", path: $path }) {
      ok
      libraryId
    }
  }
`

// ---------------------------------------------------------------------------
// Members

export interface LibraryMember {
  id: string
  owner: boolean
  user: {
    id: string
    username: string
    avatarUrl: string | null
  }
}

export const GET_LIBRARY_USERS: TypedDocumentNode<
  { libraryUsers: LibraryMember[] },
  { libraryId: string }
> = gql`
  query LibraryUsers($libraryId: UUID!) {
    libraryUsers(libraryId: $libraryId) {
      id
      owner
      user {
        id
        username
        avatarUrl
      }
    }
  }
`

export const ADD_LIBRARY_USER: TypedDocumentNode<
  { addLibraryUser: { ok: boolean } },
  { libraryId: string; username: string }
> = gql`
  mutation AddLibraryUser($libraryId: ID!, $username: String!) {
    addLibraryUser(libraryId: $libraryId, username: $username) {
      ok
    }
  }
`

export const REMOVE_LIBRARY_USER: TypedDocumentNode<
  { removeLibraryUser: { ok: boolean } },
  { libraryId: string; userId: string }
> = gql`
  mutation RemoveLibraryUser($libraryId: ID!, $userId: ID!) {
    removeLibraryUser(libraryId: $libraryId, userId: $userId) {
      ok
    }
  }
`

export const SET_LIBRARY_USER_OWNER: TypedDocumentNode<
  { setLibraryUserOwner: { ok: boolean } },
  { libraryId: string; userId: string; owner: boolean }
> = gql`
  mutation SetLibraryUserOwner($libraryId: ID!, $userId: ID!, $owner: Boolean!) {
    setLibraryUserOwner(libraryId: $libraryId, userId: $userId, owner: $owner) {
      ok
    }
  }
`

// ---------------------------------------------------------------------------
// Invitations (capability-URL links; the uuid token is the authorization)

export interface LibraryInvitation {
  id: string
  url: string
  expiresAt: string
  createdBy: { username: string }
}

export const GET_LIBRARY_INVITATIONS: TypedDocumentNode<
  { libraryInvitations: LibraryInvitation[] },
  { libraryId: string }
> = gql`
  query LibraryInvitations($libraryId: UUID!) {
    libraryInvitations(libraryId: $libraryId) {
      id
      url
      expiresAt
      createdBy {
        username
      }
    }
  }
`

export const CREATE_LIBRARY_INVITATION: TypedDocumentNode<
  { createLibraryInvitation: { ok: boolean; invitation: LibraryInvitation } },
  { libraryId: string }
> = gql`
  mutation CreateLibraryInvitation($libraryId: ID!) {
    createLibraryInvitation(libraryId: $libraryId) {
      ok
      invitation {
        id
        url
        expiresAt
        createdBy {
          username
        }
      }
    }
  }
`

export const REVOKE_LIBRARY_INVITATION: TypedDocumentNode<
  { revokeLibraryInvitation: { ok: boolean } },
  { invitationId: string }
> = gql`
  mutation RevokeLibraryInvitation($invitationId: ID!) {
    revokeLibraryInvitation(invitationId: $invitationId) {
      ok
    }
  }
`

// Public operations for the /invite/$token page

export const GET_INVITATION_INFO: TypedDocumentNode<
  {
    invitationInfo: {
      valid: boolean
      libraryName: string | null
      invitedBy: string | null
    } | null
  },
  { token: string }
> = gql`
  query InvitationInfo($token: String!) {
    invitationInfo(token: $token) {
      valid
      libraryName
      invitedBy
    }
  }
`

export const ACCEPT_LIBRARY_INVITATION: TypedDocumentNode<
  { acceptLibraryInvitation: { ok: boolean; libraryId: string } },
  { token: string }
> = gql`
  mutation AcceptLibraryInvitation($token: String!) {
    acceptLibraryInvitation(token: $token) {
      ok
      libraryId
    }
  }
`

export const CREATE_USER_VIA_INVITATION: TypedDocumentNode<
  { createUserViaInvitation: { ok: boolean; libraryId: string } },
  { token: string; username: string; password: string }
> = gql`
  mutation CreateUserViaInvitation(
    $token: String!
    $username: String!
    $password: String!
  ) {
    createUserViaInvitation(
      token: $token
      username: $username
      password: $password
    ) {
      ok
      libraryId
    }
  }
`

// Each classifier toggle mutation shares the `input: { <field>, libraryId }`
// shape and echoes the updated field back.
export const UPDATE_COLOR_ENABLED: TypedDocumentNode<
  { updateColorEnabled: { classificationColorEnabled: boolean } },
  { value: boolean; libraryId: string }
> = gql`
  mutation UpdateColorEnabled($value: Boolean!, $libraryId: ID) {
    updateColorEnabled(
      input: { classificationColorEnabled: $value, libraryId: $libraryId }
    ) {
      classificationColorEnabled
    }
  }
`

export const UPDATE_LOCATION_ENABLED: TypedDocumentNode<
  { updateLocationEnabled: { classificationLocationEnabled: boolean } },
  { value: boolean; libraryId: string }
> = gql`
  mutation UpdateLocationEnabled($value: Boolean!, $libraryId: ID) {
    updateLocationEnabled(
      input: { classificationLocationEnabled: $value, libraryId: $libraryId }
    ) {
      classificationLocationEnabled
    }
  }
`

export const UPDATE_FACE_ENABLED: TypedDocumentNode<
  { updateFaceEnabled: { classificationFaceEnabled: boolean } },
  { value: boolean; libraryId: string }
> = gql`
  mutation UpdateFaceEnabled($value: Boolean!, $libraryId: ID) {
    updateFaceEnabled(
      input: { classificationFaceEnabled: $value, libraryId: $libraryId }
    ) {
      classificationFaceEnabled
    }
  }
`

export const UPDATE_STYLE_ENABLED: TypedDocumentNode<
  { updateStyleEnabled: { classificationStyleEnabled: boolean } },
  { value: boolean; libraryId: string }
> = gql`
  mutation UpdateStyleEnabled($value: Boolean!, $libraryId: ID) {
    updateStyleEnabled(
      input: { classificationStyleEnabled: $value, libraryId: $libraryId }
    ) {
      classificationStyleEnabled
    }
  }
`

export const UPDATE_OBJECT_ENABLED: TypedDocumentNode<
  { updateObjectEnabled: { classificationObjectEnabled: boolean } },
  { value: boolean; libraryId: string }
> = gql`
  mutation UpdateObjectEnabled($value: Boolean!, $libraryId: ID) {
    updateObjectEnabled(
      input: { classificationObjectEnabled: $value, libraryId: $libraryId }
    ) {
      classificationObjectEnabled
    }
  }
`

export const UPDATE_WATCH_PHOTOS: TypedDocumentNode<
  { updateWatchPhotos: { ok: boolean; watchPhotos: boolean } },
  { value: boolean; libraryId: string }
> = gql`
  mutation UpdateWatchPhotos($value: Boolean!, $libraryId: ID) {
    updateWatchPhotos(input: { watchPhotos: $value, libraryId: $libraryId }) {
      ok
      watchPhotos
    }
  }
`
