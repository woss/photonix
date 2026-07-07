import { gql } from '@apollo/client'
import type { TypedDocumentNode } from '@apollo/client'

// Soft-delete a set of photos (comma-separated ids).
export const SET_PHOTOS_DELETED: TypedDocumentNode<
  { setPhotosDeleted: { ok: boolean } },
  { photoIds: string }
> = gql`
  mutation SetPhotosDeleted($photoIds: String!) {
    setPhotosDeleted(photoIds: $photoIds) {
      ok
    }
  }
`
