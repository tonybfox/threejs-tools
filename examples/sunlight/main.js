import * as THREE from 'three'
import { CompassOverlay, SunLightTool } from '@tonybfox/threejs-tools'
import { SceneSetup, ObjectFactory, UIHelpers } from '../shared/utils.js'

let compass
const radToDeg = (radians) => (radians * 180) / Math.PI

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const formatTimeLabel = (hours) => {
  const totalMinutes = Math.floor(clamp(hours, 0, 24) * 60)
  const displayHours = Math.floor(totalMinutes / 60)
  const displayMinutes = totalMinutes % 60
  return `${displayHours.toString().padStart(2, '0')}:${displayMinutes
    .toString()
    .padStart(2, '0')}`
}

const buildLocalDate = (date, offsetMinutes) =>
  new Date(date.getTime() + offsetMinutes * 60 * 1000)

const formatUTCOffset = (offsetMinutes) => {
  const hours = offsetMinutes / 60
  const sign = hours >= 0 ? '+' : '-'
  const absHours = Math.floor(Math.abs(hours))
  const absMinutes = Math.abs(offsetMinutes) % 60
  if (absMinutes === 0) {
    return `UTC${sign}${absHours}`
  }
  const minutesLabel = absMinutes.toString().padStart(2, '0')
  return `UTC${sign}${absHours}:${minutesLabel}`
}

const formatDayOfYearLabel = (day, year) => {
  const safeDay = Math.max(1, Math.round(day))
  const date = new Date(Date.UTC(year, 0, safeDay))
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

const computeHoursWithOffset = (date, offsetMinutes) => {
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes() + offsetMinutes
  const wrapped = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60)
  return wrapped / 60
}

const sceneSetup = new SceneSetup({
  backgroundColor: 0x101826,
  cameraPosition: [40, 32, 40],
  enableShadows: true,
  enableControls: true,
  antialias: true,
})

const { scene, camera } = sceneSetup

// Create compass overlay
compass = new CompassOverlay(camera, {
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

const ground = sceneSetup.addGround(220, 0x1c242f)
ground.material.color.setHex(0x1c242f)

const ambientLight = scene.children.find(
  (child) => child instanceof THREE.AmbientLight
)
const initialSun = scene.children.find(
  (child) => child instanceof THREE.DirectionalLight
)

const sunLightTool = new SunLightTool(scene, {
  light: initialSun,
  ambientLight,
  latitude: 37.7749,
  longitude: -122.4194,
  dayOfYear: 172,
  timeOfDay: 15.5,
  timeZoneOffsetMinutes: -420,
  weather: 'sunny',
  lightDistance: 260,
  shadowCameraSize: 120,
  shadowCameraFar: 900,
  showHelper: true,
  helperSize: 18,
  helperColor: 0xffe08a,
  showMoonHelper: true,
  moonHelperSize: 15,
  moonHelperColor: 0xb8c5d6,
})

const hemisphereLight = sunLightTool.getHemisphereLight()
if (hemisphereLight) {
  hemisphereLight.position.set(0, 1, 0)
}

const elements = []
elements.push(ObjectFactory.createBox([10, 24, 10], 0x90caf9, [-26, 12, -12]))
elements.push(ObjectFactory.createBox([6, 16, 6], 0xffcc80, [-8, 8, 18]))
elements.push(
  ObjectFactory.createCylinder(3.5, 3.5, 20, 0xff8a65, [18, 10, 12])
)
elements.push(ObjectFactory.createSphere(4, 0xf06292, [18, 8, -18]))

elements.forEach((mesh) => {
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)
})

const controlPanel = UIHelpers.createControlPanel('☀️ Sun Light Controls')

const infoContainer = document.createElement('div')
Object.assign(infoContainer.style, {
  marginTop: '15px',
  padding: '12px',
  background: 'rgba(15, 20, 30, 0.7)',
  borderRadius: '8px',
  fontSize: '12px',
  lineHeight: '1.6',
  border: '1px solid rgba(255, 255, 255, 0.08)',
})

const localTimeRow = document.createElement('div')
const systemTimeRow = document.createElement('div')
const altitudeRow = document.createElement('div')
const azimuthRow = document.createElement('div')
const weatherRow = document.createElement('div')
const moonPhaseRow = document.createElement('div')
const moonAltitudeRow = document.createElement('div')

infoContainer.appendChild(localTimeRow)
infoContainer.appendChild(systemTimeRow)
infoContainer.appendChild(altitudeRow)
infoContainer.appendChild(azimuthRow)
infoContainer.appendChild(weatherRow)
infoContainer.appendChild(moonPhaseRow)
infoContainer.appendChild(moonAltitudeRow)

controlPanel.appendChild(infoContainer)

const locationPresets = {
  custom: {
    label: 'Custom Coordinates',
  },
  sanFrancisco: {
    label: 'San Francisco, USA',
    latitude: 37.7749,
    longitude: -122.4194,
    utcOffsetMinutes: -420,
  },
  london: {
    label: 'London, UK',
    latitude: 51.5072,
    longitude: -0.1276,
    utcOffsetMinutes: 60, // BST (British Summer Time) UTC+1. Change to 0 for GMT (winter).
  },
  dubai: {
    label: 'Dubai, UAE',
    latitude: 25.276987,
    longitude: 55.296249,
    utcOffsetMinutes: 240,
  },
  tokyo: {
    label: 'Tokyo, Japan',
    latitude: 35.6762,
    longitude: 139.6503,
    utcOffsetMinutes: 540,
  },
  sydney: {
    label: 'Sydney, Australia',
    latitude: -33.8688,
    longitude: 151.2093,
    utcOffsetMinutes: 600,
  },
  reykjavik: {
    label: 'Reykjavík, Iceland',
    latitude: 64.1466,
    longitude: -21.9426,
    utcOffsetMinutes: 0,
  },
}

const locationLabel = document.createElement('label')
locationLabel.textContent = 'Location Preset'
locationLabel.style.display = 'block'
locationLabel.style.marginTop = '10px'
locationLabel.style.marginBottom = '5px'
locationLabel.style.fontSize = '13px'

const locationSelect = document.createElement('select')
Object.assign(locationSelect.style, {
  width: '100%',
  padding: '8px',
  borderRadius: '6px',
  backgroundColor: '#1f2933',
  color: '#fff',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  marginBottom: '10px',
})

Object.entries(locationPresets).forEach(([key, preset]) => {
  const option = document.createElement('option')
  option.value = key
  option.textContent = preset.label
  locationSelect.appendChild(option)
})

controlPanel.appendChild(locationLabel)
controlPanel.appendChild(locationSelect)

const realtimeContainer = document.createElement('div')
realtimeContainer.style.margin = '14px 0'

const realtimeToggle = document.createElement('input')
realtimeToggle.type = 'checkbox'
realtimeToggle.id = 'realtime-toggle'
realtimeToggle.style.marginRight = '8px'

const realtimeLabel = document.createElement('label')
realtimeLabel.htmlFor = 'realtime-toggle'
realtimeLabel.textContent = 'Use system clock (real-time updates)'
realtimeLabel.style.fontSize = '13px'

realtimeContainer.appendChild(realtimeToggle)
realtimeContainer.appendChild(realtimeLabel)
controlPanel.appendChild(realtimeContainer)

const weatherLabel = document.createElement('label')
weatherLabel.textContent = 'Weather Preset'
weatherLabel.style.display = 'block'
weatherLabel.style.marginBottom = '5px'
weatherLabel.style.fontSize = '13px'

const weatherSelect = document.createElement('select')
Object.assign(weatherSelect.style, {
  width: '100%',
  padding: '8px',
  borderRadius: '6px',
  backgroundColor: '#1f2933',
  color: '#fff',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  marginBottom: '12px',
})

const weatherOptions = [
  { value: 'sunny', label: 'Sunny' },
  { value: 'partly-cloudy', label: 'Partly Cloudy' },
  { value: 'overcast', label: 'Overcast' },
]
weatherOptions.forEach((option) => {
  const element = document.createElement('option')
  element.value = option.value
  element.textContent = option.label
  weatherSelect.appendChild(element)
})

controlPanel.appendChild(weatherLabel)
controlPanel.appendChild(weatherSelect)

const moonHelperContainer = document.createElement('div')
moonHelperContainer.style.margin = '14px 0'

const moonHelperToggle = document.createElement('input')
moonHelperToggle.type = 'checkbox'
moonHelperToggle.id = 'moon-helper-toggle'
moonHelperToggle.checked = true
moonHelperToggle.style.marginRight = '8px'

const moonHelperLabel = document.createElement('label')
moonHelperLabel.htmlFor = 'moon-helper-toggle'
moonHelperLabel.textContent = '🌙 Show moon helper'
moonHelperLabel.style.fontSize = '13px'

moonHelperContainer.appendChild(moonHelperToggle)
moonHelperContainer.appendChild(moonHelperLabel)
controlPanel.appendChild(moonHelperContainer)

moonHelperToggle.addEventListener('change', (event) => {
  const moonLight = sunLightTool.getMoonLight()
  if (moonLight) {
    const helper = scene.children.find(
      (child) =>
        child instanceof THREE.DirectionalLightHelper &&
        child.light === moonLight
    )
    if (helper) {
      helper.visible = event.target.checked
    }
  }
})

let isSyncingFromTool = false
let pendingLocationPreset = null

const timeSlider = UIHelpers.createSlider(
  0,
  24,
  sunLightTool.getTimeOfDay(),
  (value) => {
    const numeric = parseFloat(value)
    timeValueLabel.textContent = formatTimeLabel(numeric)
    if (!isSyncingFromTool) {
      sunLightTool.setTimeOfDay(numeric)
      sunLightTool.setUseSystemTime(false)
      realtimeToggle.checked = false
    }
  },
  'Time of Day'
)
const timeInput = timeSlider.querySelector('input')
const timeValueLabel = timeSlider.querySelector('span')
timeInput.step = '0.25'
timeValueLabel.textContent = formatTimeLabel(parseFloat(timeInput.value))
controlPanel.appendChild(timeSlider)

const daySlider = UIHelpers.createSlider(
  1,
  366,
  sunLightTool.getDayOfYear(),
  (value) => {
    const numeric = parseInt(value, 10)
    dayValueLabel.textContent = `${numeric} (${formatDayOfYearLabel(
      numeric,
      currentState.date.getUTCFullYear()
    )})`
    if (!isSyncingFromTool) {
      sunLightTool.setDayOfYear(numeric)
      sunLightTool.setUseSystemTime(false)
      realtimeToggle.checked = false
    }
  },
  'Day of Year'
)
const dayInput = daySlider.querySelector('input')
const dayValueLabel = daySlider.querySelector('span')
let currentState = sunLightTool.getState()
dayInput.step = '1'
dayValueLabel.textContent = `${sunLightTool.getDayOfYear()} (${formatDayOfYearLabel(
  sunLightTool.getDayOfYear(),
  currentState.date.getUTCFullYear()
)})`
controlPanel.appendChild(daySlider)

const latitudeSlider = UIHelpers.createSlider(
  -90,
  90,
  currentState.latitude,
  (value) => {
    const numeric = parseFloat(value)
    latitudeValueLabel.textContent = `${numeric.toFixed(2)}°`
    if (!isSyncingFromTool) {
      sunLightTool.setLatitude(numeric)
      locationSelect.value = 'custom'
    }
  },
  'Latitude'
)
const latitudeInput = latitudeSlider.querySelector('input')
const latitudeValueLabel = latitudeSlider.querySelector('span')
latitudeInput.step = '0.1'
latitudeValueLabel.textContent = `${currentState.latitude.toFixed(2)}°`
controlPanel.appendChild(latitudeSlider)

const longitudeSlider = UIHelpers.createSlider(
  -180,
  180,
  currentState.longitude,
  (value) => {
    const numeric = parseFloat(value)
    longitudeValueLabel.textContent = `${numeric.toFixed(2)}°`
    if (!isSyncingFromTool) {
      sunLightTool.setLongitude(numeric)
      locationSelect.value = 'custom'
    }
  },
  'Longitude'
)
const longitudeInput = longitudeSlider.querySelector('input')
const longitudeValueLabel = longitudeSlider.querySelector('span')
longitudeInput.step = '0.1'
longitudeValueLabel.textContent = `${currentState.longitude.toFixed(2)}°`
controlPanel.appendChild(longitudeSlider)

const timezoneSlider = UIHelpers.createSlider(
  -12,
  14,
  sunLightTool.getTimeZoneOffset() / 60,
  (value) => {
    const numeric = parseFloat(value)
    timezoneValueLabel.textContent = formatUTCOffset(numeric * 60)
    if (!isSyncingFromTool) {
      sunLightTool.setTimeZoneOffset(Math.round(numeric * 60))
      locationSelect.value = 'custom'
      sunLightTool.setUseSystemTime(false)
      realtimeToggle.checked = false
    }
  },
  'UTC Offset (hours)'
)
const timezoneInput = timezoneSlider.querySelector('input')
const timezoneValueLabel = timezoneSlider.querySelector('span')
timezoneInput.step = '0.25'
timezoneValueLabel.textContent = formatUTCOffset(
  sunLightTool.getTimeZoneOffset()
)
controlPanel.appendChild(timezoneSlider)

controlPanel.appendChild(
  UIHelpers.createButton(
    'Reset North',
    () => {
      const activeControls = sceneSetup.controls ?? sceneSetup.cameraControls
      if (activeControls) {
        const focusPosition = activeControls.getPosition(new THREE.Vector3())
        void activeControls.setLookAt(
          focusPosition.x,
          focusPosition.y,
          focusPosition.z,
          0,
          0,
          0,
          false
        )
      } else {
        sceneSetup.camera.lookAt(0, 0, 0)
      }
    },
    'secondary'
  )
)

const applyPreset = (presetKey) => {
  const preset = locationPresets[presetKey]
  if (!preset || presetKey === 'custom') {
    pendingLocationPreset = 'custom'
    return
  }
  pendingLocationPreset = presetKey
  sunLightTool.setLocation(preset.latitude, preset.longitude)
  sunLightTool.setTimeZoneOffset(preset.utcOffsetMinutes)
}

locationSelect.addEventListener('change', (event) => {
  applyPreset(event.target.value)
})

weatherSelect.addEventListener('change', (event) => {
  sunLightTool.setWeather(event.target.value)
})

realtimeToggle.addEventListener('change', (event) => {
  sunLightTool.setUseSystemTime(event.target.checked)
})

const findMatchingPreset = (latitude, longitude, offsetMinutes) => {
  const toleranceLat = 0.05
  const toleranceLon = 0.1
  const toleranceOffset = 15

  return Object.entries(locationPresets).find(([key, preset]) => {
    if (key === 'custom' || !preset.latitude || !preset.longitude) {
      return false
    }
    const matchLat = Math.abs(preset.latitude - latitude) <= toleranceLat
    const matchLon = Math.abs(preset.longitude - longitude) <= toleranceLon
    const matchOffset =
      Math.abs((preset.utcOffsetMinutes ?? 0) - offsetMinutes) <=
      toleranceOffset
    return matchLat && matchLon && matchOffset
  })?.[0]
}

const setManualControlsEnabled = (enabled) => {
  timeInput.disabled = !enabled
  dayInput.disabled = !enabled
  timezoneInput.disabled = !enabled
}

const updateReadout = (state) => {
  const offsetMinutes = sunLightTool.getTimeZoneOffset()
  const localDate = buildLocalDate(state.date, offsetMinutes)
  const hoursAtLocation = computeHoursWithOffset(state.date, offsetMinutes)

  localTimeRow.innerHTML = `<strong>Local Time:</strong> ${formatTimeLabel(
    hoursAtLocation
  )} – ${localDate.toLocaleDateString()}`
  systemTimeRow.innerHTML = `<strong>System Clock:</strong> ${state.date.toLocaleString()}`
  altitudeRow.innerHTML = `<strong>Sun Altitude:</strong> ${radToDeg(
    state.solarAltitude
  ).toFixed(1)}°`
  azimuthRow.innerHTML = `<strong>Sun Azimuth:</strong> ${radToDeg(
    state.solarAzimuth
  ).toFixed(1)}° from North`
  weatherRow.innerHTML = `<strong>Weather:</strong> ${
    weatherOptions.find((item) => item.value === state.weather)?.label ??
    state.weather
  }`

  if (
    state.moonIllumination !== undefined &&
    state.lunarAltitude !== undefined
  ) {
    const illuminationPercent = (state.moonIllumination * 100).toFixed(0)
    const phaseNames = [
      'New Moon',
      'Waxing Crescent',
      'First Quarter',
      'Waxing Gibbous',
      'Full Moon',
      'Waning Gibbous',
      'Last Quarter',
      'Waning Crescent',
    ]
    const phaseIndex =
      Math.floor(((state.moonPhase || 0) / (2 * Math.PI) + 0.0625) * 8) % 8
    const phaseName = phaseNames[phaseIndex < 0 ? phaseIndex + 8 : phaseIndex]
    const lunarAltitude = radToDeg(state.lunarAltitude).toFixed(1)
    const isVisible = state.lunarAltitude > 0 && state.moonIllumination >= 0.1

    moonPhaseRow.innerHTML = `<strong>Moon Phase:</strong> ${phaseName} (${illuminationPercent}% illuminated)`
    moonAltitudeRow.innerHTML = `<strong>Moon Altitude:</strong> ${lunarAltitude}° ${isVisible ? '🌙 visible' : '(below horizon)'}`
  } else {
    moonPhaseRow.innerHTML = ''
    moonAltitudeRow.innerHTML = ''
  }
}

const syncControlsFromTool = (state) => {
  isSyncingFromTool = true

  const offsetMinutes = sunLightTool.getTimeZoneOffset()
  const hoursAtLocation = computeHoursWithOffset(state.date, offsetMinutes)
  timeInput.value = hoursAtLocation.toFixed(2)
  timeValueLabel.textContent = formatTimeLabel(hoursAtLocation)

  dayInput.value = sunLightTool.getDayOfYear()
  dayValueLabel.textContent = `${sunLightTool.getDayOfYear()} (${formatDayOfYearLabel(
    sunLightTool.getDayOfYear(),
    state.date.getUTCFullYear()
  )})`

  latitudeInput.value = state.latitude
  latitudeValueLabel.textContent = `${state.latitude.toFixed(2)}°`

  longitudeInput.value = state.longitude
  longitudeValueLabel.textContent = `${state.longitude.toFixed(2)}°`

  timezoneInput.value = (offsetMinutes / 60).toFixed(2)
  timezoneValueLabel.textContent = formatUTCOffset(offsetMinutes)

  weatherSelect.value = sunLightTool.getWeather()

  if (pendingLocationPreset) {
    locationSelect.value = pendingLocationPreset
    pendingLocationPreset = null
  } else {
    const matched = findMatchingPreset(
      state.latitude,
      state.longitude,
      offsetMinutes
    )
    locationSelect.value = matched ?? 'custom'
  }

  realtimeToggle.checked = sunLightTool.usesSystemTime()
  setManualControlsEnabled(!sunLightTool.usesSystemTime())
  isSyncingFromTool = false
}

sunLightTool.addEventListener('stateChanged', (event) => {
  currentState = event.state
  updateReadout(currentState)
  syncControlsFromTool(currentState)
})

sunLightTool.addEventListener('weatherChanged', () => {
  weatherSelect.value = sunLightTool.getWeather()
})

sunLightTool.addEventListener('systemTimeToggled', (event) => {
  setManualControlsEnabled(!event.useSystemTime)
})

updateReadout(currentState)
syncControlsFromTool(currentState)

let rotationDirection = 1
setInterval(() => {
  rotationDirection *= -1
}, 10000)

sceneSetup.start(() => {
  if (sunLightTool.usesSystemTime()) {
    sunLightTool.update()
  }

  elements.forEach((object, index) => {
    object.rotation.y += 0.002 * rotationDirection * (index + 1)
  })
})

console.log(
  'Sun Light Example ready. Adjust the controls to explore solar lighting.'
)
