import React from 'react'
import { render, fireEvent, wait } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { MemoryRouter } from 'react-router-dom'
import gql from 'graphql-tag'

import Login from './Login'
import { SIGN_IN } from '../graphql/onboarding'

jest.mock('../auth', () => ({
  logIn: jest.fn(),
  logOut: jest.fn(),
  refreshToken: jest.fn(),
  scheduleTokenRefresh: jest.fn(),
}))
import { logIn, scheduleTokenRefresh } from '../auth'

// Must match the AUTH_USER document defined inside Login.js
const AUTH_USER = gql`
  mutation TokenAuth($username: String!, $password: String!) {
    tokenAuth(username: $username, password: $password) {
      token
      refreshToken
    }
  }
`

const ENVIRONMENT = gql`
  {
    environment {
      demo
      sampleData
      firstRun
      form
      userId
      libraryId
      libraryPathId
    }
  }
`

const environmentMock = {
  request: { query: ENVIRONMENT },
  result: {
    data: {
      environment: {
        demo: false,
        sampleData: false,
        firstRun: false,
        form: '',
        userId: '1',
        libraryId: '1',
        libraryPathId: '1',
      },
    },
  },
}

const signInMock = {
  request: { query: SIGN_IN },
  result: { data: { afterSignup: { token: '', refreshToken: '' } } },
}

const renderLogin = (extraMocks = []) =>
  render(
    <MockedProvider mocks={[environmentMock, signInMock, ...extraMocks]} addTypename={false}>
      <MemoryRouter initialEntries={['/login']}>
        <Login />
      </MemoryRouter>
    </MockedProvider>
  )

beforeEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
})

it('shows username and password fields and a login button', () => {
  const { getByText, getByRole } = renderLogin()
  expect(getByText('Username:')).toBeInTheDocument()
  expect(getByText('Password:')).toBeInTheDocument()
  expect(getByRole('button', { name: 'Login' })).toBeInTheDocument()
})

it('logs the user in with the token from a successful authentication', async () => {
  const authMock = {
    request: {
      query: AUTH_USER,
      variables: { username: 'damian', password: 'correct-horse' },
    },
    result: {
      data: { tokenAuth: { token: 'jwt-token', refreshToken: 'refresh-token' } },
    },
  }
  const { container, getByRole } = renderLogin([authMock])

  const [username, password] = container.querySelectorAll('input')
  fireEvent.change(username, { target: { value: 'damian' } })
  fireEvent.change(password, { target: { value: 'correct-horse' } })
  fireEvent.click(getByRole('button', { name: 'Login' }))

  await wait(() => expect(logIn).toHaveBeenCalledWith('refresh-token'))
  expect(scheduleTokenRefresh).toHaveBeenCalled()
})

it('shows the error and does not log in when authentication fails', async () => {
  const authMock = {
    request: {
      query: AUTH_USER,
      variables: { username: 'damian', password: 'wrong' },
    },
    error: new Error('Please enter valid credentials'),
  }
  const { container, getByText, getByRole } = renderLogin([authMock])

  const [username, password] = container.querySelectorAll('input')
  fireEvent.change(username, { target: { value: 'damian' } })
  fireEvent.change(password, { target: { value: 'wrong' } })
  fireEvent.click(getByRole('button', { name: 'Login' }))

  await wait(() => expect(getByText(/Please enter valid credentials/)).toBeInTheDocument())
  expect(logIn).not.toHaveBeenCalled()
})
