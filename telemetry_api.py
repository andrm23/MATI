import threading
import time
import math
import json
import os
import webbrowser
from db_manager import TelemetryDB


class TelemetryAPI:
    def __init__(self):
        # conexión con SQLite
        self.db = TelemetryDB()
        self.is_running = False
        self.window = None
        self.is_recording = False
        self.latest_payload = None

    def open_external_link(self, url):
        """Abre una URL en el navegador predeterminado del sistema."""
        webbrowser.open(url)

    def set_window(self, window):
        self.window = window

    def get_latest_data(self):
        """Pull de los datos desde el frontend"""
        if getattr(self, "latest_payload", None):
            return json.dumps(self.latest_payload)
        return None

    def start_demo(self):
        """Conexión con el botón DEMO para iniciar la simulación de datos"""
        if not self.is_running:
            self.is_running = True

            # simulación
            t = threading.Thread(target=self.hardware_loop)
            t.daemon = True
            t.start()
            return "Simulación iniciadad desde Python"

    def stop_demo(self):
        self.is_running = False
        return f"Simulación detenida desde Python."

    def start_record(self):
        """Conexión con el botón REC para iniciar la grabación de datos"""
        self.is_recording = True
        self.db.create_table()  # borrado de la DB y reset del PK
        return "Grabación iniciada en la base de datos."

    def stop_record(self):
        """Conexión con el botón REC para detener la grabación de datos"""
        self.is_recording = False
        desktop_path = os.path.join(
            os.path.expanduser("~"), "Desktop", "telemetry_data.csv"
        )
        self.db.export_csv(desktop_path)
        return f"CSV exportado en:\n{desktop_path}"

    def push_real_data(self, data):
        """Incersión de datos obtenidos de la ---- a la DB"""
        if getattr(self, "is_recording", False):
            d_limpio = {
                clave: round(valor, 3)
                for clave, valor in data.items()
                if isinstance(valor, (int, float))
            }
            self.db.insert_data(d_limpio)

    def clamp(self, value, min_val, max_val):
        """Función de apoyo"""
        return max(min_val, min(value, max_val))

    def hardware_loop(self):
        """SSimulador de datos"""
        t = 0.0
        #  perf_counter es el equivalente al performance.now() de JS
        demo_start = time.perf_counter()

        while self.is_running:
            t += 0.05

            # diccionario con los datos
            d = {
                "g": abs(math.sin(t) * 2),
                "x": math.sin(t) * 1.5,
                "y": math.cos(t) * 1.5,
                "phi": math.sin(t) * 45,
                "acel": abs(math.sin(t) * 10),
                "fren": -abs(math.cos(t) * 10),
                "fi": math.sin(t * 3) * 8,
                "fd": math.cos(t * 3) * 8,
                "ti": -math.sin(t * 3) * 8,
                "td": -math.cos(t * 3) * 8,
                "tfi": self.clamp(
                    58 + math.sin(t * 0.9) * 20 + abs(math.sin(t * 0.35)) * 32, 0, 120
                ),
                "tfd": self.clamp(
                    61
                    + math.sin(t * 0.95 + 0.4) * 19
                    + abs(math.sin(t * 0.4 + 0.3)) * 30,
                    0,
                    120,
                ),
                "tti": self.clamp(
                    56
                    + math.sin(t * 0.88 + 0.9) * 18
                    + abs(math.sin(t * 0.31 + 0.5)) * 34,
                    0,
                    120,
                ),
                "ttd": self.clamp(
                    59
                    + math.sin(t * 0.92 + 1.2) * 20
                    + abs(math.sin(t * 0.37 + 0.8)) * 31,
                    0,
                    120,
                ),
                "pfi": self.clamp(
                    12 + abs(math.sin(t * 1.8)) * 22 + math.sin(t * 0.3) * 4, 0, 40
                ),
                "pfd": self.clamp(
                    11 + abs(math.sin(t * 1.75 + 0.4)) * 23 + math.sin(t * 0.33) * 4,
                    0,
                    40,
                ),
                "pti": self.clamp(
                    10 + abs(math.sin(t * 1.7 + 0.7)) * 21 + math.sin(t * 0.28) * 4,
                    0,
                    40,
                ),
                "ptd": self.clamp(
                    10 + abs(math.sin(t * 1.72 + 1.1)) * 24 + math.sin(t * 0.25) * 4,
                    0,
                    40,
                ),
                "rpmFi": 3200 + abs(math.sin(t * 1.1)) * 2400,
                "rpmFd": 3300 + abs(math.sin(t * 1.09 + 0.4)) * 2350,
                "rpmTi": 3150 + abs(math.sin(t * 1.12 + 0.9)) * 2250,
                "rpmTd": 3250 + abs(math.sin(t * 1.08 + 1.1)) * 2300,
            }

            elapsed = time.perf_counter() - demo_start
            d["Time"] = elapsed  # Agregamos el tiempo al diccionario para la DB
            d_limpio = {clave: round(valor, 3) for clave, valor in d.items()}
            # Escritura en base de datos SQLite
            if getattr(self, "is_recording", False):
                self.db.insert_data(d_limpio)

            # empaquetado y envió a frontend
            self.latest_payload = {"d": d_limpio, "elapsed": round(elapsed, 3)}

            # if self.window:
            #     js_command = f"if(window.receiveDataFromPython) window.receiveDataFromPython({json.dumps(payload)});"
            #     self.window.evaluate_js(js_command)

            time.sleep(0.05)

    def on_closing(self):
        self.is_running = False
        self.db.close()
