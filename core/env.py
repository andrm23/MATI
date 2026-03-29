import os
import platform

SISTEMA = platform.system()
IS_WINDOWS = SISTEMA == "Windows"
IS_MAC = SISTEMA == "Darwin"
# IS_LINUX = SISTEMA == "Linux"


def get_base_folder():
    """Retorna la ruta oculta estándar para datos de la app."""
    home = os.path.expanduser("~")
    if IS_WINDOWS:
        base = os.environ.get("LOCALAPPDATA", os.path.join(home, "AppData", "Local"))
    elif IS_MAC:
        base = os.path.join(home, "Library", "Application Support")
    else:
        base = os.path.join(home, ".local", "share")

    path = os.path.join(base, "MATI")

    if not os.path.exists(path):
        os.makedirs(path, exist_ok=True)

    return path


CARPETA_SEGURA = get_base_folder()
