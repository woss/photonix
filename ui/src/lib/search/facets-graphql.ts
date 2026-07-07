import { gql } from '@apollo/client'
import type { TypedDocumentNode } from '@apollo/client'
import type { TagItem } from './graphql'

export interface FilterFacetsResponse {
  allApertures: number[]
  allExposures: string[]
  allIsoSpeeds: number[]
  allFocalLengths: number[]
  allMeteringModes: string[]
  allDriveModes: string[]
  allShootingModes: string[]
  allObjectTags: TagItem[]
  allColorTags: TagItem[]
  allStyleTags: TagItem[]
  allLocationTags: TagItem[]
}

export interface FilterFacetsVariables {
  libraryId: string
  multiFilter?: string
}

export const GET_FILTER_FACETS: TypedDocumentNode<
  FilterFacetsResponse,
  FilterFacetsVariables
> = gql`
  query FilterFacets($libraryId: UUID!, $multiFilter: String) {
    allApertures(libraryId: $libraryId)
    allExposures(libraryId: $libraryId)
    allIsoSpeeds(libraryId: $libraryId)
    allFocalLengths(libraryId: $libraryId)
    allMeteringModes(libraryId: $libraryId)
    allDriveModes(libraryId: $libraryId)
    allShootingModes(libraryId: $libraryId)
    allObjectTags(libraryId: $libraryId, multiFilter: $multiFilter) {
      id
      name
    }
    allColorTags(libraryId: $libraryId, multiFilter: $multiFilter) {
      id
      name
    }
    allStyleTags(libraryId: $libraryId, multiFilter: $multiFilter) {
      id
      name
    }
    allLocationTags(libraryId: $libraryId, multiFilter: $multiFilter) {
      id
      name
      parent {
        id
      }
    }
  }
`
