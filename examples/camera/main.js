import * as THREE from 'three'
import { DualCameraControls } from '@tonybfox/threejs-tools'
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

// Create an external camera for demonstration
const externalCamera = new THREE.PerspectiveCamera(
  90, // Wide FOV
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
externalCamera.position.set(0, 15, 0.1)
externalCamera.lookAt(0, 0, 0)

const origin = new THREE.Vector3()
const reusableEuler = new THREE.Euler()

// Camera controls & dual camera support
const cameraControls = new DualCameraControls(renderer, {
  /*
  initialTarget: [0, 0, 0],
  perspective: {
    position: [10, 10, 10],
    fov: 60,
  },
  orthographic: {
    size: 20,
  },
  */
})

cameraControls.smoothTime = 0.5
camera = cameraControls.activeCamera
updateCamera(camera)

cameraControls.addEventListener('update', (event) => {
  updateCameraInfo()
})

cameraControls.addEventListener('modechange', (event) => {
  camera = event.camera
  updateCamera(event.camera)
  updateCameraInfo()
})

cameraControls.addEventListener('externalcamerachange', (event) => {
  camera = event.camera
  updateCamera(event.camera)
  updateCameraInfo()
})

window.addEventListener('resize', () => {
  cameraControls.handleResize(window.innerWidth, window.innerHeight)
  camera = cameraControls.activeCamera
})

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
    moveCameraTo(new THREE.Vector3(0, 5, 15))
  },
  'primary'
)
controlPanel.appendChild(frontViewBtn)

const sideViewBtn = UIHelpers.createButton(
  'Side View',
  () => {
    moveCameraTo(new THREE.Vector3(15, 5, 0))
  },
  'primary'
)
controlPanel.appendChild(sideViewBtn)

const topViewBtn = UIHelpers.createButton(
  'Top View',
  () => {
    moveCameraTo(new THREE.Vector3(0, 20, 0.1))
  },
  'primary'
)
controlPanel.appendChild(topViewBtn)

const isometricBtn = UIHelpers.createButton(
  'Isometric View',
  () => {
    moveCameraTo(new THREE.Vector3(10, 10, 10))
  },
  'primary'
)
controlPanel.appendChild(isometricBtn)

const focusBtn = UIHelpers.createButton(
  'Focus on Cube',
  () => {
    const focusOffset = cube.position.clone().add(new THREE.Vector3(0, 5, 8))
    moveCameraTo(focusOffset, cube.position)
  },
  'secondary'
)
controlPanel.appendChild(focusBtn)

const moveTargetBtn = UIHelpers.createButton(
  'Move Target',
  () => {
    const target = new THREE.Vector3(3, 0, 3)
    moveCameraTo(cameraControls.activeCamera.position, target)
  },
  'secondary'
)
controlPanel.appendChild(moveTargetBtn)

const resetBtn = UIHelpers.createButton(
  'Reset Camera',
  () => {
    moveCameraTo(new THREE.Vector3(10, 10, 10))
  },
  'secondary'
)
controlPanel.appendChild(resetBtn)

// Camera Type buttons
const perspectiveBtn = UIHelpers.createButton(
  'Perspective',
  () => {
    cameraControls.switchToPerspective()
    updateCameraInfo()
  },
  'success'
)
controlPanel.appendChild(perspectiveBtn)

const orthographicBtn = UIHelpers.createButton(
  'Orthographic',
  () => {
    cameraControls.switchToOrthographic()
    updateCameraInfo()
  },
  'success'
)
controlPanel.appendChild(orthographicBtn)

// External Camera buttons
const externalCameraBtn = UIHelpers.createButton(
  'Use External Camera',
  () => {
    // Update external camera position for a top-down wide view
    externalCamera.position.set(0, 15, 0.1)
    cameraControls.setCamera(externalCamera, [0, 0, 0], true)
    updateCameraInfo()
  },
  'warning'
)
controlPanel.appendChild(externalCameraBtn)

const clearExternalBtn = UIHelpers.createButton(
  'Clear External Camera',
  () => {
    cameraControls.clearExternalCamera(true)
    updateCameraInfo()
  },
  'warning'
)
controlPanel.appendChild(clearExternalBtn)

// Create camera info panel
const cameraInfoPanel = UIHelpers.createControlPanel(
  'Camera Info',
  'bottom-right'
)
cameraInfoPanel.style.fontFamily = 'monospace'
cameraInfoPanel.style.fontSize = '12px'

const cameraPositionDiv = UIHelpers.createTextDisplay('')
const cameraRotationDiv = UIHelpers.createTextDisplay('')
const cameraTypeDiv = UIHelpers.createTextDisplay('')
const externalCameraDiv = UIHelpers.createTextDisplay('')

cameraInfoPanel.appendChild(cameraPositionDiv)
cameraInfoPanel.appendChild(cameraRotationDiv)
cameraInfoPanel.appendChild(cameraTypeDiv)
cameraInfoPanel.appendChild(externalCameraDiv)

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
  externalCameraDiv.textContent = `External: ${
    cameraControls.isUsingExternalCamera ? 'Yes' : 'No'
  }`
}

let infoUpdateAccumulator = 0

function customAnimation() {
  cameraControls.updateDelta()

  // Rotate objects for visual interest
  cube.rotation.x += 0.005
  cube.rotation.y += 0.01

  sphere.rotation.x += 0.01
  cylinder.rotation.y += 0.005
}

// Start animation using shared scene setup
sceneSetup.start(customAnimation)
updateCameraInfo()

console.log('Camera Example loaded! 📷')
console.log('- Try different camera positions and animations')
console.log('- Switch between perspective and orthographic cameras')
console.log('- DualCameraControls keeps the view consistent between modes')
console.log('- Use an external camera with setCamera()')
console.log('- Watch the real-time camera info updates')
