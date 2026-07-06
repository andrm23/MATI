import sys
from core.logger import log
import os
from pathlib import Path


def get_resource_path(ruta_relativa):
    """Busca la ruta absoluta del recurso (HTML, iconos, fuentes)"""
    try:
        if getattr(sys, "frozen", False):
            base_path = Path(sys._MEIPASS)
        else:
            base_path = Path(os.path.abspath(__file__)).parent.parent

        final_path = base_path / ruta_relativa

    except Exception as e:
        log.critical(f"Error en get_resource_path: {e}")
        return Path(".") / ruta_relativa

    if not final_path.exists():
        log.error(f"Recurso no encontrado en: {final_path}")

    return final_path
    # try:
    #     # Ruta temporal cuando la app está empaquetada con PyInstaller
    #     base_path = Path(sys._MEIPASS)
    # except Exception:
    #     # Ruta de desarrollo. Usamos .parent.parent para salir de 'core/' y llegar a la raíz
    #     base_path = Path(__file__).resolve().parent.parent

    # return base_path / ruta_relativa
