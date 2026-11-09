"""Descarga el modelo de Whisper una sola vez (npm run clases:preparar)."""
import sys

from faster_whisper import download_model

modelo = sys.argv[1] if len(sys.argv) > 1 else "large-v3-turbo"
print(f"Descargando {modelo} (~1,6 GB la primera vez)…", flush=True)
print("✔ Modelo en", download_model(modelo), flush=True)
