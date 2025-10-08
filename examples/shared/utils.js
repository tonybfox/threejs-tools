import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * Common Three.js scene utilities for examples
 */
export class SceneSetup {
  constructor(options = {}) {
    const {
      backgroundColor = 0x0f0f0f,
      cameraPosition = [10, 10, 10],
      enableShadows = true,
      enableControls = true,
      antialias = true,
    } = options

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(backgroundColor)

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.set(...cameraPosition)

    this.renderer = new THREE.WebGLRenderer({ antialias })
    this.renderer.setSize(window.innerWidth, window.innerHeight)

    if (enableShadows) {
      this.renderer.shadowMap.enabled = true
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    }

    document.body.appendChild(this.renderer.domElement)

    if (enableControls) {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement)
      this.controls.enableDamping = true
      this.controls.dampingFactor = 0.05
    }

    this.setupLighting()
    this.setupEventListeners()

    this.animate = this.animate.bind(this)

    this.updateCamera = this.updateCamera.bind(this)
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(20, 20, 20)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    this.scene.add(directionalLight)
  }

  setupEventListeners() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    })
  }

  addGround(size = 20, color = 0x2a2a2a) {
    const groundGeometry = new THREE.PlaneGeometry(size, size)
    const groundMaterial = new THREE.MeshLambertMaterial({ color })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)
    return ground
  }

  updateCamera(newCamera) {
    this.camera = newCamera
  }

  animate(customAnimationCallback) {
    requestAnimationFrame(() => this.animate(customAnimationCallback))

    if (this.controls) {
      this.controls.update()
    }

    if (customAnimationCallback) {
      customAnimationCallback()
    }

    this.renderer.render(this.scene, this.camera)
  }

  start(customAnimationCallback) {
    this.animate(customAnimationCallback)
  }
}

/**
 * Utility functions for creating common 3D objects
 */
export class ObjectFactory {
  static createBox(size = [2, 2, 2], color = 0x3b82f6, position = [0, 1, 0]) {
    const geometry = new THREE.BoxGeometry(...size)
    const material = new THREE.MeshLambertMaterial({ color })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(...position)
    mesh.castShadow = true
    return mesh
  }

  static createSphere(radius = 1, color = 0xef4444, position = [0, 1, 0]) {
    const geometry = new THREE.SphereGeometry(radius, 32, 32)
    const material = new THREE.MeshLambertMaterial({ color })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(...position)
    mesh.castShadow = true
    return mesh
  }

  static createCylinder(
    radiusTop = 1,
    radiusBottom = 1,
    height = 2,
    color = 0x10b981,
    position = [0, 1, 0]
  ) {
    const geometry = new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
      height,
      32
    )
    const material = new THREE.MeshLambertMaterial({ color })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(...position)
    mesh.castShadow = true
    return mesh
  }

  static createPlane(size = [10, 10], color = 0x666666, position = [0, 0, 0]) {
    const geometry = new THREE.PlaneGeometry(...size)
    const material = new THREE.MeshLambertMaterial({ color })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(...position)
    mesh.rotation.x = -Math.PI / 2
    mesh.receiveShadow = true
    return mesh
  }
}

/**
 * UI helper utilities
 */
export class UIHelpers {
  static createControlPanel(title, position = 'top-left') {
    const panel = document.createElement('div')
    panel.className = 'control-panel'
    panel.innerHTML = `<h3>${title}</h3>`

    const positions = {
      'top-left': { top: '10px', left: '10px' },
      'top-right': { top: '10px', right: '10px' },
      'bottom-left': { bottom: '10px', left: '10px' },
      'bottom-right': { bottom: '10px', right: '10px' },
    }

    Object.assign(panel.style, {
      position: 'absolute',
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '20px',
      borderRadius: '10px',
      backdropFilter: 'blur(10px)',
      zIndex: '100',
      minWidth: '250px',
      width: '250px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      ...positions[position],
    })

    document.body.appendChild(panel)
    return panel
  }

  static createButton(text, onClick, style = 'primary') {
    const button = document.createElement('button')
    button.textContent = text
    button.onclick = onClick

    const styles = {
      primary: {
        background: '#3b82f6',
        color: 'white',
      },
      secondary: {
        background: '#374151',
        color: 'white',
      },
      success: {
        background: '#10b981',
        color: 'white',
      },
      warning: {
        background: '#f59e0b',
        color: 'black',
      },
      danger: {
        background: '#ef4444',
        color: 'white',
      },
    }

    Object.assign(button.style, {
      border: 'none',
      padding: '10px 15px',
      borderRadius: '6px',
      cursor: 'pointer',
      margin: '3px',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.2s',
      width: '100%',
      ...styles[style],
    })

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-1px)'
      button.style.opacity = '0.9'
    })

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)'
      button.style.opacity = '1'
    })

    return button
  }

  static createSlider(min, max, value, onChange, label) {
    const container = document.createElement('div')
    container.style.margin = '15px 0'

    const labelEl = document.createElement('label')
    labelEl.textContent = label
    labelEl.style.display = 'block'
    labelEl.style.marginBottom = '5px'
    labelEl.style.fontSize = '14px'

    const slider = document.createElement('input')
    slider.type = 'range'
    slider.min = min
    slider.max = max
    slider.value = value
    slider.step = (max - min) / 100
    slider.style.width = '100%'

    console.log(slider)

    const valueDisplay = document.createElement('span')
    valueDisplay.textContent = value
    valueDisplay.style.marginLeft = '10px'

    slider.addEventListener('input', (e) => {
      valueDisplay.textContent = e.target.value
      if (onChange) onChange(e.target.value)
    })

    container.appendChild(labelEl)
    container.appendChild(slider)
    container.appendChild(valueDisplay)

    return container
  }

  static createColorPicker(value, onChange, label) {
    const container = document.createElement('div')
    container.style.margin = '15px 0'

    const labelEl = document.createElement('label')
    labelEl.textContent = label
    labelEl.style.display = 'block'
    labelEl.style.marginBottom = '5px'
    labelEl.style.fontSize = '14px'

    const colorInput = document.createElement('input')
    colorInput.type = 'color'
    colorInput.value = value

    Object.assign(colorInput.style, {
      width: '100%',
      height: '40px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      background: 'transparent',
    })

    const valueDisplay = document.createElement('span')
    valueDisplay.textContent = value.toUpperCase()
    valueDisplay.style.marginLeft = '10px'
    valueDisplay.style.fontSize = '12px'
    valueDisplay.style.color = '#888'
    valueDisplay.style.fontFamily = 'monospace'

    colorInput.addEventListener('input', (e) => {
      valueDisplay.textContent = e.target.value.toUpperCase()
      if (onChange) onChange(e.target.value)
    })

    container.appendChild(labelEl)
    container.appendChild(colorInput)
    container.appendChild(valueDisplay)

    return container
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  constructor(scene, renderer) {
    this.scene = scene
    this.renderer = renderer
    this.panel = this.createPanel()
    this.lastTime = performance.now()
    this.frameCount = 0
    this.fps = 0
  }

  createPanel() {
    const panel = document.createElement('div')
    panel.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 1000;
        `
    document.body.appendChild(panel)
    return panel
  }

  update() {
    this.frameCount++
    const currentTime = performance.now()

    if (currentTime - this.lastTime >= 1000) {
      this.fps = this.frameCount
      this.frameCount = 0
      this.lastTime = currentTime

      const info = this.renderer.info
      this.panel.innerHTML = `
                FPS: ${this.fps}<br>
                Triangles: ${info.render.triangles}<br>
                Calls: ${info.render.calls}<br>
                Objects: ${this.scene.children.length}
            `
    }
  }
}
