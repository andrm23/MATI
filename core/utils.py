import sys
from pathlib import Path


def get_resource_path(ruta_relativa):
    """Busca la ruta absoluta del recurso (HTML, iconos, fuentes)"""
    try:
        # Ruta temporal cuando la app está empaquetada con PyInstaller
        base_path = Path(sys._MEIPASS)
    except Exception:
        # Ruta de desarrollo. Usamos .parent.parent para salir de 'core/' y llegar a la raíz
        base_path = Path(__file__).resolve().parent.parent

    return base_path / ruta_relativa
