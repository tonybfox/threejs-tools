import * as THREE from 'three'
import { CompassTool } from '@tonybfox/threejs-compass'
import { SceneSetup, ObjectFactory, UIHelpers } from '../shared/utils.js'

const defaultHeadingOffset = 13.7
const defaultWidgetSize = 180

const sceneSetup = new SceneSetup({
  backgroundColor: 0x10161f,
  cameraPosition: [26, 18, 28],
  enableShadows: true,
  enableControls: true,
  antialias: true,
})

const { scene, camera, controls, renderer } = sceneSetup

camera.near = 0.1
camera.far = 500
camera.updateProjectionMatrix()

if (controls) {
  controls.target.set(0, 0, 0)
  controls.maxPolarAngle = Math.PI * 0.52
  controls.update()
}

const ground = sceneSetup.addGround(160, 0x1d2732)
ground.material.color.setHex(0x1d2732)

const gridHelper = new THREE.GridHelper(140, 28, 0x2f3c4a, 0x222b36)
gridHelper.position.y = 0.001
scene.add(gridHelper)

const featureObjects = [
  ObjectFactory.createCylinder(1.5, 1.5, 10, 0x60a5fa, [-12, 5, -6]),
  ObjectFactory.createBox([4, 6, 4], 0xf97316, [10, 3, 12]),
  ObjectFactory.createSphere(2.5, 0x10b981, [14, 2.5, -10]),
  ObjectFactory.createBox([3, 4, 9], 0x9f7aea, [-6, 2, 11]),
]

featureObjects.forEach((mesh) => {
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)
})

const locationPresets = {
  sanFrancisco: {
    latitude: 37.7749,
    longitude: -122.4194,
    label: 'San Francisco',
  },
  london: { latitude: 51.5074, longitude: -0.1278, label: 'London' },
  sydney: { latitude: -33.8688, longitude: 151.2093, label: 'Sydney' },
  reykjavik: { latitude: 64.1466, longitude: -21.9426, label: 'Reykjavík' },
  capeTown: { latitude: -33.9249, longitude: 18.4241, label: 'Cape Town' },
  tokyo: { latitude: 35.6762, longitude: 139.6503, label: 'Tokyo' },
}

let activePresetKey = 'sanFrancisco'
let useDynamicNorth = false
let isSyncingFromTool = false
let headingOffset = defaultHeadingOffset
let widgetSize = defaultWidgetSize
let lastOverlayAngle = 0

const overlayDirection = new THREE.Vector3()
const cameraWorldQuaternion = new THREE.Quaternion()
const cameraWorldQuaternionInverse = new THREE.Quaternion()
const snapSpherical = new THREE.Spherical()
const HORIZONTAL_EPSILON = 1e-4
const northPlanar = new THREE.Vector3()
const snapOffset = new THREE.Vector3()
const snapTarget = new THREE.Vector3()
const widgetBounds = { left: 0, top: 0, size: widgetSize }

const compass = new CompassTool(scene, {
  latitude: locationPresets.sanFrancisco.latitude,
  longitude: locationPresets.sanFrancisco.longitude,
  position: new THREE.Vector3(0, 0, 0),
  arrowLength: 5.2,
  baseRadius: 2.2,
  baseHeight: 0.55,
  headingOffsetDegrees: headingOffset,
  arrowColor: 0xff5333,
  baseColor: 0x111821,
  accentColor: 0xf8fafc,
  ringColor: 0x334155,
  autoAddToScene: false,
})

const compassObject = compass.getObject3D()

const widgetScene = new THREE.Scene()
widgetScene.background = null

const widgetRoot = new THREE.Group()
widgetRoot.position.y = -0.1
widgetScene.add(widgetRoot)
widgetRoot.add(compassObject)

const addBackdrop = () => {
  const backdrop = new THREE.Mesh(
    new THREE.CircleGeometry(3.5, 72),
    new THREE.MeshBasicMaterial({
      color: 0x0b1321,
      transparent: true,
      opacity: 0.82,
    })
  )
  backdrop.rotation.x = -Math.PI / 2
  backdrop.position.y = -0.12
  backdrop.renderOrder = -3

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(3.1, 3.35, 72),
    new THREE.MeshBasicMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    })
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = -0.1
  ring.renderOrder = -2

  widgetRoot.add(backdrop)
  widgetRoot.add(ring)
}

const createCardinalSprite = (label, angle) => {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.font = 'bold 78px Arial'
  context.fillStyle = '#cbd5f5'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(label, canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter

  const material = new THREE.SpriteMaterial({ map: texture, transparent: true })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(1.45, 1.45, 1)
  const radius = 2.85
  sprite.position.set(Math.sin(angle) * radius, 1.55, Math.cos(angle) * radius)
  sprite.renderOrder = 5
  return sprite
}

addBackdrop()
widgetRoot.add(createCardinalSprite('N', 0))
widgetRoot.add(createCardinalSprite('E', Math.PI / 2))
widgetRoot.add(createCardinalSprite('S', Math.PI))
widgetRoot.add(createCardinalSprite('W', (3 * Math.PI) / 2))

const widgetAmbient = new THREE.AmbientLight(0xffffff, 0.85)
const widgetKey = new THREE.DirectionalLight(0xffffff, 0.55)
widgetKey.position.set(4, 6, 8)
const widgetFill = new THREE.DirectionalLight(0x8ab4ff, 0.2)
widgetFill.position.set(-5, -4, 3)
widgetScene.add(widgetAmbient, widgetKey, widgetFill)

const widgetCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 50)
widgetCamera.position.set(0, 5.2, 6.8)
widgetCamera.lookAt(0, 0.9, 0)

const dynamicNorthResolver = (latitude, longitude) => {
  const lonRad = THREE.MathUtils.degToRad(longitude)
  const latInfluence = THREE.MathUtils.degToRad(latitude) * 0.25
  const direction = new THREE.Vector3(
    Math.sin(lonRad) * Math.cos(latInfluence),
    0,
    Math.cos(lonRad) * Math.cos(latInfluence)
  )

  if (direction.lengthSq() < 1e-6) {
    direction.set(0, 0, 1)
  }
  return direction.normalize()
}

const flatNorthResolver = () => new THREE.Vector3(0, 0, 1)
compass.setNorthResolver(flatNorthResolver)

const controlPanel = UIHelpers.createControlPanel(
  '🧭 Compass Controls',
  'top-left'
)

const headingReadout = document.createElement('div')
Object.assign(headingReadout.style, {
  fontSize: '13px',
  lineHeight: '1.6',
  padding: '12px',
  borderRadius: '8px',
  background: 'rgba(15, 22, 31, 0.85)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  marginBottom: '14px',
  fontFamily: 'monospace',
})
controlPanel.appendChild(headingReadout)

const updateHeadingReadout = (state) => {
  headingReadout.innerHTML = `
    <strong>Heading:</strong> ${state.headingDegrees.toFixed(2)}°<br/>
    <strong>Latitude:</strong> ${state.latitude.toFixed(4)}°<br/>
    <strong>Longitude:</strong> ${state.longitude.toFixed(4)}°<br/>
    <strong>Resolver:</strong> ${useDynamicNorth ? 'Dynamic (lon + lat)' : 'World north'}<br/>
    <strong>Offset:</strong> ${headingOffset.toFixed(2)}°
  `
}

updateHeadingReadout(compass.getState())

const presetLabel = document.createElement('label')
presetLabel.textContent = 'Location Preset'
presetLabel.style.display = 'block'
presetLabel.style.marginBottom = '6px'
presetLabel.style.fontSize = '14px'
controlPanel.appendChild(presetLabel)

const presetSelect = document.createElement('select')
Object.assign(presetSelect.style, {
  width: '100%',
  padding: '8px',
  marginBottom: '12px',
  backgroundColor: '#1f2933',
  color: '#f8fafc',
  border: '1px solid #334155',
  borderRadius: '6px',
  fontSize: '14px',
})

Object.entries(locationPresets).forEach(([key, preset]) => {
  const option = document.createElement('option')
  option.value = key
  option.textContent = preset.label
  presetSelect.appendChild(option)
})

const customOption = document.createElement('option')
customOption.value = 'custom'
customOption.textContent = 'Custom'
presetSelect.appendChild(customOption)

presetSelect.value = activePresetKey
controlPanel.appendChild(presetSelect)

const coordinateContainer = document.createElement('div')
coordinateContainer.style.marginTop = '10px'

const coordinateHeader = document.createElement('div')
coordinateHeader.textContent = 'Manual Coordinates'
coordinateHeader.style.fontSize = '13px'
coordinateHeader.style.marginBottom = '8px'
coordinateHeader.style.fontWeight = '600'
coordinateContainer.appendChild(coordinateHeader)

const latLabel = document.createElement('label')
latLabel.textContent = 'Latitude (°)'
latLabel.style.display = 'block'
latLabel.style.fontSize = '12px'
latLabel.style.marginBottom = '4px'
coordinateContainer.appendChild(latLabel)

const latInput = document.createElement('input')
latInput.type = 'number'
latInput.step = '0.0001'
latInput.value = locationPresets.sanFrancisco.latitude
Object.assign(latInput.style, {
  width: '100%',
  padding: '6px',
  marginBottom: '10px',
  backgroundColor: '#1f2933',
  color: '#f8fafc',
  border: '1px solid #334155',
  borderRadius: '6px',
})
coordinateContainer.appendChild(latInput)

const lonLabel = document.createElement('label')
lonLabel.textContent = 'Longitude (°)'
lonLabel.style.display = 'block'
lonLabel.style.fontSize = '12px'
lonLabel.style.marginBottom = '4px'
coordinateContainer.appendChild(lonLabel)

const lonInput = document.createElement('input')
lonInput.type = 'number'
lonInput.step = '0.0001'
lonInput.value = locationPresets.sanFrancisco.longitude
Object.assign(lonInput.style, {
  width: '100%',
  padding: '6px',
  marginBottom: '10px',
  backgroundColor: '#1f2933',
  color: '#f8fafc',
  border: '1px solid #334155',
  borderRadius: '6px',
})
coordinateContainer.appendChild(lonInput)

controlPanel.appendChild(coordinateContainer)

const declinationSlider = UIHelpers.createSlider(
  -30,
  30,
  headingOffset,
  (value) => {
    const numeric = parseFloat(value)
    if (Number.isNaN(numeric)) return
    headingOffset = numeric
    compass.setHeadingOffsetDegrees(numeric)
    headingOffsetLabel.textContent = `${numeric.toFixed(2)}°`
    updateHeadingReadout(compass.getState())
  },
  'Heading Offset (declination)'
)

const declinationInput = declinationSlider.querySelector('input')
const headingOffsetLabel = declinationSlider.querySelector('span')
declinationInput.step = '0.1'
headingOffsetLabel.textContent = `${headingOffset.toFixed(2)}°`
controlPanel.appendChild(declinationSlider)

const widgetSizeSlider = UIHelpers.createSlider(
  120,
  260,
  widgetSize,
  (value) => {
    const numeric = parseFloat(value)
    if (Number.isNaN(numeric)) return
    widgetSize = numeric
    widgetSizeValue.textContent = `${Math.round(widgetSize)} px`
  },
  'Compass Widget Size'
)

const widgetSizeInput = widgetSizeSlider.querySelector('input')
const widgetSizeValue = widgetSizeSlider.querySelector('span')
widgetSizeInput.step = '1'
widgetSizeValue.textContent = `${Math.round(widgetSize)} px`
controlPanel.appendChild(widgetSizeSlider)

const applyPreset = (presetKey) => {
  if (presetKey === 'custom') {
    activePresetKey = 'custom'
    return
  }

  const preset = locationPresets[presetKey]
  if (!preset) return
  activePresetKey = presetKey
  compass.setLocation(preset.latitude, preset.longitude)
  if (useDynamicNorth) {
    compass.setNorthResolver(dynamicNorthResolver)
  } else {
    compass.setNorthResolver(flatNorthResolver)
  }
}

const toggleResolverButton = UIHelpers.createButton(
  'Enable Dynamic North',
  () => {
    useDynamicNorth = !useDynamicNorth
    if (useDynamicNorth) {
      compass.setNorthResolver(dynamicNorthResolver)
      toggleResolverButton.textContent = 'Use World North'
    } else {
      compass.setNorthResolver(flatNorthResolver)
      toggleResolverButton.textContent = 'Enable Dynamic North'
    }
    updateHeadingReadout(compass.getState())
  },
  'secondary'
)
controlPanel.appendChild(toggleResolverButton)

const randomLocationButton = UIHelpers.createButton(
  'Random Preset',
  () => {
    const keys = Object.keys(locationPresets)
    const randomKey = keys[Math.floor(Math.random() * keys.length)]
    applyPreset(randomKey)
    presetSelect.value = randomKey
  },
  'primary'
)
controlPanel.appendChild(randomLocationButton)

const resetButton = UIHelpers.createButton(
  'Reset Controls',
  () => {
    useDynamicNorth = false
    headingOffset = defaultHeadingOffset
    widgetSize = defaultWidgetSize
    toggleResolverButton.textContent = 'Enable Dynamic North'
    compass.setNorthResolver(flatNorthResolver)
    compass.setHeadingOffsetDegrees(headingOffset)
    declinationInput.value = headingOffset.toString()
    headingOffsetLabel.textContent = `${headingOffset.toFixed(2)}°`
    widgetSizeInput.value = widgetSize.toString()
    widgetSizeValue.textContent = `${Math.round(widgetSize)} px`
    applyPreset('sanFrancisco')
    presetSelect.value = 'sanFrancisco'
    updateHeadingReadout(compass.getState())
  },
  'secondary'
)
controlPanel.appendChild(resetButton)

presetSelect.addEventListener('change', (event) => {
  applyPreset(event.target.value)
})

latInput.addEventListener('input', (event) => {
  if (isSyncingFromTool) return
  const value = parseFloat(event.target.value)
  if (Number.isNaN(value)) return
  compass.setLatitude(value)
  activePresetKey = 'custom'
  presetSelect.value = 'custom'
})

lonInput.addEventListener('input', (event) => {
  if (isSyncingFromTool) return
  const value = parseFloat(event.target.value)
  if (Number.isNaN(value)) return
  compass.setLongitude(value)
  activePresetKey = 'custom'
  presetSelect.value = 'custom'
})

compass.addEventListener('headingChanged', (event) => {
  updateHeadingReadout({
    headingDegrees: event.headingDegrees,
    latitude: event.latitude,
    longitude: event.longitude,
  })
})

compass.addEventListener('locationChanged', (event) => {
  isSyncingFromTool = true
  latInput.value = event.latitude.toFixed(4)
  lonInput.value = event.longitude.toFixed(4)
  isSyncingFromTool = false
})

const snapCameraToNorth = () => {
  northPlanar.copy(compass.getDirection()).setY(0)
  if (northPlanar.lengthSq() < HORIZONTAL_EPSILON) {
    return
  }

  northPlanar.normalize()

  const target = controls ? controls.target : snapTarget.set(0, 0, 0)

  snapOffset.copy(camera.position).sub(target)
  snapSpherical.setFromVector3(snapOffset)
  snapSpherical.theta = Math.atan2(-northPlanar.x, -northPlanar.z)
  snapOffset.setFromSpherical(snapSpherical)

  camera.position.copy(target).add(snapOffset)
  camera.lookAt(target)

  if (controls) {
    controls.update()
  }

  lastOverlayAngle = 0
}

const rendererSize = new THREE.Vector2()

const renderCompassWidget = () => {
  const originalAutoClear = renderer.autoClear
  const pixelRatio = renderer.getPixelRatio()

  renderer.getSize(rendererSize)
  const cssWidth = rendererSize.x
  const cssHeight = rendererSize.y
  const sizeCss = Math.round(
    Math.min(widgetSize, Math.min(cssWidth, cssHeight) * 0.45)
  )
  const margin = 24
  const viewportX = cssWidth - sizeCss - margin
  const viewportY = margin
  widgetBounds.left = viewportX
  widgetBounds.top = cssHeight - sizeCss - viewportY
  widgetBounds.size = sizeCss

  renderer.autoClear = false
  renderer.clearDepth()
  renderer.setScissorTest(true)
  renderer.setViewport(
    viewportX * pixelRatio,
    viewportY * pixelRatio,
    sizeCss * pixelRatio,
    sizeCss * pixelRatio
  )
  renderer.setScissor(
    viewportX * pixelRatio,
    viewportY * pixelRatio,
    sizeCss * pixelRatio,
    sizeCss * pixelRatio
  )

  widgetCamera.aspect = 1
  widgetCamera.updateProjectionMatrix()

  renderer.render(widgetScene, widgetCamera)

  renderer.setScissorTest(false)
  renderer.autoClear = originalAutoClear
}

renderer.domElement.addEventListener('dblclick', (event) => {
  const x = event.offsetX
  const y = event.offsetY

  const withinX =
    x >= widgetBounds.left && x <= widgetBounds.left + widgetBounds.size
  const withinY =
    y >= widgetBounds.top && y <= widgetBounds.top + widgetBounds.size

  if (withinX && withinY) {
    event.preventDefault()
    event.stopImmediatePropagation()
    snapCameraToNorth()
  }
})

let rotationState = 1
setInterval(() => {
  rotationState *= -1
}, 8000)

const animate = () => {
  requestAnimationFrame(animate)

  if (controls) {
    controls.update()
  }

  camera.getWorldQuaternion(cameraWorldQuaternion)
  cameraWorldQuaternionInverse.copy(cameraWorldQuaternion).invert()

  overlayDirection
    .copy(compass.getDirection())
    .applyQuaternion(cameraWorldQuaternionInverse)

  const planarMagnitude = Math.hypot(overlayDirection.x, overlayDirection.z)
  if (planarMagnitude > HORIZONTAL_EPSILON) {
    lastOverlayAngle = Math.atan2(
      -overlayDirection.x,
      -overlayDirection.z
    )
  }

  widgetRoot.rotation.y = lastOverlayAngle

  featureObjects.forEach((object, index) => {
    object.rotation.y += 0.004 * rotationState * (index % 2 === 0 ? 1 : -1)
  })

  const drawingWidth = renderer.domElement.width
  const drawingHeight = renderer.domElement.height
  renderer.setViewport(0, 0, drawingWidth, drawingHeight)
  renderer.setScissor(0, 0, drawingWidth, drawingHeight)
  renderer.setScissorTest(false)
  renderer.autoClear = true
  renderer.render(scene, camera)

  renderCompassWidget()
}

animate()

console.log(
  'Compass example ready. The widget renders as a bottom-right overlay similar to a gizmo.'
)
