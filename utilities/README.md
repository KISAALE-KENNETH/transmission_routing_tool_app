# 📦 Utilities - Data Download Scripts

This folder contains helper scripts for downloading and setting up GIS data for Uganda.

## Scripts

### `download_uganda_data.py`
Downloads various Uganda GIS datasets from OpenStreetMap and other sources.

**Usage:**
```bash
python utilities/download_uganda_data.py
```

### `download_srtm_uganda.py`
Downloads SRTM elevation data (Digital Elevation Model) for Uganda.

**Usage:**
```bash
python utilities/download_srtm_uganda.py
```

### `download_srtm_direct.py`
Alternative method to download SRTM data directly from NASA servers.

### `download_srtm_elevation.py`
Downloads specific SRTM tiles for custom areas.

### `download_dem_usgs.py`
Downloads DEM data from USGS EarthExplorer.

### `setup_shapefiles.py`
Organizes and validates downloaded shapefiles.

**Usage:**
```bash
python utilities/setup_shapefiles.py
```

## Notes

- These scripts are **optional** - the application includes sample data
- Use these if you want complete, up-to-date Uganda GIS data
- Requires internet connection
- May take 1-2 hours to download all data (several GB)
- Data sources are free and open (OpenStreetMap, NASA, USGS)

## Data Sources

- **Elevation:** NASA SRTM (Shuttle Radar Topography Mission)
- **Roads/Rivers/Buildings:** OpenStreetMap
- **Protected Areas:** Uganda Wildlife Authority / World Database on Protected Areas
- **Administrative Boundaries:** Uganda Bureau of Statistics

---

*These utilities are for initial data setup only. The main application does not require them to run.*
