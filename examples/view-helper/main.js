import * as THREE from 'three'
import { ViewHelper } from '@tonybfox/threejs-view-helper'
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
    updateAnimationButton(true)
  })

  viewHelper.addEventListener('animationEnd', () => {
    console.log('View helper animation ended')
    updateAnimationButton(false)
  })

  // Setup controls
  setupControls()

  // Start animation loop
  animate()
}

function setupControls() {
  // Position control
  const positionSelect = document.getElementById('position')
  positionSelect.addEventListener('change', (e) => {
    // Recreate view helper with new position
    viewHelper.dispose()
    viewHelper = new ViewHelper(camera, renderer.domElement, {
      size: parseInt(document.getElementById('size').value),
      position: e.target.value,
      offset: {
        x: parseInt(document.getElementById('offsetX').value),
        y: parseInt(document.getElementById('offsetY').value),
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
    setupViewHelperEvents()
  })

  // Size control
  const sizeSlider = document.getElementById('size')
  const sizeValue = document.getElementById('sizeValue')
  sizeSlider.addEventListener('input', (e) => {
    sizeValue.textContent = e.target.value
    // Recreate view helper with new size
    viewHelper.dispose()
    viewHelper = new ViewHelper(camera, renderer.domElement, {
      size: parseInt(e.target.value),
      position: document.getElementById('position').value,
      offset: {
        x: parseInt(document.getElementById('offsetX').value),
        y: parseInt(document.getElementById('offsetY').value),
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
    setupViewHelperEvents()
  })

  // Offset controls
  const offsetXSlider = document.getElementById('offsetX')
  const offsetXValue = document.getElementById('offsetXValue')
  offsetXSlider.addEventListener('input', (e) => {
    offsetXValue.textContent = e.target.value
    // Recreate view helper with new offset
    viewHelper.dispose()
    viewHelper = new ViewHelper(camera, renderer.domElement, {
      size: parseInt(document.getElementById('size').value),
      position: document.getElementById('position').value,
      offset: {
        x: parseInt(e.target.value),
        y: parseInt(document.getElementById('offsetY').value),
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
    setupViewHelperEvents()
  })

  const offsetYSlider = document.getElementById('offsetY')
  const offsetYValue = document.getElementById('offsetYValue')
  offsetYSlider.addEventListener('input', (e) => {
    offsetYValue.textContent = e.target.value
    // Recreate view helper with new offset
    viewHelper.dispose()
    viewHelper = new ViewHelper(camera, renderer.domElement, {
      size: parseInt(document.getElementById('size').value),
      position: document.getElementById('position').value,
      offset: {
        x: parseInt(document.getElementById('offsetX').value),
        y: parseInt(e.target.value),
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
    setupViewHelperEvents()
  })

  // Reset camera button
  const resetButton = document.getElementById('resetCamera')
  resetButton.addEventListener('click', () => {
    controls.setPosition(5, 5, 5, true)
    controls.setTarget(0, 0, 0, true)
    controls.update(0)
  })

  // Animation toggle button
  const toggleButton = document.getElementById('toggleAnimation')
  toggleButton.addEventListener('click', () => {
    // This would stop view helper animation if it was running
    // For now, we'll just show it's not implemented
    alert('Animation control not yet implemented in this demo')
  })

  setupViewHelperEvents()
}

function setupViewHelperEvents() {
  viewHelper.addEventListener('animationStart', () => {
    updateAnimationButton(true)
  })

  viewHelper.addEventListener('animationEnd', () => {
    updateAnimationButton(false)
  })
}

function updateAnimationButton(isAnimating) {
  const button = document.getElementById('toggleAnimation')
  button.disabled = !isAnimating
  button.textContent = isAnimating ? 'Animating...' : 'Ready'
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
