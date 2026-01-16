import * as THREE from 'three'

export interface CompassOverlayOptions {
  container?: HTMLElement
  size?: number
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  offset?: { x: number; y: number }
  northDirection?: THREE.Vector3
  colors?: {
    background: string
    border: string
    arrow: string
    text: string
    ticks: string
  }
}

// Define event types for the compass
interface CompassOverlayEventMap {
  resetToNorth: {}
}

export interface CompassOverlayEvent {
  type: 'resetToNorth'
}

export class CompassOverlay extends THREE.EventDispatcher<CompassOverlayEventMap> {
  private camera: THREE.Camera
  private container: HTMLElement
  private compassElement!: HTMLElement
  private arrowElement!: HTMLElement
  private isActive: boolean = false
  private options: Required<CompassOverlayOptions>
  private currentRotation: number = 0

  constructor(camera: THREE.Camera, options: CompassOverlayOptions = {}) {
    super()
    this.camera = camera

    // Set default options
    this.options = {
      container: options.container || document.body,
      size: options.size || 100,
      position: options.position || 'bottom-right',
      offset: options.offset || { x: 20, y: 20 },
      northDirection: options.northDirection?.clone().normalize() || new THREE.Vector3(0, 0, -1),
      colors: {
        background: options.colors?.background || '#1a1a1a',
        border: options.colors?.border || '#333333',
        arrow: options.colors?.arrow || '#ff4444',
        text: options.colors?.text || '#ffffff',
        ticks: options.colors?.ticks || '#666666',
        ...options.colors,
      },
    }

    this.container = this.options.container
    this.createCompassElement()
    this.setupStyles()
    this.start()
  }

  private createCompassElement(): void {
    // Create main compass container
    this.compassElement = document.createElement('div')
    this.compassElement.className = 'threejs-compass-overlay'

    // Create compass background with ticks
    const compassBg = document.createElement('div')
    compassBg.className = 'compass-background'

    // Create cardinal direction labels
    const directions = [
      { label: 'N', angle: 0 },
      { label: 'E', angle: 90 },
      { label: 'S', angle: 180 },
      { label: 'W', angle: 270 },
    ]

    // Create tick marks
    for (let i = 0; i < 360; i += 11.25) {
      const tick = document.createElement('div')
      tick.className =
        i % 45 === 0 ? 'compass-tick-major' : 'compass-tick-minor'
      const tickLength = i % 30 === 0 ? 8 : 4
      tick.style.transform = `rotate(${i}deg) translateY(-${this.options.size / 2 - tickLength - 2}px)`
      compassBg.appendChild(tick)
    }

    directions.forEach(({ label, angle }) => {
      const dirLabel = document.createElement('div')
      dirLabel.className = 'compass-label'
      dirLabel.textContent = label
      dirLabel.style.transform = `rotate(${angle}deg) translateY(-${this.options.size / 2 - 15}px) rotate(-${angle}deg)`
      compassBg.appendChild(dirLabel)
    })

    // Create arrow element
    this.arrowElement = document.createElement('div')
    this.arrowElement.className = 'compass-arrow'

    // Arrow SVG
    this.arrowElement.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20">
        <polygon points="10,2 14,12 10,10 6,12" fill="${this.options.colors.arrow}" stroke="#000" stroke-width="0.5"/>
      </svg>
    `

    this.compassElement.appendChild(compassBg)
    this.compassElement.appendChild(this.arrowElement)
    this.container.appendChild(this.compassElement)

    // Add double-click event to reset camera to north
    this.setupDoubleClickHandler()
  }

  private setupStyles(): void {
    // Check if styles already exist
    if (document.getElementById('threejs-compass-styles')) {
      return
    }

    const style = document.createElement('style')
    style.id = 'threejs-compass-styles'
    style.textContent = `
      .threejs-compass-overlay {
        position: fixed;
        width: ${this.options.size}px;
        height: ${this.options.size}px;
        background: ${this.options.colors.background};
        border: 2px solid ${this.options.colors.border};
        border-radius: 50%;
        z-index: 1000;
        pointer-events: none;
        user-select: none;
        transition: opacity 0.2s ease;
        ${this.getPositionStyles()};
      }

      .compass-background {
        position: relative;
        width: 100%;
        height: 100%;
        border-radius: 50%;
      }

      .compass-label {
        position: absolute;
        top: 50%;
        left: 50%;
        transform-origin: center;
        color: ${this.options.colors.text};
        font-family: Arial, sans-serif;
        font-size: 12px;
        font-weight: bold;
        text-align: center;
        width: 12px;
        height: 12px;
        line-height: 12px;
        margin-left: -6px;
        margin-top: -6px;
      }

      .compass-tick-major {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 2px;
        height: 8px;
        background: ${this.options.colors.ticks};
        transform-origin: center top;
        margin-left: -1px;
        margin-top: -4px;
      }

      .compass-tick-minor {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 1px;
        height: 4px;
        background: ${this.options.colors.ticks};
        transform-origin: center top;
        margin-left: -0.5px;
        margin-top: -2px;
        opacity: 0.6;
      }

      .compass-arrow {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        transform-origin: center;
        transition: transform 0.1s ease-out;
        z-index: 1;
      }

      .compass-arrow svg {
        display: block;
        filter: drop-shadow(0 0 2px rgba(0,0,0,0.5));
      }
    `

    document.head.appendChild(style)
  }

  private setupDoubleClickHandler(): void {
    // Enable pointer events for interaction
    this.compassElement.style.pointerEvents = 'auto'
    this.compassElement.style.cursor = 'pointer'

    // Add double-click event listener
    this.compassElement.addEventListener('dblclick', (event) => {
      event.preventDefault()
      event.stopPropagation()

      // Dispatch custom event
      this.dispatchEvent({ type: 'resetToNorth' })
    })

    // Add visual feedback on hover
    this.compassElement.addEventListener('mouseenter', () => {
      this.compassElement.style.opacity = '0.8'
    })

    this.compassElement.addEventListener('mouseleave', () => {
      this.compassElement.style.opacity = '1'
    })
  }

  private updateTicksAndLabels(): void {
    // Update compass labels

    // Update tick marks
    const majorTicks = this.compassElement.querySelectorAll(
      '.compass-tick-major'
    )
    const minorTicks = this.compassElement.querySelectorAll(
      '.compass-tick-minor'
    )

    majorTicks.forEach((tick, index) => {
      const angle = (index * 30) % 360 // Major ticks every 30 degrees
      const tickLength = 8
      ;(tick as HTMLElement).style.transform =
        `rotate(${angle}deg) translateY(-${this.options.size / 2 - tickLength - 2}px)`
    })

    minorTicks.forEach((tick, index) => {
      // Minor ticks are at angles that aren't multiples of 30
      const allAngles = []
      for (let i = 0; i < 360; i += 10) {
        if (i % 30 !== 0) {
          // Skip major tick positions
          allAngles.push(i)
        }
      }
      const angle = allAngles[index] || 0
      const tickLength = 4
      ;(tick as HTMLElement).style.transform =
        `rotate(${angle}deg) translateY(-${this.options.size / 2 - tickLength - 2}px)`
    })

    const labels = this.compassElement.querySelectorAll('.compass-label')
    labels.forEach((label, index) => {
      const directions = [
        { label: 'N', angle: 0 },
        { label: 'E', angle: 90 },
        { label: 'S', angle: 180 },
        { label: 'W', angle: 270 },
      ]
      const { angle } = directions[index]
      ;(label as HTMLElement).style.transform =
        `rotate(${angle}deg) translateY(-${this.options.size / 2 - 15}px) rotate(-${angle}deg)`
    })
  }

  private getPositionStyles(): string {
    const { position, offset } = this.options

    switch (position) {
      case 'top-left':
        return `top: ${offset.y}px; left: ${offset.x}px;`
      case 'top-right':
        return `top: ${offset.y}px; right: ${offset.x}px;`
      case 'bottom-left':
        return `bottom: ${offset.y}px; left: ${offset.x}px;`
      case 'bottom-right':
      default:
        return `bottom: ${offset.y}px; right: ${offset.x}px;`
    }
  }

  public start(): void {
    if (this.isActive) return
    this.isActive = true
    this.update()
  }

  public stop(): void {
    this.isActive = false
  }

  public update(): void {
    if (!this.isActive) return

    // Get the camera's world matrix
    const cameraMatrix = new THREE.Matrix4()
    this.camera.updateMatrixWorld()
    cameraMatrix.copy(this.camera.matrixWorld)

    // Extract the camera's forward direction (negative Z in camera space)
    const forward = new THREE.Vector3(0, 0, -1)
    forward.transformDirection(cameraMatrix)

    // Project to XZ plane (ignore Y component for top-down compass view)
    forward.y = 0
    forward.normalize()

    // Get the configured north direction and project to XZ plane
    const north = this.options.northDirection.clone()
    north.y = 0
    north.normalize()

    // Calculate angle from configured north direction
    const targetAngle = Math.atan2(-forward.x, -forward.z) * (180 / Math.PI)
    const northAngle = Math.atan2(-north.x, -north.z) * (180 / Math.PI)
    
    // Adjust target angle relative to the configured north
    const adjustedAngle = targetAngle - northAngle

    // Calculate the shortest rotation path to avoid spinning around
    let angleDiff = adjustedAngle - this.currentRotation

    // Normalize the angle difference to be between -180 and 180
    while (angleDiff > 180) angleDiff -= 360
    while (angleDiff < -180) angleDiff += 360

    // Update current rotation with smooth transition
    this.currentRotation += angleDiff

    // Update arrow rotation (negative because we want the arrow to point to north, not where camera is facing)
    this.arrowElement.style.transform = `translate(-50%, -50%) rotate(${-this.currentRotation}deg)`

    // Continue updating if active
    if (this.isActive) {
      requestAnimationFrame(() => this.update())
    }
  }

  public setCamera(camera: THREE.Camera): void {
    this.camera = camera
  }

  public getNorthDirection(): THREE.Vector3 {
    return this.options.northDirection.clone()
  }

  public setSize(size: number): void {
    this.options.size = size
    this.compassElement.style.width = `${size}px`
    this.compassElement.style.height = `${size}px`
    this.updateTicksAndLabels()
    this.updateStyles()
  }

  public setPosition(
    position: CompassOverlayOptions['position'],
    offset?: { x: number; y: number }
  ): void {
    if (position) {
      this.options.position = position
    }
    if (offset) {
      this.options.offset = offset
    }

    // Update position styles
    const positionStyles = this.getPositionStyles()
    const styles = positionStyles.split(';').filter((s) => s.trim())

    // Clear existing position styles
    this.compassElement.style.top = ''
    this.compassElement.style.right = ''
    this.compassElement.style.bottom = ''
    this.compassElement.style.left = ''

    // Apply new position styles
    styles.forEach((style) => {
      const [property, value] = style.split(':').map((s) => s.trim())
      if (property && value) {
        ;(this.compassElement.style as any)[property] = value
      }
    })
  }

  public setColors(colors: Partial<CompassOverlayOptions['colors']>): void {
    this.options.colors = { ...this.options.colors, ...colors }
    this.updateStyles()
  }

  /**
   * Helper method to reset camera to look north
   * This is a convenience method that can be called when handling the 'resetToNorth' event
   */
  public static resetCameraToNorth(
    camera: THREE.Camera,
    smooth: boolean = true,
    northDirection: THREE.Vector3 = new THREE.Vector3(0, 0, -1)
  ): void {
    if (smooth) {
      // Create a smooth rotation animation to north
      const startQuaternion = camera.quaternion.clone()
      const targetQuaternion = new THREE.Quaternion()

      // Set target rotation to look at configured north direction
      const targetMatrix = new THREE.Matrix4()
      targetMatrix.lookAt(
        camera.position,
        camera.position.clone().add(northDirection),
        new THREE.Vector3(0, 1, 0)
      )
      targetQuaternion.setFromRotationMatrix(targetMatrix)

      // Animate rotation
      const duration = 500 // milliseconds
      const startTime = Date.now()

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Use smooth easing
        const easeProgress = 1 - Math.pow(1 - progress, 3)

        camera.quaternion.slerpQuaternions(
          startQuaternion,
          targetQuaternion,
          easeProgress
        )

        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }
      animate()
    } else {
      // Instant rotation to north
      camera.lookAt(camera.position.clone().add(northDirection))
    }
  }

  private updateStyles(): void {
    // Remove existing styles
    const existingStyle = document.getElementById('threejs-compass-styles')
    if (existingStyle) {
      existingStyle.remove()
    }

    // Recreate styles with new values
    this.setupStyles()
  }

  public dispose(): void {
    this.stop()

    if (this.compassElement && this.compassElement.parentNode) {
      this.compassElement.parentNode.removeChild(this.compassElement)
    }

    // Remove styles if no other compass instances exist
    const compassElements = document.querySelectorAll(
      '.threejs-compass-overlay'
    )
    if (compassElements.length === 0) {
      const style = document.getElementById('threejs-compass-styles')
      if (style) {
        style.remove()
      }
    }
  }
}
