import * as THREE from 'three'
import { SceneSetup } from '../shared/utils.js'
import { CompassOverlay } from '@tonybfox/threejs-compass'

// Global variables for the demo
let compass
let moveState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
}

const moveSpeed = 0.1

const sceneSetup = new SceneSetup({
  backgroundColor: 0x101826,
  cameraPosition: [4, 2, 4],
  enableShadows: true,
  enableControls: true,
  antialias: true,
})

const { scene, camera, renderer, controls } = sceneSetup

// Create renderer

// Add some lights
const ambientLight = new THREE.AmbientLight(0x404040, 0.3)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
directionalLight.position.set(10, 10, 5)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.width = 2048
directionalLight.shadow.mapSize.height = 2048
scene.add(directionalLight)

// Create a ground plane
const groundGeometry = new THREE.PlaneGeometry(100, 100)
const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 })
const ground = new THREE.Mesh(groundGeometry, groundMaterial)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// Add a grid to show orientation
const gridHelper = new THREE.GridHelper(100, 50, 0x666666, 0x444444)
scene.add(gridHelper)

// Add some reference objects to show direction
// Red cube at negative Z (north)
const northCube = new THREE.Mesh(
  new THREE.BoxGeometry(2, 2, 2),
  new THREE.MeshLambertMaterial({ color: 0xff0000 })
)
northCube.position.set(0, 1, -10)
northCube.castShadow = true
scene.add(northCube)

// Green cube at negative X (east)
const eastCube = new THREE.Mesh(
  new THREE.BoxGeometry(2, 2, 2),
  new THREE.MeshLambertMaterial({ color: 0x00ff00 })
)
eastCube.position.set(-10, 1, 0)
eastCube.castShadow = true
scene.add(eastCube)

// Blue cube at positive Z (south)
const southCube = new THREE.Mesh(
  new THREE.BoxGeometry(2, 2, 2),
  new THREE.MeshLambertMaterial({ color: 0x0000ff })
)
southCube.position.set(0, 1, 10)
southCube.castShadow = true
scene.add(southCube)

// Yellow cube at positive X (west)
const westCube = new THREE.Mesh(
  new THREE.BoxGeometry(2, 2, 2),
  new THREE.MeshLambertMaterial({ color: 0xffff00 })
)
westCube.position.set(10, 1, 0)
westCube.castShadow = true
scene.add(westCube)

// Add text labels (using sprites)
addTextLabel('N (Z-)', new THREE.Vector3(0, 3, -10), 0xff0000)
addTextLabel('E (X-)', new THREE.Vector3(-10, 3, 0), 0x00ff00)
addTextLabel('S (Z+)', new THREE.Vector3(0, 3, 10), 0x0000ff)
addTextLabel('W (X+)', new THREE.Vector3(10, 3, 0), 0xffff00)

// Create compass overlay
compass = new CompassOverlay(camera, {
  size: 80,
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

// Start the compass
compass.start()

// Add event listener for compass double-click to reset camera to north
compass.addEventListener('resetToNorth', () => {
  // controls
  const cameraPos = camera.position.clone()

  // force look direction to world -Z (0, 0, -1) from current position
  const lookAt = new THREE.Vector3(cameraPos.x, cameraPos.y, cameraPos.z - 1)

  controls.target.copy(lookAt)
  controls.update()
})

// Handle window resize
window.addEventListener('resize', onWindowResize)

// Start render loop
animate()

function addTextLabel(text, position, color) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  canvas.width = 128
  canvas.height = 64

  context.fillStyle = `#${color.toString(16).padStart(6, '0')}`
  context.font = '16px Arial'
  context.textAlign = 'center'
  context.fillText(text, 64, 32)

  const texture = new THREE.CanvasTexture(canvas)
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture })
  const sprite = new THREE.Sprite(spriteMaterial)
  sprite.position.copy(position)
  sprite.scale.set(4, 2, 1)
  scene.add(sprite)
}

function animate() {
  requestAnimationFrame(animate)

  renderer.render(scene, camera)
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

// Global functions for UI controls
window.toggleCompass = function () {
  if (compass.isActive) {
    compass.stop()
  } else {
    compass.start()
  }
}

window.setCompassSize = function (size) {
  compass.setSize(size)
}

window.setCompassPosition = function (position) {
  compass.setPosition(position)
}
