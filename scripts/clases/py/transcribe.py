"""
Transcripción local y gratuita de una clase (español + chino mezclados) con faster-whisper.

Uso (lo llama scripts/clases/todo.ts):
  uv run --project scripts/clases/py python -I scripts/clases/py/transcribe.py AUDIO SALIDA.json
      [--modelo large-v3-turbo] [--meta '{"...": ...}']

Método (elegido tras probar; ver scripts/clases/README.md):
 1. Primera pasada sin idioma fijo, con VAD y marcas por palabra → segmentos.
 2. Detección de idioma por segmento (detect_language sobre el trozo de audio).
 3. Los segmentos cuyo idioma no coincide con el de la pasada se vuelven a transcribir
    forzando su idioma (es / zh). Así el chino no sale "traducido" al español ni al revés.
 4. El chino se pasa siempre a simplificado con OpenCC (t2s).
Es reanudable: guarda el avance en SALIDA.json.partial cada pocos segmentos.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path


def add_cuda_dll_dirs() -> None:
    """En Windows, CTranslate2 necesita encontrar cublas/cudnn de los paquetes nvidia-*."""
    if sys.platform != "win32":
        return
    import site

    for sp in site.getsitepackages() + [site.getusersitepackages()]:
        nv = Path(sp) / "nvidia"
        if not nv.exists():
            continue
        for b in nv.glob("*/bin"):
            os.add_dll_directory(str(b))
            os.environ["PATH"] = str(b) + os.pathsep + os.environ["PATH"]


add_cuda_dll_dirs()

import numpy as np  # noqa: E402
from faster_whisper import WhisperModel  # noqa: E402
from opencc import OpenCC  # noqa: E402

SR = 16000
t2s = OpenCC("t2s")
HAN = __import__("re").compile(r"[一-鿿]")


try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # la consola de Windows no es UTF-8
except Exception:
    pass

# Frases que Whisper "alucina" en silencios o ruido (vienen de subtítulos de su entrenamiento).
HALLUCINATIONS = __import__("re").compile(
    r"(字幕|订阅|點贊|点赞|明镜|谢谢观看|謝謝觀看|Продолжение следует|Subt[ií]tulos|Gracias por ver|suscr[ií]bete|Amara\.org|www\.|\.com\b)",
    __import__("re").I,
)
ZH_LANGS = {"zh", "yue", "ja", "ko"}  # el coreano/japonés que "oye" Whisper aquí es chino mal detectado


def log(msg: str) -> None:
    print(msg, flush=True)


def es_o_zh(model, chunk) -> tuple[str, float]:
    """Idioma del trozo, limitado a español o chino (las clases solo tienen esos dos)."""
    try:
        _, _, probs = model.detect_language(chunk)
    except Exception:
        return "es", 0.0
    p_zh = sum(p for l, p in probs if l in ZH_LANGS)
    p_es = sum(p for l, p in probs if l not in ZH_LANGS)
    return ("zh", p_zh) if p_zh > p_es else ("es", p_es)


def load_audio(path: str) -> np.ndarray:
    """Audio a 16 kHz mono float32 con ffmpeg (más fiable que PyAV en Windows)."""
    import subprocess

    ffmpeg = os.environ.get("FFMPEG", "ffmpeg")
    cmd = [ffmpeg, "-nostdin", "-hide_banner", "-loglevel", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"]
    out = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(out, dtype=np.float32).copy()


def pick_device() -> tuple[str, str]:
    try:
        import ctranslate2

        if ctranslate2.get_cuda_device_count() > 0:
            return "cuda", "float16"
    except Exception:
        pass
    return "cpu", "int8"


def normalize_lang(lang: str | None, text: str) -> str:
    if lang in ("zh", "yue", "ja") or (HAN.search(text or "") and lang not in ("es",)):
        return "zh"
    if lang == "es":
        return "es"
    return lang or ("zh" if HAN.search(text or "") else "es")


def clean(text: str, lang: str) -> str:
    text = text.strip()
    return t2s.convert(text) if lang == "zh" or HAN.search(text) else text


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("salida")
    ap.add_argument("--modelo", default="large-v3-turbo")
    ap.add_argument("--meta", default="{}")
    ap.add_argument("--max-seg", type=float, default=0, help="solo los primeros N segundos (pruebas)")
    a = ap.parse_args()

    out_path = Path(a.salida)
    partial = out_path.with_suffix(out_path.suffix + ".partial")
    device, compute = pick_device()
    if device == "cpu":
        log("⚠ No hay GPU NVIDIA utilizable: se usa la CPU (int8). Una clase de 1 h puede tardar 30–60 min.")
    log(f"Modelo {a.modelo} en {device} ({compute})…")
    t0 = time.time()
    model = WhisperModel(a.modelo, device=device, compute_type=compute)

    audio = load_audio(a.audio)
    if a.max_seg:
        audio = audio[: int(a.max_seg * SR)]
    duration = len(audio) / SR
    log(f"Audio: {duration/60:.1f} min")

    done: list[dict] = []
    resume_from = 0.0
    if partial.exists():
        st = json.loads(partial.read_text(encoding="utf-8"))
        if st.get("modelo") == a.modelo and abs(st.get("duration", 0) - duration) < 1:
            done = st["segments"]
            resume_from = done[-1]["end"] if done else 0.0
            log(f"Reanudando desde {resume_from/60:.1f} min ({len(done)} segmentos ya hechos)")

    # 1) Pasada principal: idioma libre, VAD, palabras con tiempo.
    clip = [resume_from, duration] if resume_from else "0"
    segments, info = model.transcribe(
        audio,
        language="es",  # idioma base de la clase; los trozos en chino se rehacen abajo
        task="transcribe",
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 500},
        word_timestamps=True,
        condition_on_previous_text=False,  # evita que arrastre el idioma de un segmento al siguiente
        beam_size=5,
        clip_timestamps=clip,
        initial_prompt="Clase de chino en español. 你好，我们今天学习汉语。",
    )
    main_lang = "es"
    log("Pasada principal en español; los trozos en chino se vuelven a transcribir en chino")

    last_save = time.time()
    retried = 0
    for s in segments:
        a0, a1 = int(s.start * SR), int(s.end * SR)
        chunk = audio[a0:a1]
        if s.no_speech_prob > 0.6 and s.avg_logprob < -1.0:
            continue  # ruido o silencio
        lang, conf_lang = ("zh", 0.5) if HAN.search(s.text) else ("es", 0.5)
        if len(chunk) > SR * 0.5:
            lang, conf_lang = es_o_zh(model, chunk)
        text, words = s.text, s.words or []
        avg_lp = s.avg_logprob
        seg_main = "es"
        # 2) Si el trozo es de otro idioma, se re-transcribe forzando ese idioma.
        if lang != seg_main and len(chunk) > SR * 0.4:
            retried += 1
            sub, _ = model.transcribe(
                np.ascontiguousarray(chunk), language=lang, word_timestamps=True, beam_size=5, vad_filter=False, condition_on_previous_text=False
            )
            sub = list(sub)
            if sub:
                text = "".join(x.text for x in sub)
                words = [w for x in sub for w in (x.words or [])]
                for w in words:
                    w.start += s.start
                    w.end += s.start
                avg_lp = float(np.mean([x.avg_logprob for x in sub]))
        text = clean(text, lang)
        if not text or HALLUCINATIONS.search(text):
            continue
        done.append(
            {
                "start": round(s.start, 2),
                "end": round(s.end, 2),
                "lang": lang,
                "text": text,
                "confidence": round(float(np.exp(avg_lp)), 3),
                "langConfidence": round(float(conf_lang), 3),
                "words": [{"w": clean(w.word, lang), "s": round(w.start, 2), "e": round(w.end, 2), "p": round(w.probability, 2)} for w in words],
            }
        )
        if time.time() - last_save > 20:
            partial.write_text(json.dumps({"modelo": a.modelo, "duration": duration, "segments": done}, ensure_ascii=False), encoding="utf-8")
            last_save = time.time()
            pct = 100 * s.end / duration
            log(f"  {pct:5.1f} %  ({s.end/60:.1f}/{duration/60:.1f} min, {len(done)} segmentos)")

    covered = sum(max(0.0, d["end"] - d["start"]) for d in done)
    meta = json.loads(a.meta)
    result = {
        "version": 1,
        "meta": {
            **meta,
            "durationSec": round(duration, 1),
            "model": a.modelo,
            "device": f"{device}/{compute}",
            "method": "faster-whisper: pasada libre + detección de idioma por segmento + re-transcripción forzada; OpenCC t2s",
            "mainLang": main_lang,
            "segmentsRetranscribed": retried,
            "speechCoverage": round(covered / duration, 3) if duration else 0,
            "transcribedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "elapsedSec": round(time.time() - t0, 1),
        },
        "segments": done,
    }
    tmp = out_path.with_suffix(".tmp")
    tmp.write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(out_path)
    if partial.exists():
        partial.unlink()
    log(f"✔ {len(done)} segmentos en {result['meta']['elapsedSec']/60:.1f} min → {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
