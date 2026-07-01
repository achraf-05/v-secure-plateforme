#!/usr/bin/env bash
set -euo pipefail

INPUT="${1:?Usage: $0 <input_video>}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HLS_DIR="$SCRIPT_DIR/../hls"
ENV_FILE="$SCRIPT_DIR/../.env"

mkdir -p "$HLS_DIR"

KEY_FILE="$HLS_DIR/enc.key"
KEY_INFO_FILE="$HLS_DIR/enc.key.info"

AES_KEY="${AES_KEY:-}"
if [ -z "$AES_KEY" ] && [ -f "$ENV_FILE" ]; then
  AES_KEY=$(grep -m1 '^AES_KEY=' "$ENV_FILE" | cut -d= -f2-)
fi
: "${AES_KEY:?AES_KEY introuvable (definissez-le dans pole2/.env ou l'environnement) — le key-server sert cette meme cle, donc encode_hls.sh doit la reutiliser au lieu d'en generer une nouvelle a chaque fois}"

echo -n "$AES_KEY" | xxd -r -p > "$KEY_FILE"
IV=$(openssl rand -hex 16)

# ffmpeg reads this path itself (not via argv), so on Windows it needs a native
# path — git-bash's automatic POSIX->Windows argv conversion doesn't apply to
# file contents.
KEY_FILE_FOR_FFMPEG="$KEY_FILE"
if command -v cygpath >/dev/null 2>&1; then
  KEY_FILE_FOR_FFMPEG="$(cygpath -w "$KEY_FILE")"
fi

cat > "$KEY_INFO_FILE" <<EOF
http://localhost:8001/key?token=DEMO
$KEY_FILE_FOR_FFMPEG
$IV
EOF

ffmpeg -y \
  -i "$INPUT" \
  -c:v libx264 -crf 22 -preset fast \
  -c:a aac -b:a 128k \
  -hls_time 6 \
  -hls_list_size 0 \
  -hls_key_info_file "$KEY_INFO_FILE" \
  -hls_segment_filename "$HLS_DIR/segment_%03d.ts" \
  -hls_flags independent_segments \
  "$HLS_DIR/output.m3u8"

echo "HLS stream ready at http://localhost:8082/hls/output.m3u8"
