# @tonybfox/threejs-asset-loader

A universal asset loader for Three.js with progress tracking, caching, and visual placeholders.

## Features

- **Multi-Format Support:** Load GLTF, FBX, and OBJ model formats
- **Progress Tracking:** Real-time loading progress with events
- **Visual Placeholders:** Semi-transparent cube with shader fill effect while loading
- **Asset Caching:** Automatic caching for better performance
- **Low-Res Loading:** Optional low-resolution model loading for progressive enhancement
- **Event-Driven:** Comprehensive event system for all loading states

## Installation

```bash
npm install @tonybfox/threejs-asset-loader three
# or
pnpm add @tonybfox/threejs-asset-loader three
```

## Usage

### Basic Loading

```typescript
import { AssetLoader } from '@tonybfox/threejs-asset-loader'

const loader = new AssetLoader()

// Load a GLTF model
const asset = await loader.load({
  type: 'gltf',
  url: '/models/my-model.gltf',
})

scene.add(asset)
```

### With Placeholder

```typescript
const asset = await loader.load({
  type: 'gltf',
  url: '/models/my-model.gltf',
  size: [3, 3, 3], // Placeholder dimensions
  placeholderColor: 0x4fc3f7,
  placeholderOpacity: 0.3,
})
```

### With Progress Tracking

```typescript
loader.addEventListener('progress', (event) => {
  console.log(`Loading: ${event.percentage.toFixed(2)}%`)
})

loader.addEventListener('loaded', (event) => {
  scene.add(event.asset)
})

loader.addEventListener('error', (event) => {
  console.error('Loading failed:', event.error)
})

await loader.load({
  type: 'fbx',
  url: '/models/my-model.fbx',
})
```

### With Low-Res Model

```typescript
loader.addEventListener('lowResLoaded', (event) => {
  scene.add(event.lowRes)
})

await loader.load({
  type: 'gltf',
  url: '/models/high-res.gltf',
  lowResUrl: '/models/low-res.gltf',
  size: [3, 3, 3],
})
```

### Caching

```typescript
// Enable caching (default: true)
await loader.load({
  type: 'obj',
  url: '/models/my-model.obj',
  enableCaching: true,
})

// Check cache size
console.log(`Cached items: ${loader.getCacheSize()}`)

// Clear cache
loader.clearCache()

// Remove specific item from cache
loader.removeFromCache('/models/my-model.obj')
```

## API

### AssetLoader

#### Constructor

```typescript
new AssetLoader()
```

#### Methods

##### `load(options: AssetLoaderOptions): Promise<THREE.Object3D>`

Load an asset with the specified options.

**Options:**

- `type` (required): Asset type - `'gltf'`, `'fbx'`, or `'obj'`
- `url` (required): URL to the model file
- `size`: Optional `[width, height, depth]` for placeholder
- `lowResUrl`: Optional URL for low-resolution version
- `enableCaching`: Enable/disable caching (default: `true`)
- `placeholderColor`: Placeholder color (default: `0x4fc3f7`)
- `placeholderOpacity`: Placeholder opacity (default: `0.3`)

##### `getPlaceholder(): THREE.Object3D | null`

Get the current placeholder object.

##### `getAsset(): THREE.Object3D | null`

Get the loaded asset.

##### `getLowResAsset(): THREE.Object3D | null`

Get the low-resolution asset.

##### `clearCache(): void`

Clear all cached assets.

##### `removeFromCache(url: string): void`

Remove a specific asset from cache.

##### `getCacheSize(): number`

Get the number of cached items.

#### Events

The loader extends `THREE.EventDispatcher` and emits the following events:

- **`placeholderCreated`**: Fired when placeholder is created

  ```typescript
  {
    placeholder: THREE.Object3D
  }
  ```

- **`progress`**: Fired during loading progress

  ```typescript
  { loaded: number, total: number, percentage: number }
  ```

- **`lowResLoaded`**: Fired when low-res model is loaded

  ```typescript
  {
    lowRes: THREE.Object3D
  }
  ```

- **`loaded`**: Fired when main asset is loaded

  ```typescript
  {
    asset: THREE.Object3D
  }
  ```

- **`error`**: Fired on loading error
  ```typescript
  {
    error: Error
  }
  ```

## Placeholder Shader

The placeholder uses a custom shader material with a fill-up effect that animates based on loading progress:

- Semi-transparent cube with configurable color and opacity
- Gradient fill effect from bottom to top
- Edge glow for better visibility
- Automatically updates with loading progress

## Example

See the [examples/asset-loader](../../examples/asset-loader) directory for a complete interactive demo.

## License

MIT
