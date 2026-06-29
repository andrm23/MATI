#!/bin/bash
# Este script levanta la aplicación y la reinicia automáticamente
# si detecta algún cambio en los archivos Python, HTML, JS o CSS.

echo "Starting MATI in development mode..."
watchmedo auto-restart \
  --patterns="*.py;*.html;*.js;*.css" \
  --recursive \
  -- python main.py
