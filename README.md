# ThreeJS Tools

A collection of utilities and tools for Three.js development, organized as a monorepo with separate packages for different functionalities. The root `@tonybfox/threejs-tools` package now bundles every tool so you can install a single npm package while still importing submodules (for example `@tonybfox/threejs-tools/camera` or `@tonybfox/threejs-tools/terrain`).

## Packages

- **[@tonybfox/threejs-camera](./packages/camera/)** - Camera utilities and controls
- **[@tonybfox/threejs-grid](./packages/grid/)** - Infinite grid component
- **[@tonybfox/threejs-measurements](./packages/measurements/)** - Measurement tools for 3D scenes
- **[@tonybfox/threejs-asset-loader](./packages/asset-loader/)** - Universal asset loader with progress tracking and caching

## Prerequisites

Make sure you have the following installed on your system:

- **Node.js** (version 16 or higher)
- **pnpm** (recommended package manager)

If you don't have pnpm installed, you can install it globally:

```bash
npm install -g pnpm
```

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/tonybfox/threejs-tools.git
   cd threejs-tools
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

   This will install all dependencies for the root workspace and all packages.

## Building

### Build the publishable bundle

```bash
pnpm build
```

Generates the aggregated `dist/` folder that is published to npm (includes CommonJS, ESM, and type declarations for every tool).

### Build individual workspace packages

```bash
pnpm build:packages
```

Builds each package inside `packages/` – useful for local development and examples.

### Build everything including examples

To build both packages and examples:

```bash
pnpm build:all
```

### Build only examples

To build just the examples:

```bash
pnpm build:examples
```

### Clean build artifacts

To clean all build outputs:

```bash
pnpm clean
```

## Running Examples

The project includes interactive examples demonstrating each package's functionality.

### Development Mode

1. **Install dependencies and build packages:**

   ```bash
   pnpm install
   pnpm build:packages
   ```

2. **Start the development server:**

   ```bash
   cd examples
   pnpm dev
   ```

3. **Open your browser** and navigate to `http://localhost:5173`

### Production Preview

To preview the built examples:

```bash
cd examples
pnpm build
pnpm preview
```

## Examples Overview

### Grid Package Example

- **Location:** `/examples/grid/`
- **Features:**
  - Interactive InfiniteGrid component
  - Adjustable grid size and divisions
  - Multiple grid instances
  - Grid positioning and rotation
- **Controls:** Use the control panel to modify grid properties

### Camera Package Example

- **Location:** `/examples/camera/`
- **Features:**
  - Camera position presets (Front, Side, Top, Isometric)
  - Smooth camera animations
  - Orbit animation mode
  - Perspective vs Orthographic camera switching
  - Real-time camera info display
- **Controls:** Click buttons to change camera views and modes

### Measurements Package Example

- **Location:** `/examples/measurements/`
- **Features:**
  - Distance measurement tool
  - Angle measurement (3-point)
  - Area calculation tool
  - Grid snap functionality
  - Unit switching (meters/feet)
  - Interactive labels
- **Usage:** Select a tool and click in the 3D scene to measure

### Asset Loader Package Example

- **Location:** `/examples/asset-loader/`
- **Features:**
  - Universal loader for GLTF, FBX, and OBJ formats
  - Visual placeholder with shader fill effect
  - Real-time progress tracking
  - Asset caching for performance
  - Optional low-res model loading
  - Event-driven architecture
- **Usage:** Use the control panel to create placeholders and see the loading system in action

### Outline Package Example

- **Location:** `/examples/outline/`
- **Features:**
  - Mesh mode with inverted hull + edge lines (no post-processing)
  - Post-processing mode with ID buffer edge detection
  - Auto-updating outlines for animated objects
  - Smart exclusions for helpers and gizmos
- **Usage:** Toggle outline modes and settings to compare visual styles

### Terrain Package Example

- **Location:** `/examples/terrain/`
- **Features:**
  - Real elevation data terrain mesh generation
  - Configurable resolution and elevation scaling
  - Optional imagery overlay and demo mode
  - Loading events for progress feedback
- **Usage:** Adjust location and terrain settings to update the mesh

### Transform Controls Package Example

- **Location:** `/examples/transform-controls/`
- **Features:**
  - Translate, rotate, and scale gizmo controls
  - Axis and plane constraints
  - World vs local space modes
  - Snap support for precise transforms
- **Usage:** Manipulate objects with the gizmo and toggle modes

### View Helper Package Example

- **Location:** `/examples/view-helper/`
- **Features:**
  - Clickable axis gizmo for quick camera reorientation
  - Configurable size, colors, and labels
  - Smooth animated transitions
- **Usage:** Click axis labels to snap the camera to preset views

### Sun Light Package Example

- **Location:** `/examples/sunlight/`
- **Features:**
  - Real-time sun position from latitude, longitude, and date
  - Weather presets for color and intensity
  - Sunrise/sunset color transitions based on solar altitude
  - Optional system clock sync for live daylight simulation
  - Directional light helper and scene objects to show shadows
- **Usage:** Adjust the control panel to explore lighting scenarios or enable real-time mode

### Compass Package Example

- **Location:** `/examples/compass/`
- **Features:**
  - Stylized compass gizmo with heading, latitude, and longitude
  - Declination slider with live heading updates
  - Location presets plus manual coordinate entry
  - Optional dynamic north resolver
- **Usage:** Move the compass or adjust coordinates to see live updates

### Combined Scene Example

- **Location:** `/examples/combined-scene/`
- **Features:**
  - Terrain, sun lighting, and compass overlay in one scene
  - Optional Mapbox imagery overlay for terrain
  - Interactive control panel for location and lighting
- **Usage:** Use the control panel to explore combined tool behavior

### Interactive Features

Each example includes:

- **Mouse Controls:** Orbit, zoom, and pan with OrbitControls
- **Responsive Design:** Automatic window resize handling
- **Visual Feedback:** Hover effects and interactive elements
- **Real-time Updates:** Live parameter adjustment
- **Performance Monitoring:** Optional FPS and render statistics

### Example Development

#### Shared Utilities

The `/examples/shared/utils.js` file contains common utilities for:

- Scene setup and configuration
- Object creation helpers
- UI component helpers
- Performance monitoring

#### Adding New Examples

1. Create a new folder in `/examples/`
2. Add `index.html` and `main.js` files
3. Update `vite.config.js` to include the new example
4. Update the main `index.html` with a link to your example

#### Configuration

Examples use Vite for development with:

- ES modules support
- Hot module replacement
- Multi-page application setup
- Three.js optimization
- Workspace linking for package imports

## Publishing to npm

Steps to publish the unified `threejs-tools` package:

1. Ensure you are logged in: `pnpm login`
2. Build the bundle: `pnpm build`
3. Publish from the repository root: `pnpm publish --access public`

The published package exposes:

- `@tonybfox/threejs-tools` – combined exports (tree-shakeable)
- `@tonybfox/threejs-tools/<tool>` – direct submodule imports for each tool (`camera`, `terrain`, `measurements`, etc.)

## Development Workflow

### Working on packages

1. **Make changes** to any package in the `packages/` directory
2. **Build the packages:**
   ```bash
   pnpm build
   ```
3. **Test your changes** in the examples:
   ```bash
   cd examples
   pnpm dev
   ```

The examples use workspace references (`workspace:*`), so your local changes will be automatically reflected.

### Adding new packages

1. Create a new directory in `packages/`
2. Add a `package.json` with the `@tonybfox/threejs-*` naming convention
3. The workspace will automatically include it

## Code Formatting

This project uses Prettier for code formatting:

```bash
# Format all files
pnpm format

# Check formatting without making changes
pnpm format:check
```

## Project Structure

```
threejs-tools/
├── packages/                    # Library packages
│   ├── camera/                 # Camera utilities
│   ├── core/                   # Core functionality
│   ├── grid/                   # Grid components
│   └── measurements/           # Measurement tools
├── examples/                   # Interactive examples
│   ├── camera/                 # Camera example
│   ├── grid/                   # Grid example
│   ├── measurements/           # Measurements example
│   └── shared/                 # Shared example utilities
├── package.json                # Root workspace configuration
├── pnpm-workspace.yaml         # pnpm workspace definition
└── tsconfig.json               # TypeScript configuration
```

## Scripts Reference

| Script                | Description                            |
| --------------------- | -------------------------------------- |
| `pnpm build`          | Build all packages (excludes examples) |
| `pnpm build:all`      | Build packages and examples            |
| `pnpm build:examples` | Build only examples                    |
| `pnpm clean`          | Clean all build artifacts              |
| `pnpm format`         | Format all files with Prettier         |
| `pnpm format:check`   | Check code formatting                  |

## Troubleshooting

### Common Issues

1. **Package not found:** Run `pnpm build` from root directory
2. **Vite not starting:** Check Node.js version compatibility (20.18+)
3. **Import errors:** Ensure packages are built and workspace is properly configured
4. **WebGL errors:** Check browser WebGL support

### Performance Tips

- Use the built-in performance monitor in examples
- Test with different device capabilities
- Monitor memory usage with large scenes
- Use appropriate LOD for complex geometries

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and formatting (`pnpm format`)
5. Build packages (`pnpm build`)
6. Test examples (`cd examples && pnpm dev`)
7. Commit your changes (`git commit -m 'Add some amazing feature'`)
8. Push to the branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Issues & Support

If you encounter any issues or have questions:

1. Check existing [GitHub Issues](https://github.com/tonybfox/threejs-tools/issues)
2. Create a new issue with detailed information
3. Include steps to reproduce and expected behavior

---

Made with love for the Three.js community
