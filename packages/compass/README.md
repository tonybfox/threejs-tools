# Three.js Compass Tool

`@tonybfox/threejs-compass` provides a reusable compass gizmo for Three.js scenes. Supply geographic coordinates and world position, and the tool renders a stylised compass base with a north-pointing arrow that emits heading change events when you move it or adjust the declination.

## Installation

```bash
pnpm add @tonybfox/threejs-compass three
```

## Usage

```ts
import * as THREE from 'three'
import { CompassTool } from '@tonybfox/threejs-compass'

const scene = new THREE.Scene()
const compass = new CompassTool(scene, {
  latitude: 37.7749,
  longitude: -122.4194,
  position: new THREE.Vector3(0, 0, 0),
  headingOffsetDegrees: 13.5, // optional magnetic declination
})

compass.addEventListener('headingChanged', (event) => {
  console.log('Heading:', event.headingDegrees.toFixed(2))
})
```

### Options

- `latitude` / `longitude`: Geographic metadata stored with the compass. Defaults to `0`.
- `position`: Initial world position (`THREE.Vector3` or tuple). Defaults to the origin.
- `arrowLength`, `shaftRadius`, `baseRadius`, `baseHeight`: Size controls with sensible defaults.
- `arrowColor`, `baseColor`, `accentColor`, `ringColor`: Material customisation.
- `headingOffsetDegrees`: Rotate the arrow around the up axis (useful for magnetic declination).
- `worldNorth`, `worldUp`: Override the reference vectors if your scene uses a different basis.
- `getNorthDirection`: Provide a custom function to resolve the north direction from latitude/longitude.
- `autoAddToScene`: Automatically parent the compass to the supplied scene (enable for world objects, disable for HUD/overlay rendering).

### API Highlights

- `setLocation(latitude, longitude)` / `setPosition(vector)` to move the compass.
- `setHeadingOffsetDegrees(value)` to adjust declination.
- `getState()` for the current position, direction, and heading metadata.
- `getObject3D()` to attach the compass group to custom scenes or overlay viewports.
- Events: `locationChanged`, `positionChanged`, `headingChanged`, `visibilityChanged`.

## Building

```bash
pnpm --filter @tonybfox/threejs-compass build
```

This compiles the TypeScript sources into CJS, ESM, and `.d.ts` bundles via `tsup`.
