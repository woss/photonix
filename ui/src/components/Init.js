import React from 'react'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import {
  ApolloClient,
  ApolloLink,
  ApolloProvider,
  from,
  HttpLink,
  InMemoryCache,
} from '@apollo/client'
import { RetryLink } from '@apollo/client/link/retry'
import { getMainDefinition } from '@apollo/client/utilities'
import { Router } from 'react-router-dom'
import { ModalContainer } from 'react-router-modal'
// import { ThemeProvider, CSSReset } from '@chakra-ui/core'
import { ThemeProvider, ColorModeProvider } from '@chakra-ui/core'

import history from '../history'
import reducers from './../stores'
import customTheme from '../theme'
import { logOut } from '../auth'
import { ThumbnailQueueProvider } from '../contexts/ThumbnailQueueContext'

export const store = createStore(
  reducers,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
)
// Used by mobile app to set layout properties
window.photonix = {
  store: store,
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)'))
  return match ? match[2] : ''
}

const csrfLink = new ApolloLink((operation, forward) => {
  operation.setContext(({ headers = {} }) => ({
    headers: {
      ...headers,
      'X-CSRFToken': getCookie('csrftoken'),
    },
  }))
  return forward(operation)
})

const isMutationOperation = (operation) => {
  const definition = getMainDefinition(operation.query)
  return (
    definition.kind === 'OperationDefinition' &&
    definition.operation === 'mutation'
  )
}

const additiveLink = from([
  new RetryLink({
    delay: {
      initial: 500,
      max: Infinity,
      jitter: true,
    },
    attempts: {
      max: 30,
      // Queries are retried so they recover once re-authentication has
      // completed, but mutations must never be replayed - retrying them
      // repeats their side effects
      retryIf: (error, operation) => !!error && !isMutationOperation(operation),
    },
  }),
  csrfLink,
  new ApolloLink((operation, forward) => {
    return forward(operation).map((data) => {
      // Raise GraphQL errors as exceptions that trigger RetryLink when re-authentication is in progress
      if (data && data.errors && data.errors.length > 0) {
        if (data.errors[0].message === 'Error decoding signature') {
          // Probably the Django SECRET_KEY changed so the user needs to re-authenticate.
          logOut()
        }
        // Keep the real message rather than masking every failure as a
        // generic operational error
        throw new Error(data.errors[0].message)
      }
      return data
    })
  }),
  new HttpLink({
    uri: '/graphql',
    credentials: 'same-origin', // Required for older versions of Chromium (~v58)
  }),
])

export const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: additiveLink,
})

const Init = ({ children }) => {
  const isMobileApp = navigator.userAgent.indexOf('PhotonixMobileApp') > -1

  // Higher Order Components (HOCs) grouped together here so can be reused by Storybook
  return (
    <Provider store={store}>
      <React.StrictMode>
        <ApolloProvider client={client}>
          <Router history={history}>
            <ThemeProvider theme={customTheme}>
              <ColorModeProvider value="dark">
                <ThumbnailQueueProvider>
                  <div className={isMobileApp ? 'isMobileApp' : undefined}>
                    {/* <CSSReset /> */}
                    {children}
                    <ModalContainer />
                  </div>
                </ThumbnailQueueProvider>
              </ColorModeProvider>
            </ThemeProvider>
          </Router>
        </ApolloProvider>
      </React.StrictMode>
    </Provider>
  )
}

export default Init
