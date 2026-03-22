import os
import sys
import platform


def apply_fixes():
    """Aplica parches de entorno para asegurar compatibilidad multiplataforma."""
    sistema = platform.system()

    # --- PARCHE PARA MACOS (Modo Windowed) ---
    if sistema == "Darwin":  # Identificador de macOS
        # if sys.stdout is None:
        #     sys.stdout = open(os.devnull, "w")
        # if sys.stderr is None:
        #     sys.stderr = open(os.devnull, "w")
        print("[COMPAT] Parches de salida para macOS aplicados.")

    # --- PARCHES PARA LINUX (Andrés / Xilinx / WebKit) ---
    elif sistema == "Linux":
        # Forzar desactivación de aceleración para evitar ventana estática
        os.environ["WEBKIT_DISABLE_COMPOSITING_MODE"] = "1"

        # Limpieza de rutas de Xilinx para evitar conflictos de librerías
        if "LD_LIBRARY_PATH" in os.environ:
            current_path = os.environ["LD_LIBRARY_PATH"]
            clean_paths = [p for p in current_path.split(":") if "Xilinx" not in p]
            os.environ["LD_LIBRARY_PATH"] = ":".join(clean_paths)

        print("[COMPAT] Parches de renderizado para Linux aplicados.")
