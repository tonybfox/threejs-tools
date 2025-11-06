import * as THREE from 'three'

// Hard-coded axis colors matching TransformControls
const AXIS_COLORS = {
  x: '#ed4358',
  y: '#82cc19',
  z: '#3185eb',
} as const

export interface ViewHelperCameraController {
  camera: THREE.Camera
  getPosition(target: THREE.Vector3): THREE.Vector3
  getTarget(target: THREE.Vector3): THREE.Vector3
  setLookAt(
    positionX: number,
    positionY: number,
    positionZ: number,
    targetX: number,
    targetY: number,
    targetZ: number,
    enableTransition?: boolean
  ): Promise<void> | void
  stop?(): void
  enabled: boolean
}

export interface ViewHelperOptions {
  container?: HTMLElement
  size?: number
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  offset?: { x: number; y: number }
  center?: THREE.Vector3
  labels?: {
    x?: string
    y?: string
    z?: string
  }
  controls?: ViewHelperCameraController
}

// Define event types for the view helper
interface ViewHelperEventMap {
  animationStart: {}
  animationEnd: {}
}

export interface ViewHelperEvent {
  type: 'animationStart' | 'animationEnd'
}

export class ViewHelper extends THREE.EventDispatcher<ViewHelperEventMap> {
  private camera: THREE.Camera
  private domElement: HTMLElement
  private options: Required<Omit<ViewHelperOptions, 'controls'>>
  private scene: THREE.Scene
  private orthoCamera: THREE.OrthographicCamera
  private renderer?: THREE.WebGLRenderer
  private viewport: THREE.Vector4 = new THREE.Vector4()
  private controls?: ViewHelperCameraController
  private pointerDownHandler!: (event: PointerEvent) => void

  // Animation properties
  public animating: boolean = false
  public center: THREE.Vector3
  private targetPosition: THREE.Vector3 = new THREE.Vector3()
  private targetQuaternion: THREE.Quaternion = new THREE.Quaternion()
  private q1: THREE.Quaternion = new THREE.Quaternion()
  private q2: THREE.Quaternion = new THREE.Quaternion()
  private dummy: THREE.Object3D = new THREE.Object3D()
  private radius: number = 0
  private turnRate: number = 2 * Math.PI // turn rate in angles per second
  private tempVecA: THREE.Vector3 = new THREE.Vector3()

  // Interactive elements
  private interactiveObjects: THREE.Object3D[] = []
  private raycaster: THREE.Raycaster = new THREE.Raycaster()
  private mouse: THREE.Vector2 = new THREE.Vector2()

  // Helper objects
  private axes!: {
    x: THREE.Mesh
    y: THREE.Mesh
    z: THREE.Mesh
  }
  private sprites!: {
    posX: THREE.Sprite
    posY: THREE.Sprite
    posZ: THREE.Sprite
    negX: THREE.Sprite
    negY: THREE.Sprite
    negZ: THREE.Sprite
  }

  constructor(
    camera: THREE.Camera,
    domElement?: HTMLElement,
    options: ViewHelperOptions = {}
  ) {
    super()
    this.controls = options.controls
    this.camera = this.controls?.camera ?? camera
    this.domElement = domElement || document.body

    const defaultCenter =
      options.center ??
      (this.controls
        ? this.controls.getTarget(new THREE.Vector3())
        : new THREE.Vector3())

    // Set default options
    this.options = {
      container: options.container || document.body,
      size: options.size || 128,
      position: options.position || 'bottom-right',
      offset: options.offset || { x: 20, y: 20 },
      center: defaultCenter.clone(),
      labels: {
        x: options.labels?.x || '',
        y: options.labels?.y || '',
        z: options.labels?.z || '',
        ...options.labels,
      },
    }

    this.center = this.options.center.clone()

    this.scene = new THREE.Scene()
    this.scene.background = null // Make background transparent
    this.orthoCamera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0, 4)
    this.orthoCamera.position.set(0, 0, 2)

    this.createAxes()
    this.createSprites()
    this.setupEventListeners()
  }

  private syncActiveCamera(): THREE.Camera {
    if (this.controls) {
      this.camera = this.controls.camera
    }
    return this.camera
  }

  private getCameraPosition(target: THREE.Vector3): THREE.Vector3 {
    if (this.controls) {
      return this.controls.getPosition(target)
    }
    return target.copy(this.camera.position)
  }

  private createAxes(): void {
    const geometry = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 5)
      .rotateZ(-Math.PI / 2)
      .translate(0.4, 0, 0)

    const xAxisMaterial = new THREE.MeshBasicMaterial({
      color: AXIS_COLORS.x,
      toneMapped: false,
    })
    const yAxisMaterial = new THREE.MeshBasicMaterial({
      color: AXIS_COLORS.y,
      toneMapped: false,
    })
    const zAxisMaterial = new THREE.MeshBasicMaterial({
      color: AXIS_COLORS.z,
      toneMapped: false,
    })

    this.axes = {
      x: new THREE.Mesh(geometry.clone(), xAxisMaterial),
      y: new THREE.Mesh(geometry.clone(), yAxisMaterial),
      z: new THREE.Mesh(geometry.clone(), zAxisMaterial),
    }

    this.axes.y.rotation.z = Math.PI / 2
    this.axes.z.rotation.y = -Math.PI / 2

    this.scene.add(this.axes.x)
    this.scene.add(this.axes.y)
    this.scene.add(this.axes.z)
  }

  private createSprites(): void {
    const posXSprite = this.createSprite(AXIS_COLORS.x, this.options.labels.x)
    const posYSprite = this.createSprite(AXIS_COLORS.y, this.options.labels.y)
    const posZSprite = this.createSprite(AXIS_COLORS.z, this.options.labels.z)
    // Use faded versions of the axis colors for negative axes
    const negXSprite = this.createSprite(AXIS_COLORS.x)
    const negYSprite = this.createSprite(AXIS_COLORS.y)
    const negZSprite = this.createSprite(AXIS_COLORS.z)

    this.sprites = {
      posX: posXSprite,
      posY: posYSprite,
      posZ: posZSprite,
      negX: negXSprite,
      negY: negYSprite,
      negZ: negZSprite,
    }

    // Position sprites
    this.sprites.posX.position.set(1, 0, 0)
    this.sprites.posY.position.set(0, 1, 0)
    this.sprites.posZ.position.set(0, 0, 1)
    this.sprites.negX.position.set(-1, 0, 0)
    this.sprites.negY.position.set(0, -1, 0)
    this.sprites.negZ.position.set(0, 0, -1)

    // Set opacity for negative axes
    this.sprites.negX.material.opacity = 0.2
    this.sprites.negY.material.opacity = 0.2
    this.sprites.negZ.material.opacity = 0.2

    // Set user data for interaction
    this.sprites.posX.userData.type = 'posX'
    this.sprites.posY.userData.type = 'posY'
    this.sprites.posZ.userData.type = 'posZ'
    this.sprites.negX.userData.type = 'negX'
    this.sprites.negY.userData.type = 'negY'
    this.sprites.negZ.userData.type = 'negZ'

    // Add to scene and interactive objects
    Object.values(this.sprites).forEach((sprite) => {
      this.scene.add(sprite)
      this.interactiveObjects.push(sprite)
    })
  }

  private createSprite(color: string, text?: string): THREE.Sprite {
    // Use higher resolution for crisp rendering
    const pixelRatio = window.devicePixelRatio || 1
    const size = 128 * pixelRatio
    const radius = 28 * pixelRatio

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size

    const context = canvas.getContext('2d')!

    // Enable high-quality rendering
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'

    // Scale for device pixel ratio
    context.scale(pixelRatio, pixelRatio)

    const center = size / (2 * pixelRatio)
    const actualRadius = radius / pixelRatio

    // Draw circle background
    context.beginPath()
    context.arc(center, center, actualRadius, 0, 2 * Math.PI)
    context.closePath()
    context.fillStyle = color
    context.fill()

    if (text) {
      context.font = 'bold 48px Arial, sans-serif'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillStyle = '#ffffff'

      // Add text stroke for better visibility
      context.strokeStyle = '#000000'
      context.lineWidth = 2
      context.strokeText(text, center, center)
      context.fillText(text, center, center)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.generateMipmaps = false
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter

    return new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        toneMapped: false,
        alphaTest: 0.1,
      })
    )
  }

  private setupEventListeners(): void {
    this.pointerDownHandler = (event: PointerEvent) => {
      this.handleClick(event)
    }
    this.domElement.addEventListener('pointerdown', this.pointerDownHandler)
  }

  public render(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer

    const activeCamera = this.syncActiveCamera()

    // Update helper orientation to match camera
    this.scene.quaternion.copy(activeCamera.quaternion).invert()
    this.scene.updateMatrixWorld()

    const size = this.options.size
    const canvasWidth = renderer.domElement.width / renderer.getPixelRatio()
    const canvasHeight = renderer.domElement.height / renderer.getPixelRatio()

    let x: number, y: number

    switch (this.options.position) {
      case 'top-left':
        x = this.options.offset.x
        y = canvasHeight - size - this.options.offset.y
        break
      case 'top-right':
        x = canvasWidth - size - this.options.offset.x
        y = canvasHeight - size - this.options.offset.y
        break
      case 'bottom-left':
        x = this.options.offset.x
        y = this.options.offset.y
        break
      case 'bottom-right':
      default:
        x = canvasWidth - size - this.options.offset.x
        y = this.options.offset.y
        break
    }

    // Store current viewport and autoClear setting
    renderer.getViewport(this.viewport)
    const autoClear = renderer.autoClear

    // Set viewport for helper and disable autoClear
    renderer.setViewport(x, y, size, size)
    renderer.autoClear = false

    // Clear only depth buffer in the helper area
    renderer.setScissorTest(true)
    renderer.setScissor(x, y, size, size)
    renderer.clear(true, true, true)

    // Render helper
    renderer.render(this.scene, this.orthoCamera)
    // Restore settings
    renderer.setScissorTest(false)
    renderer.autoClear = autoClear
    renderer.setViewport(
      this.viewport.x,
      this.viewport.y,
      this.viewport.z,
      this.viewport.w
    )
  }

  public handleClick(event: PointerEvent): boolean {
    if (this.animating || !this.renderer) return false

    this.syncActiveCamera()

    const rect = this.domElement.getBoundingClientRect()
    const size = this.options.size // Use logical size for click detection

    // Calculate helper viewport bounds
    let offsetX: number, offsetY: number

    switch (this.options.position) {
      case 'top-left':
        offsetX = rect.left + this.options.offset.x
        offsetY = rect.top + this.options.offset.y
        break
      case 'top-right':
        offsetX = rect.left + rect.width - size - this.options.offset.x
        offsetY = rect.top + this.options.offset.y
        break
      case 'bottom-left':
        offsetX = rect.left + this.options.offset.x
        offsetY = rect.top + rect.height - size - this.options.offset.y
        break
      case 'bottom-right':
      default:
        offsetX = rect.left + rect.width - size - this.options.offset.x
        offsetY = rect.top + rect.height - size - this.options.offset.y
        break
    }

    // Convert click coordinates to helper-relative coordinates
    this.mouse.x = ((event.clientX - offsetX) / size) * 2 - 1
    this.mouse.y = -((event.clientY - offsetY) / size) * 2 + 1

    // Check if click is within helper bounds
    if (
      this.mouse.x < -1 ||
      this.mouse.x > 1 ||
      this.mouse.y < -1 ||
      this.mouse.y > 1
    ) {
      return false
    }

    this.raycaster.setFromCamera(this.mouse, this.orthoCamera)
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects)

    if (intersects.length > 0) {
      const intersection = intersects[0]
      const object = intersection.object
      this.prepareAnimationData(object, this.center)
      if (this.controls) {
        this.startControlsAnimation(this.center)
      } else {
        this.animating = true
        this.dispatchEvent({ type: 'animationStart' })
      }
      return true
    }

    return false
  }

  private prepareAnimationData(
    object: THREE.Object3D,
    focusPoint: THREE.Vector3
  ): void {
    switch (object.userData.type) {
      case 'posX':
        this.targetPosition.set(1, 0, 0)
        this.targetQuaternion.setFromEuler(new THREE.Euler(0, Math.PI * 0.5, 0))
        break
      case 'posY':
        this.targetPosition.set(0, 1, 0)
        this.targetQuaternion.setFromEuler(
          new THREE.Euler(-Math.PI * 0.5, 0, 0)
        )
        break
      case 'posZ':
        this.targetPosition.set(0, 0, 1)
        this.targetQuaternion.setFromEuler(new THREE.Euler())
        break
      case 'negX':
        this.targetPosition.set(-1, 0, 0)
        this.targetQuaternion.setFromEuler(
          new THREE.Euler(0, -Math.PI * 0.5, 0)
        )
        break
      case 'negY':
        this.targetPosition.set(0, -1, 0)
        this.targetQuaternion.setFromEuler(new THREE.Euler(Math.PI * 0.5, 0, 0))
        break
      case 'negZ':
        this.targetPosition.set(0, 0, -1)
        this.targetQuaternion.setFromEuler(new THREE.Euler(0, Math.PI, 0))
        break
      default:
        console.error('ViewHelper: Invalid axis.')
        return
    }

    const cameraPosition = this.getCameraPosition(this.tempVecA)
    this.radius = cameraPosition.distanceTo(focusPoint)
    this.targetPosition.multiplyScalar(this.radius).add(focusPoint)

    this.dummy.position.copy(focusPoint)
    this.dummy.lookAt(cameraPosition)
    this.q1.copy(this.dummy.quaternion)

    this.dummy.lookAt(this.targetPosition)
    this.q2.copy(this.dummy.quaternion)
  }

  private startControlsAnimation(focusPoint: THREE.Vector3): void {
    const controls = this.controls
    if (!controls) {
      return
    }
    controls.enabled = false
    controls.stop?.()
    this.animating = true
    this.dispatchEvent({ type: 'animationStart' })

    const applyLookAt = () => {
      controls.setLookAt(
        this.targetPosition.x,
        this.targetPosition.y,
        this.targetPosition.z,
        focusPoint.x,
        focusPoint.y,
        focusPoint.z,
        true
      )

      setTimeout(() => {
        controls.enabled = true
      }, 100)
    }
    try {
      void Promise.resolve(applyLookAt())
        .catch((error) => {
          console.warn('ViewHelper: Unable to set camera look-at.', error)
        })
        .finally(() => {
          this.animating = false
          this.dispatchEvent({ type: 'animationEnd' })
        })
    } catch (error) {
      console.warn('ViewHelper: Unable to set camera look-at.', error)
      this.animating = false
      this.dispatchEvent({ type: 'animationEnd' })
    }
  }

  public update(delta: number): void {
    this.syncActiveCamera()

    if (this.controls) {
      return
    }

    if (!this.animating) return

    const step = delta * this.turnRate

    // Animate position by doing a slerp and then scaling the position on the unit sphere
    this.q1.rotateTowards(this.q2, step)
    this.camera.position
      .set(0, 0, 1)
      .applyQuaternion(this.q1)
      .multiplyScalar(this.radius)
      .add(this.center)

    // Animate orientation
    this.camera.quaternion.rotateTowards(this.targetQuaternion, step)

    if (this.q1.angleTo(this.q2) === 0) {
      this.animating = false
      this.dispatchEvent({ type: 'animationEnd' })
    }
  }

  public setLabels(labelX?: string, labelY?: string, labelZ?: string): void {
    if (labelX !== undefined) this.options.labels.x = labelX
    if (labelY !== undefined) this.options.labels.y = labelY
    if (labelZ !== undefined) this.options.labels.z = labelZ

    this.updateLabels()
  }

  private updateLabels(): void {
    // Dispose old materials
    this.sprites.posX.material.map?.dispose()
    this.sprites.posY.material.map?.dispose()
    this.sprites.posZ.material.map?.dispose()
    this.sprites.posX.material.dispose()
    this.sprites.posY.material.dispose()
    this.sprites.posZ.material.dispose()

    // Create new sprites with updated labels
    const newPosX = this.createSprite(AXIS_COLORS.x, this.options.labels.x)
    const newPosY = this.createSprite(AXIS_COLORS.y, this.options.labels.y)
    const newPosZ = this.createSprite(AXIS_COLORS.z, this.options.labels.z)

    // Update sprites
    this.sprites.posX.material = newPosX.material
    this.sprites.posY.material = newPosY.material
    this.sprites.posZ.material = newPosZ.material
  }

  public dispose(): void {
    // Dispose geometries
    this.axes.x.geometry.dispose()
    this.axes.y.geometry.dispose()
    this.axes.z.geometry.dispose()

    // Dispose materials
    ;(this.axes.x.material as THREE.Material).dispose()
    ;(this.axes.y.material as THREE.Material).dispose()
    ;(this.axes.z.material as THREE.Material).dispose()

    // Dispose sprite materials and textures
    Object.values(this.sprites).forEach((sprite) => {
      sprite.material.map?.dispose()
      sprite.material.dispose()
    })

    // Remove event listeners
    if (this.pointerDownHandler) {
      this.domElement.removeEventListener(
        'pointerdown',
        this.pointerDownHandler
      )
    }
  }
}
