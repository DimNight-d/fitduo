#!/bin/zsh
# Збирає папку site/ для публікації (Cloudflare Pages): лише файли програми, без даних.
# Використання: tools/make-site.sh
cd "$(dirname "$0")/.." || exit 1
rm -rf site && mkdir -p site
cp -R index.html manifest.webmanifest sw.js css js icons site/
echo "Готово: папка site/ ($(du -sh site | cut -f1))"
