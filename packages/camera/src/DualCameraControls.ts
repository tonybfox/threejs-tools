import * as THREE from 'three'
import CameraControls from 'camera-controls'

type Vector3Tuple = [number, number, number]
type Vector3Like = THREE.Vector3 | Vector3Tuple

export type CameraMode = 'perspective' | 'orthographic'

export interface PerspectiveCameraConfig {
  fov?: number
  near?: number
  far?: number
  position?: Vector3Like
  zoom?: number
}

export interface OrthographicCameraConfig {
  size?: number
  near?: number
  far?: number
  position?: Vector3Like
  zoom?: number
}

export interface DualCameraControlsOptions {
  domElement?: HTMLElement
  initialMode?: CameraMode
  initialTarget?: Vector3Like
  perspective?: PerspectiveCameraConfig
  orthographic?: OrthographicCameraConfig
}

export interface ModeChangedEvent {
  type: 'modechange'
  mode: CameraMode
  previousMode: CameraMode
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera
}

let controlsInstalled = false

const tempVec3A = new THREE.Vector3()
const tempVec3B = new THREE.Vector3()
const tempVec2 = new THREE.Vector2()

function ensureCameraControlsInstalled() {
  if (!controlsInstalled) {
    CameraControls.install({ THREE })
    controlsInstalled = true
  }
}

function toVector3(
  value: Vector3Like | undefined,
  fallback: Vector3Tuple,
  target: THREE.Vector3
) {
  if (!value) {
    target.set(fallback[0], fallback[1], fallback[2])
    return target
  }

  if (Array.isArray(value)) {
    target.set(value[0], value[1], value[2])
    return target
  }

  target.copy(value)
  return target
}

/**
 * Camera controls that manage both perspective and orthographic cameras while
 * extending {@link CameraControls}. Provides helpers to toggle between the
 * camera types and keep the framing consistent.
 */
export class DualCameraControls extends CameraControls {
  readonly perspectiveCamera: THREE.PerspectiveCamera
  readonly orthographicCamera: THREE.OrthographicCamera

  private readonly renderer: THREE.WebGLRenderer
  private readonly domElementRef: HTMLElement
  private activeMode: CameraMode
  private readonly minOrthoHalfHeight: number
  private readonly updateClock = new THREE.Clock()

  constructor(
    renderer: THREE.WebGLRenderer,
    options: DualCameraControlsOptions = {}
  ) {
    ensureCameraControlsInstalled()

    const { domElement = renderer.domElement } = options
    const aspect = resolveAspect(renderer, domElement)

    const perspectiveConfig = options.perspective ?? {}
    const orthographicConfig = options.orthographic ?? {}

    const perspectiveCamera = new THREE.PerspectiveCamera(
      perspectiveConfig.fov ?? 60,
      aspect,
      perspectiveConfig.near ?? 0.1,
      perspectiveConfig.far ?? 2000
    )

    perspectiveCamera.position.copy(
      toVector3(perspectiveConfig.position, [12, 12, 12], new THREE.Vector3())
    )

    if (perspectiveConfig.zoom !== undefined) {
      perspectiveCamera.zoom = perspectiveConfig.zoom
      perspectiveCamera.updateProjectionMatrix()
    }

    const orthoHalfHeight = Math.max(orthographicConfig.size ?? 20, 0.001) * 0.5
    const orthoHalfWidth = orthoHalfHeight * aspect

    const orthographicCamera = new THREE.OrthographicCamera(
      -orthoHalfWidth,
      orthoHalfWidth,
      orthoHalfHeight,
      -orthoHalfHeight,
      orthographicConfig.near ?? 0.1,
      orthographicConfig.far ?? 2000
    )

    orthographicCamera.position.copy(
      toVector3(orthographicConfig.position, [12, 12, 12], new THREE.Vector3())
    )

    if (orthographicConfig.zoom !== undefined) {
      orthographicCamera.zoom = orthographicConfig.zoom
      orthographicCamera.updateProjectionMatrix()
    }

    const initialMode = options.initialMode ?? 'perspective'
    const initialCamera =
      initialMode === 'orthographic' ? orthographicCamera : perspectiveCamera

    super(initialCamera, domElement)

    const initialTarget = toVector3(
      options.initialTarget,
      [0, 0, 0],
      new THREE.Vector3()
    )
    void this.setLookAt(
      initialCamera.position.x,
      initialCamera.position.y,
      initialCamera.position.z,
      initialTarget.x,
      initialTarget.y,
      initialTarget.z,
      false
    )

    this.renderer = renderer
    this.domElementRef = domElement
    this.perspectiveCamera = perspectiveCamera
    this.orthographicCamera = orthographicCamera
    this.activeMode = initialMode
    this.minOrthoHalfHeight = orthoHalfHeight

    this.updateInputBindingsForMode(initialMode)
  }

  get mode(): CameraMode {
    return this.activeMode
  }

  /**
   * Returns the currently active camera instance.
   */
  get activeCamera(): THREE.PerspectiveCamera | THREE.OrthographicCamera {
    return this.camera
  }

  /**
   * Switch to the perspective camera while keeping the current framing.
   */
  switchToPerspective(enableTransition = false) {
    if (this.activeMode === 'perspective') {
      return
    }

    const target = this.getTarget(tempVec3A)
    const position = this.getPosition(tempVec3B)

    const aspect = resolveAspect(this.renderer, this.domElementRef)
    this.perspectiveCamera.aspect = aspect
    this.perspectiveCamera.position.copy(position)
    this.perspectiveCamera.quaternion.copy(this.camera.quaternion)
    this.perspectiveCamera.up.copy(this.camera.up)
    this.perspectiveCamera.updateProjectionMatrix()

    this.camera = this.perspectiveCamera
    this.activeMode = 'perspective'
    this.updateInputBindingsForMode('perspective')

    void this.setLookAt(
      position.x,
      position.y,
      position.z,
      target.x,
      target.y,
      target.z,
      enableTransition
    )

    this.dispatchEvent({
      type: 'modechange',
      mode: this.activeMode,
      previousMode: 'orthographic',
      camera: this.perspectiveCamera,
    } satisfies ModeChangedEvent)
  }

  /**
   * Switch to the orthographic camera while keeping the current framing.
   */
  switchToOrthographic(enableTransition = false) {
    if (this.activeMode === 'orthographic') {
      return
    }

    const target = this.getTarget(tempVec3A)
    const position = this.getPosition(tempVec3B)

    const aspect = resolveAspect(this.renderer, this.domElementRef)
    this.updateOrthographicFrustum(position, target, aspect)

    this.orthographicCamera.position.copy(position)
    this.orthographicCamera.quaternion.copy(this.camera.quaternion)
    this.orthographicCamera.up.copy(this.camera.up)
    this.orthographicCamera.updateProjectionMatrix()

    this.camera = this.orthographicCamera
    this.activeMode = 'orthographic'
    this.updateInputBindingsForMode('orthographic')

    void this.setLookAt(
      position.x,
      position.y,
      position.z,
      target.x,
      target.y,
      target.z,
      enableTransition
    )

    this.dispatchEvent({
      type: 'modechange',
      mode: this.activeMode,
      previousMode: 'perspective',
      camera: this.orthographicCamera,
    } satisfies ModeChangedEvent)
  }

  /**
   * Toggles between perspective and orthographic camera modes.
   */
  toggleCameraMode(enableTransition = false) {
    if (this.activeMode === 'perspective') {
      this.switchToOrthographic(enableTransition)
    } else {
      this.switchToPerspective(enableTransition)
    }
  }

  /**
   * Update camera projection parameters when the viewport size changes.
   */
  handleResize(width: number, height: number) {
    const aspect = height === 0 ? 1 : width / height

    this.perspectiveCamera.aspect = aspect
    this.perspectiveCamera.updateProjectionMatrix()

    const target = this.getTarget(tempVec3A)
    const position = this.getPosition(tempVec3B)
    this.updateOrthographicFrustum(position, target, aspect)

    if (this.activeMode === 'orthographic') {
      this.camera = this.orthographicCamera
      void this.setLookAt(
        position.x,
        position.y,
        position.z,
        target.x,
        target.y,
        target.z,
        false
      )
    }
  }

  /**
   * Moves the camera to a new position and target.
   */
  moveCamera(
    position: Vector3Like,
    target: Vector3Like,
    enableTransition = true
  ) {
    toVector3(position, [0, 0, 0], tempVec3A)
    toVector3(target, [0, 0, 0], tempVec3B)

    return this.setLookAt(
      tempVec3A.x,
      tempVec3A.y,
      tempVec3A.z,
      tempVec3B.x,
      tempVec3B.y,
      tempVec3B.z,
      enableTransition
    )
  }

  /**
   * Updates the controls using an internally managed clock.
   * Useful when you don't want to pass delta time each frame.
   */
  updateDelta(): ReturnType<CameraControls['update']> {
    const delta = this.updateClock.getDelta()
    return super.update(delta)
  }

  private updateInputBindingsForMode(mode: CameraMode) {
    const { ACTION } = CameraControls

    if (mode === 'orthographic') {
      this.mouseButtons.left = ACTION.TRUCK
      this.mouseButtons.right = ACTION.ROTATE
      this.mouseButtons.wheel = ACTION.ZOOM
      this.touches.one = ACTION.TOUCH_TRUCK
      this.touches.two = ACTION.TOUCH_ZOOM_TRUCK
    } else {
      this.mouseButtons.left = ACTION.ROTATE
      this.mouseButtons.right = ACTION.TRUCK
      this.mouseButtons.wheel = ACTION.DOLLY
      this.touches.one = ACTION.TOUCH_ROTATE
      this.touches.two = ACTION.TOUCH_DOLLY_TRUCK
    }
  }

  private updateOrthographicFrustum(
    position: THREE.Vector3,
    target: THREE.Vector3,
    aspect: number
  ) {
    const distance = Math.max(position.distanceTo(target), 0.001)
    const fov = this.perspectiveCamera.fov
    const halfHeight = Math.max(
      distance * Math.tan(THREE.MathUtils.degToRad(fov * 0.5)),
      this.minOrthoHalfHeight
    )
    const halfWidth = halfHeight * aspect

    this.orthographicCamera.left = -halfWidth
    this.orthographicCamera.right = halfWidth
    this.orthographicCamera.top = halfHeight
    this.orthographicCamera.bottom = -halfHeight
    this.orthographicCamera.updateProjectionMatrix()
  }
}

function resolveAspect(
  renderer: THREE.WebGLRenderer,
  domElement: HTMLElement
): number {
  const size = renderer.getSize(tempVec2)
  if (size.y > 0) {
    return size.x / size.y
  }

  const { clientWidth, clientHeight } = domElement
  if (clientHeight > 0) {
    return clientWidth / clientHeight
  }

  return 1
}
