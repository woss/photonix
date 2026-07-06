import React from 'react'
import { render } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { Router } from 'react-router-dom'

import App from './components/App'
import reducers from './stores'
import history from './history'

it('renders the login screen without crashing', () => {
  // No refreshToken cookie is set, so importing App redirects to /login
  history.push('/login')
  const { getByText } = render(
    <Provider store={createStore(reducers)}>
      <MockedProvider>
        <Router history={history}>
          <App />
        </Router>
      </MockedProvider>
    </Provider>
  )
  expect(getByText('Username:')).toBeInTheDocument()
  expect(getByText('Password:')).toBeInTheDocument()
  expect(getByText('Login')).toBeInTheDocument()
})
