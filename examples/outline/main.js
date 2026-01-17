import * as THREE from 'three'
import { OutlineTool } from '@tonybfox/threejs-tools'
import { SceneSetup, ObjectFactory, UIHelpers } from '../shared/utils.js'

// Scene setup
const sceneSetup = new SceneSetup({
  backgroundColor: 0x0f172a,
  cameraPosition: [8, 6, 8],
  enableShadows: true,
  enableControls: true,
  antialias: true,
})

const { scene, camera, renderer } = sceneSetup

// Add ground
sceneSetup.addGround(20, 0x1e293b)

// Create outline tool
const outlineTool = new OutlineTool(renderer, {
  outlineColor: 0xff0000,
  edgeLineWidth: 2,
  edgeLineColor: 0xff0000,
  edgeThreshold: 45, // Higher threshold = fewer edges detected (better for smooth surfaces)
  outlineScale: 1.02,
  enableEdgeLines: true, // Show both edge lines and silhouette
  enableSilhouette: true,
})

// Create various objects
const cube = ObjectFactory.createBox([1.5, 1.5, 1.5], 0x3b82f6, [-3, 0.75, 0])
scene.add(cube)

const sphere = ObjectFactory.createSphere(0.8, 0xef4444, [0, 0.8, 0])
scene.add(sphere)

const torus = new THREE.Mesh(
  new THREE.TorusKnotGeometry(0.6, 0.2, 100, 16),
  new THREE.MeshStandardMaterial({ color: 0x10b981 })
)
torus.position.set(3, 1, 0)
torus.castShadow = true
scene.add(torus)

// Create a group with multiple objects
const group = new THREE.Group()
const groupBox1 = ObjectFactory.createBox([0.5, 0.5, 0.5], 0xfbbf24, [0, 0, 0])
const groupBox2 = ObjectFactory.createBox([0.5, 0.5, 0.5], 0xa855f7, [1, 0, 0])
group.add(groupBox1, groupBox2)
group.position.set(-3, 0.25, -3)
scene.add(group)

// Add a helper that should be excluded (GridHelper is auto-excluded)
const axesHelper = new THREE.AxesHelper(5)
scene.add(axesHelper)

// Track outlined objects
const outlinedObjects = new Set()

// UI Controls
const controlPanel = UIHelpers.createControlPanel('🎨 Outline Tool Controls')

// Outline color picker
const colorSection = UIHelpers.createSection('Colors')
const outlineColorInput = document.createElement('input')
outlineColorInput.type = 'color'
outlineColorInput.value = '#ff0000'
outlineColorInput.style.cssText =
  'width: 100%; height: 40px; cursor: pointer; margin: 10px 0;'
outlineColorInput.addEventListener('input', (e) => {
  const hex = parseInt(e.target.value.slice(1), 16)
  outlineTool.setOptions({ outlineColor: hex, edgeLineColor: hex })
})
const colorLabel = document.createElement('label')
colorLabel.textContent = 'Outline Color'
colorLabel.style.display = 'block'
colorLabel.style.marginBottom = '5px'
colorSection.appendChild(colorLabel)
colorSection.appendChild(outlineColorInput)
controlPanel.appendChild(colorSection)

// Line width slider
const widthSlider = UIHelpers.createSlider(
  1,
  10,
  2,
  (value) => {
    outlineTool.setOptions({ edgeLineWidth: parseFloat(value) })
  },
  'Edge Line Width'
)
controlPanel.appendChild(widthSlider)

// Edge threshold slider
const thresholdSlider = UIHelpers.createSlider(
  0,
  90,
  30,
  (value) => {
    outlineTool.setOptions({ edgeThreshold: parseFloat(value) })
  },
  'Edge Threshold (degrees)'
)
controlPanel.appendChild(thresholdSlider)

// Outline scale slider
const scaleSlider = UIHelpers.createSlider(
  1.01,
  1.1,
  1.02,
  (value) => {
    outlineTool.setOptions({ outlineScale: parseFloat(value) })
  },
  'Outline Scale',
  0.01
)
controlPanel.appendChild(scaleSlider)

// Toggle options
const toggleSection = UIHelpers.createSection('Toggle Features', {
  marginTop: '20px',
})

const silhouetteToggle = UIHelpers.createToggle(
  'Silhouette Outline',
  true,
  (enabled) => {
    outlineTool.setOptions({ enableSilhouette: enabled })
  }
)
toggleSection.appendChild(silhouetteToggle)

const edgeLinesToggle = UIHelpers.createToggle(
  'Edge Lines',
  true,
  (enabled) => {
    outlineTool.setOptions({ enableEdgeLines: enabled })
  }
)
toggleSection.appendChild(edgeLinesToggle)

controlPanel.appendChild(toggleSection)

// Object controls
const objectSection = UIHelpers.createSection('Add/Remove Outlines', {
  marginTop: '20px',
})

const cubeBtn = UIHelpers.createButton(
  'Toggle Cube',
  () => {
    if (outlinedObjects.has(cube)) {
      outlineTool.removeObject(cube)
      outlinedObjects.delete(cube)
      cubeBtn.style.opacity = '0.5'
    } else {
      outlineTool.addObject(cube)
      outlinedObjects.add(cube)
      cubeBtn.style.opacity = '1'
    }
  },
  'secondary'
)
objectSection.appendChild(cubeBtn)

const sphereBtn = UIHelpers.createButton(
  'Toggle Sphere',
  () => {
    if (outlinedObjects.has(sphere)) {
      outlineTool.removeObject(sphere)
      outlinedObjects.delete(sphere)
      sphereBtn.style.opacity = '0.5'
    } else {
      outlineTool.addObject(sphere)
      outlinedObjects.add(sphere)
      sphereBtn.style.opacity = '1'
    }
  },
  'secondary'
)
objectSection.appendChild(sphereBtn)

const torusBtn = UIHelpers.createButton(
  'Toggle Torus',
  () => {
    if (outlinedObjects.has(torus)) {
      outlineTool.removeObject(torus)
      outlinedObjects.delete(torus)
      torusBtn.style.opacity = '0.5'
    } else {
      outlineTool.addObject(torus)
      outlinedObjects.add(torus)
      torusBtn.style.opacity = '1'
    }
  },
  'secondary'
)
objectSection.appendChild(torusBtn)

const groupBtn = UIHelpers.createButton(
  'Toggle Group',
  () => {
    if (outlinedObjects.has(group)) {
      outlineTool.removeObject(group)
      outlinedObjects.delete(group)
      groupBtn.style.opacity = '0.5'
    } else {
      outlineTool.addObject(group)
      outlinedObjects.add(group)
      groupBtn.style.opacity = '1'
    }
  },
  'secondary'
)
objectSection.appendChild(groupBtn)

controlPanel.appendChild(objectSection)

// Bulk actions
const bulkSection = UIHelpers.createSection('Bulk Actions', {
  marginTop: '20px',
})

const addAllBtn = UIHelpers.createButton(
  'Add All',
  () => {
    const objects = [cube, sphere, torus, group]
    outlineTool.addObjects(objects)
    objects.forEach((obj) => outlinedObjects.add(obj))
    cubeBtn.style.opacity = '1'
    sphereBtn.style.opacity = '1'
    torusBtn.style.opacity = '1'
    groupBtn.style.opacity = '1'
  },
  'primary'
)
bulkSection.appendChild(addAllBtn)

const removeAllBtn = UIHelpers.createButton(
  'Remove All',
  () => {
    outlineTool.clearAll()
    outlinedObjects.clear()
    cubeBtn.style.opacity = '0.5'
    sphereBtn.style.opacity = '0.5'
    torusBtn.style.opacity = '0.5'
    groupBtn.style.opacity = '0.5'
  },
  'danger'
)
bulkSection.appendChild(removeAllBtn)

controlPanel.appendChild(bulkSection)

// Info section
const infoDiv = UIHelpers.createTextDisplay(
  `<strong>Features:</strong><br>
  • Click toggles to add/remove outlines<br>
  • Objects animate automatically<br>
  • Outlines update in real-time<br>
  • Helpers (axes) are auto-excluded`,
  {
    fontSize: '12px',
    margin: '20px 0 10px 0',
    color: 'rgba(255,255,255,0.6)',
  }
)
controlPanel.appendChild(infoDiv)

// Animation
function customAnimation() {
  // Rotate objects
  cube.rotation.x += 0.01
  cube.rotation.y += 0.01

  sphere.position.y = 0.8 + Math.sin(Date.now() * 0.001) * 0.3

  torus.rotation.x += 0.02
  torus.rotation.y += 0.01

  group.rotation.y += 0.02

  // Update outlines to follow transforms
  outlineTool.update()
}

// Start
sceneSetup.start(customAnimation)
