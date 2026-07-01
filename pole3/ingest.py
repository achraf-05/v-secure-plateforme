"""Automatic video ingestion: download (URL) or accept an uploaded file, then
re-encode it as an AES-128 encrypted HLS stream, replacing the video currently
served at pole2/hls/output.m3u8.

Mirrors pole2/scripts/encode_hls.sh exactly (same ffmpeg flags, same key
handling) but implemented in pure Python so it can run from FastAPI without
shelling out to bash/git-bash.
"""

import binascii
import glob
import os
import secrets
import shutil
import subprocess
import tempfile
import urllib.request

import yt_dlp

from pipeline import _ffmpeg_exe


def download_video(url: str) -> str:
    """Download a video from a URL to a temp file and return its path.

    Tries yt-dlp first (handles YouTube and most video sites). Falls back to
    a plain HTTP(S) direct-file download via urllib for direct-file URLs
    (e.g. a .mp4 link) that yt-dlp doesn't recognize as an extractor.
    """
    tmp_dir = tempfile.mkdtemp()
    outtmpl = os.path.join(tmp_dir, "download.%(ext)s")

    ydl_opts = {
        "outtmpl": outtmpl,
        "format": "mp4/bestvideo+bestaudio/best",
        "quiet": True,
        "nocheckcertificate": True,
        "merge_output_format": "mp4",
        # YouTube increasingly blocks anonymous downloads ("Sign in to
        # confirm you're not a bot") — authenticate using a local browser's
        # cookies. Firefox, not Chrome: Chrome's cookie store is protected by
        # Windows DPAPI "App-Bound Encryption" (Chrome 127+), which yt-dlp
        # cannot decrypt (see yt-dlp issue #10927). Firefox uses its own NSS
        # key, unaffected by that issue.
        "cookiesfrombrowser": ("firefox",),
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)

        # Prefer yt-dlp's own record of the final (post-merge) file path over
        # globbing — globbing can pick up a leftover intermediate stream
        # (e.g. a video-only or audio-only fragment) if the merge step
        # produced more than one "download.*" file, which then fails
        # ffmpeg re-encoding with an opaque "moov atom not found" error.
        final_path = None
        requested = (info or {}).get("requested_downloads") or []
        if requested and requested[0].get("filepath"):
            final_path = requested[0]["filepath"]
        if not final_path or not os.path.exists(final_path):
            candidates = sorted(
                glob.glob(os.path.join(tmp_dir, "download.*")),
                key=os.path.getsize,
                reverse=True,
            )
            if not candidates:
                raise RuntimeError("yt-dlp n'a produit aucun fichier")
            final_path = candidates[0]

        _validate_video_file(final_path)
        return final_path
    except Exception:
        # Fallback: plain direct-file download (yt-dlp fails cleanly on
        # non-video-site URLs such as a direct .mp4 link).
        fallback_path = os.path.join(tmp_dir, "download.mp4")
        urllib.request.urlretrieve(url, fallback_path)
        _validate_video_file(fallback_path)
        return fallback_path


def _validate_video_file(path: str) -> None:
    """Fail fast with a clear error if a downloaded/uploaded file isn't a
    readable video (e.g. truncated, missing its moov atom) — must run BEFORE
    the file can overwrite the live video_source.mp4 or HLS stream."""
    try:
        subprocess.run(
            [_ffmpeg_exe(), "-v", "error", "-i", path, "-t", "0.1", "-f", "null", "-"],
            check=True,
            capture_output=True,
        )
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(
            f"Fichier vidéo invalide ou corrompu: {exc.stderr.decode(errors='replace')}"
        ) from exc


def _read_aes_key(pole2_dir: str) -> str:
    """Read AES_KEY from environment or pole2/.env — never generate a new one,
    the key-server serves a fixed AES_KEY and a mismatch breaks decryption."""
    aes_key = os.environ.get("AES_KEY", "").strip()
    if aes_key:
        return aes_key

    env_path = os.path.join(pole2_dir, ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("AES_KEY="):
                    return line.split("=", 1)[1].strip()

    raise RuntimeError(
        "AES_KEY introuvable (definissez-le dans pole2/.env ou l'environnement)"
    )


def _clear_hls_dir(hls_dir: str) -> None:
    """Delete existing output.m3u8 and segment_*.ts BEFORE running ffmpeg.

    Required because ffmpeg is invoked with -hls_flags append_list, which
    appends to an existing playlist instead of replacing it if old segments
    are still on disk.
    """
    playlist_path = os.path.join(hls_dir, "output.m3u8")
    try:
        os.remove(playlist_path)
    except OSError:
        pass

    for segment_path in glob.glob(os.path.join(hls_dir, "segment_*.ts")):
        try:
            os.remove(segment_path)
        except OSError:
            pass


def reencode_hls(video_path: str, hls_dir: str, pole2_dir: str) -> None:
    """Re-encode video_path into AES-128 encrypted HLS at hls_dir, replicating
    pole2/scripts/encode_hls.sh.

    Encodes into a staging directory first and only swaps it into hls_dir
    once ffmpeg has fully succeeded, so a failed ingest never leaves the
    currently-serving stream deleted/broken (it previously cleared hls_dir
    up front, which took the live video down whenever the new encode failed)."""
    os.makedirs(hls_dir, exist_ok=True)
    staging_dir = tempfile.mkdtemp(prefix="hls_staging_")

    try:
        key_file = os.path.join(staging_dir, "enc.key")
        key_info_file = os.path.join(staging_dir, "enc.key.info")

        aes_key_hex = _read_aes_key(pole2_dir)
        with open(key_file, "wb") as f:
            f.write(binascii.unhexlify(aes_key_hex))

        iv = secrets.token_hex(16)

        with open(key_info_file, "w", encoding="utf-8") as f:
            f.write("http://localhost:8001/key?token=DEMO\n")
            f.write(os.path.abspath(key_file) + "\n")
            f.write(iv + "\n")

        playlist_path = os.path.join(staging_dir, "output.m3u8")
        segment_pattern = os.path.join(staging_dir, "segment_%03d.ts")

        try:
            subprocess.run(
                [
                    _ffmpeg_exe(), "-y",
                    "-i", video_path,
                    "-c:v", "libx264", "-crf", "22", "-preset", "fast",
                    "-c:a", "aac", "-b:a", "128k",
                    "-hls_time", "6",
                    "-hls_list_size", "0",
                    "-hls_key_info_file", key_info_file,
                    "-hls_segment_filename", segment_pattern,
                    "-hls_flags", "delete_segments+append_list",
                    playlist_path,
                ],
                check=True,
                capture_output=True,
            )
        except subprocess.CalledProcessError as exc:
            raise RuntimeError(
                f"ffmpeg a échoué: {exc.stderr.decode(errors='replace')}"
            ) from exc

        # Only reached on ffmpeg success: swap the new stream in.
        _clear_hls_dir(hls_dir)
        for name in os.listdir(staging_dir):
            shutil.move(os.path.join(staging_dir, name), os.path.join(hls_dir, name))
    finally:
        shutil.rmtree(staging_dir, ignore_errors=True)


def ingest_video(source_path_or_url: str, is_url: bool, hls_dir: str, pole2_dir: str) -> None:
    """Ingest a video (from a URL or a local file path) and replace the HLS
    stream at hls_dir. Overwrites pole2_dir/video_source.mp4 only after the
    new encode has fully succeeded, so a failed ingest leaves the previous
    working video/stream untouched instead of bricking the live playback."""
    tmp_download_dir = None
    try:
        if is_url:
            video_path = download_video(source_path_or_url)
            tmp_download_dir = os.path.dirname(video_path)
        else:
            video_path = source_path_or_url
            _validate_video_file(video_path)

        video_source_path = os.path.join(pole2_dir, "video_source.mp4")
        staging_source_path = video_source_path + ".incoming"
        shutil.copyfile(video_path, staging_source_path)

        try:
            reencode_hls(staging_source_path, hls_dir, pole2_dir)
        except Exception:
            os.remove(staging_source_path)
            raise

        os.replace(staging_source_path, video_source_path)
    finally:
        if tmp_download_dir:
            shutil.rmtree(tmp_download_dir, ignore_errors=True)
