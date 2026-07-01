"""
Módulo de gestión de persistencia de datos para el sistema MATI.

Este script facilita la conexión y las operaciones sobre una base de datos
local SQLite, permitiendo el almacenamiento estructurado de las sesiones de
telemetría capturadas y su posterior exportación a formatos estándar.
"""

import sqlite3
import os
import csv
import threading
from datetime import datetime
from core.env import CARPETA_SEGURA


# CONFIGURACIÓN PRINCIPAL (Rutas Absolutas)
DB_NAME = os.path.join(CARPETA_SEGURA, "telemetry.db")
DB_HISTORY_NAME = os.path.join(CARPETA_SEGURA, "telemetry_history.mati")
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
            except Exception as e:
                print(f"[ERROR] No se pudo borrar la DB temporal: {e}")

        # Conexión con la DB
        self.conn = sqlite3.connect(DB_NAME, check_same_thread=False)
        self.cursor = self.conn.cursor()

        # conexión con DB persistente y cifrado
        self.conn_hist = sqlite3.connect(DB_HISTORY_NAME, check_same_thread=False)
        self.cursor_hist = self.conn_hist.cursor()
        self.cursor_hist.execute("PRAGMA key = 'UAMOTORS_gotera'")

        # lock para evitar ace conditions entre hilos
        self.lock = threading.RLock()
        self.cursor_hist.execute("PRAGMA key = 'UAMOTORS_gotera'")

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

        query_base = """
        CREATE TABLE telemetry_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            Time REAL, G REAL, Steer REAL, Accel REAL, Brake REAL,
            FL REAL, FR REAL, RL REAL, RR REAL
        )
        """
        self.cursor.execute(query_base)

        # tabla historial
        query_history = query_base.replace("CREATE TABLE", "CREATE TABLE IF NOT EXISTS")
        query_history = query_history.replace("id INTEGER", "id INTEGER", 1).replace(
            "RR REAL", "RR REAL, session_id TEXT"
        )

        try:
            self.cursor_hist.execute(query_history)
        except sqlite3.OperationalError as e:
            # Si la tabla existe pero no tiene la columna session_id (versión vieja), la añadimos
            if "duplicate column name: session_id" not in str(e).lower():
                try:
                    self.cursor_hist.execute(
                        "ALTER TABLE telemetry_data ADD COLUMN session_id TEXT"
                    )
                except:
                    pass  # Ya existía la columna

        self.conn.commit()
        self.conn_hist.commit()

    def insert_data(self, d):
        """
        Procesa y encola un nuevo registro de telemetría.

        Mapea los valores del diccionario de entrada a una tupla estructurada.
        Si se alcanza el BATCH_SIZE definido, se dispara el commit a la DB.

        Args:
            d (dict): Diccionario con los datos crudos de los sensores.
        """
        row = (
            round(float(d.get("Time", 0.0)), 4),
            round(float(d.get("g", 0.0)), 4),
            round(float(d.get("phi", 0.0)), 4),
            round(float(d.get("acel", 0.0)), 4),
            round(float(d.get("fren", 0.0)), 4),
            round(float(d.get("fi", 0.0)), 4),
            round(float(d.get("fd", 0.0)), 4),
            round(float(d.get("ti", 0.0)), 4),
            round(float(d.get("td", 0.0)), 4)
            # round(float(d.get("tfi", 0.0)), 4),
            # round(float(d.get("tfd", 0.0)), 4),
            # round(float(d.get("tti", 0.0)), 4),
            # round(float(d.get("ttd", 0.0)), 4),
            # float(d.get("pfi", 0.0)),
            # float(d.get("pfd", 0.0)),
            # float(d.get("pti", 0.0)),
            # float(d.get("ptd", 0.0)),
        )
        
        with self.lock:
            self.batch_data.append(row)

            if len(self.batch_data) >= BATCH_SIZE:
                self.commit_batch()

    def commit_batch(self):
        """
        Realiza la inserción masiva de los datos encolados en la base de datos.
        """
        with self.lock:
            if not self.batch_data:
                return

            query = """
            INSERT INTO telemetry_data (
                Time, G, Steer, Accel, Brake, 
                FL, FR, RL, RR
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            self.cursor.executemany(query, self.batch_data)
            self.conn.commit()
            self.batch_data.clear()

    def save_to_history(self, session_name):
        self.commit_batch()

        # lectura de la tabla vólatil
        self.cursor.execute("SELECT * FROM telemetry_data")
        rows = self.cursor.fetchall()

        full_session_id = session_name

        history_rows = [row[1:] + (full_session_id,) for row in rows]

        query_hist = """
        INSERT INTO telemetry_data (
            Time, G, Steer, Accel, Brake, FL, FR, RL, RR, session_id
        ) VALUES (?,?,?,?,?,?,?,?,?,?)
        """
        self.cursor_hist.executemany(query_hist, history_rows)
        self.conn_hist.commit()

        return full_session_id

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
            "SELECT Time, G, Steer, Accel, Brake, FL, FR, RL, RR FROM telemetry_data ORDER BY id ASC"
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
            "RR"
        ]

        # creación del archivo .csv
        with open(filename, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            writer.writerows(registros)

        return len(registros)

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
