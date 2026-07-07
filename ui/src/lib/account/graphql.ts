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
