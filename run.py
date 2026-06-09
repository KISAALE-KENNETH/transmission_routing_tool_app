"""
Main entry point for Transmission Line Routing Optimization Tool
Run this file to start the Flask development server
"""
import os
import sys

# Force UTF-8 on stdout/stderr so emoji log lines (e.g. "[OK]", "[WARN]", "[ERR]")
# do not crash the Windows cp1252 console.  Without this, a single emoji print
# inside a request handler raises UnicodeEncodeError and the exception text
# ends up serialised into the JSON response (which produces a misleading 500
# such as "'charmap' codec can't encode character '\u274c'").
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding='utf-8')
    except (AttributeError, OSError):
        pass

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from app import create_app

# Get configuration from environment variable or use default
config_name = os.getenv('FLASK_CONFIG', 'development')
app = create_app(config_name)

if __name__ == '__main__':
    # Create necessary directories
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['DATA_FOLDER'], exist_ok=True)
    os.makedirs(app.config['DEM_FOLDER'], exist_ok=True)
    os.makedirs(app.config['LANDCOVER_FOLDER'], exist_ok=True)
    os.makedirs(app.config['SETTLEMENTS_FOLDER'], exist_ok=True)
    os.makedirs(app.config['PROTECTED_AREAS_FOLDER'], exist_ok=True)
    os.makedirs(app.config['ROADS_FOLDER'], exist_ok=True)
    
    # Run the application
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=app.config['DEBUG']
    )

