import * as THREE from 'three'
import { SceneSetup, UIHelpers } from '../shared/utils.js'
import { TerrainTool } from '@tonybfox/threejs-terrain'

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

// Create terrain tool
const terrainTool = new TerrainTool(scene, {
  widthSegments: 50,
  depthSegments: 50,
  elevationScale: 2.0,
  baseColor: 0x8b7355,
  wireframe: false,
  useDemoData: true, // Use demo data for testing/environments where API is blocked
})

// Predefined locations
const locations = {
  lasVegas: { latitude: 36.1699, longitude: -115.1398, name: 'Las Vegas' },
  grandCanyon: { latitude: 36.0544, longitude: -112.1401, name: 'Grand Canyon' },
  mountEverest: { latitude: 27.9881, longitude: 86.925, name: 'Mount Everest' },
  newYork: { latitude: 40.7128, longitude: -74.006, name: 'New York' },
  sanFrancisco: { latitude: 37.7749, longitude: -122.4194, name: 'San Francisco' },
}

// Current settings
let currentLocation = locations.lasVegas
let currentWidth = 5000
let currentDepth = 5000

// Create control panel
const controlPanel = UIHelpers.createControlPanel('Terrain Controls')

// Location selector
const locationLabel = document.createElement('label')
locationLabel.textContent = 'Location:'
locationLabel.style.display = 'block'
locationLabel.style.marginBottom = '5px'
locationLabel.style.fontSize = '14px'

const locationSelect = document.createElement('select')
locationSelect.style.width = '100%'
locationSelect.style.padding = '8px'
locationSelect.style.marginBottom = '15px'
locationSelect.style.backgroundColor = '#2a2a2a'
locationSelect.style.color = 'white'
locationSelect.style.border = '1px solid #444'
locationSelect.style.borderRadius = '4px'
locationSelect.style.fontSize = '14px'

Object.entries(locations).forEach(([key, loc]) => {
  const option = document.createElement('option')
  option.value = key
  option.textContent = loc.name
  locationSelect.appendChild(option)
})

locationSelect.addEventListener('change', (e) => {
  currentLocation = locations[e.target.value]
})

controlPanel.appendChild(locationLabel)
controlPanel.appendChild(locationSelect)

// Custom coordinates
const customCoordsLabel = document.createElement('div')
customCoordsLabel.textContent = 'Custom Coordinates:'
customCoordsLabel.style.fontSize = '14px'
customCoordsLabel.style.marginTop = '15px'
customCoordsLabel.style.marginBottom = '5px'
controlPanel.appendChild(customCoordsLabel)

// Latitude input
const latLabel = document.createElement('label')
latLabel.textContent = 'Latitude:'
latLabel.style.display = 'block'
latLabel.style.fontSize = '12px'
latLabel.style.marginBottom = '3px'

const latInput = document.createElement('input')
latInput.type = 'number'
latInput.step = '0.0001'
latInput.value = currentLocation.latitude
latInput.style.width = '100%'
latInput.style.padding = '6px'
latInput.style.marginBottom = '10px'
latInput.style.backgroundColor = '#2a2a2a'
latInput.style.color = 'white'
latInput.style.border = '1px solid #444'
latInput.style.borderRadius = '4px'

controlPanel.appendChild(latLabel)
controlPanel.appendChild(latInput)

// Longitude input
const lonLabel = document.createElement('label')
lonLabel.textContent = 'Longitude:'
lonLabel.style.display = 'block'
lonLabel.style.fontSize = '12px'
lonLabel.style.marginBottom = '3px'

const lonInput = document.createElement('input')
lonInput.type = 'number'
lonInput.step = '0.0001'
lonInput.value = currentLocation.longitude
lonInput.style.width = '100%'
lonInput.style.padding = '6px'
lonInput.style.marginBottom = '15px'
lonInput.style.backgroundColor = '#2a2a2a'
lonInput.style.color = 'white'
lonInput.style.border = '1px solid #444'
lonInput.style.borderRadius = '4px'

controlPanel.appendChild(lonLabel)
controlPanel.appendChild(lonInput)

// Update lat/lon inputs when location changes
locationSelect.addEventListener('change', (e) => {
  const loc = locations[e.target.value]
  latInput.value = loc.latitude
  lonInput.value = loc.longitude
})

// Size controls
const sizeLabel = document.createElement('div')
sizeLabel.textContent = 'Terrain Size (meters):'
sizeLabel.style.fontSize = '14px'
sizeLabel.style.marginTop = '15px'
sizeLabel.style.marginBottom = '5px'
controlPanel.appendChild(sizeLabel)

// Width input
const widthLabel = document.createElement('label')
widthLabel.textContent = 'Width:'
widthLabel.style.display = 'block'
widthLabel.style.fontSize = '12px'
widthLabel.style.marginBottom = '3px'

const widthInput = document.createElement('input')
widthInput.type = 'number'
widthInput.step = '100'
widthInput.value = currentWidth
widthInput.style.width = '100%'
widthInput.style.padding = '6px'
widthInput.style.marginBottom = '10px'
widthInput.style.backgroundColor = '#2a2a2a'
widthInput.style.color = 'white'
widthInput.style.border = '1px solid #444'
widthInput.style.borderRadius = '4px'

controlPanel.appendChild(widthLabel)
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
  controls.target.copy(mesh.position)
  controls.update()
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
