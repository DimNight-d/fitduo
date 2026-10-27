#!/bin/zsh
# Оновлює версію файлів у index.html і sw.js, щоб браузер та iPhone завантажили нову версію.
# Використання: tools/bump-version.sh 10
cd "$(dirname "$0")/.." || exit 1
[ -z "$1" ] && { echo "Вкажіть номер версії, напр.: tools/bump-version.sh 10"; exit 1; }
sed -i '' -E "s/\?v=[0-9]+\"/?v=$1\"/g" index.html
sed -i '' -E "s/^const VERSION = [0-9]+;/const VERSION = $1;/" sw.js
echo "Версія: $1"
