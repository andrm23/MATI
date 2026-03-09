import os
import platform


def apply_fixes():

    sistema = platform.system()

    if sistema == "Linux":
        # solución para ventana estática (bypass de aceleración)
        os.environ["WEBKIT_DISABLE_COMPOSITING_MODE"] = "1"

        if "LD_LIBRARY_PATH" in os.environ:
            current_path = os.environ["LD_LIBRARY_PATH"]
            clean_paths = [p for p in current_path.split(":") if "Xilinx" not in p]
            os.environ["LD_LIBRARY_PATH"] = ":".join(clean_paths)
