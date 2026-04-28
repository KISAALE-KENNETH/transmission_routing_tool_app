# Transmission Line Routing Tool - Complete Documentation

> **Uganda Electricity Transmission Company Limited (UETCL)**  
> **400kV Transmission Line Route Optimization System**

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Quick Start Guide](#quick-start-guide)
3. [User Guide](#user-guide)
4. [Technical Architecture](#technical-architecture)
5. [QGIS-Style Cost Surface Implementation](#qgis-style-cost-surface-implementation)
6. [Recent Updates & Fixes](#recent-updates--fixes)
7. [Troubleshooting](#troubleshooting)
8. [API Reference](#api-reference)

---

## Project Overview

### What This Tool Does

This web application helps engineers plan optimal routes for high-voltage transmission lines by:

- **Automated Route Finding**: Uses Dijkstra and A* algorithms to find least-cost paths
- **Multi-Criteria Analysis**: Applies AHP (Analytic Hierarchy Process) weights to balance multiple factors
- **QGIS-Style Visualization**: Generates dynamic cost surface maps with quantile classification
- **Engineering Validation**: Checks tower spacing, slope limits, and corridor constraints
- **Real-Time Analysis**: Provides instant feedback on route quality and costs

### Key Features

✅ **Interactive Map Interface** - Click to set start/end points and waypoints  
✅ **Dynamic Cost Surface** - Visual heatmap showing construction difficulty  
✅ **Multiple Algorithms** - Compare Dijkstra vs A* results  
✅ **Real GIS Data Support** - Works with shapefiles, GeoTIFF, and GeoJSON  
✅ **Export Options** - GeoJSON for GIS software, XYZ for engineering simulation  
✅ **User Authentication** - Secure login system with project management  

### Technology Stack

- **Backend**: Python 3.x, Flask, SQLAlchemy
- **Frontend**: JavaScript, Leaflet.js, Chart.js
- **GIS Processing**: Rasterio, Shapely, Fiona, GDAL
- **Algorithms**: NumPy, SciPy, scikit-image
- **Database**: SQLite (development), PostgreSQL (production-ready)

---

## Quick Start Guide

### Installation

```bash
# 1. Clone or download the project
cd transmission_routing_tool

# 2. Create virtual environment
python -m venv .venv

# 3. Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Initialize database
python
>>> from app import create_app, db
>>> app = create_app()
>>> with app.app_context():
...     db.create_all()
>>> exit()

# 6. Run the application
python run.py
```

### First Use

1. Open browser: `http://localhost:5000`
2. Click "Register" to create account
3. Login with your credentials
4. Start planning routes!

---

## User Guide

### Setting Up a Route

#### 1. Set Start and End Points

**Method A: Click on Map**
1. Click "Set Start Point" button
2. Cursor changes to crosshair
3. Click on map where line should begin
4. Click "Set End Point" button
5. Click on map where line should end

**Method B: Enter Coordinates**
1. Type latitude and longitude in the input fields
2. Click the ✓ button to place marker

#### 2. Add Angle Points (Optional)

For long routes or to guide the path around obstacles:
1. Click "+ Add Angle Point"
2. Click on map to place the point
3. Route will pass through all angle points in order

**Tip**: For routes over 100km, add angle points every 50-75km

#### 3. Adjust AHP Weights

Use sliders to control what the route should avoid:

| Layer | Default | What It Affects |
|-------|---------|-----------------|
| Protected Areas | 0.15 | National parks, reserves |
| Rivers | 0.15 | Water crossings |
| Wetlands | 0.10 | Swamps, marshes |
| Roads | 0.10 | Proximity to roads (lower = prefer roads) |
| Elevation | 0.15 | Steep terrain |
| Lakes | 0.10 | Large water bodies |
| Settlements | 0.15 | Towns, villages, schools |
| Land Use | 0.10 | Farmland, urban areas |

**Important**: All weights must sum to 1.0 (shown at bottom)

#### 4. Generate Cost Surface (Optional)

Before optimizing, you can visualize the cost surface:

1. Click "🎨 Generate Cost Surface / Suitability Map"
2. Wait for processing (5-15 seconds)
3. Map shows color-coded overlay:
   - 🟢 **Green** = Low cost (easy to build)
   - 🟡 **Yellow** = Medium cost
   - 🔴 **Red** = High cost (difficult/expensive)

**Dynamic Scaling**: Colors automatically adjust to your data range using quantile classification (lowest 20% = green, highest 20% = red)

#### 5. Optimize Route

1. Select algorithm:
   - **Dijkstra** - Classic, reliable
   - **A*** - Faster, similar results
   - **Compare both** - See differences

2. Click "🚀 Optimize Route"

3. Wait for processing (10-30 seconds)

### Understanding Results

#### Route Metrics

- **Route Length** - Total distance in kilometers
- **Estimated Towers** - Number of towers needed
- **Avg Span Length** - Distance between towers (target: 350m)
- **Total Cost** - Estimated construction cost
- **Cost per km** - Cost efficiency metric

#### Route Quality Score Chart

Visual bar chart showing avoidance percentages:
- 🏘️ **Avoiding Settlements** - % of route clear of towns
- 💧 **Avoiding Water Bodies** - % avoiding rivers/lakes
- 📏 **Optimal Tower Spacing** - How close to ideal 350m spacing

**Color Guide**:
- 🟢 80-100% = Excellent
- 🟡 60-79% = Good
- 🟠 40-59% = Needs attention
- 🔴 0-39% = Problem area

#### Elevation Chart

Shows terrain profile along the route with:
- Minimum elevation
- Maximum elevation
- Average elevation
- Elevation changes

#### Cost Breakdown

Detailed itemized costs:
- Towers (quantity × unit cost)
- Conductors (length × cost per km)
- Insulators
- Hardware
- Foundation
- Labor
- Right of Way acquisition

### Export Options

**Export GeoJSON**
- For use in QGIS, ArcGIS, or other GIS software
- Contains route geometry and properties
- WGS 84 coordinate system (EPSG:4326)

**Export XYZ (Eastings/Northings/Elevation)**
- For engineering simulation software
- UTM Zone 36N coordinate system (EPSG:21096)
- CSV format with E, N, Z columns

---

## Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    Web Browser (Client)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   map.js     │  │ optimize.js  │  │ layer_mgr.js │ │
│  │ (Leaflet)    │  │ (Route Logic)│  │ (GIS Layers) │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↕ HTTP/JSON
┌─────────────────────────────────────────────────────────┐
│                   Flask Application Server               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ routes_api.py│  │   auth.py    │  │  models.py   │ │
│  │ (REST API)   │  │ (Login/Auth) │  │ (Database)   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                    Optimizer Engine                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │cost_surface  │  │  dijkstra.py │  │   astar.py   │ │
│  │    .py       │  │              │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐                   │
│  │engineering_  │  │ qgis_cost_   │                   │
│  │validation.py │  │ surface.py   │                   │
│  └──────────────┘  └──────────────┘                   │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                    GIS Data Services                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ dem_loader   │  │elevation_    │  │uganda_gis_   │ │
│  │    .py       │  │sampling.py   │  │loader.py     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                    Data Storage                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  SQLite DB   │  │  GeoTIFF     │  │  Shapefiles  │ │
│  │  (Projects)  │  │  (DEM/Cost)  │  │  (GIS Data)  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Key Algorithms

#### 1. Cost Surface Generation

**Purpose**: Create a 2D grid where each cell has a "cost" value representing construction difficulty.

**Process**:
1. Load GIS layers (shapefiles, rasters)
2. Rasterize vector data to grid
3. Apply friction functions:
   - **Barriers** (protected areas, water): High cost inside, low outside
   - **Distance penalties** (settlements, rivers): Cost increases near features
   - **Distance benefits** (roads): Cost decreases near roads
   - **Slope** (elevation): Cost increases with steepness
4. Normalize each layer to 0-100 range
5. Apply AHP weights
6. Combine into single cost surface

**Output**: 2D NumPy array where higher values = avoid

#### 2. Least-Cost Path (Dijkstra)

**Purpose**: Find the path with minimum accumulated cost.

**Algorithm**:
```python
1. Initialize: Set start cost = 0, all others = infinity
2. Create priority queue with start node
3. While queue not empty:
   a. Pop node with lowest cost
   b. If node is goal, reconstruct path and return
   c. For each neighbor:
      - Calculate new_cost = current_cost + edge_cost
      - If new_cost < neighbor_cost:
        - Update neighbor_cost
        - Add neighbor to queue
4. Return path from start to goal
```

**Characteristics**:
- Guaranteed to find optimal path
- Explores all directions equally
- Slower but more thorough

#### 3. A* (A-Star)

**Purpose**: Faster pathfinding using heuristics.

**Algorithm**:
```python
1. Same as Dijkstra, but priority = cost + heuristic
2. Heuristic = straight-line distance to goal
3. Explores promising directions first
4. Still finds optimal path if heuristic is admissible
```

**Characteristics**:
- Faster than Dijkstra
- Produces straighter routes
- Uses Euclidean distance heuristic

#### 4. Engineering Validation

**Checks**:
- Tower spacing: 250-450m (configurable)
- Slope limits: < 30 degrees
- Corridor clearance: 60m width
- Minimum clearance from obstacles

---

## QGIS-Style Cost Surface Implementation

### Overview

The system implements QGIS-style cost surface analysis with:
- **Quantile classification** (5 classes by default)
- **Dynamic color scaling** based on actual data
- **Raster-based pathfinding** using scikit-image
- **Proper coordinate transformation** between lat/lon and pixel indices

### Workflow

```
1. User adjusts AHP weights
   ↓
2. Generate Cost Surface
   ├─ Load GIS layers (shapefiles, rasters)
   ├─ Rasterize to common grid
   ├─ Apply friction functions
   ├─ Normalize to 0-100 range
   ├─ Weighted overlay (AHP)
   └─ Classify into 5 quantile bands
   ↓
3. Visualize on Map
   ├─ Green = Lowest 20% (easy)
   ├─ Light Green = 20-40%
   ├─ Yellow = 40-60%
   ├─ Orange = 60-80%
   └─ Red = Highest 20% (difficult)
   ↓
4. Optimize Route (optional)
   ├─ Convert lat/lon to pixel coordinates
   ├─ Run least-cost path algorithm
   ├─ Convert pixel path back to lat/lon
   └─ Display route on map
```

### Dynamic Quantile Classification

**Why Quantile?**
- Adapts to actual data distribution
- Each color band contains ~20% of data
- More informative than fixed thresholds
- Matches QGIS default behavior

**Implementation**:
```python
# Calculate quantile thresholds
q20 = np.percentile(cost_surface, 20)
q40 = np.percentile(cost_surface, 40)
q60 = np.percentile(cost_surface, 60)
q80 = np.percentile(cost_surface, 80)

# Apply colors based on thresholds
colors = [
    (cost < q20)        → Green (lowest 20%)
    (q20 ≤ cost < q40)  → Light Green
    (q40 ≤ cost < q60)  → Yellow
    (q60 ≤ cost < q80)  → Orange
    (cost ≥ q80)        → Red (highest 20%)
]
```

### Coordinate Transformation

**Critical for Accuracy**:
```python
# Lat/Lon → Pixel
row, col = rasterio.transform.rowcol(
    transform, lon, lat
)

# Pixel → Lat/Lon
lon, lat = rasterio.transform.xy(
    transform, row, col
)
```

### Least-Cost Path with scikit-image

```python
from skimage.graph import route_through_array

# Run pathfinding
indices, cost = route_through_array(
    cost_surface,
    start=(start_row, start_col),
    end=(end_row, end_col),
    geometric=True,        # Diagonal cost = 1.414
    fully_connected=True   # 8-direction movement
)

# Convert pixel path to coordinates
path_coords = [
    pixel_to_latlon(row, col, transform)
    for row, col in indices
]
```

---

## Recent Updates & Fixes

### 1. Button and Slider Functionality Fixed

**Issue**: Buttons (Set Start Point, Set End Point, Add Angle Point) and AHP weight sliders were not working.

**Root Cause**: 
- JavaScript syntax error (duplicate code block) prevented `optimize.js` from loading
- Variable scope issue - `selectionMode` declared in `map.js` but accessed in `optimize.js`

**Solution**:
- Removed duplicate code at line 839-844 in `optimize.js`
- Made `selectionMode` and `currentWaypointId` global using `window.` prefix
- Added visual feedback (cursor changes to crosshair)
- Added console logging for debugging

**Result**: All buttons and sliders now work correctly.

### 2. Dynamic Cost Surface Scaling

**Issue**: Cost surface colors used hardcoded thresholds instead of adapting to actual data.

**Old Behavior**:
- Fixed thresholds (220, 284, 348, 412) for all datasets
- Colors didn't reflect relative cost distribution
- Same data range always produced same colors

**New Behavior**:
- Dynamic quantile-based classification
- Colors adapt to each dataset's unique range
- Green = lowest 20%, Red = highest 20%
- More informative visualization

**Implementation**:
```python
# Calculate quantiles from actual data
q20 = np.percentile(valid_data, 20)
q40 = np.percentile(valid_data, 40)
q60 = np.percentile(valid_data, 60)
q80 = np.percentile(valid_data, 80)

# Apply colors based on quantiles
```

### 3. UI Cleanup

**Removed**:
- ❌ Route Quality assessment card (verbose warnings and suggestions)
- ❌ Classification controls (method dropdown, number of classes)

**Kept**:
- ✅ Route metrics (length, towers, cost)
- ✅ Route Quality Score chart (bar chart)
- ✅ Elevation chart
- ✅ Cost breakdown

**Rationale**: Simplified UI, removed unnecessary information, kept essential metrics.

**Default Settings**:
- Classification: Quantile (always)
- Number of classes: 5 (always)

---

## Troubleshooting

### Common Issues

#### 1. Buttons Don't Work

**Symptoms**: Clicking "Set Start Point" does nothing, cursor doesn't change.

**Solutions**:
1. Hard refresh browser: `Ctrl+F5` or `Ctrl+Shift+R`
2. Clear browser cache completely
3. Check browser console (F12) for JavaScript errors
4. Restart Flask app

**Verification**:
- Open console (F12)
- Click button
- Should see: `✓ Set Start Point mode activated - click on map`
- Cursor should change to crosshair

#### 2. Sliders Don't Update Values

**Symptoms**: Moving slider doesn't change displayed value.

**Solutions**:
1. Hard refresh browser: `Ctrl+F5`
2. Check console for errors
3. Verify `setupWeightSliders()` is called

**Verification**:
- Open console (F12)
- Should see: `🎚️ Setting up weight sliders...`
- Move slider
- Should see: `✓ Slider [name] changed to [value]`

#### 3. Cost Surface Doesn't Generate

**Symptoms**: Clicking "Generate Cost Surface" shows loading but nothing appears.

**Solutions**:
1. Check at least one layer checkbox is enabled
2. Verify weights sum to 1.0
3. Check console for errors
4. Check Flask terminal for backend errors

**Common Errors**:
- "No layers enabled" → Enable at least one checkbox
- "Weights must sum to 1.0" → Adjust sliders
- "Failed to load layer" → Check GIS data files exist

#### 4. Route Optimization Fails

**Symptoms**: "No valid path found" or "Route area too large" error.

**Solutions**:
1. **No valid path**:
   - Add angle points to guide route
   - Check start/end points are not too close
   - Verify weights sum to 1.0

2. **Route area too large**:
   - Add angle points every 50-75km
   - Break long routes into segments
   - Reduce resolution (increase resolution_m)

3. **Algorithm timeout**:
   - Use A* instead of Dijkstra (faster)
   - Add more angle points
   - Reduce area of interest

#### 5. Map Layers Don't Load

**Symptoms**: Checkboxes don't show layers on map.

**Solutions**:
1. Check internet connection
2. Wait for layer to load (can take 5-10 seconds)
3. Check Flask terminal for shapefile errors
4. Verify GIS data files exist in `data/` folder

**File Locations**:
```
data/
├── protected_areas/
├── rivers/
├── wetlands/
├── roads/
├── settlements/
├── lakes/
└── land_use/
```

#### 6. Elevation Shows 0 or Wrong Values

**Symptoms**: Elevation chart shows flat line or unrealistic values.

**Solutions**:
1. Add DEM data to `data/dem/` folder
2. System uses Uganda elevation estimates (600-3500m) when no DEM available
3. Download SRTM data from USGS EarthExplorer

#### 7. Export Fails

**Symptoms**: "No route to export" or download doesn't start.

**Solutions**:
1. Optimize a route first
2. Wait for optimization to complete
3. Check browser download settings
4. Try different export format (GeoJSON vs XYZ)

### Debug Mode

Enable detailed logging:

```python
# In config.py
DEBUG = True
LOGGING_LEVEL = 'DEBUG'
```

Check logs:
- Browser console (F12) for frontend errors
- Flask terminal for backend errors
- Look for red error messages

---

## API Reference

### Authentication Endpoints

#### POST `/auth/register`
Register new user account.

**Request Body**:
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "organization": "string"
}
```

**Response**: Redirect to login page

#### POST `/auth/login`
Login to existing account.

**Request Body**:
```json
{
  "username": "string",
  "password": "string"
}
```

**Response**: Redirect to dashboard

#### GET `/auth/logout`
Logout current user.

**Response**: Redirect to login page

### Project Endpoints

#### POST `/api/projects`
Create new project.

**Request Body**:
```json
{
  "name": "string",
  "description": "string",
  "voltage_level": 400,
  "tower_type": "lattice",
  "start": {"lat": 1.5, "lon": 32.5, "name": "Start"},
  "end": {"lat": 2.5, "lon": 33.5, "name": "End"},
  "waypoints": [
    {"lat": 2.0, "lon": 33.0, "name": "Waypoint 1"}
  ],
  "ahp_weights": {
    "protected_areas": 0.15,
    "rivers": 0.15,
    "wetlands": 0.10,
    "roads": 0.10,
    "elevation": 0.15,
    "lakes": 0.10,
    "settlements": 0.15,
    "land_use": 0.10
  }
}
```

**Response**:
```json
{
  "project_id": 123,
  "message": "Project created successfully"
}
```

#### POST `/api/projects/{project_id}/optimize`
Optimize route for existing project.

**Request Body**:
```json
{
  "algorithm": "dijkstra",  // or "astar"
  "compare": false          // true to compare both
}
```

**Response**:
```json
{
  "route": {
    "type": "Feature",
    "geometry": {
      "type": "LineString",
      "coordinates": [[lon, lat], ...]
    },
    "properties": {
      "estimated_towers": 45,
      "avg_span_length_m": 350.5
    }
  },
  "cost_breakdown": {
    "total_cost": 15000000,
    "total_length_km": 45.2,
    "cost_per_km": 331858,
    "breakdown": {
      "towers": {"quantity": 45, "cost": 9000000},
      "conductors": {"length_km": 45.2, "cost": 3000000},
      ...
    }
  },
  "route_elevation": {
    "min_m": 1050,
    "max_m": 1450,
    "avg_m": 1250
  },
  "avoidance_metrics": {
    "settlements_clear_pct": 95,
    "water_clear_pct": 88,
    "protected_clear_pct": 92
  },
  "algorithm_used": "dijkstra",
  "resolution_m": 30
}
```

### Cost Surface Endpoints

#### POST `/api/cost-surface/generate`
Generate cost surface visualization.

**Request Body**:
```json
{
  "layers": {
    "protected_areas": {"enabled": true, "weight": 0.15},
    "rivers": {"enabled": true, "weight": 0.15},
    ...
  },
  "bounds": [min_lon, min_lat, max_lon, max_lat],
  "resolution_m": 100,
  "classification": "quantile",
  "n_classes": 5
}
```

**Response**:
```json
{
  "success": true,
  "image_base64": "data:image/png;base64,...",
  "bounds": [min_lon, min_lat, max_lon, max_lat],
  "legend": [
    {"label": "1.00 - 15.23", "color": "#228B22"},
    {"label": "15.23 - 28.45", "color": "#7CCD50"},
    ...
  ],
  "metadata": {
    "min": 1.0,
    "max": 100.0,
    "mean": 45.2,
    "classification": "quantile",
    "n_classes": 5
  }
}
```

#### GET `/api/projects/{project_id}/cost-surface-image`
Get cost surface as PNG image.

**Response**: PNG image with headers:
- `X-Cost-Min`: Minimum cost value
- `X-Cost-Max`: Maximum cost value
- `X-Cost-Q20`: 20th percentile
- `X-Cost-Q40`: 40th percentile
- `X-Cost-Q60`: 60th percentile
- `X-Cost-Q80`: 80th percentile
- `X-Bounds-*`: Geographic bounds

### GIS Layer Endpoints

#### GET `/api/gis/layers/{layer_name}`
Get GIS layer data as GeoJSON.

**Parameters**:
- `layer_name`: protected_areas, rivers, wetlands, roads, settlements, lakes, land_use
- `min_lon`, `min_lat`, `max_lon`, `max_lat`: Bounding box

**Response**: GeoJSON FeatureCollection

---

## File Structure

```
transmission_routing_tool/
├── app/
│   ├── __init__.py              # Flask app factory
│   ├── auth.py                  # Authentication routes
│   ├── models.py                # Database models
│   ├── routes_api.py            # Main API endpoints
│   ├── routes_qgis_api.py       # QGIS-style endpoints
│   ├── views.py                 # Web page routes
│   ├── optimizer/
│   │   ├── cost_surface.py      # Cost surface generation
│   │   ├── dijkstra.py          # Dijkstra algorithm
│   │   ├── astar.py             # A* algorithm
│   │   ├── engineering_validation.py  # Route validation
│   │   ├── qgis_cost_surface.py # QGIS-style implementation
│   │   └── qgis_routing_workflow.py   # Workflow management
│   └── services/
│       ├── dem_loader.py        # DEM data loading
│       ├── elevation_sampling.py # Elevation queries
│       ├── gis_data_loader.py   # GIS data loading
│       └── uganda_gis_loader.py # Uganda-specific loader
├── static/
│   ├── css/
│   │   └── style.css            # Styling
│   ├── js/
│   │   ├── map.js               # Map initialization
│   │   ├── optimize.js          # Route optimization logic
│   │   ├── qgis_tools.js        # QGIS tools
│   │   └── layer_manager.js     # Layer management
│   ├── images/
│   │   ├── uetcl_logo.png       # Company logo
│   │   └── login_background.jpg # Login page background
│   └── vendor/
│       └── chart.umd.min.js     # Chart.js library
├── templates/
│   ├── dashboard.html           # Main application interface
│   ├── login.html               # Login page
│   └── register.html            # Registration page
├── data/
│   ├── dem/                     # Elevation data (GeoTIFF)
│   ├── protected_areas/         # Shapefiles
│   ├── rivers/                  # Shapefiles
│   ├── wetlands/                # Shapefiles
│   ├── roads/                   # Shapefiles
│   ├── settlements/             # Shapefiles
│   ├── lakes/                   # Shapefiles
│   └── land_use/                # Shapefiles
├── instance/
│   └── transmission_routing.db  # SQLite database
├── config.py                    # Configuration settings
├── run.py                       # Application entry point
├── requirements.txt             # Python dependencies
└── PROJECT_DOCUMENTATION.md     # This file
```

---

## Credits & License

### Developed For
**Uganda Electricity Transmission Company Limited (UETCL)**

### Case Study
**Olwiyo (Uganda) to South Sudan Border 400kV Interconnection**

### Data Sources
- **Elevation**: USGS SRTM (Shuttle Radar Topography Mission)
- **Land Cover**: ESA WorldCover
- **Roads/Settlements**: OpenStreetMap
- **Protected Areas**: NEMA, NFA, UWA

### Technologies
- **Algorithms**: Dijkstra, A*, AHP Multi-Criteria Analysis
- **GIS**: Rasterio, Shapely, Fiona, GDAL
- **Web**: Flask, Leaflet.js, Chart.js
- **Scientific**: NumPy, SciPy, scikit-image

### Version
**1.0.0** - December 2024

---

## Support & Contact

For technical support or questions:
1. Check this documentation
2. Review browser console (F12) for errors
3. Check Flask terminal output
4. Verify all dependencies are installed
5. Ensure GIS data files are in correct locations

**Good luck with your transmission line planning! ⚡**

