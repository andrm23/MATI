import threading
import time
import math
import json
import os
from db_manager import TelemetryDB


class TelemetryAPI:
    """
    Controlador (API) entre el motor de Python y la vista en JavaScript.

    Actúa como el puente de comunicación IPC (Inter-Process Communication) del sistema de telemetría. Se
    encarga de gestionar el ciclo de vida del simulador de hardware (Modeo Demo), realizar la grabación
    datos reales hacia la base de datos local, y exponer la información empaquetada para que el frontend
    la consuma en tiempo real.
    """

    def __init__(self):
        """
        Inicializa el estado de la API, configurando banderas de control y estableciendo la conexión
        con la base de datos SQLite.
        """
        self.db = TelemetryDB()
        self.is_running = False
        self.window = None
        self.is_recording = False
        self.latest_payload = None

    def set_window(self, window):
        """
        Asigna la referencia de la ventana principal de la interfaz gráfica.

        Permite que el backend (la API de Python) se cominuqe directamente con el contenedor web. Es
        fundamental para poder gestionar eventos nativos (como el cierre de la app) o inyectar comandos
        JavaScript desde Python.

        Args:
            window (webview.Window): La instancia de la ventana generada por la librería pywebview.
        """
        self.window = window

    def get_latest_data(self):
        """
        Expone el último paquete de telemetría generado para ser enviado al frontend.

        Esta función es invocada de manera asíncrona desde JavaScript (mediane la técnica de polling)
        a través del punete IPC de pywebview. Su objetivo es entregar los datos calculados por el hilo
        de simulación para que la interfaz web actualice el radas de fuerzas G y las gráficas en tiempo
        real.

        Returns:
            str: Cadena en formato JSON con el diccionario de sensores ('d') y el tiempo transcurrido
                 ('elapsed').
            None: Si la simulación aún no ha generado el primer paquete de datos.
        """
        if getattr(self, "latest_payload", None):
            return json.dumps(self.latest_payload)
        return None

    def start_demo(self):
        """
        Inicializa la simulación de telemetría.

        Esta función inicia la simulación de telemetría invocando a la función hardware_loop cuando
        se presiona en botón "DEMO" desde el frontend.

        """
        if not self.is_running:
            self.is_running = True
            t = threading.Thread(target=self.hardware_loop)
            t.daemon = True
            t.start()

    def stop_demo(self):
        """
        Deteiene la simulación de telemetría.

        Detiene el proceso de simulación de telemetría en caso de que el usuario presione la tecla "STOP
        DEMO" o en caso de conectarse con el módulo ESP32."
        """

        self.is_running = False

    def start_record(self):
        """
        Interruptor para iniciar el almacenamiento de datos de telemetría.

        Esta fución se encarga de crear una nueva tabla dentro de la base de datos para preparar el
        almacenamiento de datos de telemetría.
        """
        self.is_recording = True
        self.db.create_table()  # borrado de la DB y reset del PK

    def stop_record(self):
        """
        Interruptor para detener el almacenamiento de datos de telemetría.

        Detiene la grabación de telemetría dentro de la base de datos y exporta la información almacenada
        en un archivo csv en la carpeta "Desktop" del usuario.

        Returns:
            str: Mensaje que indica el path en el que se exportó el archivo csv.
        """
        self.is_recording = False
        desktop_path = os.path.join(
            os.path.expanduser("~"), "Desktop", "telemetry_data.csv"
        )
        total_registros = self.db.export_csv(desktop_path)
        return {"total": total_registros, "path": desktop_path}

    def push_real_data(self, data):
        """
        Almacena los datos de telemetría reales en la base de datos.

        Se encarga de recibir un paquete de datos crudos exclusivamente desde el ESP32 a través del
        frontend, realizar un redondeo a cuatro decimales e intertar el diccionario limpio en el gestor
        de la base de datos.

        Args:
            data (dict): Diccionario con las lecturas de los sensores (g, phi, etc).
        """
        if getattr(self, "is_recording", False):
            d_limpio = {
                clave: round(valor, 4)
                for clave, valor in data.items()
                if isinstance(valor, (int, float))
            }
            self.db.insert_data(d_limpio)

    def clamp(self, value, min_val, max_val):
        """
        Limita un valor numérico dentro de un rango definido.

        Esta función asegura que las lecturas generadas por el modelo matemático no superen los límites
        físicos de los sensores reales (ej. presiones negativas o temperaturas por encima del límite
        operativo).

        Args:
            value (float o int): Valor crudo por evaluar.
            min_val (float o int): Límite inferior permitido.
            max_val (float o int): Límite superior permitido.

        Returns:
            float o int: Valor ajustado al límite más cercano si excede el rango, o el valor original
                         si se enceuntra dentro del mismo.
        """
        return max(min_val, min(value, max_val))

    def hardware_loop(self):
        """
        Ciclo principal de simulación de telemetría (Modo Demo).

        Se ejecuta en un hilo secundario para no bloquear la interfaz principal.
        Sustituye al hardware físico generando datos sintéticos mediante funciones trigonométricas para
        probar el renderizado de gráficas y el radar de gráficas G.

        Opera a una frecuencia de 20GHz (sleep de 0.005s). Además, esta función evalúa si la grabación
        está activa para enviarlos a la base de datos y actualiza el playload global para que el frontend
        los consuma vía IPC.

        """
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
        """
        Rutina de limpieza (teardown) para un cierre seguro del sistema.

        Detiene el hilo del simulador de hardware (si está activo) y cierra la conexión con la base de
        datos SQLite. Es necesario para evitar que siga corriendo procesos en memoria RAM y previene la
        corrupción del archivo de datos.
        """

        self.is_running = False
        self.db.close()
