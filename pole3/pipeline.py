import ssl
ssl._create_default_https_context = ssl._create_unverified_context

import json
import os
import shutil
import subprocess
import tempfile
from typing import Any, Optional

from groq import Groq

_whisper_model: Optional[Any] = None


def _ensure_ffmpeg_on_path(exe: str) -> None:
    # whisper's own audio loader shells out to the literal "ffmpeg" command via
    # PATH, so imageio_ffmpeg's oddly-named binary (e.g. ffmpeg-win-x86_64-v7.1.exe)
    # must be exposed under the exact name "ffmpeg(.exe)" for whisper to find it.
    alias_dir = os.path.join(tempfile.gettempdir(), "vsecure_ffmpeg_bin")
    alias_name = "ffmpeg.exe" if os.name == "nt" else "ffmpeg"
    alias_path = os.path.join(alias_dir, alias_name)
    if not os.path.exists(alias_path):
        os.makedirs(alias_dir, exist_ok=True)
        try:
            os.link(exe, alias_path)
        except OSError:
            shutil.copy(exe, alias_path)
    if alias_dir not in os.environ.get("PATH", "").split(os.pathsep):
        os.environ["PATH"] = alias_dir + os.pathsep + os.environ.get("PATH", "")


def _ffmpeg_exe() -> str:
    if shutil.which("ffmpeg"):
        return "ffmpeg"
    try:
        import imageio_ffmpeg
        exe = imageio_ffmpeg.get_ffmpeg_exe()
        _ensure_ffmpeg_on_path(exe)
        return exe
    except ImportError:
        raise RuntimeError("ffmpeg introuvable. Installez ffmpeg ou imageio-ffmpeg.")


def get_whisper_model() -> Any:
    global _whisper_model
    if _whisper_model is None:
        import whisper
        _whisper_model = whisper.load_model("small")
    return _whisper_model


def extract_audio(video_path: str) -> str:
    fd, audio_path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    is_hls = video_path.lower().endswith(".m3u8")
    hls_opts = (
        ["-allowed_extensions", "ALL", "-protocol_whitelist", "file,crypto,data,http,tcp"]
        if is_hls else []
    )
    try:
        subprocess.run(
            [
                _ffmpeg_exe(), "-y",
                *hls_opts,
                "-i", video_path,
                "-vn", "-acodec", "pcm_s16le",
                "-ar", "16000", "-ac", "1",
                audio_path,
            ],
            check=True,
            capture_output=True,
        )
    except subprocess.CalledProcessError as exc:
        os.unlink(audio_path)
        raise RuntimeError(
            f"ffmpeg a échoué: {exc.stderr.decode(errors='replace')}"
        ) from exc
    return audio_path


def transcribe(audio_path: str) -> dict:
    model = get_whisper_model()
    return model.transcribe(audio_path, fp16=False)


def _extract_json_from_text(text: str) -> str:
    text = text.strip()
    if "```" in text:
        start = text.find("```")
        end = text.rfind("```")
        if start != end:
            inner = text[start + 3 : end].strip()
            if inner.startswith("json"):
                inner = inner[4:].strip()
            return inner
    brace_start = text.find("{")
    brace_end = text.rfind("}")
    if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
        return text[brace_start : brace_end + 1]
    return text


def build_groq_analysis(full_text: str, duration: float, client: Groq) -> dict:
    prompt = f"""Analyse ce transcript vidéo (durée totale: {duration:.1f} secondes).
Retourne UNIQUEMENT un objet JSON valide, sans markdown, sans texte avant ou après.

Transcript:
{full_text[:4000]}

JSON attendu (respecte exactement cette structure):
{{
  "summary": "résumé factuel en 2-3 phrases",
  "chapters": [
    {{"id": "ch1", "title": "titre court", "start": 0.0, "end": 0.0, "description": "description concise"}},
    {{"id": "ch2", "title": "titre court", "start": 0.0, "end": {duration:.1f}, "description": "description concise"}}
  ],
  "keywords": ["mot1", "mot2", "mot3", "mot4", "mot5"],
  "language": "fr"
}}

Génère 2 à 4 chapitres qui couvrent toute la durée de la vidéo. Les valeurs start/end sont en secondes flottants."""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=1024,
    )

    raw = response.choices[0].message.content
    clean = _extract_json_from_text(raw)

    try:
        return json.loads(clean)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Groq a retourné un JSON invalide: {exc}\nContenu brut: {raw[:300]}"
        ) from exc


def analyze_video(video_path: str, groq_api_key: str) -> dict:
    audio_path = None
    try:
        audio_path = extract_audio(video_path)
        result = transcribe(audio_path)

        segments = [
            {
                "start": round(float(seg["start"]), 3),
                "end": round(float(seg["end"]), 3),
                "text": seg["text"].strip(),
            }
            for seg in result.get("segments", [])
        ]

        full_text = result.get("text", "").strip()
        duration = round(float(segments[-1]["end"]), 3) if segments else 0.0

        if not full_text:
            return {
                "transcript": [],
                "summary": "",
                "chapters": [],
                "keywords": [],
                "language": result.get("language", "fr"),
                "duration": duration,
            }

        client = Groq(api_key=groq_api_key)
        nlp = build_groq_analysis(full_text, duration, client)

        return {
            "transcript": segments,
            "summary": nlp.get("summary", ""),
            "chapters": nlp.get("chapters", []),
            "keywords": nlp.get("keywords", []),
            "language": nlp.get("language", result.get("language", "fr")),
            "duration": duration,
        }
    finally:
        if audio_path and os.path.exists(audio_path):
            os.unlink(audio_path)
