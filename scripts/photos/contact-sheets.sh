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
  curl -sSL --max-time 25 -A "Mozilla/5.0 (compatible; ParentsHubBot/1.0)" "$src" -o "$f.raw" || continue
  convert "$f.raw[0]" -auto-orient -resize 240x160^ -gravity center -extent 240x160 "$f" 2>/dev/null || rm -f "$f"
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
ls strips/*.jpg | split -l 4 - group_
k=0
for g in group_*; do convert $(cat "$g") -append -resize '1400x>' -quality 82 "sheets/sheet_$(printf %02d $k).jpg"; k=$((k+1)); done
rm -f group_*
echo "sheets: $k"
