import * as THREE from 'three'
import { SceneSetup, UIHelpers, ObjectFactory } from '../shared/utils.js'
import {
  TerrainTool,
  CompassOverlay,
  SunLightTool,
} from '@tonybfox/threejs-tools'

// Fixed location for this example
const FIXED_LOCATION = {
  latitude: 50.741530098472964,
  longitude: -1.784831359077266,
  name: 'Fixed Location',
}

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

// Adjust camera to better view the scene
camera.position.set(50, 40, 50)
if (controls) {
  void controls.setLookAt(50, 40, 50, 0, 0, 0, false)
} else {
  camera.lookAt(0, 0, 0)
}

// Helper function to get day of year
function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date - start
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay)
}

// Create compass overlay
const compass = new CompassOverlay(camera, {
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

// Mapbox token storage
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

// Current terrain settings
let currentWidth = 150
let currentDepth = 150

// Create terrain tool
const terrainTool = new TerrainTool(scene, {
  widthSegments: 50,
  depthSegments: 50,
  elevationScale: 1.0,
  baseColor: 0xffffff,
  wireframe: false,
  useDemoData: false,
  receiveShadow: true,
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

// Get initial sun light from scene
const ambientLight = scene.children.find(
  (child) => child instanceof THREE.AmbientLight
)
const initialSun = scene.children.find(
  (child) => child instanceof THREE.DirectionalLight
)

const cube = ObjectFactory.createBox([2, 2, 2], 0x4fc3f7, [-30, 3, 20])
cube.castShadow = true
sceneSetup.scene.add(cube)

// Create sun light tool
const sunLightTool = new SunLightTool(scene, {
  light: initialSun,
  ambientLight,
  latitude: FIXED_LOCATION.latitude,
  longitude: FIXED_LOCATION.longitude,
  dayOfYear: getDayOfYear(new Date()),
  timeOfDay: new Date().getHours() + new Date().getMinutes() / 60,
  timeZoneOffsetMinutes: 0,
  weather: 'sunny',
  lightDistance: 260,
  shadowCameraSize: 120,
  shadowCameraFar: 900,
  showHelper: true,
  helperSize: 18,
  helperColor: 0xffe08a,
})

const hemisphereLight = sunLightTool.getHemisphereLight()
if (hemisphereLight) {
  hemisphereLight.position.set(0, 1, 0)
}

// Helper functions for time formatting
const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const formatTimeLabel = (hours) => {
  const totalMinutes = Math.floor(clamp(hours, 0, 24) * 60)
  const displayHours = Math.floor(totalMinutes / 60)
  const displayMinutes = totalMinutes % 60
  return `${displayHours.toString().padStart(2, '0')}:${displayMinutes
    .toString()
    .padStart(2, '0')}`
}

const radToDeg = (radians) => (radians * 180) / Math.PI

// Create control panel
const controlPanel = UIHelpers.createControlPanel('🌍 Combined Scene Controls')

// ===== LOCATION INFO SECTION =====
const locationInfoSection = document.createElement('div')
Object.assign(locationInfoSection.style, {
  marginBottom: '20px',
  padding: '12px',
  background: 'rgba(15, 20, 30, 0.7)',
  borderRadius: '8px',
  fontSize: '13px',
  lineHeight: '1.6',
  border: '1px solid rgba(255, 255, 255, 0.08)',
})

const locationInfoTitle = document.createElement('div')
locationInfoTitle.textContent = '📍 Location'
locationInfoTitle.style.fontWeight = 'bold'
locationInfoTitle.style.marginBottom = '8px'
locationInfoTitle.style.fontSize = '14px'

const latitudeInfo = document.createElement('div')
latitudeInfo.textContent = `Latitude: ${FIXED_LOCATION.latitude.toFixed(6)}°`

const longitudeInfo = document.createElement('div')
longitudeInfo.textContent = `Longitude: ${FIXED_LOCATION.longitude.toFixed(6)}°`

locationInfoSection.appendChild(locationInfoTitle)
locationInfoSection.appendChild(latitudeInfo)
locationInfoSection.appendChild(longitudeInfo)
controlPanel.appendChild(locationInfoSection)

// ===== SUN INFO SECTION =====
const sunInfoSection = document.createElement('div')
Object.assign(sunInfoSection.style, {
  marginBottom: '20px',
  padding: '12px',
  background: 'rgba(15, 20, 30, 0.7)',
  borderRadius: '8px',
  fontSize: '13px',
  lineHeight: '1.6',
  border: '1px solid rgba(255, 255, 255, 0.08)',
})

const sunInfoTitle = document.createElement('div')
sunInfoTitle.textContent = '☀️ Sun Position'
sunInfoTitle.style.fontWeight = 'bold'
sunInfoTitle.style.marginBottom = '8px'
sunInfoTitle.style.fontSize = '14px'

const altitudeRow = document.createElement('div')
const azimuthRow = document.createElement('div')
const weatherRow = document.createElement('div')

sunInfoSection.appendChild(sunInfoTitle)
sunInfoSection.appendChild(altitudeRow)
sunInfoSection.appendChild(azimuthRow)
sunInfoSection.appendChild(weatherRow)
controlPanel.appendChild(sunInfoSection)

// ===== DATE/TIME CONTROLS SECTION =====
const dateTimeSection = document.createElement('div')
Object.assign(dateTimeSection.style, {
  marginBottom: '20px',
  padding: '15px',
  background: 'rgba(20, 25, 35, 0.8)',
  borderRadius: '8px',
  border: '1px solid rgba(255, 255, 255, 0.12)',
})

const dateTimeSectionTitle = document.createElement('div')
dateTimeSectionTitle.textContent = '🕐 Date & Time Controls'
dateTimeSectionTitle.style.fontWeight = 'bold'
dateTimeSectionTitle.style.marginBottom = '15px'
dateTimeSectionTitle.style.fontSize = '14px'
dateTimeSection.appendChild(dateTimeSectionTitle)

// Date Input
const dateInputLabel = document.createElement('label')
dateInputLabel.textContent = 'Date:'
dateInputLabel.style.display = 'block'
dateInputLabel.style.marginBottom = '5px'
dateInputLabel.style.fontSize = '13px'

const dateInput = document.createElement('input')
dateInput.type = 'date'
const today = new Date()
dateInput.value = today.toISOString().split('T')[0]
Object.assign(dateInput.style, {
  width: '100%',
  padding: '8px',
  marginBottom: '15px',
  backgroundColor: '#2a2a2a',
  color: 'white',
  border: '1px solid #444',
  borderRadius: '4px',
  fontSize: '13px',
})

dateTimeSection.appendChild(dateInputLabel)
dateTimeSection.appendChild(dateInput)

// Time of Day Slider
const timeLabel = document.createElement('label')
timeLabel.textContent = 'Time of Day:'
timeLabel.style.display = 'block'
timeLabel.style.marginBottom = '5px'
timeLabel.style.fontSize = '13px'

const timeValue = document.createElement('div')
timeValue.textContent = formatTimeLabel(
  today.getHours() + today.getMinutes() / 60
)
timeValue.style.fontSize = '16px'
timeValue.style.fontWeight = 'bold'
timeValue.style.marginBottom = '8px'
timeValue.style.color = '#4fc3f7'

const timeSlider = document.createElement('input')
timeSlider.type = 'range'
timeSlider.min = '0'
timeSlider.max = '24'
timeSlider.step = '0.1'
timeSlider.value = today.getHours() + today.getMinutes() / 60
Object.assign(timeSlider.style, {
  width: '100%',
  marginBottom: '15px',
})

dateTimeSection.appendChild(timeLabel)
dateTimeSection.appendChild(timeValue)
dateTimeSection.appendChild(timeSlider)

// Weather Control
const weatherLabel = document.createElement('label')
weatherLabel.textContent = 'Weather:'
weatherLabel.style.display = 'block'
weatherLabel.style.marginBottom = '5px'
weatherLabel.style.fontSize = '13px'

const weatherSelect = document.createElement('select')
Object.assign(weatherSelect.style, {
  width: '100%',
  padding: '8px',
  marginBottom: '10px',
  backgroundColor: '#2a2a2a',
  color: 'white',
  border: '1px solid #444',
  borderRadius: '4px',
  fontSize: '13px',
})

const weatherOptions = ['sunny', 'partly-cloudy', 'cloudy', 'overcast']
weatherOptions.forEach((weather) => {
  const option = document.createElement('option')
  option.value = weather
  option.textContent = weather
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  if (weather === 'sunny') option.selected = true
  weatherSelect.appendChild(option)
})

dateTimeSection.appendChild(weatherLabel)
dateTimeSection.appendChild(weatherSelect)

// Quick Time Buttons
const quickTimeLabel = document.createElement('div')
quickTimeLabel.textContent = 'Quick Time:'
quickTimeLabel.style.marginTop = '15px'
quickTimeLabel.style.marginBottom = '8px'
quickTimeLabel.style.fontSize = '13px'

const quickTimeButtons = document.createElement('div')
Object.assign(quickTimeButtons.style, {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '8px',
})

const quickTimes = [
  { label: 'Sunrise', time: 6 },
  { label: 'Noon', time: 12 },
  { label: 'Sunset', time: 18 },
  { label: 'Midnight', time: 0 },
]

quickTimes.forEach(({ label, time }) => {
  const btn = document.createElement('button')
  btn.textContent = label
  Object.assign(btn.style, {
    padding: '8px',
    backgroundColor: '#3a3a3a',
    color: 'white',
    border: '1px solid #555',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  })
  btn.addEventListener('mouseenter', () => {
    btn.style.backgroundColor = '#4a4a4a'
  })
  btn.addEventListener('mouseleave', () => {
    btn.style.backgroundColor = '#3a3a3a'
  })
  btn.addEventListener('click', () => {
    timeSlider.value = time
    timeSlider.dispatchEvent(new Event('input'))
  })
  quickTimeButtons.appendChild(btn)
})

dateTimeSection.appendChild(quickTimeLabel)
dateTimeSection.appendChild(quickTimeButtons)

controlPanel.appendChild(dateTimeSection)

// ===== TERRAIN CONTROLS SECTION =====
const terrainSection = document.createElement('div')
Object.assign(terrainSection.style, {
  marginBottom: '20px',
  padding: '15px',
  background: 'rgba(20, 25, 35, 0.8)',
  borderRadius: '8px',
  border: '1px solid rgba(255, 255, 255, 0.12)',
})

const terrainSectionTitle = document.createElement('div')
terrainSectionTitle.textContent = '🗻 Terrain Controls'
terrainSectionTitle.style.fontWeight = 'bold'
terrainSectionTitle.style.marginBottom = '15px'
terrainSectionTitle.style.fontSize = '14px'
terrainSection.appendChild(terrainSectionTitle)

// Size controls
const sizeLabel = document.createElement('div')
sizeLabel.textContent = 'Terrain Size (meters):'
sizeLabel.style.fontSize = '13px'
sizeLabel.style.marginBottom = '10px'

const widthLabel = document.createElement('label')
widthLabel.textContent = 'Width:'
widthLabel.style.display = 'block'
widthLabel.style.fontSize = '12px'
widthLabel.style.marginBottom = '3px'

const widthInput = document.createElement('input')
widthInput.type = 'number'
widthInput.min = '50'
widthInput.max = '500'
widthInput.step = '10'
widthInput.value = currentWidth
Object.assign(widthInput.style, {
  width: '100%',
  padding: '6px',
  marginBottom: '10px',
  backgroundColor: '#2a2a2a',
  color: 'white',
  border: '1px solid #444',
  borderRadius: '4px',
})

const depthLabel = document.createElement('label')
depthLabel.textContent = 'Depth:'
depthLabel.style.display = 'block'
depthLabel.style.fontSize = '12px'
depthLabel.style.marginBottom = '3px'

const depthInput = document.createElement('input')
depthInput.type = 'number'
depthInput.min = '50'
depthInput.max = '500'
depthInput.step = '10'
depthInput.value = currentDepth
Object.assign(depthInput.style, {
  width: '100%',
  padding: '6px',
  marginBottom: '15px',
  backgroundColor: '#2a2a2a',
  color: 'white',
  border: '1px solid #444',
  borderRadius: '4px',
})

terrainSection.appendChild(sizeLabel)
terrainSection.appendChild(widthLabel)
terrainSection.appendChild(widthInput)
terrainSection.appendChild(depthLabel)
terrainSection.appendChild(depthInput)

// Load Terrain Button
const loadTerrainBtn = document.createElement('button')
loadTerrainBtn.textContent = '🔄 Load Terrain'
Object.assign(loadTerrainBtn.style, {
  width: '100%',
  padding: '10px',
  backgroundColor: '#4caf50',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  fontSize: '14px',
  fontWeight: 'bold',
  cursor: 'pointer',
  marginTop: '10px',
})

loadTerrainBtn.addEventListener('mouseenter', () => {
  loadTerrainBtn.style.backgroundColor = '#66bb6a'
})

loadTerrainBtn.addEventListener('mouseleave', () => {
  loadTerrainBtn.style.backgroundColor = '#4caf50'
})

loadTerrainBtn.addEventListener('click', async () => {
  currentWidth = parseFloat(widthInput.value)
  currentDepth = parseFloat(depthInput.value)

  loadTerrainBtn.disabled = true
  loadTerrainBtn.textContent = '⏳ Loading...'

  try {
    await terrainTool.loadTerrain(
      {
        latitude: FIXED_LOCATION.latitude,
        longitude: FIXED_LOCATION.longitude,
      },
      { width: currentWidth, depth: currentDepth }
    )

    // Remove temporary reference objects once terrain is loaded

    loadTerrainBtn.textContent = '✓ Loaded!'
    setTimeout(() => {
      loadTerrainBtn.textContent = '🔄 Load Terrain'
      loadTerrainBtn.disabled = false
    }, 2000)
  } catch (error) {
    console.error('Error loading terrain:', error)
    loadTerrainBtn.textContent = '❌ Error'
    setTimeout(() => {
      loadTerrainBtn.textContent = '🔄 Load Terrain'
      loadTerrainBtn.disabled = false
    }, 2000)
  }
})

terrainSection.appendChild(loadTerrainBtn)
controlPanel.appendChild(terrainSection)

// Update sun info display
function updateSunInfo() {
  const state = sunLightTool.getState()
  const weather = sunLightTool.getWeather()

  altitudeRow.textContent = `Altitude: ${radToDeg(state.solarAltitude).toFixed(
    1
  )}°`
  azimuthRow.textContent = `Azimuth: ${radToDeg(state.solarAzimuth).toFixed(
    1
  )}°`
  weatherRow.textContent = `Weather: ${weather
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')}`
}

// Event listeners for sun controls
timeSlider.addEventListener('input', (e) => {
  const timeOfDay = parseFloat(e.target.value)
  timeValue.textContent = formatTimeLabel(timeOfDay)
  sunLightTool.setTimeOfDay(timeOfDay)
  updateSunInfo()
})

dateInput.addEventListener('change', (e) => {
  const selectedDate = new Date(e.target.value)
  const dayOfYear = getDayOfYear(selectedDate)
  sunLightTool.setDayOfYear(dayOfYear)
  updateSunInfo()
})

weatherSelect.addEventListener('change', (e) => {
  sunLightTool.setWeather(e.target.value)
  updateSunInfo()
})

// Initial sun info update
updateSunInfo()

// Load initial terrain automatically
terrainTool
  .loadTerrain(
    { latitude: FIXED_LOCATION.latitude, longitude: FIXED_LOCATION.longitude },
    { width: currentWidth, depth: currentDepth }
  )
  .then(() => {
    // Remove temporary reference objects once terrain is loaded

    console.log('Terrain loaded successfully!')
  })
  .catch((error) => console.error('Error loading initial terrain:', error))

// Start animation loop
sceneSetup.start(() => {
  compass.update()
})
