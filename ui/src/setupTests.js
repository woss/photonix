import '@testing-library/jest-dom/extend-expect'

// jsdom doesn't implement IntersectionObserver (used for infinite scroll)
if (typeof window.IntersectionObserver === 'undefined') {
  class IntersectionObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  window.IntersectionObserver = IntersectionObserverStub
  global.IntersectionObserver = IntersectionObserverStub
}
