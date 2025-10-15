import * as THREE from 'three'
import { AssetLoader } from '@tonybfox/threejs-asset-loader'
import { SceneSetup, ObjectFactory, UIHelpers } from '../shared/utils.js'

// Scene setup using shared utilities
const sceneSetup = new SceneSetup({
  backgroundColor: 0x0f172a,
  cameraPosition: [10, 10, 10],
  enableShadows: true,
  enableControls: true,
  antialias: true,
})

const { scene, camera, renderer, controls } = sceneSetup

// Add ground plane
sceneSetup.addGround(20, 0x1e293b)

// Add some reference objects
const refCube = ObjectFactory.createBox([1, 1, 1], 0x3b82f6, [-5, 0.5, 0])
scene.add(refCube)

const refSphere = ObjectFactory.createSphere(0.5, 0xef4444, [5, 0.5, 0])
scene.add(refSphere)

// Create asset loaders for demonstration
const assetLoader = new AssetLoader()
let currentPlaceholder = null
let previewAsset = null
const loadedAssets = new Set()
let latestAsset = null
const pendingAssetUpdates = []

const getPendingPlacement = () => pendingAssetUpdates[0] || null

// Progress tracking
let progressInfo = {
  loaded: 0,
  total: 0,
  percentage: 0,
}

// Listen to asset loader events
assetLoader.addEventListener('placeholderCreated', (event) => {
  console.log('Placeholder created')
  if (currentPlaceholder) {
    scene.remove(currentPlaceholder)
  }
  currentPlaceholder = event.placeholder
  const pending = getPendingPlacement()
  if (pending) {
    placeAtBottomCenter(currentPlaceholder, pending.position)
  }
  scene.add(currentPlaceholder)
})

assetLoader.addEventListener('progress', (event) => {
  progressInfo = event
  console.log(`Loading progress: ${event.percentage.toFixed(2)}%`)
  updateProgressUI()
})

assetLoader.addEventListener('lowResLoaded', (event) => {
  console.log('Low-res model loaded')
  if (previewAsset) {
    scene.remove(previewAsset)
  }
  previewAsset = event.lowRes
  const pending = getPendingPlacement()
  if (pending) {
    placeAtBottomCenter(previewAsset, pending.position)
  }
  scene.add(previewAsset)
  latestAsset = previewAsset
})

assetLoader.addEventListener('loaded', (event) => {
  console.log('Asset loaded successfully')
  if (previewAsset && previewAsset !== event.asset) {
    scene.remove(previewAsset)
    previewAsset = null
  }
  const asset = event.asset
  loadedAssets.add(asset)
  const pending = pendingAssetUpdates.shift()
  if (pending) {
    placeAtBottomCenter(asset, pending.position)
  }
  scene.add(asset)
  latestAsset = asset

  // Remove placeholder after loading
  if (currentPlaceholder) {
    scene.remove(currentPlaceholder)
    currentPlaceholder = null
  }

  if (pending && pending.onLoad) {
    pending.onLoad(asset)
  } else {
    updateStatusUI('Asset loaded successfully!')
  }
  updateCacheInfo()
})

assetLoader.addEventListener('error', (event) => {
  console.error('Error loading asset:', event.error)
  updateStatusUI(`Error: ${event.error.message}`)

  // Keep the placeholder visible in error state - don't remove it
  // The placeholder should now be showing the error visual feedback
})

// Create UI controls
const controlPanel = UIHelpers.createControlPanel('📦 Asset Loader Controls')

// Status display
const statusDiv = document.createElement('div')
statusDiv.style.cssText = `
  margin: 15px 0;
  padding: 10px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 6px;
  font-size: 14px;
  min-height: 20px;
`
statusDiv.textContent = 'Ready to load assets'
controlPanel.appendChild(statusDiv)

// Progress bar
const progressContainer = document.createElement('div')
progressContainer.style.cssText = `
  margin: 15px 0;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  height: 20px;
  overflow: hidden;
`
const progressBar = document.createElement('div')
progressBar.style.cssText = `
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #3b82f6, #06b6d4);
  transition: width 0.3s ease;
`
progressContainer.appendChild(progressBar)
controlPanel.appendChild(progressContainer)

const progressText = document.createElement('div')
progressText.style.cssText = `
  margin: 5px 0 15px 0;
  font-size: 12px;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
`
progressText.textContent = '0%'
controlPanel.appendChild(progressText)

function updateProgressUI() {
  progressBar.style.width = `${progressInfo.percentage}%`
  progressText.textContent = `${progressInfo.percentage.toFixed(1)}% (${(progressInfo.loaded / 1024 / 1024).toFixed(2)}MB / ${(progressInfo.total / 1024 / 1024).toFixed(2)}MB)`
}

function updateStatusUI(message) {
  statusDiv.textContent = message
}

function placeAtBottomCenter(object, position) {
  const offsetData = object.userData.bottomCenterOffset
  if (offsetData) {
    const offset =
      offsetData instanceof THREE.Vector3
        ? offsetData
        : new THREE.Vector3(
            offsetData.x ?? 0,
            offsetData.y ?? 0,
            offsetData.z ?? 0
          )

    if (!(offsetData instanceof THREE.Vector3)) {
      object.userData.bottomCenterOffset = offset
    }

    object.position.set(
      position.x - offset.x,
      position.y - offset.y,
      position.z - offset.z
    )
  } else {
    object.position.copy(position)
  }

  object.updateMatrixWorld(true)
}

// Placeholder demo section
const placeholderSection = document.createElement('div')
placeholderSection.style.cssText =
  'margin: 20px 0; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);'
const placeholderTitle = document.createElement('div')
placeholderTitle.textContent = 'Placeholder Demo'
placeholderTitle.style.cssText =
  'font-weight: bold; margin-bottom: 10px; color: #3b82f6;'
placeholderSection.appendChild(placeholderTitle)

// Size controls for placeholder
const sizeLabel = document.createElement('div')
sizeLabel.textContent = 'Placeholder Size:'
sizeLabel.style.cssText = 'font-size: 12px; margin: 10px 0 5px 0;'
placeholderSection.appendChild(sizeLabel)

const sizeSlider = UIHelpers.createSlider(
  1,
  10,
  3,
  (value) => {
    currentPlaceholderSize = parseFloat(value)
  },
  'Size'
)
placeholderSection.appendChild(sizeSlider)

let currentPlaceholderSize = 3

// Create placeholder button
const createPlaceholderBtn = UIHelpers.createButton(
  'Create Placeholder',
  () => {
    if (currentPlaceholder) {
      scene.remove(currentPlaceholder)
    }

    const placeholder = assetLoader['createPlaceholder'](
      [currentPlaceholderSize, currentPlaceholderSize, currentPlaceholderSize],
      0x4fc3f7,
      1
    )
    currentPlaceholder = placeholder
    scene.add(currentPlaceholder)
    updateStatusUI('Placeholder created')
  },
  'primary'
)
placeholderSection.appendChild(createPlaceholderBtn)

// Animate placeholder fill button
let fillAnimation = null
const animateFillBtn = UIHelpers.createButton(
  'Animate Fill',
  () => {
    if (!currentPlaceholder) {
      updateStatusUI('Create a placeholder first!')
      return
    }

    if (fillAnimation) {
      cancelAnimationFrame(fillAnimation)
      fillAnimation = null
      animateFillBtn.textContent = 'Animate Fill'
      return
    }

    animateFillBtn.textContent = 'Stop Animation'
    let progress = 0

    const animate = () => {
      progress += 0.005
      if (progress > 1) progress = 0

      if (currentPlaceholder && currentPlaceholder instanceof THREE.Mesh) {
        const material = currentPlaceholder.material
        if (material.uniforms && material.uniforms.fillProgress) {
          material.uniforms.fillProgress.value = progress
        }
      }

      fillAnimation = requestAnimationFrame(animate)
    }
    animate()
  },
  'secondary'
)
placeholderSection.appendChild(animateFillBtn)

controlPanel.appendChild(placeholderSection)

// Model type selection
const modelSection = document.createElement('div')
modelSection.style.cssText =
  'margin: 20px 0; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);'
const modelTitle = document.createElement('div')
modelTitle.textContent = 'Model Type Demo'
modelTitle.style.cssText =
  'font-weight: bold; margin-bottom: 10px; color: #10b981;'
modelSection.appendChild(modelTitle)

const modelTypeInfo = document.createElement('div')
modelTypeInfo.style.cssText =
  'font-size: 12px; margin: 10px 0; color: rgba(255,255,255,0.6);'
modelTypeInfo.innerHTML = `
  <strong>Supported formats:</strong><br>
  • GLTF (.gltf, .glb)<br>
  • FBX (.fbx)<br>
  • OBJ (.obj)
`
modelSection.appendChild(modelTypeInfo)

const urlInfo = document.createElement('div')
urlInfo.style.cssText =
  'font-size: 11px; margin: 15px 0; padding: 10px; background: rgba(239, 68, 68, 0.1); border-radius: 4px; color: rgba(255,255,255,0.7);'
urlInfo.innerHTML = `
  <strong>Note:</strong> To test with actual models, you'll need to provide URLs to 3D model files. 
  The loader supports progress tracking, caching, and placeholder display while loading.
`
modelSection.appendChild(urlInfo)

const loadRandomBtn = UIHelpers.createButton(
  'Load GLTF at Random Position',
  async () => {
    const randomX = (Math.random() - 0.5) * 20
    const randomZ = (Math.random() - 0.5) * 20
    updateStatusUI('Loading GLTF asset...')

    const placementHandler = (asset) => {
      latestAsset = asset
      updateStatusUI(
        `Asset loaded at X: ${randomX.toFixed(1)}, Z: ${randomZ.toFixed(1)}`
      )
    }
    const pendingPlacement = {
      position: new THREE.Vector3(randomX, 0, randomZ),
      onLoad: placementHandler,
    }
    pendingAssetUpdates.push(pendingPlacement)

    try {
      await assetLoader.load({
        type: 'gltf',
        url: 'https://visualconfig-dev.s3.eu-west-2.amazonaws.com/uploads/123e4567-e89b-12d3-a456-426614174003/a682a3c5-98bf-43b2-8993-a100f9d89c63.gltf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAUS2U3PEFAUHF2QNI%2F20251008%2Feu-west-2%2Fs3%2Faws4_request&X-Amz-Date=20251008T231453Z&X-Amz-Expires=3600&X-Amz-Signature=7e06d67998ccf950538168d742a90cff1e02f4ce931d7884e90be88dbd3a4ea8&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject',
        size: [10, 3, 10],
        enableCaching: true,
      })
    } catch (error) {
      const index = pendingAssetUpdates.indexOf(pendingPlacement)
      if (index >= 0) {
        pendingAssetUpdates.splice(index, 1)
      }
      console.error('Error loading asset:', error)
      updateStatusUI(`Error: ${error.message}`)
    }
  },
  'primary'
)
modelSection.appendChild(loadRandomBtn)

// Test error state button
const testErrorBtn = UIHelpers.createButton(
  'Test Error State',
  async () => {
    const randomX = (Math.random() - 0.5) * 20
    const randomZ = (Math.random() - 0.5) * 20
    updateStatusUI('Testing error state...')

    const placementHandler = (asset) => {
      // This won't be called on error
    }
    const pendingPlacement = {
      position: new THREE.Vector3(randomX, 0, randomZ),
      onLoad: placementHandler,
    }
    pendingAssetUpdates.push(pendingPlacement)

    try {
      await assetLoader.load({
        type: 'gltf',
        url: 'https://invalid-url-that-does-not-exist.com/nonexistent.gltf',
        size: [3, 3, 3],
        enableCaching: false,
        errorColor: 0xff4444, // Red color for error
        errorOpacity: 0.6,
      })
    } catch (error) {
      const index = pendingAssetUpdates.indexOf(pendingPlacement)
      if (index >= 0) {
        pendingAssetUpdates.splice(index, 1)
      }
      console.log('Error state demonstration - this is expected!')
      updateStatusUI(`Error state demonstrated: ${error.message}`)
    }
  },
  'danger'
)
modelSection.appendChild(testErrorBtn)

controlPanel.appendChild(modelSection)

// Cache controls
const cacheSection = document.createElement('div')
cacheSection.style.cssText =
  'margin: 20px 0; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);'
const cacheTitle = document.createElement('div')
cacheTitle.textContent = 'Cache Management'
cacheTitle.style.cssText =
  'font-weight: bold; margin-bottom: 10px; color: #f59e0b;'
cacheSection.appendChild(cacheTitle)

const cacheInfo = document.createElement('div')
cacheInfo.style.cssText =
  'font-size: 12px; margin: 10px 0; color: rgba(255,255,255,0.6);'
cacheInfo.textContent = 'Cache size: 0 items'
cacheSection.appendChild(cacheInfo)

const updateCacheInfo = () => {
  cacheInfo.textContent = `Cache size: ${assetLoader.getCacheSize()} items`
}

const clearCacheBtn = UIHelpers.createButton(
  'Clear Cache',
  () => {
    assetLoader.clearCache()
    updateCacheInfo()
    updateStatusUI('Cache cleared')
  },
  'secondary'
)
cacheSection.appendChild(clearCacheBtn)

controlPanel.appendChild(cacheSection)

// Clear scene button
const clearSceneBtn = UIHelpers.createButton(
  'Clear Scene',
  () => {
    if (currentPlaceholder) {
      scene.remove(currentPlaceholder)
      currentPlaceholder = null
    }
    if (previewAsset) {
      scene.remove(previewAsset)
      previewAsset = null
    }
    loadedAssets.forEach((asset) => {
      scene.remove(asset)
    })
    loadedAssets.clear()
    latestAsset = null
    pendingAssetUpdates.length = 0
    if (fillAnimation) {
      cancelAnimationFrame(fillAnimation)
      fillAnimation = null
      animateFillBtn.textContent = 'Animate Fill'
    }
    progressBar.style.width = '0%'
    progressText.textContent = '0%'
    updateStatusUI('Scene cleared')
  },
  'danger'
)
controlPanel.appendChild(clearSceneBtn)

// Custom animation function
function customAnimation(deltaTime) {
  // Rotate reference objects
  refCube.rotation.x += 0.01
  refCube.rotation.y += 0.01

  refSphere.position.y = 0.5 + Math.sin(Date.now() * 0.001) * 0.3

  // Rotate loaded asset if present
  if (latestAsset) {
    // latestAsset.rotation.y += 0.005
  }

  // Rotate placeholder if present
  if (currentPlaceholder) {
    // currentPlaceholder.rotation.y += 0.01
  }

  // Update placeholder animation (for error state pulsing effect)
  assetLoader.updatePlaceholderAnimation(deltaTime || 0.016)
}

// Start animation using shared scene setup
sceneSetup.start(customAnimation)

console.log('Asset Loader Example loaded! 📦')
console.log('Features:')
console.log('- Placeholder with shader fill effect')
console.log('- Progress tracking with events')
console.log('- Support for GLTF, FBX, and OBJ formats')
console.log('- Asset caching system')
console.log('- Optional low-res model loading')
console.log('')
console.log('Usage:')
console.log('1. Create a placeholder to see the loading indicator')
console.log('2. Animate the fill effect to simulate loading progress')
console.log('3. Use the "Load GLTF at Random Position" button to spawn assets')
console.log('')
console.log('Example code:')
console.log(`
const loader = new AssetLoader()
await loader.load({
  type: 'gltf',
  url: '/path/to/model.gltf',
  size: [3, 3, 3], // Optional placeholder size
  lowResUrl: '/path/to/lowres.gltf', // Optional low-res version
  enableCaching: true
})
`)
