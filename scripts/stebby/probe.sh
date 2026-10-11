#!/usr/bin/env bash
# One-off: look at how stebby.eu's public partner search works (pages, scripts, API calls).
set -u
cd "$(dirname "$0")"; mkdir -p probe; cd probe
UA="Mozilla/5.0 (compatible; ParentsHubBot/1.0; +https://trshawonbdcse-blip.github.io/parents_hub/)"
for u in https://stebby.eu https://stebby.eu/et https://stebby.ee https://stebby.eu/et/teenusepakkujad https://stebby.eu/et/partners https://stebby.eu/en/service-providers https://stebby.eu/robots.txt https://stebby.eu/sitemap.xml; do
  f=$(echo "$u" | sed 's|https://||; s|[/:]|_|g')
  curl -sSL -A "$UA" -m 30 -w "%{http_code} %{url_effective}\n" -o "$f.html" "$u" >> status.txt 2>&1
done
# Script bundles referenced by the home page, and any API-looking strings inside them.
grep -hoE '(src|href)="[^"]+\.js[^"]*"' *.html | sed -E 's/^(src|href)="//; s/"$//' | sort -u > scripts.txt
while read -r s; do
  case "$s" in http*) url="$s";; //*) url="https:$s";; /*) url="https://stebby.eu$s";; *) url="https://stebby.eu/$s";; esac
  curl -sSL -A "$UA" -m 30 "$url" -o js_tmp && grep -hoE '"(https?:)?//[^"]*api[^"]*"|"/api/[^"]*"|/graphql[^"]*|search[A-Za-z]*\(|"/[a-z-]+/v[0-9]/[^"]*"' js_tmp | sort -u | head -80 | sed "s|^|$url: |" >> api-strings.txt
done < scripts.txt
rm -f js_tmp
ls -la
