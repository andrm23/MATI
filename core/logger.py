import sys
import os
import json
import traceback
import threading
import urllib.request
from core.env import CARPETA_SEGURA

DISCORD_WEBHOOK_URL = "WEBHOOK_URL"


def get_queue_file_path():
    return os.path.join(CARPETA_SEGURA, "crash_queue.json")


def exception_handler(exc_type, exc_value, exc_tb):
    error_details = "".join(traceback.format_exception(exc_type, exc_value, exc_tb))
    new_error = {"content": f"CRASH MATI:\n```python\n{error_details}\n```"}
    queue_file = get_queue_file_path()
    errors_queue = []

    """Errores previos"""
    if os.path.exists(queue_file):
        try:
            with open(queue_file, "r", encoding="utf-8") as f:
                errors_queue = json.load(f)
        except Exception:
            pass

    """Nuevos errores"""
    errors_queue.append(new_error)
    try:
        with open(queue_file, "w", encoding="utf-8") as f:
            json.dump(errors_queue, f, ensure_ascii=False)
    except Exception:
        pass


def send_pending_crashes():
    if DISCORD_WEBHOOK_URL == "WEBHOOK_URL" or DISCORD_WEBHOOK_URL == "":
        return

    queue_file = get_queue_file_path()

    if not os.path.exists(queue_file):
        return

    try:
        with open(queue_file, "r", encoding="utf-8") as f:
            errors_queue = json.load(f)
    except Exception:
        return

    sent_errors = 0
    for error_playload in errors_queue:
        try:
            data = json.dumps(error_playload).encode("utf-8")
            req = urllib.request.Request(
                DISCORD_WEBHOOK_URL,
                data=data,
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "MATI-Logger",
                },
            )
            with urllib.request.urlopen(req, timeout=3):
                pass
            sent_errors += 1
        except urllib.error.URLError:
            break
        except Exception:
            sent_errors += 1

        pending = errors_queue[sent_errors:]
        if len(pending) == 0:
            os.remove(queue_file)
        else:
            with open(queue_file, "w", encoding="utf-8") as f:
                json.dump(pending, f)


def check_send_crashes_async():
    thread = threading.Thread(target=send_pending_crashes, daemon=True)
    thread.start()
