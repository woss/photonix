// Jest can't parse react-leaflet's ESM-only build and map rendering isn't
// meaningful in jsdom, so tests get these stand-ins via jest.moduleNameMapper
import React from 'react'

export const MapContainer = ({ children }) => <div data-testid="map">{children}</div>
export const TileLayer = () => null
export const Marker = () => null
export const Popup = () => null
export const useMapEvent = () => null
export const useMap = () => ({})

const MarkerClusterGroup = ({ children }) => <>{children}</>
export default MarkerClusterGroup
