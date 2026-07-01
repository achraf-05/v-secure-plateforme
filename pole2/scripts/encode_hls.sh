#!/usr/bin/env bash
set -euo pipefail

INPUT="${1:?Usage: $0 <input_video>}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HLS_DIR="$SCRIPT_DIR/../hls"

mkdir -p "$HLS_DIR"

KEY_FILE="$HLS_DIR/enc.key"
KEY_INFO_FILE="$HLS_DIR/enc.key.info"

openssl rand 16 > "$KEY_FILE"
IV=$(openssl rand -hex 16)

cat > "$KEY_INFO_FILE" <<EOF
http://localhost:8001/key?token=DEMO
$KEY_FILE
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
  -hls_flags delete_segments+append_list \
  "$HLS_DIR/output.m3u8"

echo "HLS stream ready at http://localhost:8080/hls/output.m3u8"
