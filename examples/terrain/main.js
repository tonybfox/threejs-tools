import * as THREE from 'three'
import { SceneSetup, UIHelpers } from '../shared/utils.js'
import { TerrainTool, CompassOverlay } from '@tonybfox/threejs-tools'

// Scene setup using shared utilities
const sceneSetup = new SceneSetup({
  backgroundColor: 0x87ceeb, // Sky blue
  cameraPosition: [100, 100, 100],
  enableShadows: true,
  enableControls: true,
  antialias: true,
})

// Access scene, camera, renderer, and controls from sceneSetup
const { scene, camera, renderer, controls } = sceneSetup

// Adjust camera far plane for terrain viewing
camera.far = 50000
camera.updateProjectionMatrix()

// Create compass overlay
let compass = new CompassOverlay(camera, {
  size: 100,
  position: 'bottom-right',
  offset: { x: 20, y: 20 },
  colors: {
    background: '#1a1a1a',
    border: '#444444',
    arrow: '#ff4444',
    text: '#ffffff',
    ticks: '#666666',
  },
})

// Predefined locations
const locations = {
  home: {
    latitude: 50.741530098472964,
    longitude: -1.784831359077266,
    name: 'Home',
  },
  lasVegas: { latitude: 36.1699, longitude: -115.1398, name: 'Las Vegas' },
  grandCanyon: {
    latitude: 36.0544,
    longitude: -112.1401,
    name: 'Grand Canyon',
  },
  mountEverest: { latitude: 27.9881, longitude: 86.925, name: 'Mount Everest' },
  newYork: { latitude: 40.7128, longitude: -74.006, name: 'New York' },
  sanFrancisco: {
    latitude: 37.7749,
    longitude: -122.4194,
    name: 'San Francisco',
  },
}

// Current settings
let currentLocation = locations.home
let currentWidth = 150
let currentDepth = 150

const MAPBOX_TOKEN_STORAGE_KEY = 'threejs-tools-mapbox-token'
let mapboxAccessToken = ''
let useMapboxImagery = false

try {
  const storedToken = localStorage.getItem(MAPBOX_TOKEN_STORAGE_KEY)
  if (storedToken) {
    const trimmedToken = storedToken.trim()
    if (trimmedToken) {
      mapboxAccessToken = trimmedToken
      useMapboxImagery = true
    }
  }
} catch (error) {
  console.warn('Unable to access stored Mapbox token.', error)
}

// Create terrain tool
const terrainTool = new TerrainTool(scene, {
  widthSegments: 50,
  depthSegments: 50,
  elevationScale: 1.0,
  baseColor: 0xffffff,
  wireframe: false,
  useDemoData: false, // Use demo data for testing/environments where API is blocked
  mapbox:
    useMapboxImagery && mapboxAccessToken
      ? {
          accessToken: mapboxAccessToken,
          imageWidth: 1024,
          imageHeight: 1024,
          highResolution: true,
          paddingRatio: 0.15,
          imageFormat: 'jpg',
        }
      : undefined,
})

// Create control panel
const controlPanel = UIHelpers.createControlPanel('Terrain Controls')

// Location selector
const locationSelect = UIHelpers.createSelect(
  Object.entries(locations).map(([key, loc]) => ({
    value: key,
    label: loc.name,
  })),
  'home',
  (value) => {
    currentLocation = locations[value]
    latInput.querySelector('input').value = currentLocation.latitude
    lonInput.querySelector('input').value = currentLocation.longitude
  },
  'Location'
)
controlPanel.appendChild(locationSelect)

// Custom coordinates
const customCoordsSection = UIHelpers.createSection('Custom Coordinates')

// Latitude input
const latInput = UIHelpers.createInput(
  'number',
  currentLocation.latitude,
  (value) => {},
  'Latitude',
  { step: '0.0001' }
)
customCoordsSection.appendChild(latInput)

// Longitude input
const lonInput = UIHelpers.createInput(
  'number',
  currentLocation.longitude,
  (value) => {},
  'Longitude',
  { step: '0.0001' }
)
customCoordsSection.appendChild(lonInput)

controlPanel.appendChild(customCoordsSection)

// Size controls
const sizeSection = UIHelpers.createSection('Terrain Size (meters)')

// Width input
const widthInput = UIHelpers.createInput(
  'number',
  currentWidth,
  (value) => {},
  'Width',
  { step: '100' }
)
widthInput.style.width = '100%'
widthInput.style.padding = '6px'
widthInput.style.marginBottom = '10px'
widthInput.style.backgroundColor = '#2a2a2a'
widthInput.style.color = 'white'
widthInput.style.border = '1px solid #444'
widthInput.style.borderRadius = '4px'

controlPanel.appendChild(widthInput)

// Depth input
const depthLabel = document.createElement('label')
depthLabel.textContent = 'Depth:'
depthLabel.style.display = 'block'
depthLabel.style.fontSize = '12px'
depthLabel.style.marginBottom = '3px'

const depthInput = document.createElement('input')
depthInput.type = 'number'
depthInput.step = '100'
depthInput.value = currentDepth
depthInput.style.width = '100%'
depthInput.style.padding = '6px'
depthInput.style.marginBottom = '15px'
depthInput.style.backgroundColor = '#2a2a2a'
depthInput.style.color = 'white'
depthInput.style.border = '1px solid #444'
depthInput.style.borderRadius = '4px'

controlPanel.appendChild(depthLabel)
controlPanel.appendChild(depthInput)

const mapboxSection = document.createElement('div')
mapboxSection.style.marginTop = '20px'
mapboxSection.style.marginBottom = '20px'

const mapboxHeader = document.createElement('div')
mapboxHeader.textContent = 'Satellite Imagery (Mapbox)'
mapboxHeader.style.fontSize = '14px'
mapboxHeader.style.marginBottom = '6px'
mapboxSection.appendChild(mapboxHeader)

const mapboxToggleLabel = document.createElement('label')
mapboxToggleLabel.style.display = 'flex'
mapboxToggleLabel.style.alignItems = 'center'
mapboxToggleLabel.style.fontSize = '13px'
mapboxToggleLabel.style.cursor = 'pointer'

const mapboxToggle = document.createElement('input')
mapboxToggle.type = 'checkbox'
mapboxToggle.checked = useMapboxImagery
mapboxToggle.style.marginRight = '8px'
mapboxToggleLabel.appendChild(mapboxToggle)

const mapboxToggleText = document.createElement('span')
mapboxToggleText.textContent = 'Enable Mapbox satellite overlay'
mapboxToggleLabel.appendChild(mapboxToggleText)

mapboxSection.appendChild(mapboxToggleLabel)

const mapboxTokenInput = document.createElement('input')
mapboxTokenInput.type = 'password'
mapboxTokenInput.placeholder = 'Mapbox access token'
mapboxTokenInput.value = mapboxAccessToken
mapboxTokenInput.style.width = '100%'
mapboxTokenInput.style.padding = '6px'
mapboxTokenInput.style.marginTop = '10px'
mapboxTokenInput.style.backgroundColor = '#2a2a2a'
mapboxTokenInput.style.color = 'white'
mapboxTokenInput.style.border = '1px solid #444'
mapboxTokenInput.style.borderRadius = '4px'
mapboxTokenInput.disabled = !useMapboxImagery
mapboxSection.appendChild(mapboxTokenInput)

const mapboxHint = document.createElement('div')
mapboxHint.textContent =
  'Requires a Mapbox access token. The token is stored locally in this browser.'
mapboxHint.style.fontSize = '11px'
mapboxHint.style.marginTop = '6px'
mapboxHint.style.color = '#bbbbbb'
mapboxSection.appendChild(mapboxHint)

controlPanel.appendChild(mapboxSection)

const mapboxAttribution = document.createElement('div')
mapboxAttribution.textContent =
  'Imagery © Mapbox © OpenStreetMap contributors'
mapboxAttribution.style.position = 'absolute'
mapboxAttribution.style.bottom = '10px'
mapboxAttribution.style.right = '10px'
mapboxAttribution.style.fontSize = '11px'
mapboxAttribution.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'
mapboxAttribution.style.padding = '4px 8px'
mapboxAttribution.style.borderRadius = '4px'
mapboxAttribution.style.pointerEvents = 'none'
mapboxAttribution.style.display = 'none'

const updateAttributionVisibility = () => {
  mapboxAttribution.style.display =
    useMapboxImagery && mapboxAccessToken ? 'block' : 'none'
}

if (document.body) {
  document.body.appendChild(mapboxAttribution)
  updateAttributionVisibility()
} else {
  window.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(mapboxAttribution)
    updateAttributionVisibility()
  })
}

const applyMapboxOptions = () => {
  const token = mapboxAccessToken.trim()
  if (useMapboxImagery && token) {
    mapboxAccessToken = token
    terrainTool.setMapboxOptions({
      accessToken: mapboxAccessToken,
      imageWidth: 1024,
      imageHeight: 1024,
      highResolution: true,
      paddingRatio: 0.15,
      imageFormat: 'jpg',
    })
  } else {
    terrainTool.setMapboxOptions(undefined)
  }
  updateAttributionVisibility()
}

mapboxToggle.addEventListener('change', () => {
  useMapboxImagery = mapboxToggle.checked
  mapboxTokenInput.disabled = !useMapboxImagery
  applyMapboxOptions()
})

mapboxTokenInput.addEventListener('input', (event) => {
  const value = event.target.value
  const trimmedValue = value.trim()
  mapboxAccessToken = trimmedValue

  try {
    if (trimmedValue) {
      localStorage.setItem(MAPBOX_TOKEN_STORAGE_KEY, trimmedValue)
    } else {
      localStorage.removeItem(MAPBOX_TOKEN_STORAGE_KEY)
    }
  } catch (error) {
    console.warn('Unable to persist Mapbox token.', error)
  }

  if (useMapboxImagery) {
    applyMapboxOptions()
  } else {
    updateAttributionVisibility()
  }
})

applyMapboxOptions()

// Load terrain button
const loadButton = UIHelpers.createButton(
  'Load Terrain',
  async () => {
    loadButton.disabled = true
    loadButton.textContent = 'Loading...'

    const lat = parseFloat(latInput.value)
    const lon = parseFloat(lonInput.value)
    const width = parseInt(widthInput.value)
    const depth = parseInt(depthInput.value)

    currentWidth = width
    currentDepth = depth

    if (useMapboxImagery && !mapboxAccessToken) {
      statusDiv.innerHTML =
        '<strong>Status:</strong> <span style="color: #ff4444;">Enter a Mapbox access token to fetch imagery.</span>'
      loadButton.disabled = false
      loadButton.textContent = 'Load Terrain'
      return
    }

    applyMapboxOptions()

    await terrainTool.loadTerrain(
      { latitude: lat, longitude: lon },
      { width, depth }
    )

    loadButton.disabled = false
    loadButton.textContent = 'Load Terrain'
  },
  'primary'
)
controlPanel.appendChild(loadButton)

// Status display
const statusDiv = document.createElement('div')
statusDiv.style.marginTop = '20px'
statusDiv.style.padding = '10px'
statusDiv.style.backgroundColor = '#1a1a1a'
statusDiv.style.borderRadius = '4px'
statusDiv.style.fontSize = '12px'
statusDiv.innerHTML = '<strong>Status:</strong> Ready'
controlPanel.appendChild(statusDiv)

// Info display
const infoDiv = document.createElement('div')
infoDiv.style.marginTop = '10px'
infoDiv.style.padding = '10px'
infoDiv.style.backgroundColor = '#1a1a1a'
infoDiv.style.borderRadius = '4px'
infoDiv.style.fontSize = '11px'
infoDiv.style.display = 'none'
controlPanel.appendChild(infoDiv)

// Event listeners
terrainTool.addEventListener('updateStarted', (event) => {
  statusDiv.innerHTML = `<strong>Status:</strong> Loading terrain at ${event.center.latitude.toFixed(4)}, ${event.center.longitude.toFixed(4)}...`
  infoDiv.style.display = 'none'
})

terrainTool.addEventListener('dataLoaded', (event) => {
  statusDiv.innerHTML = `<strong>Status:</strong> Data loaded`
  infoDiv.style.display = 'block'
  infoDiv.innerHTML = `
    <strong>Terrain Info:</strong><br>
    Min Elevation: ${event.data.minElevation.toFixed(1)}m<br>
    Max Elevation: ${event.data.maxElevation.toFixed(1)}m<br>
    Range: ${(event.data.maxElevation - event.data.minElevation).toFixed(1)}m<br>
    Area: ${event.data.dimensions.width}m × ${event.data.dimensions.depth}m
  `
})

terrainTool.addEventListener('meshLoaded', (event) => {
  statusDiv.innerHTML = `<strong>Status:</strong> Terrain mesh created`

  // Center camera on terrain
  const mesh = event.mesh
  if (controls) {
    const currentPosition = controls.getPosition(new THREE.Vector3())
    void controls.setLookAt(
      currentPosition.x,
      currentPosition.y,
      currentPosition.z,
      mesh.position.x,
      mesh.position.y,
      mesh.position.z,
      false
    )
  } else {
    camera.lookAt(mesh.position)
  }
})

terrainTool.addEventListener('error', (event) => {
  statusDiv.innerHTML = `<strong>Status:</strong> <span style="color: #ff4444;">Error: ${event.message}</span>`
  console.error(event.error)
})

// Load initial terrain
terrainTool.loadTerrain(
  { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
  { width: currentWidth, depth: currentDepth }
)

// Start animation loop
sceneSetup.start()
