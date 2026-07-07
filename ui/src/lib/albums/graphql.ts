import { gql } from '@apollo/client'
import type { TypedDocumentNode } from '@apollo/client'

export interface AlbumNode {
  id: string
  name: string
  photosCount: number
  coverImage: {
    id: string
    location: [number, number] | null
    starRating: number | null
    rotation: number | null
  } | null
}

export interface AlbumListResponse {
  albumList: {
    pageInfo: {
      endCursor: string | null
      hasNextPage: boolean
    }
    edges: { node: AlbumNode }[]
  } | null
}

export interface AlbumListVariables {
  libraryId: string
  name_Icontains?: string | null
  first?: number
  after?: string
}

export const GET_ALBUMS: TypedDocumentNode<
  AlbumListResponse,
  AlbumListVariables
> = gql`
  query AlbumList(
    $libraryId: UUID
    $name_Icontains: String
    $first: Int
    $after: String
  ) {
    albumList(
      libraryId: $libraryId
      name_Icontains: $name_Icontains
      first: $first
      after: $after
    ) {
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        node {
          id
          name
          photosCount
          coverImage {
            id
            location
            starRating
            rotation
          }
        }
      }
    }
  }
`

// Create-or-assign an album (a Tag of type "A") to a set of photos.
export const ASSIGN_TAG_TO_PHOTOS: TypedDocumentNode<
  { assignTagToPhotos: { ok: boolean } },
  { name: string; photoIds: string; tagType: string }
> = gql`
  mutation AssignTagToPhotos(
    $name: String!
    $photoIds: String!
    $tagType: String!
  ) {
    assignTagToPhotos(name: $name, photoIds: $photoIds, tagType: $tagType) {
      ok
    }
  }
`

export const REMOVE_PHOTOS_FROM_ALBUM: TypedDocumentNode<
  { removePhotosFromAlbum: { ok: boolean } },
  { photoIds: string; albumId: string }
> = gql`
  mutation RemovePhotosFromAlbum($photoIds: String!, $albumId: String!) {
    removePhotosFromAlbum(photoIds: $photoIds, albumId: $albumId) {
      ok
    }
  }
`
