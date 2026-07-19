import { gql } from '@apollo/client'
import type { TypedDocumentNode } from '@apollo/client'

export interface ChangePasswordResponse {
  changePassword: {
    ok: boolean
  }
}

export interface ChangePasswordVariables {
  oldPassword: string
  newPassword: string
}

export const CHANGE_PASSWORD: TypedDocumentNode<
  ChangePasswordResponse,
  ChangePasswordVariables
> = gql`
  mutation ChangePassword($oldPassword: String!, $newPassword: String!) {
    changePassword(oldPassword: $oldPassword, newPassword: $newPassword) {
      ok
    }
  }
`

// ---------------------------------------------------------------------------
// Profile (settings → Account)

export const UPDATE_PROFILE: TypedDocumentNode<
  {
    updateProfile: {
      ok: boolean
      profile: {
        email: string | null
        firstName: string | null
        lastName: string | null
      }
    }
  },
  { email?: string; firstName?: string; lastName?: string }
> = gql`
  mutation UpdateProfile($email: String, $firstName: String, $lastName: String) {
    updateProfile(email: $email, firstName: $firstName, lastName: $lastName) {
      ok
      profile {
        email
        firstName
        lastName
      }
    }
  }
`

export const SET_AVATAR: TypedDocumentNode<
  { setAvatar: { ok: boolean; avatarUrl: string | null } },
  { imageBase64: string }
> = gql`
  mutation SetAvatar($imageBase64: String!) {
    setAvatar(imageBase64: $imageBase64) {
      ok
      avatarUrl
    }
  }
`

export const CLEAR_AVATAR: TypedDocumentNode<
  { clearAvatar: { ok: boolean } },
  Record<string, never>
> = gql`
  mutation ClearAvatar {
    clearAvatar {
      ok
    }
  }
`

// ---------------------------------------------------------------------------
// Site-admin user management (settings → Users, is_staff only)

export interface AdminUser {
  id: string
  username: string
  email: string | null
  isActive: boolean
  isStaff: boolean
  dateJoined: string
  avatarUrl: string | null
}

export const GET_ALL_USERS: TypedDocumentNode<
  { allUsers: AdminUser[] },
  Record<string, never>
> = gql`
  query AllUsers {
    allUsers {
      id
      username
      email
      isActive
      isStaff
      dateJoined
      avatarUrl
    }
  }
`

export const ADMIN_CREATE_USER: TypedDocumentNode<
  { adminCreateUser: { ok: boolean; user: { id: string; username: string } } },
  { username: string; password: string; email?: string }
> = gql`
  mutation AdminCreateUser($username: String!, $password: String!, $email: String) {
    adminCreateUser(username: $username, password: $password, email: $email) {
      ok
      user {
        id
        username
      }
    }
  }
`

export const ADMIN_SET_USER_ACTIVE: TypedDocumentNode<
  { adminSetUserActive: { ok: boolean; user: { id: string; isActive: boolean } } },
  { userId: string; isActive: boolean }
> = gql`
  mutation AdminSetUserActive($userId: ID!, $isActive: Boolean!) {
    adminSetUserActive(userId: $userId, isActive: $isActive) {
      ok
      user {
        id
        isActive
      }
    }
  }
`
