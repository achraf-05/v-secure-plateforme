#!/usr/bin/env bash
set -euo pipefail

mkdir -p "$(dirname "$0")/../hls"

KEY_HEX=$(openssl rand -hex 16)
printf '%s' "$(echo "$KEY_HEX" | xxd -r -p)" > "$(dirname "$0")/../hls/enc.key"

echo "AES_KEY=$KEY_HEX"
echo "Add this line to your .env or export it before running docker-compose."
