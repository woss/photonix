import { gql } from '@apollo/client'
import type { TypedDocumentNode } from '@apollo/client'

export interface MapPhotoNode {
  id: string
  location: [number, number] | null
  rotation: number | null
}

export interface MapPhotosResponse {
  mapPhotos: {
    edges: { node: MapPhotoNode }[]
  } | null
}

export const GET_MAP_PHOTOS: TypedDocumentNode<
  MapPhotosResponse,
  { filters?: string }
> = gql`
  query MapPhotos($filters: String) {
    mapPhotos(multiFilter: $filters) {
      edges {
        node {
          id
          location
          rotation
        }
      }
    }
  }
`
