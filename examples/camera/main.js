import * as THREE from 'three'
import { DualCameraControls } from '@tonybfox/threejs-camera'
import { SceneSetup, ObjectFactory, UIHelpers } from '../shared/utils.js'

// Scene setup using shared utilities
const sceneSetup = new SceneSetup({
  backgroundColor: 0x0f172a,
  cameraPosition: [10, 10, 10],
  enableShadows: true,
  enableControls: false,
  antialias: true,
})

const { scene, renderer, updateCamera } = sceneSetup
let camera = sceneSetup.camera

// Create a more interesting scene using ObjectFactory
sceneSetup.addGround(20, 0x1e293b)

const cube = ObjectFactory.createBox([2, 2, 2], 0x3b82f6, [0, 1, 0])
scene.add(cube)

const sphere = ObjectFactory.createSphere(1, 0xef4444, [-5, 1, -5])
scene.add(sphere)

const cylinder = ObjectFactory.createCylinder(
  0.8,
  0.8,
  3,
  0x10b981,
  [5, 1.5, 5]
)
scene.add(cylinder)

const clock = new THREE.Clock()
const origin = new THREE.Vector3()
const reusableEuler = new THREE.Euler()

// Camera controls & dual camera support
const cameraControls = new DualCameraControls(renderer, {
  initialTarget: [0, 0, 0],
  perspective: {
    position: [10, 10, 10],
    fov: 60,
  },
  orthographic: {
    size: 20,
  },
})

cameraControls.smoothTime = 0.5
camera = cameraControls.activeCamera
updateCamera(camera)

cameraControls.addEventListener('modechange', (event) => {
  camera = event.camera
  updateCamera(event.camera)
  updateCameraInfo()
})

window.addEventListener('resize', () => {
  cameraControls.handleResize(window.innerWidth, window.innerHeight)
  camera = cameraControls.activeCamera
  updateCamera(camera)
})

let isOrbiting = false
let orbitBtn = null
const orbitSettings = {
  speed: THREE.MathUtils.degToRad(25),
  polarAngle: THREE.MathUtils.degToRad(55),
  distance: 15,
}

function toggleOrbit(enable) {
  isOrbiting = enable

  if (!orbitBtn) {
    return
  }

  if (enable) {
    cameraControls.stop()
    cameraControls.distance = orbitSettings.distance
    cameraControls.polarAngle = orbitSettings.polarAngle
    orbitBtn.textContent = 'Stop Orbit'
    orbitBtn.style.background = '#ef4444'
  } else {
    orbitBtn.textContent = 'Start Orbit'
    orbitBtn.style.background = '#374151'
  }
}

function stopCameraMotion() {
  if (isOrbiting) {
    toggleOrbit(false)
  }
  cameraControls.stop()
}

function moveCameraTo(position, target = origin, enableTransition = true) {
  const destination = position.isVector3
    ? position.clone()
    : new THREE.Vector3(...position)
  const lookAtTarget = target.isVector3
    ? target.clone()
    : new THREE.Vector3(...target)

  void cameraControls.moveCamera(destination, lookAtTarget, enableTransition)
}

// Create UI using shared utilities
const controlPanel = UIHelpers.createControlPanel('📷 Camera Controls')

// Camera Position buttons
const frontViewBtn = UIHelpers.createButton(
  'Front View',
  () => {
    stopCameraMotion()
    moveCameraTo(new THREE.Vector3(0, 5, 15))
  },
  'primary'
)
controlPanel.appendChild(frontViewBtn)

const sideViewBtn = UIHelpers.createButton(
  'Side View',
  () => {
    stopCameraMotion()
    moveCameraTo(new THREE.Vector3(15, 5, 0))
  },
  'primary'
)
controlPanel.appendChild(sideViewBtn)

const topViewBtn = UIHelpers.createButton(
  'Top View',
  () => {
    stopCameraMotion()
    moveCameraTo(new THREE.Vector3(0, 20, 0.1))
  },
  'primary'
)
controlPanel.appendChild(topViewBtn)

const isometricBtn = UIHelpers.createButton(
  'Isometric View',
  () => {
    stopCameraMotion()
    moveCameraTo(new THREE.Vector3(10, 10, 10))
  },
  'primary'
)
controlPanel.appendChild(isometricBtn)

// Camera Animation buttons
orbitBtn = UIHelpers.createButton(
  'Start Orbit',
  () => {
    if (isOrbiting) {
      toggleOrbit(false)
    } else {
      toggleOrbit(true)
    }
  },
  'secondary'
)
controlPanel.appendChild(orbitBtn)

const focusBtn = UIHelpers.createButton(
  'Focus on Cube',
  () => {
    stopCameraMotion()
    const focusOffset = cube.position.clone().add(new THREE.Vector3(0, 5, 8))
    moveCameraTo(focusOffset, cube.position)
  },
  'secondary'
)
controlPanel.appendChild(focusBtn)

const resetBtn = UIHelpers.createButton(
  'Reset Camera',
  () => {
    stopCameraMotion()
    moveCameraTo(new THREE.Vector3(10, 10, 10))
  },
  'secondary'
)
controlPanel.appendChild(resetBtn)

// Camera Type buttons
const perspectiveBtn = UIHelpers.createButton(
  'Perspective',
  () => {
    stopCameraMotion()
    cameraControls.switchToPerspective()
    camera = cameraControls.activeCamera
    updateCamera(camera)
    updateCameraInfo()
  },
  'success'
)
controlPanel.appendChild(perspectiveBtn)

const orthographicBtn = UIHelpers.createButton(
  'Orthographic',
  () => {
    stopCameraMotion()
    cameraControls.switchToOrthographic()
    camera = cameraControls.activeCamera
    updateCamera(camera)
    updateCameraInfo()
  },
  'success'
)
controlPanel.appendChild(orthographicBtn)

// Create camera info panel
const cameraInfoPanel = UIHelpers.createControlPanel(
  '📊 Camera Info',
  'bottom-left'
)
cameraInfoPanel.style.fontFamily = 'monospace'
cameraInfoPanel.style.fontSize = '12px'

const cameraPositionDiv = document.createElement('div')
const cameraRotationDiv = document.createElement('div')
const cameraTypeDiv = document.createElement('div')

cameraInfoPanel.appendChild(cameraPositionDiv)
cameraInfoPanel.appendChild(cameraRotationDiv)
cameraInfoPanel.appendChild(cameraTypeDiv)

function updateCameraInfo() {
  const activeCamera = cameraControls.activeCamera
  const pos = activeCamera.position
  const rot = reusableEuler.setFromQuaternion(activeCamera.quaternion, 'YXZ')

  cameraPositionDiv.textContent = `Position: (${pos.x.toFixed(
    1
  )}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`
  cameraRotationDiv.textContent = `Rotation: (${THREE.MathUtils.radToDeg(
    rot.x
  ).toFixed(
    0
  )}°, ${THREE.MathUtils.radToDeg(rot.y).toFixed(0)}°, ${THREE.MathUtils.radToDeg(
    rot.z
  ).toFixed(0)}°)`
  cameraTypeDiv.textContent = `Type: ${
    activeCamera.isPerspectiveCamera ? 'Perspective' : 'Orthographic'
  }`
}

let infoUpdateAccumulator = 0

function customAnimation() {
  if (isOrbiting) {
    cameraControls.azimuthAngle += orbitSettings.speed * delta
    cameraControls.polarAngle = orbitSettings.polarAngle
  }

  cameraControls.updateDelta()

  // Rotate objects for visual interest
  cube.rotation.x += 0.005
  cube.rotation.y += 0.01

  sphere.rotation.x += 0.01
  cylinder.rotation.y += 0.005

  infoUpdateAccumulator += delta
  if (infoUpdateAccumulator >= 0.2) {
    updateCameraInfo()
    infoUpdateAccumulator = 0
  }
}

// Start animation using shared scene setup
sceneSetup.start(customAnimation)
updateCameraInfo()

console.log('Camera Example loaded! 📷')
console.log('- Try different camera positions and animations')
console.log('- Switch between perspective and orthographic cameras')
console.log('- DualCameraControls keeps the view consistent between modes')
console.log('- Watch the real-time camera info updates')
