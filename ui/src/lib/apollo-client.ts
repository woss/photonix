import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
  gql,
} from '@apollo/client/core'
import { setContext } from '@apollo/client/link/context'
import { ErrorLink } from '@apollo/client/link/error'
import { CombinedGraphQLErrors } from '@apollo/client/errors'
import { RetryLink } from '@apollo/client/link/retry'
import { getMainDefinition } from '@apollo/client/utilities'
import Cookies from 'js-cookie'
import { getAccessToken, clearTokens } from './auth/auth-store'

const authLink = setContext((_, { headers }) => {
  const token = getAccessToken()
  return {
    headers: {
      ...headers,
      authorization: token ? `JWT ${token}` : '',
    },
  }
})

// Django enforces CSRF on the /graphql endpoint (every GraphQL request is a
// POST). Send the token from the `csrftoken` cookie on each request. This link
// sits downstream of the RetryLink so that after the first request 403s - the
// server's csrf_failure view issues the cookie in that response - the retry
// re-reads the freshly-set cookie and succeeds. The app's initial ENVIRONMENT
// query bootstraps the cookie before any mutation (e.g. login) is sent.
const csrfLink = new ApolloLink((operation, forward) => {
  operation.setContext(
    ({ headers = {} }: { headers?: Record<string, string> }) => ({
      headers: {
        ...headers,
        'X-CSRFToken': Cookies.get('csrftoken') ?? '',
      },
    })
  )
  return forward(operation)
})

const isMutation = (operation: { query: Parameters<typeof getMainDefinition>[0] }) => {
  const definition = getMainDefinition(operation.query)
  return (
    definition.kind === 'OperationDefinition' &&
    definition.operation === 'mutation'
  )
}

const errorLink = new ErrorLink(({ error }) => {
  if (CombinedGraphQLErrors.is(error)) {
    for (const err of error.errors) {
      const message = err.message || ''
      if (
        message.includes('Signature has expired') ||
        message.includes('Error decoding signature') ||
        message.includes('Invalid token')
      ) {
        clearTokens()
        window.dispatchEvent(new CustomEvent('auth:token-expired'))
      }
    }
  }
})

const retryLink = new RetryLink({
  delay: { initial: 500, max: 5000, jitter: true },
  attempts: {
    max: 3,
    // Retry queries (e.g. to recover once the CSRF cookie is issued on the
    // first 403) but never replay mutations, which would repeat side effects.
    retryIf: (error, operation) => !!error && !isMutation(operation),
  },
})

const httpLink = new HttpLink({
  uri: '/graphql',
  credentials: 'same-origin',
})

export const apolloClient = new ApolloClient({
  cache: new InMemoryCache(),
  // csrfLink is placed after retryLink so retries re-read the csrftoken cookie.
  link: ApolloLink.from([authLink, errorLink, retryLink, csrfLink, httpLink]),
})

// Bootstrap the CSRF cookie for deep links whose first request is a mutation
// (e.g. /onboarding/step1): this query 403s without a token, the server's
// csrf_failure view sets the cookie in that response, and the RetryLink retry
// succeeds - so the cookie is in place before the user can submit a form.
if (!Cookies.get('csrftoken')) {
  apolloClient
    .query({
      query: gql`query CsrfBootstrap { __typename }`,
      // __typename alone resolves from the local cache; force the round-trip
      fetchPolicy: 'network-only',
    })
    .catch(() => {})
}
