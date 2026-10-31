#!/bin/bash
# Prépare la fabrication des vidéos : modules Python, voix française, polices du site.
# Chromium, Playwright et ffmpeg sont fournis par l'environnement.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(dirname "$HERE")"
pip install --break-system-packages -q "sherpa-onnx==1.12.40" soundfile scipy numpy >/dev/null 2>&1 || pip install -q "sherpa-onnx==1.12.40" soundfile scipy numpy
mkdir -p "$HERE/.cache"
if [ ! -f "$HERE/.cache/vits-piper-fr_FR-tom-medium/fr_FR-tom-medium.onnx" ]; then
  curl -sL -m 300 -o "$HERE/.cache/voice.tar.bz2" "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-fr_FR-tom-medium.tar.bz2"
  tar xjf "$HERE/.cache/voice.tar.bz2" -C "$HERE/.cache" && rm -f "$HERE/.cache/voice.tar.bz2"
fi
if [ ! -d "$REPO/node_modules/@fontsource/tilt-warp" ]; then
  (cd "$REPO" && npm install --no-save --no-audit --no-fund @fontsource/inter @fontsource/jetbrains-mono @fontsource/tilt-warp >/dev/null 2>&1)
fi
python3 -c "import sherpa_onnx, soundfile, scipy, playwright; print('prêt')"
