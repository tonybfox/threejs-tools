import * as THREE from 'three'

// Define custom event types
interface InfiniteGridEventMap {
  subdivisionsChanged: { subdivisions: number }
  divisionsChanged: { divisions: number }
  colorChanged: {
    color: THREE.Color | number
    colorType: 'color1' | 'color2' | 'fog'
  }
  fogChanged: { property: 'near' | 'far'; value: number }
}

export class InfiniteGrid extends THREE.Object3D {
  subdivisions: number
  divisions: number
  gridMaterial: THREE.ShaderMaterial
  private eventDispatcher: THREE.EventDispatcher<InfiniteGridEventMap>

  constructor(divisions: number = 1, subdivisions: number = 10) {
    super()

    // Create an internal EventDispatcher for custom events
    this.eventDispatcher = new THREE.EventDispatcher<InfiniteGridEventMap>()
    this.divisions = divisions
    this.subdivisions = subdivisions

    // Create a custom grid shader material
    const gridSize = 100

    // Create a plane for the grid
    const gridGeometry = new THREE.PlaneGeometry(
      gridSize * 2,
      gridSize * 2,
      1,
      1
    )

    // Custom grid shader material
    this.gridMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uSize1: { value: this.divisions / this.subdivisions },
        uSize2: { value: this.divisions },
        uColor1: { value: new THREE.Color(0x444444) },
        uColor2: { value: new THREE.Color(0x666666) },
        uFogColor: { value: new THREE.Color(0x2a2a2a) },
        uFogNear: { value: 20.0 },
        uFogFar: { value: 60.0 },
      },
      vertexShader: `
   varying vec3 worldPosition;
   
   void main() {
     worldPosition = position.xzy;
     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
   }
 `,
      fragmentShader: `
   uniform float uSize1;
   uniform float uSize2;
   uniform vec3 uColor1;
   uniform vec3 uColor2;
   uniform vec3 uFogColor;
   uniform float uFogNear;
   uniform float uFogFar;
   
   varying vec3 worldPosition;
   
   float getGrid(float size) {
     vec2 r = worldPosition.xz / size;
     vec2 grid = abs(fract(r - 0.5) - 0.5) / fwidth(r);
     float line = min(grid.x, grid.y);
     return 1.0 - min(line, 1.0);
   }
   
   void main() {
     float d = 1.0 - min(distance(vec3(0.0, 0.0, 0.0), worldPosition) / uFogFar, 1.0);
     
     float g1 = getGrid(uSize1);
     float g2 = getGrid(uSize2);
     
     vec3 color = mix(uColor1, uColor2, g2);
     gl_FragColor = vec4(color, (g1 + g2) * d);
     
     // Apply fog
     float fogFactor = smoothstep(uFogNear, uFogFar, length(worldPosition));
     gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogColor, fogFactor);
   }
 `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    })

    // Create the grid mesh
    const gridMesh = new THREE.Mesh(gridGeometry, this.gridMaterial)
    gridMesh.renderOrder = -1
    gridMesh.rotation.x = -Math.PI / 2
    this.add(gridMesh)
    // return gridMesh;
  }

  setSubdivisions(subdivisions: number): void {
    this.subdivisions = subdivisions
    this.gridMaterial.uniforms.uSize1.value = this.divisions / this.subdivisions
    this.eventDispatcher.dispatchEvent({
      type: 'subdivisionsChanged',
      subdivisions,
    })
  }

  setDivisions(divisions: number): void {
    this.divisions = divisions
    this.gridMaterial.uniforms.uSize1.value = this.divisions / this.subdivisions
    this.gridMaterial.uniforms.uSize2.value = this.divisions
    this.eventDispatcher.dispatchEvent({ type: 'divisionsChanged', divisions })
  }

  setColor1(color: THREE.Color | number): void {
    if (typeof color === 'number') {
      this.gridMaterial.uniforms.uColor1.value.setHex(color)
    } else {
      this.gridMaterial.uniforms.uColor1.value.copy(color)
    }
    this.eventDispatcher.dispatchEvent({
      type: 'colorChanged',
      color,
      colorType: 'color1',
    })
  }

  setColor2(color: THREE.Color | number): void {
    if (typeof color === 'number') {
      this.gridMaterial.uniforms.uColor2.value.setHex(color)
    } else {
      this.gridMaterial.uniforms.uColor2.value.copy(color)
    }
    this.eventDispatcher.dispatchEvent({
      type: 'colorChanged',
      color,
      colorType: 'color2',
    })
  }

  setFogColor(color: THREE.Color | number): void {
    if (typeof color === 'number') {
      this.gridMaterial.uniforms.uFogColor.value.setHex(color)
    } else {
      this.gridMaterial.uniforms.uFogColor.value.copy(color)
    }
    this.eventDispatcher.dispatchEvent({
      type: 'colorChanged',
      color,
      colorType: 'fog',
    })
  }

  setFogNear(near: number): void {
    this.gridMaterial.uniforms.uFogNear.value = near
    this.eventDispatcher.dispatchEvent({
      type: 'fogChanged',
      property: 'near',
      value: near,
    })
  }

  setFogFar(far: number): void {
    this.gridMaterial.uniforms.uFogFar.value = far
    this.eventDispatcher.dispatchEvent({
      type: 'fogChanged',
      property: 'far',
      value: far,
    })
  }

  // Custom event listener methods (prefixed to avoid conflicts with Object3D)
  addGridEventListener<K extends keyof InfiniteGridEventMap>(
    type: K,
    listener: (event: InfiniteGridEventMap[K] & { type: K }) => void
  ): void {
    this.eventDispatcher.addEventListener(type, listener)
  }

  removeGridEventListener<K extends keyof InfiniteGridEventMap>(
    type: K,
    listener: (event: InfiniteGridEventMap[K] & { type: K }) => void
  ): void {
    this.eventDispatcher.removeEventListener(type, listener)
  }

  hasGridEventListener<K extends keyof InfiniteGridEventMap>(
    type: K,
    listener: (event: InfiniteGridEventMap[K] & { type: K }) => void
  ): boolean {
    return this.eventDispatcher.hasEventListener(type, listener)
  }
}
