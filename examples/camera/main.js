import * as THREE from 'three'
import { SceneSetup, ObjectFactory, UIHelpers } from '../shared/utils.js'

// Scene setup using shared utilities
const sceneSetup = new SceneSetup({
  backgroundColor: 0x0f172a,
  cameraPosition: [10, 10, 10],
  enableShadows: true,
  enableControls: true,
  antialias: true,
})

// Access scene, camera, renderer, and controls from sceneSetup
let { scene, camera, renderer, controls } = sceneSetup

// Create a more interesting scene using ObjectFactory
// Ground plane
const ground = sceneSetup.addGround(20, 0x1e293b)

// Main cube (target for camera focus) using ObjectFactory
const cube = ObjectFactory.createBox([2, 2, 2], 0x3b82f6, [0, 1, 0])
scene.add(cube)

// Additional objects for visual context using ObjectFactory
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

// Camera utilities (since the camera package is empty, we'll create our own)
class CameraController {
  constructor(camera, controls, renderer) {
    this.camera = camera
    this.controls = controls
    this.renderer = renderer
    this.isAnimating = false
    this.animationId = null
  }

  animateToPosition(
    targetPosition,
    targetLookAt = new THREE.Vector3(0, 0, 0),
    duration = 1000
  ) {
    if (this.isAnimating) return

    this.isAnimating = true
    const startPosition = this.camera.position.clone()
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Smooth easing function
      const eased = 1 - Math.pow(1 - progress, 3)

      // Interpolate position
      this.camera.position.lerpVectors(startPosition, targetPosition, eased)
      this.camera.lookAt(targetLookAt)
      this.controls.target.copy(targetLookAt)
      this.controls.update()

      if (progress < 1) {
        this.animationId = requestAnimationFrame(animate)
      } else {
        this.isAnimating = false
        this.animationId = null
      }
    }

    animate()
  }

  startOrbitAnimation() {
    if (this.isAnimating) return

    this.isAnimating = true
    const radius = 15
    const speed = 0.005
    let angle = 0

    const animate = () => {
      angle += speed
      this.camera.position.x = Math.cos(angle) * radius
      this.camera.position.z = Math.sin(angle) * radius
      this.camera.position.y = 8
      this.camera.lookAt(0, 0, 0)
      this.controls.target.set(0, 0, 0)
      this.controls.update()

      if (this.isAnimating) {
        this.animationId = requestAnimationFrame(animate)
      }
    }

    animate()
  }

  stopAnimation() {
    this.isAnimating = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  switchToPerspective() {
    const aspect = window.innerWidth / window.innerHeight
    const newCamera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000)
    newCamera.position.copy(this.camera.position)

    this.camera = newCamera
    this.controls.object = newCamera
    this.controls.update()

    return newCamera
  }

  switchToOrthographic() {
    const aspect = window.innerWidth / window.innerHeight
    const size = 10
    const newCamera = new THREE.OrthographicCamera(
      -size * aspect,
      size * aspect,
      size,
      -size,
      0.1,
      1000
    )
    newCamera.position.copy(this.camera.position)

    this.camera = newCamera
    this.controls.object = newCamera
    this.controls.update()

    return newCamera
  }
}

// Initialize camera controller
const cameraController = new CameraController(camera, controls, renderer)

// Create UI using shared utilities
const controlPanel = UIHelpers.createControlPanel('📷 Camera Controls')

// Camera Position buttons
const frontViewBtn = UIHelpers.createButton(
  'Front View',
  () => {
    cameraController.stopAnimation()
    cameraController.animateToPosition(new THREE.Vector3(0, 5, 15))
  },
  'primary'
)
controlPanel.appendChild(frontViewBtn)

const sideViewBtn = UIHelpers.createButton(
  'Side View',
  () => {
    cameraController.stopAnimation()
    cameraController.animateToPosition(new THREE.Vector3(15, 5, 0))
  },
  'primary'
)
controlPanel.appendChild(sideViewBtn)

const topViewBtn = UIHelpers.createButton(
  'Top View',
  () => {
    cameraController.stopAnimation()
    cameraController.animateToPosition(new THREE.Vector3(0, 20, 0.1))
  },
  'primary'
)
controlPanel.appendChild(topViewBtn)

const isometricBtn = UIHelpers.createButton(
  'Isometric View',
  () => {
    cameraController.stopAnimation()
    cameraController.animateToPosition(new THREE.Vector3(10, 10, 10))
  },
  'primary'
)
controlPanel.appendChild(isometricBtn)

// Camera Animation buttons
let isOrbiting = false
const orbitBtn = UIHelpers.createButton(
  'Start Orbit',
  () => {
    if (!isOrbiting) {
      cameraController.startOrbitAnimation()
      orbitBtn.textContent = 'Stop Orbit'
      orbitBtn.style.background = '#ef4444'
      isOrbiting = true
    } else {
      cameraController.stopAnimation()
      orbitBtn.textContent = 'Start Orbit'
      orbitBtn.style.background = '#374151'
      isOrbiting = false
    }
  },
  'secondary'
)
controlPanel.appendChild(orbitBtn)

const focusBtn = UIHelpers.createButton(
  'Focus on Cube',
  () => {
    cameraController.stopAnimation()
    const cubePosition = cube.position.clone()
    cubePosition.y += 5
    cubePosition.z += 8
    cameraController.animateToPosition(cubePosition, cube.position)
  },
  'secondary'
)
controlPanel.appendChild(focusBtn)

const resetBtn = UIHelpers.createButton(
  'Reset Camera',
  () => {
    cameraController.stopAnimation()
    cameraController.animateToPosition(new THREE.Vector3(10, 10, 10))
    if (isOrbiting) {
      orbitBtn.click() // Stop orbiting
    }
  },
  'secondary'
)
controlPanel.appendChild(resetBtn)

// Camera Type buttons
const perspectiveBtn = UIHelpers.createButton(
  'Perspective',
  () => {
    camera = cameraController.switchToPerspective()
    updateCameraInfo()
  },
  'success'
)
controlPanel.appendChild(perspectiveBtn)

const orthographicBtn = UIHelpers.createButton(
  'Orthographic',
  () => {
    camera = cameraController.switchToOrthographic()
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

// Update camera info display
function updateCameraInfo() {
  const pos = camera.position
  const rot = camera.rotation

  cameraPositionDiv.textContent = `Position: (${pos.x.toFixed(
    1
  )}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`
  cameraRotationDiv.textContent = `Rotation: (${(
    (rot.x * 180) /
    Math.PI
  ).toFixed(0)}°, ${((rot.y * 180) / Math.PI).toFixed(0)}°, ${(
    (rot.z * 180) /
    Math.PI
  ).toFixed(0)}°)`
  cameraTypeDiv.textContent = `Type: ${
    camera.isPerspectiveCamera ? 'Perspective' : 'Orthographic'
  }`
}

// Custom animation function
function customAnimation() {
  // Rotate objects for visual interest
  cube.rotation.x += 0.005
  cube.rotation.y += 0.01

  sphere.rotation.x += 0.01
  cylinder.rotation.y += 0.005

  // Update camera info periodically
  if (Math.random() < 0.1) {
    // Update 10% of frames to avoid performance issues
    updateCameraInfo()
  }
}

// Handle window resize for camera switching
window.addEventListener('resize', () => {
  const aspect = window.innerWidth / window.innerHeight

  if (camera.isPerspectiveCamera) {
    camera.aspect = aspect
  } else {
    const size = 10
    camera.left = -size * aspect
    camera.right = size * aspect
  }

  camera.updateProjectionMatrix()
})

// Start animation using shared scene setup
sceneSetup.start(customAnimation)
updateCameraInfo()

console.log('Camera Example loaded! 📷')
console.log('- Try different camera positions and animations')
console.log('- Switch between perspective and orthographic cameras')
console.log('- Use orbit controls to manually navigate the scene')
console.log('- Watch the real-time camera info updates')
