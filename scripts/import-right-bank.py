"""Compatibility entry point: now imports all ten districts of Kyiv."""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name("import-kyiv.py")), run_name="__main__")
