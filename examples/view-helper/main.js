import * as THREE from 'three'
import { ViewHelper } from '@tonybfox/threejs-tools'
import {
  SceneSetup,
  ObjectFactory,
  UIHelpers,
  PerformanceMonitor,
} from '../shared/utils.js'

// Global variables
let viewHelper, clock
let performanceMonitor

// Animation state
let animationId

const sceneSetup = new SceneSetup({
  backgroundColor: 0x1a1a1a,
  cameraPosition: [5, 5, 5],
  enableShadows: true,
  enableControls: true,
  antialias: true,
})

const { scene, camera, renderer, controls } = sceneSetup

const group = new THREE.Group()

// Add a ground plane using SceneSetup utility
sceneSetup.addGround(10, 0x444444)

// Add some cubes at different positions using ObjectFactory
const cube1 = ObjectFactory.createBox([1, 1, 1], 0x66aaff, [-2, 0.5, -2])
cube1.castShadow = true
group.add(cube1)

const cube2 = ObjectFactory.createBox([1, 1, 1], 0x66aaff, [2, 0.5, 2])
cube2.castShadow = true
group.add(cube2)

const cube3 = ObjectFactory.createBox([1, 1, 1], 0x66aaff, [-2, 0.5, 2])
cube3.castShadow = true
group.add(cube3)

scene.add(group)

function init() {
  // Create scene setup with shared utilities

  clock = new THREE.Clock()

  // Create performance monitor
  // performanceMonitor = new PerformanceMonitor(scene, renderer)

  // Create view helper
  viewHelper = new ViewHelper(camera, renderer.domElement, {
    size: 128,
    position: 'bottom-right',
    offset: { x: 20, y: 20 },
    center: new THREE.Vector3(0, 0, 0),
    controls,
  })

  // Add event listeners for view helper
  viewHelper.addEventListener('animationStart', () => {
    console.log('View helper animation started')
  })

  viewHelper.addEventListener('animationEnd', () => {
    console.log('View helper animation ended')
  })

  // Setup controls
  setupControls()

  // Start animation loop
  animate()
}

function setupControls() {
  const controlPanel = UIHelpers.createControlPanel(
    '🎛️ View Helper Controls',
    'top-left'
  )

  // Position control
  const positionSelect = UIHelpers.createSelect(
    [
      { value: 'bottom-right', label: 'Bottom Right' },
      { value: 'bottom-left', label: 'Bottom Left' },
      { value: 'top-right', label: 'Top Right' },
      { value: 'top-left', label: 'Top Left' },
    ],
    'bottom-right',
    (value) => {
      // Recreate view helper with new position
      viewHelper.dispose()
      viewHelper = new ViewHelper(camera, renderer.domElement, {
        size: parseInt(sizeSlider.querySelector('input').value),
        position: value,
        offset: {
          x: parseInt(offsetXSlider.querySelector('input').value),
          y: parseInt(offsetYSlider.querySelector('input').value),
        },
        center: new THREE.Vector3(0, 0, 0),
        labels: { x: 'X', y: 'Y', z: 'Z' },
        colors: {
          x: '#ff4466',
          y: '#88ff44',
          z: '#4488ff',
          background: '#000000',
        },
        controls,
      })
    },
    'Position'
  )
  controlPanel.appendChild(positionSelect)

  // Size control
  const sizeSlider = UIHelpers.createSlider(
    64,
    256,
    128,
    (value) => {
      // Recreate view helper with new size
      viewHelper.dispose()
      viewHelper = new ViewHelper(camera, renderer.domElement, {
        size: parseInt(value),
        position: positionSelect.querySelector('select').value,
        offset: {
          x: parseInt(offsetXSlider.querySelector('input').value),
          y: parseInt(offsetYSlider.querySelector('input').value),
        },
        center: new THREE.Vector3(0, 0, 0),
        labels: { x: 'X', y: 'Y', z: 'Z' },
        colors: {
          x: '#ff4466',
          y: '#88ff44',
          z: '#4488ff',
          background: '#000000',
        },
        controls,
      })
    },
    'Size'
  )
  sizeSlider.querySelector('input').step = '1'
  controlPanel.appendChild(sizeSlider)

  // Offset X control
  const offsetXSlider = UIHelpers.createSlider(
    0,
    100,
    20,
    (value) => {
      // Recreate view helper with new offset
      viewHelper.dispose()
      viewHelper = new ViewHelper(camera, renderer.domElement, {
        size: parseInt(sizeSlider.querySelector('input').value),
        position: positionSelect.querySelector('select').value,
        offset: {
          x: parseInt(value),
          y: parseInt(offsetYSlider.querySelector('input').value),
        },
        center: new THREE.Vector3(0, 0, 0),
        labels: { x: 'X', y: 'Y', z: 'Z' },
        colors: {
          x: '#ff4466',
          y: '#88ff44',
          z: '#4488ff',
          background: '#000000',
        },
        controls,
      })
    },
    'Offset X'
  )
  offsetXSlider.querySelector('input').step = '1'
  controlPanel.appendChild(offsetXSlider)

  // Offset Y control
  const offsetYSlider = UIHelpers.createSlider(
    0,
    100,
    20,
    (value) => {
      // Recreate view helper with new offset
      viewHelper.dispose()
      viewHelper = new ViewHelper(camera, renderer.domElement, {
        size: parseInt(sizeSlider.querySelector('input').value),
        position: positionSelect.querySelector('select').value,
        offset: {
          x: parseInt(offsetXSlider.querySelector('input').value),
          y: parseInt(value),
        },
        center: new THREE.Vector3(0, 0, 0),
        labels: { x: 'X', y: 'Y', z: 'Z' },
        colors: {
          x: '#ff4466',
          y: '#88ff44',
          z: '#4488ff',
          background: '#000000',
        },
        controls,
      })
    },
    'Offset Y'
  )
  offsetYSlider.querySelector('input').step = '1'
  controlPanel.appendChild(offsetYSlider)

  // Reset camera button
  const resetButton = UIHelpers.createButton(
    'Reset Camera',
    () => {
      controls.setPosition(5, 5, 5, true)
      controls.setTarget(0, 0, 0, true)
      controls.update(0)
    },
    'success'
  )
  controlPanel.appendChild(resetButton)
}

function animate() {
  animationId = requestAnimationFrame(animate)

  const delta = clock.getDelta()

  // Update controls
  if (controls) {
    controls.updateDelta()
  }

  // Update view helper
  if (viewHelper) {
    viewHelper.update(delta)
  }

  // Update performance monitor
  //performanceMonitor.update()

  // Render main scene
  renderer.render(scene, camera)

  // Render view helper on top
  if (viewHelper) {
    viewHelper.render(renderer)
  }
}

function cleanup() {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }

  if (viewHelper) {
    viewHelper.dispose()
  }

  // Clean up scene objects
  if (scene) {
    scene.clear()
  }
}

// Handle page visibility change
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
  } else {
    animate()
  }
})

// Handle page unload
window.addEventListener('beforeunload', cleanup)

// Initialize when page loads
init()
