#!/usr/bin/env bash
# Downloads candidate photos and builds numbered contact sheets for manual review.
# Runs automatically when the candidate list changes on main.
# Each row is one place; thumbnails are labelled #0, #1, … in candidates.json order.
set -u
cd "$(dirname "$0")"
mkdir -p dl sheets strips
node -e '
const c=require("./candidates.json");
for (const [id, list] of Object.entries(c)) list.forEach((p,i)=>console.log(`${id}\t${i}\t${p.src}`))
' | while IFS=$'\t' read -r id i src; do
  f="dl/${id}__${i}.jpg"
  code=$(curl -sSL --max-time 25 -A "ParentsHubBot/1.0 (https://trshawonbdcse-blip.github.io/parents_hub/; photo review)" -w '%{http_code}' "$src" -o "$f.raw" 2>/dev/null)
  if [ "$code" != "200" ]; then echo "skip $id#$i http=$code"; rm -f "$f.raw"; continue; fi
  if ! convert "$f.raw[0]" -auto-orient -resize '240x160^' -gravity center -extent 240x160 "$f"; then
    echo "skip $id#$i not an image ($(file -b "$f.raw" | cut -c1-40))"; rm -f "$f"
  fi
  rm -f "$f.raw"
done
n=0
for id in $(node -e 'console.log(Object.keys(require("./candidates.json")).join(" "))'); do
  files=$(ls dl/${id}__*.jpg 2>/dev/null | sort -t_ -k3 -n)
  [ -z "$files" ] && continue
  args=()
  for f in $files; do i=${f##*__}; i=${i%.jpg}; args+=(-label "#$i" "$f"); done
  montage "${args[@]}" -tile 7x1 -geometry 240x160+4+4 -pointsize 18 -background white -title "$id" -pointsize 22 "strips/$(printf %03d $n)_$id.jpg"
  n=$((n+1))
done
ls dl | wc -l | xargs echo "downloaded:"
ls strips/*.jpg 2>/dev/null | split -l 4 - group_ || true
k=0
for g in group_*; do [ -e "$g" ] || continue convert $(cat "$g") -append -resize '1400x>' -quality 82 "sheets/sheet_$(printf %02d $k).jpg"; k=$((k+1)); done
rm -f group_*
echo "sheets: $k"
