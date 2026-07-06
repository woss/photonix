import React from 'react'
import { render } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { Router } from 'react-router-dom'

import Browse from './Browse'
import reducers from '../stores'
import history from '../history'

const renderBrowse = (props = {}) =>
  render(
    <Provider store={createStore(reducers)}>
      <MockedProvider>
        <Router history={history}>
          <Browse
            selectedFilters={[]}
            search=""
            mode="TIMELINE"
            loading={false}
            error={null}
            photoSections={[]}
            onFilterToggle={() => {}}
            onClearFilters={() => {}}
            updateSearchText={() => {}}
            {...props}
          />
        </Router>
      </MockedProvider>
    </Provider>
  )

it('renders the timeline browse screen with its navigation tabs', () => {
  const { getByText } = renderBrowse()
  expect(getByText('Timeline')).toBeInTheDocument()
  expect(getByText('Albums')).toBeInTheDocument()
  expect(getByText('Map')).toBeInTheDocument()
})

it('shows a spinner while photos are loading', () => {
  const { container } = renderBrowse({ loading: true })
  expect(container.querySelector('.spinner, [class*="spinner"], svg')).toBeTruthy()
})

it('shows an error message when the photo query fails', () => {
  const { getByText } = renderBrowse({ error: new Error('boom') })
  expect(getByText('Error :(')).toBeInTheDocument()
})
