#!/usr/bin/env bash
# One-off: find the API behind app.stebby.eu's public search and partner (POS) pages.
set -u
cd "$(dirname "$0")"; rm -rf probe; mkdir -p probe; cd probe
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
get() { curl -sSL -A "$UA" -m 30 -w "%{http_code} %{content_type} %{url_effective}\n" -o "$2" "$1" >> status.txt 2>&1; }
get "https://app.stebby.eu/search?query=ahhaa" search.html
get "https://app.stebby.eu/pos/aqva.spa.veekeskus" pos.html
grep -hoE '(src|href)="[^"]+\.js[^"]*"' search.html pos.html | sed -E 's/^(src|href)="//; s/"$//' | sort -u > scripts.txt
n=0
while read -r s; do
  case "$s" in http*) url="$s";; //*) url="https:$s";; /*) url="https://app.stebby.eu$s";; *) url="https://app.stebby.eu/$s";; esac
  n=$((n+1)); curl -sSL -A "$UA" -m 30 "$url" -o "js_$n.js"
  echo "js_$n.js $url $(wc -c < js_$n.js)" >> scripts-fetched.txt
  grep -hoE '"[^"]{0,80}(api|/v[0-9]/|graphql|search|pos/)[^"]{0,120}"' "js_$n.js" | sort -u | head -200 | sed "s|^|js_$n: |" >> api-strings.txt
done < scripts.txt
# Try likely JSON endpoints.
for u in "https://app.stebby.eu/api/search?query=ahhaa" "https://app.stebby.eu/api/v1/search?query=ahhaa" "https://api.stebby.eu/search?query=ahhaa" "https://app.stebby.eu/api/pos/aqva.spa.veekeskus"; do
  f=$(echo "$u" | sed 's|https://||; s|[/:?=&]|_|g'); get "$u" "try_$f.txt"
done
rm -f js_*.js
