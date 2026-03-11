"""
Módulo de gestión de persistencia de datos para el sistema MATI.

Este script facilita la conexión y las operaciones sobre una base de datos
local SQLite, permitiendo el almacenamiento estructurado de las sesiones de
telemetría capturadas y su posterior exportación a formatos estándar.
"""

import sqlite3
import os
import csv

# --- CONFIGURACIÓN PRINCIPAL (Rutas Absolutas) ---
CARPETA_SEGURA = os.path.join(os.path.expanduser("~"), "Documents", "TelemetriaApp")
DB_NAME = os.path.join(CARPETA_SEGURA, "telemetry_data.db")
BATCH_SIZE = 20  # Frecuencia de 20Hz


class TelemetryDB:
    """
    Clase encargada de la gestión del ciclo de vida de la base de datos de telemetría.

    Maneja la creación de tablas, la inserción optimizada por lotes (batching)
    y la exportación de datos históricos a archivos CSV.
    """

    def __init__(self):
        """
        Inicializa la conexión con la base de datos y prepara el entorno.

        Crea la carpeta de almacenamiento si no existe y reinicia la base de
        datos para asegurar una sesión de grabación limpia.
        """
        os.makedirs(CARPETA_SEGURA, exist_ok=True)

        if os.path.exists(DB_NAME):
            try:
                os.remove(DB_NAME)
            except Exception:
                pass

        # Conexión con la DB
        self.conn = sqlite3.connect(DB_NAME, check_same_thread=False)
        self.cursor = self.conn.cursor()

        # lote de datos temporales
        self.batch_data = []

        self.create_table()

    def create_table(self):
        """
        Define la estructura de la tabla de telemetría en la base de datos.

        Elimina cualquier tabla previa 'telemetry_data' para evitar la mezcla
        de datos entre sesiones de grabación distintas.
        """
        self.cursor.execute("DROP TABLE IF EXISTS telemetry_data")

        query = """
        CREATE TABLE telemetry_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            Time REAL, G REAL, Steer REAL, Accel REAL, Brake REAL,
            FL REAL, FR REAL, RL REAL, RR REAL,
            TFI REAL, TFD REAL, TTI REAL, TTD REAL,
            PFI REAL, PFD REAL, PTI REAL, PTD REAL
        )
        """
        self.cursor.execute(query)
        self.conn.commit()

    def insert_data(self, d):
        """
        Procesa y encola un nuevo registro de telemetría.

        Mapea los valores del diccionario de entrada a una tupla estructurada.
        Si se alcanza el BATCH_SIZE definido, se dispara el commit a la DB.

        Args:
            d (dict): Diccionario con los datos crudos de los sensores.
        """
        row = (
            float(d.get("Time", 0.0)),
            float(d.get("g", 0.0)),
            float(d.get("phi", 0.0)),
            float(d.get("acel", 0.0)),
            float(d.get("fren", 0.0)),
            float(d.get("fi", 0.0)),
            float(d.get("fd", 0.0)),
            float(d.get("ti", 0.0)),
            float(d.get("td", 0.0)),
            float(d.get("tfi", 0.0)),
            float(d.get("tfd", 0.0)),
            float(d.get("tti", 0.0)),
            float(d.get("ttd", 0.0)),
            float(d.get("pfi", 0.0)),
            float(d.get("pfd", 0.0)),
            float(d.get("pti", 0.0)),
            float(d.get("ptd", 0.0)),
        )
        self.batch_data.append(row)

        if len(self.batch_data) >= BATCH_SIZE:
            self.commit_batch()

    def commit_batch(self):
        """
        Realiza la inserción masiva de los datos encolados en la base de datos.

        Utiliza executemany para optimizar el rendimiento de escritura y
        limpia el búfer temporal tras confirmar la transacción.
        """

        if not self.batch_data:
            return

        query = """
        INSERT INTO telemetry_data (
            Time, G, Steer, Accel, Brake, 
            FL, FR, RL, RR, 
            TFI, TFD, TTI, TTD, 
            PFI, PFD, PTI, PTD
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        self.cursor.executemany(query, self.batch_data)
        self.conn.commit()
        self.batch_data.clear()

    def export_csv(self, filename="telemetry_data.csv"):
        """
        Exporta el contenido íntegro de la tabla telemetry_data a un archivo CSV.

        Realiza un commit final de los datos pendientes antes de leer la
        base de datos y generar el archivo con encabezados técnicos.

        Args:
            filename (str): Nombre o ruta del archivo de salida.
        """

        self.commit_batch()
        self.cursor.execute(
            "SELECT Time, G, Steer, Accel, Brake, FL, FR, RL, RR, TFI, TFD, TTI, TTD, PFI, PFD, PTI, PTD FROM telemetry_data ORDER BY id ASC"
        )
        registros = self.cursor.fetchall()

        headers = [
            "Time",
            "G",
            "Steer",
            "Accel",
            "Brake",
            "FL",
            "FR",
            "RL",
            "RR",
            "TFI",
            "TFD",
            "TTI",
            "TTD",
            "PFI",
            "PFD",
            "PTI",
            "PTD",
        ]

        # creación del archivo .csv
        with open(filename, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            writer.writerows(registros)

    def close(self):
        """
        Exporta el contenido íntegro de la tabla telemetry_data a un archivo CSV.

        Realiza un commit final de los datos pendientes antes de leer la
        base de datos y generar el archivo con encabezados técnicos.

        Args:
            filename (str): Nombre o ruta del archivo de salida.
        """

        self.commit_batch()
        self.conn.close()
