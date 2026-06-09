# Transmission Line Routing Tool — Student Guide

**For Electrical Engineering Students**  
*A teaching guide for understanding this project without being an expert programmer*

**Case study:** Olwiyo (Uganda) → South Sudan Border — 400 kV interconnection  
**Client context:** Uganda Electricity Transmission Company Limited (UETCL)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Objectives](#2-project-objectives)
3. [System Overview](#3-system-overview)
4. [Architecture Overview](#4-architecture-overview)
5. [Folder Structure Explained](#5-folder-structure-explained)
6. [Important Files and Their Roles](#6-important-files-and-their-roles)
7. [Key Code Walkthrough](#7-key-code-walkthrough)
8. [Data Flow Through the System](#8-data-flow-through-the-system)
9. [Core Features Explained](#9-core-features-explained)
10. [Technologies Used and Why](#10-technologies-used-and-why)
11. [How to Run the Project](#11-how-to-run-the-project)
12. [Frequently Asked Questions](#12-frequently-asked-questions)
13. [Glossary of Technical Terms](#13-glossary-of-technical-terms)
14. [Appendix: Cleanup Report](#14-appendix-cleanup-report)

---

## 1. Executive Summary

This project is a **web application** that helps engineers plan high-voltage transmission line routes across Uganda. Instead of manually drawing a line on a map and hoping it avoids towns, wetlands, and steep terrain, the software:

1. Loads real **GIS data** (maps of roads, rivers, protected areas, schools, etc.)
2. Builds a **cost surface** — a grid where every cell has a "difficulty score" for building a line through it
3. Uses **pathfinding algorithms** (Dijkstra or A\*) to find the lowest-cost route between two points
4. **Validates** the route against engineering rules (tower spacing, corridor width)
5. **Estimates costs** and displays results on an interactive map

Think of it as **GPS navigation for power lines**: the algorithm does not just find the shortest path — it finds the path that balances construction cost, environmental impact, and engineering feasibility.

**Who is this for?** Electrical engineering students who understand transmission lines, towers, and right-of-way — but may not be comfortable reading Python or JavaScript source code.

**What you need to know:** Basic engineering concepts (voltage levels, tower spans, ROW). No advanced programming required to *use* the tool; this guide explains how it works under the hood.

---

## 2. Project Objectives

### The Engineering Problem

Planning a 400 kV line from Olwiyo to the South Sudan border involves balancing many competing factors:

| Factor | Why it matters |
|--------|----------------|
| **Terrain slope** | Steep hills need taller, more expensive towers |
| **Settlements** | Crossing towns means expensive land acquisition and social impact |
| **Protected areas** | National parks and wetlands have legal restrictions |
| **Water bodies** | Rivers and lakes need special foundations or long spans |
| **Existing infrastructure** | Roads help access; existing lines may share corridors |
| **Tower spacing** | 400 kV lattice towers typically span 300–450 m |

Doing this manually on paper maps takes weeks and is error-prone. A wrong route can cost millions in extra towers and land compensation.

### What This Software Achieves

| Objective | How the system addresses it |
|-----------|----------------------------|
| **Automate route selection** | Dijkstra / A\* algorithms search thousands of path options in seconds |
| **Apply multi-criteria weighting** | AHP (Analytic Hierarchy Process) sliders let engineers prioritize factors |
| **Use real Uganda data** | Shapefiles and DEM tiles from `data/` folders |
| **Enforce engineering rules** | Tower spacing (300–450 m), 60 m corridor, slope limits |
| **Provide visual feedback** | Interactive Leaflet map, elevation profile, cost breakdown |
| **Support export** | GeoJSON and XYZ (UTM coordinates) for use in other tools |

### Design Constraints Built Into the Code

These values come directly from `config.py` and reflect the UETCL case study:

- **Voltage:** 400 kV
- **Tower type:** Steel lattice (default)
- **Corridor width:** 60 m (10 m ROW + 25 m wayleave each side)
- **Tower span range:** 300–450 m
- **Maximum slope:** 30°
- **Minimum ground clearance:** 7.6 m (for 400 kV)

---

## 3. System Overview

At the highest level, the system has three layers:

```
┌─────────────────────────────────────────────────────────────┐
│  YOU (the engineer)                                         │
│  Set start/end points, adjust weights, click "Optimize"     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (Browser)                                         │
│  dashboard.html + map.js + optimize.js + layer_manager.js   │
│  Shows the map, sends your choices to the server              │
└──────────────────────────┬──────────────────────────────────┘
                           │  HTTP requests (JSON)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND (Python / Flask)                                   │
│  routes_api.py, optimizer/, services/                       │
│  Loads GIS data, builds cost surface, finds route, saves    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  DATABASE + DATA FILES                                      │
│  transmission_routing.db (SQLite) + data/ shapefiles/DEM    │
└─────────────────────────────────────────────────────────────┘
```

### A Typical Session (What Happens When You Use It)

1. You **register** and **log in** through the web page.
2. On the **dashboard**, you name your project and set start/end coordinates (click the map or type lat/lon).
3. You adjust **AHP weight sliders** — for example, increase "Protected Areas" if environmental impact is the top priority.
4. You click **Optimize Route**.
5. The browser sends your settings to the server.
6. The server loads GIS layers, builds a cost grid, runs Dijkstra or A\*, validates the result, and saves it.
7. The route appears on the map with length, tower count, cost estimate, and charts.

**Analogy:** You are the project manager giving instructions. The browser is your assistant who writes them down. The Python server is the engineering team that does the analysis. The database and `data/` folder are the filing cabinets.

---

## 4. Architecture Overview

### The Four Main Backend Pieces

```
run.py
  └── app/__init__.py  (create_app)
        ├── auth.py          → Login / Register
        ├── views.py         → Dashboard page
        ├── routes_api.py    → Main API (optimize, export, GIS layers)
        ├── routes_qgis_api.py → Alternate QGIS-style pipeline (not used by dashboard)
        └── models.py        → Database tables (User, Project, Route, CostSurface)
```

### Blueprints (Route Groups)

A **blueprint** is Flask's way of organizing related URLs. This project registers five:

| Blueprint | URL prefix | Purpose |
|-----------|------------|---------|
| `main_bp` | `/` | Home page redirect, dashboard |
| `auth_bp` | `/auth` | Register, login, logout |
| `api_bp` | `/api` | Projects, optimization, GIS layers, export |
| `qgis_api_bp` | `/api/qgis` | Alternate cost-surface pipeline |
| `cost_surface_bp` | `/` | Standalone QGIS endpoints (legacy) |

**Important:** The dashboard only uses `auth_bp`, `main_bp`, and `api_bp`. The QGIS blueprints exist for an alternate workflow that is not wired into the current UI.

### The Optimization Engine (Backend Modules)

```
routes_api.py  (optimize_route)
      │
      ├── gis_data_loader.py     Load DEM + vector layers as numpy grids
      ├── cost_surface.py        Combine layers using AHP weights → cost grid
      ├── dijkstra.py  OR        Find lowest-cost path on the grid
      │   astar.py
      ├── engineering_validation.py   Tower placement, cost estimate, rules check
      └── elevation_sampling.py  Sample heights along the route for charts
```

### The Map Display (Frontend Modules)

```
dashboard.html
      │
      ├── map.js           Leaflet map, markers, route display, layer loading
      ├── layer_manager.js Checkbox toggles for GIS layers
      ├── optimize.js      AHP sliders, optimize button, results charts, export
      └── qgis_tools.js    Coordinate readout, attribute table on click
```

### How Modules Communicate

| From | To | Method |
|------|-----|--------|
| Browser (`optimize.js`) | Server (`routes_api.py`) | `fetch()` HTTP POST/GET with JSON |
| `routes_api.py` | `gis_data_loader.py` | Direct Python function call |
| `gis_data_loader.py` | `data/` folder | Reads shapefiles / GeoTIFF on disk |
| `routes_api.py` | `models.py` | SQLAlchemy saves Project, Route, CostSurface |
| Browser (`map.js`) | Server | `GET /api/gis/layers/<name>` for map overlays |
| `uganda_gis_loader.py` | `data/` + OSM API | Shapefile → GeoJSON for map display |

---

## 5. Folder Structure Explained

```
transmission_routing_tool/
│
├── run.py                  ← START HERE: launches the web server
├── config.py               ← All engineering constants and folder paths
├── requirements.txt        ← Python packages to install
├── .env.example            ← Template for secret keys (copy to .env)
├── transmission_routing.db ← SQLite database (created automatically)
│
├── app/                    ← All server-side Python code
│   ├── __init__.py         ← Creates the Flask app, registers blueprints
│   ├── models.py           ← Database table definitions
│   ├── auth.py             ← User login and registration
│   ├── views.py            ← Serves the dashboard HTML page
│   ├── routes_api.py       ← Main API (optimization, export, GIS)
│   ├── routes_qgis_api.py  ← Alternate QGIS API (not used by dashboard)
│   ├── optimizer/          ← Routing algorithms and cost surface math
│   └── services/           ← GIS data loading helpers
│
├── templates/              ← HTML pages the server sends to your browser
│   ├── login.html
│   ├── register.html
│   └── dashboard.html      ← Main application interface
│
├── static/                 ← CSS, JavaScript, images (loaded by browser)
│   ├── css/style.css
│   ├── js/map.js, optimize.js, layer_manager.js, qgis_tools.js
│   └── images/             ← UETCL logo, login background
│
├── data/                   ← GIS shapefiles, DEM tiles, cached cost surfaces
│   ├── uganda_districts/   ← District boundaries (basemap)
│   ├── protected_areas/    ← National parks, reserves
│   ├── rivers/, wetlands/, lakes/
│   ├── roads/, elevation/
│   ├── transmission_lines/, substations/
│   ├── schools/, health_facilities/, commercial_facilities/
│   ├── land_use/, dem/, cache/
│   └── cost_surface_project_*.tif  ← Saved optimization grids (cache)
│
└── utilities/              ← One-time setup scripts (optional)
    ├── download_srtm_uganda.py
    ├── setup_shapefiles.py
    └── README.md
```

### What Each Top-Level Folder Does

| Folder | Role | Analogy |
|--------|------|---------|
| `app/` | The "brain" — all computation and API logic | Engineering office |
| `templates/` | HTML skeletons for web pages | Printed forms you fill in |
| `static/` | Files the browser downloads (JS, CSS, images) | Instruction manuals at your desk |
| `data/` | Geographic information (maps as files) | Survey maps and elevation models |
| `utilities/` | Scripts to download or organize data | Supply department (one-time setup) |

### The `data/` Subfolders (GIS Layers)

Each subfolder holds **shapefiles** (`.shp` + companion files) or **GeoTIFF** rasters. The server reads these when building cost surfaces or drawing map layers.

| Folder | Contents | Used for |
|--------|----------|----------|
| `dem/` | SRTM elevation tiles (`.tif`) | Slope / topography cost |
| `protected_areas/` | `protected_areas_60.shp` | Environmental avoidance |
| `rivers/`, `wetlands/`, `lakes/` | Water features | Water crossing cost |
| `roads/` | `Ug_Roads_UNRA_2012.shp` | Access corridor preference |
| `schools/` | `Ug_Schools ORIGINAL.shp` | Settlement proximity |
| `health_facilities/` | Hospitals/clinics | Public infrastructure buffer |
| `commercial_facilities/` | Shops, markets | Built-up area cost |
| `land_use/` | OSM land use polygons | Agriculture vs urban cost |
| `transmission_lines/` | Existing UETCL lines | Corridor sharing |
| `substations/` | UETCL substation points | Connection points |
| `planned_routes/` | Option 2_Uganda planned transmission route | Reference alignment overlay |
| `uganda_districts/` | District boundaries | Map basemap |
| `cache/` | Cached API responses | Speed up repeated requests |

---

## 6. Important Files and Their Roles

### Entry Point and Configuration

#### `run.py`
- **Purpose:** Starts the Flask web server on port 5000.
- **Why it exists:** Every Python web app needs a single entry point you can run with `python run.py`.
- **Interactions:** Imports `create_app()` from `app/__init__.py`, creates data folders, calls `app.run()`.
- **Key section:** Lines 19–34 start the server and ensure `data/` subfolders exist.

#### `config.py`
- **Purpose:** Central store for all engineering constants, folder paths, and default AHP weights.
- **Why it exists:** Keeps magic numbers out of the rest of the code — change tower span here, and the whole app updates.
- **Interactions:** Imported by every module that needs paths (`DATA_FOLDER`, `DEM_FOLDER`, etc.) or engineering limits.
- **Critical values students should know:**
  - `DEFAULT_AHP_WEIGHTS` — default priority of settlements, protected areas, water, etc.
  - `MIN_TOWER_SPAN` / `MAX_TOWER_SPAN` — 300 m and 450 m
  - `TOTAL_CORRIDOR_WIDTH` — 60 m
  - `COST_ESTIMATION` — dollar amounts for towers, conductor, ROW per km

---

### Application Core (`app/`)

#### `app/__init__.py` — Application Factory
- **Purpose:** Builds the Flask app, connects the database, registers all route blueprints.
- **Why it exists:** Separates "how to create the app" from "how to run it" — standard Flask pattern.
- **Interactions:** Called by `run.py`; imports `routes_api`, `auth`, `views`, `models`.
- **Key function:** `create_app(config_name)` — returns a fully configured Flask instance.

#### `app/models.py` — Database Tables
- **Purpose:** Defines four database tables as Python classes.
- **Why it exists:** Persists users, projects, routes, and cost surfaces between sessions.

| Class | Table | What it stores |
|-------|-------|----------------|
| `User` | `users` | Username, email, hashed password, organization |
| `Project` | `projects` | Start/end coords, AHP weights, waypoints, status |
| `Route` | `routes` | Optimized path as GeoJSON, length, cost, tower count |
| `CostSurface` | `cost_surfaces` | Path to saved `.tif` cost grid file |

- **Interactions:** Used by `auth.py` (User), `routes_api.py` (Project, Route, CostSurface).
- **Key methods:** `set_password()` / `check_password()` on User; `get_ahp_weights()` / `set_ahp_weights()` on Project.

#### `app/auth.py` — Authentication
- **Purpose:** Register, login, logout, session management.
- **Why it exists:** Projects belong to users; optimization endpoints require login.
- **Interactions:** Uses `User` model; redirects to dashboard after login.
- **Routes:** `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/user`.

#### `app/views.py` — Web Pages
- **Purpose:** Serves HTML pages (not JSON APIs).
- **Routes:**
  - `GET /` — redirect to dashboard if logged in, else login
  - `GET /dashboard` — renders `dashboard.html` with map API keys

#### `app/routes_api.py` — Main API (Most Important File)
- **Purpose:** Handles project creation, route optimization, GIS layer delivery, export.
- **Why it exists:** This is where the engineering computation is orchestrated.
- **Interactions:** Imports optimizer modules, GIS loaders, database models.
- **Key endpoints:**

| Endpoint | What it does |
|----------|--------------|
| `POST /api/projects` | Save a new project with start/end and weights |
| `POST /api/projects/<id>/optimize` | **Main optimization** — cost surface + pathfinding |
| `POST /api/projects/<id>/generate-towers` | Place towers along saved route |
| `GET /api/gis/layers/<name>` | GeoJSON for map checkbox layers |
| `GET /api/routes/<id>/export` | Download GeoJSON or XYZ |
| `GET /api/routes/<id>/corridor` | 60 m corridor polygon + land area |

---

### Optimizer (`app/optimizer/`)

#### `cost_surface.py` — `CostSurfaceGenerator`
- **Purpose:** Combines multiple GIS layers into one cost grid using AHP weights.
- **Why it exists:** Pathfinding needs a single number per grid cell — this class produces it.
- **How it works (simplified):**
  1. Divide the study area into a grid (e.g., 30 m cells).
  2. For each layer (DEM, land use, settlements…), compute a 0–100 cost array.
  3. Multiply each layer by its AHP weight and sum them.
  4. Normalize to 0–100.
- **Analogy:** Like a report card where each subject (layer) has a weight — the final grade is the weighted average of difficulty scores.

#### `dijkstra.py` — `LeastCostPathFinder`
- **Purpose:** Finds the absolute lowest-cost path on the grid.
- **Why it exists:** Classic, guaranteed-optimal pathfinding for cost surfaces.
- **Behavior:** Explores cells in order of accumulated cost; never revisits a cell with a higher cost. Cells with cost ≥ 99 are impassable.
- **Also provides:** `smooth_path_los()` (line-of-sight smoothing), `simplify_path()`, `path_to_coordinates()`.

#### `astar.py` — `AStarPathFinder`
- **Purpose:** Faster, more direct paths using a heuristic (estimated distance to goal).
- **Why it exists:** Dijkstra explores uniformly in all directions; A\* is biased toward the endpoint, producing straighter routes.
- **Trade-off:** May not be perfectly optimal on cost, but often looks more like a real transmission corridor.

#### `engineering_validation.py` — `EngineeringValidator`
- **Purpose:** Checks engineering rules and estimates costs.
- **Key functions:**
  - `validate_route()` — checks span lengths, slope (placeholder without full DEM sampling)
  - `generate_tower_positions()` — places towers every 300–450 m along the route
  - `calculate_detailed_costs()` — tower + conductor + foundation + ROW + contingency

#### `qgis_cost_surface.py` — `QGISStyleCostSurfaceAnalyzer`
- **Purpose:** Alternate cost-surface pipeline mimicking QGIS Multi-Criteria Evaluation.
- **Status:** Used by `/api/qgis/*` endpoints only — **not** by the dashboard optimize button.

#### `qgis_routing_workflow.py` — `QGISRoutingWorkflow`
- **Status:** **Unused** — import is commented out in `routes_api.py`.

#### `qgis_workflow_example.py`
- **Status:** Standalone demo script — not connected to the web app.

---

### Services (`app/services/`)

#### `gis_data_loader.py`
- **Purpose:** Loads real GIS files from `data/` and converts them to numpy arrays for optimization.
- **Key function:** `load_layers_for_bounds(config, bounds, out_shape)` — returns a dictionary of layer arrays.
- **Interactions:** Called by `optimize_route()` in `routes_api.py`.
- **Fallback:** If files are missing, `routes_api.py` creates synthetic demo layers.

#### `uganda_gis_loader.py` — `UgandaGISLoader`
- **Purpose:** Loads shapefiles as GeoJSON for **map display** (not optimization grids).
- **Key function:** `load_layer_geojson(layer_name, bounds)` — reads `.shp`, simplifies, filters to viewport.
- **Fallback:** If local file missing, queries OpenStreetMap Overpass API and caches result in `data/cache/`.

#### `dem_loader.py` — `MultiTileDEMLoader`
- **Purpose:** Merges multiple SRTM elevation tiles into one array for the study area.
- **Interactions:** Used by `gis_data_loader.py` and `elevation_sampling.py`.

#### `elevation_sampling.py`
- **Purpose:** Samples elevation at each point along the optimized route for the elevation profile chart.
- **Key functions:** `sample_elevations_m()`, `downsample_for_chart()`.

#### `corridor_restriction.py` — `CorridorRestrictionService`
- **Purpose:** Generates the 60 m corridor polygon around the route and calculates land acquisition area.
- **Used by:** `GET /api/routes/<id>/corridor`.

---

### Frontend (`templates/` + `static/js/`)

#### `templates/dashboard.html`
- **Purpose:** The entire application UI after login.
- **Contains:** Project form, AHP sliders, optimize button, map container, layer checkboxes, results panel.
- **Loads:** `map.js`, `optimize.js`, `layer_manager.js`, `qgis_tools.js`, Leaflet, Chart.js.

#### `static/js/optimize.js`
- **Purpose:** Handles the optimization workflow from the browser side.
- **Key functions:**
  - `optimizeRoute()` — creates project, calls optimize API, displays results
  - `setupWeightSliders()` — keeps AHP weights summing to 1.0
  - `displayResults()` — shows metrics, builds Chart.js charts
  - `exportRoute()` — downloads GeoJSON or XYZ
  - `viewCorridor()` — fetches and draws 60 m corridor

#### `static/js/map.js`
- **Purpose:** Leaflet map setup, start/end markers, route drawing, GIS layer rendering.
- **Key functions:**
  - `initMap()` — creates map centered on Uganda
  - `setStartPoint()` / `setEndPoint()` — draggable markers
  - `loadGISLayer()` — fetches GeoJSON from `/api/gis/layers/<name>`
  - `displayRoute()` / `displayTowers()` — draws optimization output

#### `static/js/layer_manager.js`
- **Purpose:** Connects the 15 layer checkboxes to `loadGISLayer()`.
- **Key functions:** `initLayerCheckboxes()`, `toggleLayer()`, `clearAllLayers()`.

#### `static/js/qgis_tools.js`
- **Purpose:** Shows mouse coordinates and scale on the status bar; attribute table when you click a feature.

---

## 7. Key Code Walkthrough

This section explains the **most important code paths** in plain language. You do not need to read every line — focus on understanding the flow.

### Walkthrough 1: Starting the Application

**File:** `run.py`

```python
from app import create_app
config_name = os.getenv('FLASK_CONFIG', 'development')
app = create_app(config_name)
app.run(host='0.0.0.0', port=5000, debug=app.config['DEBUG'])
```

**What happens:**
1. Python loads environment variables from `.env` (if present).
2. `create_app()` builds Flask, connects SQLite, registers routes.
3. The server listens on port 5000 — your browser connects to `http://localhost:5000`.

---

### Walkthrough 2: User Login

**File:** `app/auth.py` → `login()`

1. User submits username + password via HTML form.
2. Server looks up `User` in the database.
3. `user.check_password(password)` compares against the stored hash.
4. Flask-Login creates a **session cookie** — the browser sends this with every subsequent request.
5. Protected API routes (`@login_required`) reject requests without a valid session.

**Analogy:** Like showing your ID badge at the office entrance — once verified, you can access all rooms.

---

### Walkthrough 3: Creating a Project (Browser → Server)

**File:** `static/js/optimize.js` → `optimizeRoute()` (first step)

When you click "Optimize Route", the browser first sends:

```javascript
fetch('/api/projects', {
    method: 'POST',
    body: JSON.stringify({
        name: projectName,
        start: { lat, lon, name },
        end: { lat, lon, name },
        ahp_weights: ahpWeights,
        waypoints: waypoints
    })
})
```

**File:** `app/routes_api.py` → `create_project()`

1. Validates that `name`, `start`, and `end` are present.
2. Creates a `Project` row in the database.
3. Stores AHP weights as JSON text.
4. Returns `{ id: 42, ... }` — the project ID used in the next step.

---

### Walkthrough 4: The Optimization Pipeline (Heart of the System)

**File:** `app/routes_api.py` → `optimize_route(project_id)`

This function runs when the browser calls `POST /api/projects/<id>/optimize`.

**Step 1 — Load the project and mark it "processing"**
```python
project = Project.query.get_or_404(project_id)
project.status = 'processing'
```

**Step 2 — Determine the study area (bounding box)**
- Collects coordinates of start, end, and any waypoints.
- Adds a margin around them (larger margin for routes over 100 km).
- Result: `bounds = [min_lon, min_lat, max_lon, max_lat]`

**Step 3 — Choose grid resolution (memory management)**
- Starts at 30 m per cell.
- If the grid would exceed ~1.5 million cells, resolution is increased (coarser grid).
- If still too large, returns an error asking the user to add waypoints to break the route into segments.

**Why this matters:** A 200 km route at 30 m resolution could need gigabytes of RAM. The code automatically trades precision for feasibility.

**Step 4 — Load GIS layers**
```python
layers_data = load_layers_for_bounds(config, bounds, shape)
```
- Reads DEM tiles, land use rasters, and vector shapefiles from `data/`.
- Converts vectors to presence grids (marks cells that contain a feature).
- If nothing loads, falls back to `_create_demo_layers()` — synthetic data so the demo still works.

**Step 5 — Normalize AHP weights**
- Maps UI slider names to backend layer names (e.g., `elevation` → `topography`, `rivers` → `water`).
- Applies exponential boost so high-priority layers have stronger influence.

**Step 6 — Build the cost surface**
```python
generator = CostSurfaceGenerator(config)
composite_cost, metadata = generator.generate_composite_cost_surface(
    bounds, ahp_weights, layers_data, resolution=res, grid_shape=shape
)
```
- Each layer contributes a weighted cost array.
- Arrays are summed and normalized to 0–100.
- Saved as `data/cost_surface_project_<id>.tif` and recorded in `CostSurface` table.

**Step 7 — Pathfinding**
```python
# For each segment: start → waypoint₁ → waypoint₂ → ... → end
finder = LeastCostPathFinder(cost_array)  # or AStarPathFinder
path_pixels = finder.find_path(start_pixel, end_pixel)
path_pixels = finder.smooth_path_los(path_pixels)
coords = finder.path_to_coordinates(path_pixels, bounds)
```
- Converts lat/lon to grid row/column indices.
- Finds lowest-cost path through the grid.
- Smooths jagged pixel steps.
- Converts back to geographic coordinates.

**Step 8 — Engineering validation and cost estimate**
```python
validator = EngineeringValidator(config)
validation = validator.validate_route(coords)
towers = validator.generate_tower_positions(coords)
costs = validator.calculate_detailed_costs(coords, towers)
```

**Step 9 — Save and respond**
- Creates a `Route` record with GeoJSON geometry, length, tower count, validation status.
- Sets `project.status = 'completed'`.
- Returns JSON to the browser with route, towers, charts data, cost breakdown.

---

### Walkthrough 5: Displaying GIS Layers on the Map

**File:** `static/js/layer_manager.js` → user checks "Protected Areas"

1. `toggleLayer('protected_areas', true)` runs.
2. Calls `loadGISLayer('protected_areas')` in `map.js`.
3. Browser requests: `GET /api/gis/layers/protected_areas?min_lon=...&max_lon=...`
4. Server (`routes_api.py` → `get_gis_layer()`) calls `UgandaGISLoader.load_layer_geojson()`.
5. Loader reads `data/protected_areas/protected_areas_60.shp`, converts to GeoJSON, filters to viewport.
6. Browser draws colored polygons on the Leaflet map.

**Note:** Map layers and optimization layers use **different loaders** — the map shows detailed shapes; optimization uses simplified raster grids.

---

### Walkthrough 6: Cost Surface Math (Simplified)

**File:** `app/optimizer/cost_surface.py` → `generate_composite_cost_surface()`

Imagine a 3×3 grid for illustration:

```
Layer: Settlements cost     Weight: 0.20
┌─────┬─────┬─────┐
│  10 │  80 │  10 │   ← 80 = near a town
├─────┼─────┼─────┤
│  10 │  10 │  10 │
├─────┼─────┼─────┤
│  10 │  10 │  90 │   ← 90 = inside a town
└─────┴─────┴─────┘

Layer: Slope cost           Weight: 0.15
┌─────┬─────┬─────┐
│  20 │  20 │  60 │   ← 60 = steep hill
├─────┼─────┼─────┤
│  20 │  20 │  20 │
├─────┼─────┼─────┤
│  20 │  20 │  20 │
└─────┴─────┴─────┘

Composite = 0.20 × settlements + 0.15 × slope + ... (all layers)
```

The pathfinder then finds the route where the **sum of composite costs** along the path is minimized.

---

## 8. Data Flow Through the System

### Flow A: Route Optimization (Main Workflow)

```
User clicks "Optimize Route"
        │
        ▼
optimize.js: optimizeRoute()
        │
        ├─► POST /api/projects          → Create Project in DB
        │
        └─► POST /api/projects/{id}/optimize
                    │
                    ▼
            routes_api.py: optimize_route()
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
  gis_data_loader  cost_surface  dijkstra/astar
  (load arrays)    (combine)     (find path)
        │           │           │
        └───────────┴───────────┘
                    │
                    ▼
        engineering_validation.py
        (towers, costs, rules)
                    │
                    ▼
        elevation_sampling.py
        (profile chart data)
                    │
                    ▼
        Save Route + CostSurface to DB
                    │
                    ▼
        JSON response → optimize.js
                    │
                    ▼
        map.js: displayRoute(), displayTowers()
        Chart.js: elevation + avoidance charts
```

### Flow B: Map Layer Toggle

```
User checks "Rivers" checkbox
        │
        ▼
layer_manager.js: toggleLayer('rivers', true)
        │
        ▼
map.js: loadGISLayer('rivers')
        │
        ▼
GET /api/gis/layers/rivers?bounds=...
        │
        ▼
uganda_gis_loader.py: load_layer_geojson()
        │
        ├─► Read data/rivers/Ug_Rivers-original.shp
        └─► (fallback) OpenStreetMap Overpass API
        │
        ▼
GeoJSON → Leaflet draws blue lines on map
```

### Flow C: Export Route

```
User clicks "Export GeoJSON"
        │
        ▼
optimize.js: exportRoute('geojson')
        │
        ▼
GET /api/routes/{id}/export?format=geojson
        │
        ▼
routes_api.py: reads Route.geometry from DB
        │
        ▼
Browser downloads .geojson file
```

### Flow D: Authentication

```
User visits /
        │
        ▼
views.py: index() → redirect to /auth/login
        │
        ▼
User submits login form
        │
        ▼
auth.py: login() → verify password → set session cookie
        │
        ▼
Redirect to /dashboard
        │
        ▼
views.py: dashboard() → render dashboard.html
```

---

## 9. Core Features Explained

### Feature 1: AHP Weight Sliders

**What:** Nine sliders on the dashboard let you prioritize routing factors.

**Engineering meaning:** AHP (Analytic Hierarchy Process) is a structured method for comparing criteria. Higher weight = the algorithm tries harder to avoid that feature.

**Dashboard sliders (from `optimize.js`):**

| Slider | Backend layer | Default weight |
|--------|---------------|----------------|
| Protected Areas | `protected_areas` | 0.15 |
| Rivers | `rivers` → `water` | 0.12 |
| Wetlands | `wetlands` → `water` | 0.10 |
| Roads | `roads` | 0.08 |
| Elevation | `elevation` → `topography` | 0.15 |
| Lakes | `lakes` → `water` | 0.10 |
| Settlements | `settlements` | 0.12 |
| Land Use | `land_use` | 0.08 |
| Transmission Lines | `transmission_lines` | 0.10 |

**Constraint:** Weights must sum to 1.0 — the UI enforces this.

**Practical example:** For an environmentally sensitive route through Murchison Falls area, increase Protected Areas to 0.30 and decrease Roads to 0.03.

---

### Feature 2: Dijkstra vs A\* Algorithm Selection

| Algorithm | Behavior | Best when |
|-----------|----------|-----------|
| **Dijkstra** | Explores uniformly; guaranteed lowest total cost | You want the mathematically optimal cost path |
| **A\*** | Biased toward the endpoint; straighter lines | You want a more direct corridor (fewer zigzags) |

**Compare mode:** Checkbox runs both and shows side-by-side length, cost, and tower count.

---

### Feature 3: Waypoints (Angle Points)

**What:** Optional intermediate points the route must pass through.

**Why:** Long routes (>100 km) produce very large grids. Waypoints break the problem into smaller segments that fit in memory.

**How:** Click "Add Waypoint" on the dashboard, then click the map to place it.

---

### Feature 4: Tower Generation

**What:** After optimization, "Generate Towers" places lattice tower positions along the route.

**Rules (from `engineering_validation.py`):**
- Spans between towers: 300–450 m
- Tower type and terrain affect cost estimate
- Positions returned as lat/lon points drawn on the map

---

### Feature 5: Corridor View (60 m)

**What:** Shows the land strip the utility needs to acquire.

**Calculation:** 10 m right-of-way + 25 m wayleave on each side = 60 m total (`config.py`).

**API:** `GET /api/routes/<id>/corridor` returns a polygon and land area in hectares.

---

### Feature 6: Cost Breakdown

**What:** Estimated USD cost split into towers, conductor, foundations, installation, ROW, engineering, contingency.

**Source:** `config.py` → `COST_ESTIMATION` dictionary with per-tower and per-km rates.

---

### Feature 7: GIS Layer Overlays

**What:** 15 checkbox layers for visual context (districts, rivers, protected areas, planned routes, etc.).

**New layer — Planned Routes:** The `planned_routes` layer loads the `Option 2_Uganda.shp` shapefile from `data/planned_routes/`. This is a pre-engineered reference alignment (LineString geometry, originally in Arc 1960 / UTM Zone 36N, auto-reprojected to WGS 84). It displays as a **purple dashed line** on the map and can be toggled from the **Power Infrastructure (UETCL)** section of the layer panel.

**How it was added:**
- Shapefile copied from an external source into `data/planned_routes/`.
- `PLANNED_ROUTES_FOLDER` registered in `config.py`.
- Layer name `planned_routes` mapped in `uganda_gis_loader.py`, `gis_data_loader.py`, and `routes_qgis_api.py`.
- Checkbox `showPlannedRoutes` added to `dashboard.html` with a handler in `layer_manager.js`.

**Important:** These layers are for **visualization**. The optimization uses an overlapping but not identical set of rasterized layers.

---

### Feature 8: Export Formats

| Format | Contents | Use case |
|--------|----------|----------|
| **GeoJSON** | LineString in WGS 84 (lat/lon) | GIS software, web maps |
| **XYZ** | Easting, Northing, Elevation in UTM Zone 36N (EPSG:21096) | Simulation tools, CAD |

---

## 10. Technologies Used and Why

| Technology | What it is | Why this project uses it |
|------------|-----------|--------------------------|
| **Python 3** | Programming language | Strong ecosystem for GIS and scientific computing |
| **Flask** | Web framework (lightweight) | Simple to understand; good for student projects |
| **SQLite** | File-based database | No separate database server needed |
| **SQLAlchemy** | Database ORM | Define tables as Python classes |
| **Flask-Login** | Session management | Keeps users logged in securely |
| **NumPy** | Numerical arrays | Cost surfaces are 2D arrays of numbers |
| **SciPy** | Scientific algorithms | Distance transforms, image processing on grids |
| **Rasterio** | GeoTIFF reader (optional) | Read DEM and land cover rasters |
| **Shapely** | Geometry operations | Corridor polygons, spatial calculations |
| **GeoPandas** | Shapefile reader (optional) | Convert `.shp` to GeoJSON for the map |
| **Leaflet** | JavaScript map library | Interactive pan/zoom map in the browser |
| **Chart.js** | JavaScript charting | Elevation profile and avoidance charts |
| **pyproj** | Coordinate transforms | WGS 84 → UTM for XYZ export |

**Not installed by default (optional):** GDAL, rasterio, Fiona, geopandas — these need extra setup on Windows. The app has fallbacks when they are missing.

---

## 11. How to Run the Project

### Prerequisites

- Python 3.10 or newer
- pip (Python package installer)
- A web browser (Chrome, Firefox, Edge)

### Step 1: Install Dependencies

```bash
cd transmission_routing_tool
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### Step 2: Environment Variables (Optional)

```bash
copy .env.example .env    # Windows
# cp .env.example .env    # macOS/Linux
```

Edit `.env` if you have MapTiler or Thunderforest API keys (optional — the map works without them using local layers).

### Step 3: Initialize the Database

The database is created automatically on first run. To create it manually:

```python
python -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all(); print('OK')"
```

### Step 4: Start the Server

```bash
python run.py
```

### Step 5: Open the Application

Go to: **http://localhost:5000**

1. Click **Register** — create an account (organization: "UETCL" is fine).
2. Log in — you will see the dashboard.
3. Set start and end points on the map.
4. Click **Optimize Route**.

### Optional: Download GIS Data

If `data/dem/` is empty, elevation-based costing uses approximations. To get real SRTM data:

```bash
python utilities/download_srtm_uganda.py
```

See `utilities/README.md` for all download scripts.

### Troubleshooting

| Problem | Likely cause | Fix |
|---------|--------------|-----|
| `ModuleNotFoundError: flask` | Virtual env not activated | Run `.venv\Scripts\activate` then `pip install -r requirements.txt` |
| Optimization returns "area too large" | Route too long for memory | Add waypoints to split the route |
| Map layers empty | Shapefile missing in `data/` | Run `python utilities/setup_shapefiles.py` or check folder |
| Login fails | Database not initialized | Run Step 3 above |
| Port 5000 in use | Another app using the port | Stop other process or change port in `run.py` |

---

## 12. Frequently Asked Questions

### Q: Do I need to know programming to use this tool?
**No.** You only need programming knowledge to modify or extend it. Using the web interface requires basic computer skills.

### Q: Where does the Uganda map data come from?
From shapefiles in the `data/` folder — sourced from Ugandan government datasets, UETCL exports, OSM Geofabrik, and USGS SRTM for elevation. If local files are missing, the map may fall back to OpenStreetMap's online API.

### Q: What is a "cost surface"?
A grid of numbers covering your study area. Each cell has a score from 0 (easy to build) to 100 (avoid). The pathfinder walks through the grid choosing the lowest total score. Like a heat map of construction difficulty.

### Q: Why are there two pathfinding algorithms?
Dijkstra guarantees the lowest cost but may zigzag. A\* produces straighter lines that look more like real transmission corridors. The compare mode lets you see the trade-off.

### Q: What happens if GIS data is missing?
The optimizer falls back to `_create_demo_layers()` — synthetic seeded data so the demo still runs. Results will not reflect real terrain. Always ensure `data/` folders contain shapefiles for production use.

### Q: What is the 60 m corridor?
For 400 kV lines in this project: 10 m right-of-way (ROW) where the line sits, plus 25 m wayleave on each side for construction access and safety. Total: 60 m (`TOTAL_CORRIDOR_WIDTH` in `config.py`).

### Q: Can I use this for voltages other than 400 kV?
The dashboard offers 400, 220, and 132 kV options, but engineering constants (tower spans, clearance, costs) in `config.py` are calibrated for 400 kV. Lower voltages would need parameter updates.

### Q: What is GeoJSON?
A text format for geographic features — points, lines, polygons with coordinates. The optimized route is stored and exported as a GeoJSON LineString.

### Q: What is the difference between `/api/projects/.../optimize` and `/api/qgis/optimize-route`?
The dashboard uses `/api/projects/.../optimize` (AHP + Dijkstra/A\*). The QGIS endpoints use a separate friction-map pipeline and are **not connected to the current UI**.

### Q: Is my password stored safely?
Yes — `User.set_password()` hashes the password with Werkzeug before saving. The plain-text password is never stored.

### Q: Can multiple users use the system?
Yes — each user sees only their own projects (`user_id` filter on all queries).

---

## 13. Glossary of Technical Terms

| Term | Simple explanation |
|------|-------------------|
| **API** | Application Programming Interface — URLs the browser calls to ask the server to do work |
| **AHP** | Analytic Hierarchy Process — method to assign importance weights to multiple criteria |
| **Blueprint** | Flask's way of grouping related URLs (like `/api/projects`) |
| **Bounding box** | Rectangle defined by min/max latitude and longitude around the study area |
| **Corridor** | Strip of land along the route that the utility must acquire or access |
| **Cost surface** | Grid where each cell has a difficulty/cost score for building a line through it |
| **CRS** | Coordinate Reference System — rules for how coordinates map to Earth (e.g., WGS 84, UTM) |
| **DEM** | Digital Elevation Model — raster map of ground height |
| **Dijkstra's algorithm** | Classic method to find the lowest-cost path through a weighted grid |
| **A\*** | Pathfinding algorithm that uses a heuristic to search toward the goal faster |
| **EPSG:4326** | Standard GPS coordinates (latitude/longitude) — used for display |
| **EPSG:21096** | UTM Zone 36N — used for Uganda engineering coordinates (Eastings/Northings) |
| **Flask** | Python library for building web servers |
| **GeoJSON** | JSON format for geographic features (points, lines, polygons) |
| **GeoTIFF** | Image file where each pixel has a geographic location |
| **GIS** | Geographic Information System — software/data for maps and spatial analysis |
| **Grid / raster** | 2D array of values — like graph paper where each square has a number |
| **Lat/Lon** | Latitude (north-south) and Longitude (east-west) in degrees |
| **Leaflet** | JavaScript library for interactive web maps |
| **LCP** | Least-Cost Path — the optimal route on a cost surface |
| **ORM** | Object-Relational Mapping — define database tables as Python classes (SQLAlchemy) |
| **Pathfinding** | Algorithm that finds a route through a grid or network |
| **Rasterize** | Convert vector shapes (lines, polygons) into grid cells |
| **REST** | Style of API using HTTP methods (GET, POST) and URLs |
| **Right-of-way (ROW)** | Legal strip of land where the transmission line is built |
| **Session** | Server-side record that keeps you logged in between page loads |
| **Shapefile** | Common GIS file format (`.shp` + `.dbf` + `.prj` + `.shx`) |
| **SQLite** | Lightweight database stored in a single file |
| **SRTM** | Shuttle Radar Topography Mission — global elevation data (~30 m resolution) |
| **Tower span** | Distance between two consecutive transmission towers |
| **UTM** | Universal Transverse Mercator — projected coordinate system in meters |
| **Vector data** | Geographic features as points, lines, or polygons (shapefiles) |
| **Waypoint** | Intermediate point the route must pass through |
| **Wayleave** | Permission to use land adjacent to the ROW for construction/maintenance |
| **WGS 84** | World Geodetic System 1984 — the standard GPS coordinate system |

---

## 14. Appendix: Cleanup Report

This section lists files and code that are **not needed for the running application** and can be safely removed or archived. This replaces the separate `CLEANUP_SUMMARY.md` document.

### Already Removed (June 2026)

These were deleted or moved in a prior cleanup. The app does not depend on them:

| Item | Action | Reason |
|------|--------|--------|
| `test_layers.py`, `test_roads.py`, etc. | Deleted | Development test scripts |
| `download_*.py` (root) | Moved to `utilities/` | One-time setup scripts |
| `verify_roads.py`, `convert_shapefiles_to_geojson.py` | Deleted | One-time verification tools |
| `PROJECT_DOCUMENTATION.md`, `GIT_PUSH_GUIDE.md` | Deleted | Replaced by this guide |
| `test_output/` | Deleted | Temporary test artifacts |

### Safe to Remove Now

| Path | Type | Why safe |
|------|------|----------|
| `static/test_cost_surface.png` | Orphan file | Not referenced by any HTML or JS |
| `data/uganda_boundary_final.json` | Unused data | No code references this file |
| `data/uganda_country_boundary.json` | Unused data | No code references this file |
| `data/commercial_facilities.*` (root level) | Duplicate | Same data exists in `data/commercial_facilities/` folder |
| `data/*.cst` (root level) | Stray sidecars | Leftover shapefile companion files at wrong location |
| `data/cost_surface_project_*.{npy,tif}` | Cache files | Old optimization outputs; regenerated on each run. Keep recent ones if you want offline review |

### Dead Code (Safe to Remove from Source Files)

| Location | What | Why unused |
|----------|------|------------|
| `app/optimizer/qgis_routing_workflow.py` | Entire file | Import commented out in `routes_api.py` |
| `app/optimizer/qgis_workflow_example.py` | Entire file | Standalone demo, never imported |
| `app/services/dem_loader.py` → `load_dem_for_route()` | Function | Defined but never called |
| `app/optimizer/cost_surface.py` → `load_cost_surface()` | Function | Defined but never called |
| `app/services/corridor_restriction.py` → `check_corridor_conflicts()` | Function | Only other methods are used |
| `static/js/map.js` lines ~140–429 | `create*Layer()` functions | Superseded by `layer_manager.js` |
| `static/js/optimize.js` | `generateRouteQualityCard()`, `generateRouteOptimalityGraph()`, `buildDynamicLegend()` | UI feature removed; functions orphaned |
| `templates/dashboard.html` lines ~399–446 | Debug click listener | Marked "Remove after testing" |

### Backend APIs Not Used by Dashboard (Keep for Now or Remove Later)

| Endpoint | File | Notes |
|----------|------|-------|
| `POST /api/cost-surface/generate` | `routes_api.py` | Cost-surface-only preview; no UI button |
| `GET /api/projects/<id>/cost-surface-image` | `routes_api.py` | PNG heatmap endpoint; no UI caller |
| `POST /api/qgis/generate-cost-surface` | `routes_qgis_api.py` | Alternate QGIS pipeline |
| `POST /api/qgis/optimize-route` | `routes_qgis_api.py` | Alternate QGIS pipeline |
| `POST /generate-cost-surface` | `routes_qgis_api.py` | Unauthenticated legacy endpoint |
| `GET /api/layers` | `routes_api.py` | Legacy raster-to-points endpoint |
| `GET /api/projects` | `routes_api.py` | List projects — no UI list view yet |

**Recommendation:** Keep these endpoints if you plan to add QGIS integration later. Remove only if you want a minimal codebase.

### Stub Implementations (Incomplete, Not Dead)

These return flat/zero arrays — the app runs but these layers contribute nothing to the cost surface until implemented:

- `cost_surface.py` → `_process_forests()`, `_process_education()`, `_process_power_infrastructure()`, `_process_airports()`

### Documentation Files

| File | Recommendation |
|------|----------------|
| `STUDENT_GUIDE.md` | **Keep** — this document (primary teaching guide) |
| `README.md` | **Keep** — short quick-start entry point; link here for depth |
| `utilities/README.md` | **Keep** — scoped to data download scripts |
| `CLEANUP_SUMMARY.md` | **Delete** — content merged into this appendix |

### Empty or Underused Data Folders

| Folder | Status |
|--------|--------|
| `data/airports/` | Configured but empty — no map checkbox |
| `data/dem/` | May be empty without running `utilities/download_srtm_uganda.py` |
| `data/landcover/` | Backend-only; not in dashboard checkboxes |
| `data/power_infrastructure/` | Stub cost processor only |

### Summary

**The running application depends on:**
- `run.py`, `config.py`, `requirements.txt`
- `app/` (all modules except unused QGIS workflow files)
- `templates/`, `static/`
- `data/` shapefiles and DEM tiles
- `transmission_routing.db`

**Nothing in the "Safe to Remove" list above will prevent `python run.py` from starting or the optimize button from working**, as verified by import tests and HTTP smoke tests on `/auth/login`.

---

*Document version: June 2026 — based on analysis of the full codebase at `transmission_routing_tool/`.*
